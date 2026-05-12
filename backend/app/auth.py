"""SQLite-backed JWT authentication for AssureBench."""

import os
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext


DB_PATH = Path(__file__).resolve().parents[1] / "assurebench_auth.db"
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 12
ROLES = {"owner", "admin", "user"}

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger("assurebench.auth")


def load_local_env(override: bool = True) -> None:
    if not ENV_PATH.exists():
        return

    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        clean_key = key.strip()
        clean_value = value.strip().strip('"').strip("'")
        if override:
            os.environ[clean_key] = clean_value
        else:
            os.environ.setdefault(clean_key, clean_value)


def get_auth_db_path() -> Path:
    data_dir = os.getenv("ASSUREBENCH_DATA_DIR")
    if data_dir:
        path = Path(data_dir).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path / "assurebench_auth.db"
    return DB_PATH


def _connect() -> sqlite3.Connection:
    db_path = get_auth_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def _row_to_user(row: sqlite3.Row) -> Dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "force_password_change": bool(row["force_password_change"]) if "force_password_change" in row.keys() else False,
        "created_at": row["created_at"],
    }


def _row_to_access_request(row: sqlite3.Row) -> Dict:
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "company_or_project": row["company_or_project"],
        "intended_use": row["intended_use"],
        "expected_usage": row["expected_usage"],
        "message": row["message"],
        "status": row["status"],
        "created_at": row["created_at"],
    }


def _jwt_secret() -> str:
    secret = os.getenv("ASSUREBENCH_JWT_SECRET")
    if not secret:
        raise RuntimeError("ASSUREBENCH_JWT_SECRET must be set")
    return secret


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def normalize_email(email: str) -> str:
    return str(email).strip().lower()


def _migrate_users_table(connection: sqlite3.Connection) -> None:
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
    if not columns:
        return
    if "name" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN name TEXT")
    if "email" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN email TEXT")
    if "force_password_change" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN force_password_change INTEGER NOT NULL DEFAULT 0")
    if "username" in columns:
        connection.execute("UPDATE users SET name = COALESCE(name, username), email = COALESCE(email, username)")
    connection.execute("UPDATE users SET name = COALESCE(name, email, 'AssureBench User')")
    connection.execute("UPDATE users SET email = LOWER(email)")
    connection.commit()


def _ensure_storage_schema() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                force_password_change INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        _migrate_users_table(connection)
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS access_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                company_or_project TEXT,
                intended_use TEXT NOT NULL,
                expected_usage TEXT NOT NULL,
                message TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def _owner_env_values() -> Dict[str, str]:
    return {
        "name": os.getenv("ASSUREBENCH_OWNER_NAME", "Owner").strip() or "Owner",
        "email": normalize_email(os.getenv("ASSUREBENCH_OWNER_EMAIL", "")),
        "password": os.getenv("ASSUREBENCH_OWNER_PASSWORD", ""),
        "jwt_secret": os.getenv("ASSUREBENCH_JWT_SECRET", ""),
    }


def log_auth_startup_state(owner_email: str) -> None:
    safe_lines = [
        f"Auth database path: {get_auth_db_path()}",
        f"backend/.env present: {ENV_PATH.exists()}",
        f"ASSUREBENCH_OWNER_NAME present: {bool(os.getenv('ASSUREBENCH_OWNER_NAME'))}",
        f"ASSUREBENCH_OWNER_EMAIL present: {bool(owner_email)}",
        f"ASSUREBENCH_OWNER_PASSWORD present: {bool(os.getenv('ASSUREBENCH_OWNER_PASSWORD'))}",
        f"ASSUREBENCH_JWT_SECRET present: {bool(os.getenv('ASSUREBENCH_JWT_SECRET'))}",
    ]
    if owner_email:
        safe_lines.append(f"Owner email configured: {owner_email}")
    for line in safe_lines:
        logger.info(line)
        print(f"[AssureBench auth] {line}")


def initialize_auth_storage() -> None:
    load_local_env()
    _ensure_storage_schema()
    env_values = _owner_env_values()
    log_auth_startup_state(env_values["email"])
    sync_owner_from_env(update_password=True, create_if_missing=True)


def create_owner_from_env_if_empty() -> Optional[Dict]:
    load_local_env()
    _ensure_storage_schema()
    with _connect() as connection:
        count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if count:
            return None

    env_values = _owner_env_values()
    if not env_values["email"] or not env_values["password"]:
        return None

    return create_user(
        name=env_values["name"],
        email=env_values["email"],
        password=env_values["password"],
        role="owner",
    )


def sync_owner_from_env(update_password: bool = False, create_if_missing: bool = True) -> Optional[Dict]:
    env_values = _owner_env_values()
    email = env_values["email"]
    password = env_values["password"]
    if not email or not password:
        logger.warning("Owner account not synced because owner email or password is missing")
        return None

    existing = get_user_with_password(email)
    if existing:
        updates = ["name = ?", "role = 'owner'", "is_active = 1", "force_password_change = 0"]
        values = [env_values["name"]]
        if update_password:
            updates.append("password_hash = ?")
            values.append(hash_password(password))
        values.append(email)
        with _connect() as connection:
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE email = ?",
                values,
            )
            connection.commit()
        owner = get_user_by_id(existing["id"])
        if not owner:
            raise RuntimeError("Owner account could not be updated")
        logger.info("Owner account synced for %s", email)
        return owner

    if not create_if_missing:
        return None

    owner = create_user(name=env_values["name"], email=email, password=password, role="owner")
    logger.info("Owner account created for %s", email)
    return owner


def seed_owner_from_env() -> Dict:
    load_local_env()
    _ensure_storage_schema()
    env_values = _owner_env_values()
    log_auth_startup_state(env_values["email"])
    if not env_values["email"] or not env_values["password"]:
        raise RuntimeError("ASSUREBENCH_OWNER_EMAIL and ASSUREBENCH_OWNER_PASSWORD must be set")
    owner = sync_owner_from_env(update_password=True, create_if_missing=True)
    if not owner:
        raise RuntimeError("Owner account could not be seeded")
    return owner


def create_user(name: str, email: str, password: str, role: str = "user") -> Dict:
    normalized_role = role if role in ROLES else "user"
    normalized_email = normalize_email(email)
    normalized_name = str(name).strip()
    if not normalized_name or not normalized_email or not password:
        raise ValueError("Name, email, and password are required")
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        with _connect() as connection:
            columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
            if "username" in columns:
                cursor = connection.execute(
                    """
                        INSERT INTO users (username, name, email, password_hash, role, is_active, force_password_change, created_at)
                        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        normalized_email,
                        normalized_name,
                        normalized_email,
                        hash_password(password),
                        normalized_role,
                        0 if normalized_role == "owner" else 1,
                        created_at,
                    ),
                )
            else:
                cursor = connection.execute(
                    """
                    INSERT INTO users (name, email, password_hash, role, is_active, force_password_change, created_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        normalized_name,
                        normalized_email,
                        hash_password(password),
                        normalized_role,
                        0 if normalized_role == "owner" else 1,
                        created_at,
                    ),
                )
            connection.commit()
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise ValueError("Email already exists") from exc

    user = get_user_by_id(user_id)
    if not user:
        raise RuntimeError("User was not created")
    return user


def create_user_as_actor(actor: Dict, name: str, email: str, password: str, role: str = "user") -> Dict:
    actor_role = actor.get("role")
    requested_role = role if role in ROLES else "user"
    if actor_role == "owner":
        if requested_role == "owner":
            raise PermissionError("Owner accounts cannot be created from the admin API")
        return create_user(name=name, email=email, password=password, role=requested_role)
    if actor_role == "admin":
        if requested_role != "user":
            raise PermissionError("Admins can only create normal user accounts")
        return create_user(name=name, email=email, password=password, role="user")
    raise PermissionError("Admin access required")


def list_users() -> List[Dict]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, name, email, role, is_active, force_password_change, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
    return [_row_to_user(row) for row in rows]


def get_user_by_id(user_id: int) -> Optional[Dict]:
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, name, email, role, is_active, force_password_change, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _row_to_user(row) if row else None


def get_user_with_password(email: str) -> Optional[Dict]:
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, name, email, password_hash, role, is_active, force_password_change, created_at FROM users WHERE email = ?",
            (normalize_email(email),),
        ).fetchone()
    return dict(row) if row else None


def update_user(
    user_id: int,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    password: Optional[str] = None,
    force_password_change: Optional[bool] = None,
) -> Dict:
    updates = []
    values = []
    if role is not None:
        updates.append("role = ?")
        values.append(role if role in ROLES else "user")
    if is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if is_active else 0)
    if password:
        updates.append("password_hash = ?")
        values.append(hash_password(password))
    if force_password_change is not None:
        updates.append("force_password_change = ?")
        values.append(1 if force_password_change else 0)

    if updates:
        values.append(user_id)
        with _connect() as connection:
            connection.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
            connection.commit()

    user = get_user_by_id(user_id)
    if not user:
        raise FileNotFoundError("User not found")
    return user


def _active_owner_count() -> int:
    with _connect() as connection:
        return int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'owner' AND is_active = 1"
            ).fetchone()["count"]
        )


def update_user_as_actor(
    actor: Dict,
    user_id: int,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    password: Optional[str] = None,
) -> Dict:
    target = get_user_by_id(user_id)
    if not target:
        raise FileNotFoundError("User not found")

    actor_role = actor.get("role")
    target_role = target.get("role")
    if target["id"] == actor.get("id") and role is not None and role != target_role:
        raise PermissionError("Users cannot modify their own role")
    if actor_role == "owner":
        if target["id"] == actor.get("id") and is_active is False:
            raise PermissionError("Cannot deactivate the currently logged-in owner")
        if target_role == "owner" and is_active is False and _active_owner_count() <= 1:
            raise PermissionError("Cannot deactivate the last active owner account")
        if role == "owner":
            raise PermissionError("Owner role cannot be assigned from the admin API")
        return update_user(
            user_id,
            role=role,
            is_active=is_active,
            password=password,
            force_password_change=True if password else None,
        )
    if actor_role == "admin":
        if target_role in {"owner", "admin"}:
            raise PermissionError("Admins can only manage normal user accounts")
        if role not in {None, "user"}:
            raise PermissionError("Admins cannot assign admin or owner roles")
        return update_user(
            user_id,
            role=role,
            is_active=is_active,
            password=password,
            force_password_change=True if password else None,
        )
    raise PermissionError("Admin access required")


def deactivate_user(user_id: int) -> Dict:
    return update_user(user_id, is_active=False)


def change_own_password(user_id: int, current_password: str, new_password: str) -> Dict:
    user = None
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row:
            user = dict(row)
    if not user:
        raise FileNotFoundError("User not found")
    if not verify_password(current_password, user["password_hash"]):
        raise PermissionError("Current password is incorrect")
    if not str(new_password).strip():
        raise ValueError("New password is required")
    return update_user(user_id, password=new_password, force_password_change=False)


def authenticate_user(email: str, password: str) -> Dict:
    user = get_user_with_password(email)
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not bool(user["is_active"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive")
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": bool(user["is_active"]),
        "force_password_change": bool(user.get("force_password_change")),
        "created_at": user["created_at"],
    }


def create_access_token(user: Dict) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": expires_at,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user = get_user_by_id(user_id)
    if not user or not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or inactive user")
    request.state.current_user = user
    return user


def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    if current_user.get("role") not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def create_access_request(data: Dict) -> Dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO access_requests (
                full_name, email, company_or_project, intended_use,
                expected_usage, message, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (
                data["full_name"],
                data["email"],
                data.get("company_or_project") or "",
                data["intended_use"],
                data["expected_usage"],
                data.get("message") or "",
                created_at,
            ),
        )
        connection.commit()
        request_id = cursor.lastrowid

    request = get_access_request_by_id(request_id)
    if not request:
        raise RuntimeError("Access request was not created")
    return request


def get_access_request_by_id(request_id: int) -> Optional[Dict]:
    with _connect() as connection:
        row = connection.execute(
            """
            SELECT id, full_name, email, company_or_project, intended_use,
                   expected_usage, message, status, created_at
            FROM access_requests
            WHERE id = ?
            """,
            (request_id,),
        ).fetchone()
    return _row_to_access_request(row) if row else None


def list_access_requests() -> List[Dict]:
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, full_name, email, company_or_project, intended_use,
                   expected_usage, message, status, created_at
            FROM access_requests
            ORDER BY created_at DESC
            """
        ).fetchall()
    return [_row_to_access_request(row) for row in rows]


def update_access_request_status(request_id: int, status_value: str) -> Dict:
    if status_value not in {"pending", "contacted", "approved", "rejected"}:
        raise ValueError("Invalid access request status")

    with _connect() as connection:
        connection.execute(
            "UPDATE access_requests SET status = ? WHERE id = ?",
            (status_value, request_id),
        )
        connection.commit()

    request = get_access_request_by_id(request_id)
    if not request:
        raise FileNotFoundError("Access request not found")
    return request
