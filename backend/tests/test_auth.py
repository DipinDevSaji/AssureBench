import asyncio

import httpx
import pytest
from fastapi import HTTPException

from app import auth, main


async def _request(method, path, **kwargs):
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await getattr(client, method)(path, **kwargs)


def test_auth_db_path_defaults_to_local_db(monkeypatch):
    monkeypatch.delenv("ASSUREBENCH_DATA_DIR", raising=False)

    assert auth.get_auth_db_path() == auth.DB_PATH


def test_auth_db_path_uses_data_dir(monkeypatch, tmp_path):
    data_dir = tmp_path / "assurebench-data"
    monkeypatch.setenv("ASSUREBENCH_DATA_DIR", str(data_dir))

    assert auth.get_auth_db_path() == data_dir.resolve() / "assurebench_auth.db"
    assert data_dir.exists()


def test_owner_account_is_created_from_env_when_no_users_exist():
    users = auth.list_users()

    assert len(users) == 1
    assert users[0]["name"] == "Owner"
    assert users[0]["email"] == "owner@example.com"
    assert users[0]["role"] == "owner"
    assert users[0]["is_active"] is True


def test_backend_env_owner_values_are_loaded(tmp_path, monkeypatch):
    env_path = tmp_path / ".env"
    env_path.write_text(
        "\n".join(
            [
                "ASSUREBENCH_OWNER_NAME=Env Owner",
                "ASSUREBENCH_OWNER_EMAIL=env-owner@example.com",
                "ASSUREBENCH_OWNER_PASSWORD=env-password",
                "ASSUREBENCH_JWT_SECRET=env-secret",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(auth, "ENV_PATH", env_path)
    monkeypatch.delenv("ASSUREBENCH_OWNER_NAME", raising=False)
    monkeypatch.delenv("ASSUREBENCH_OWNER_EMAIL", raising=False)
    monkeypatch.delenv("ASSUREBENCH_OWNER_PASSWORD", raising=False)
    monkeypatch.delenv("ASSUREBENCH_JWT_SECRET", raising=False)

    auth.load_local_env()

    assert auth._owner_env_values()["name"] == "Env Owner"
    assert auth._owner_env_values()["email"] == "env-owner@example.com"
    assert auth._owner_env_values()["password"] == "env-password"
    assert auth._jwt_secret() == "env-secret"


def test_existing_owner_password_can_be_updated_from_env(monkeypatch):
    monkeypatch.setenv("ASSUREBENCH_OWNER_NAME", "Owner Updated")
    monkeypatch.setenv("ASSUREBENCH_OWNER_EMAIL", "owner@example.com")
    monkeypatch.setenv("ASSUREBENCH_OWNER_PASSWORD", "updated-owner-password")

    owner = auth.seed_owner_from_env()

    assert owner["name"] == "Owner Updated"
    assert owner["role"] == "owner"
    assert owner["is_active"] is True
    with pytest.raises(HTTPException):
        auth.authenticate_user("owner@example.com", "owner-password")
    assert auth.authenticate_user("owner@example.com", "updated-owner-password")["role"] == "owner"


def test_owner_can_login_after_seed_owner_runs(monkeypatch):
    monkeypatch.setenv("ASSUREBENCH_OWNER_NAME", "Seeded Owner")
    monkeypatch.setenv("ASSUREBENCH_OWNER_EMAIL", "seeded-owner@example.com")
    monkeypatch.setenv("ASSUREBENCH_OWNER_PASSWORD", "seeded-owner-password")

    auth.seed_owner_from_env()
    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "seeded-owner@example.com", "password": "seeded-owner-password"})
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "owner"


def test_owner_can_login():
    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "owner@example.com", "password": "owner-password"})
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["name"] == "Owner"
    assert payload["user"]["email"] == "owner@example.com"
    assert payload["user"]["role"] == "owner"
    assert payload["user"]["force_password_change"] is False
    assert payload["user"]["id"]


def test_admin_can_login():
    auth.create_user("Trusted Admin", "admin@example.com", "temporary-password", "admin")
    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "admin@example.com", "password": "temporary-password"})
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_user_can_login():
    auth.create_user("Customer", "customer@example.com", "temporary-password", "user")
    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "customer@example.com", "password": "temporary-password"})
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "user"


def test_login_fails_with_wrong_password():
    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "owner@example.com", "password": "wrong"})
    )

    assert response.status_code == 401


def test_public_cannot_create_accounts():
    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            json={"name": "Blocked", "email": "blocked@example.com", "password": "temporary-password", "role": "user"},
        )
    )

    assert response.status_code == 401


def test_unauthenticated_visitor_cannot_access_admin_endpoints():
    users_response = asyncio.run(_request("get", "/admin/users"))
    access_requests_response = asyncio.run(_request("get", "/admin/access-requests"))

    assert users_response.status_code == 401
    assert access_requests_response.status_code == 401


def test_protected_route_rejects_missing_token():
    response = asyncio.run(_request("get", "/reports"))

    assert response.status_code == 401


def test_protected_route_accepts_valid_token(admin_headers):
    response = asyncio.run(_request("get", "/reports", headers=admin_headers))

    assert response.status_code == 200
    assert "reports" in response.json()


def test_inactive_user_cannot_login():
    user = auth.create_user("Inactive User", "inactive@example.com", "temporary-password", "user")
    auth.deactivate_user(user["id"])

    response = asyncio.run(
        _request("post", "/auth/login", json={"email": "inactive@example.com", "password": "temporary-password"})
    )

    assert response.status_code == 401


def test_owner_can_create_admin(admin_headers):
    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=admin_headers,
            json={"name": "Trusted Admin", "email": "trusted@example.com", "password": "temporary-password", "role": "admin"},
        )
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["email"] == "trusted@example.com"
    assert payload["role"] == "admin"
    assert "password_hash" not in payload


def test_owner_can_list_admin_users(admin_headers):
    response = asyncio.run(_request("get", "/admin/users", headers=admin_headers))

    assert response.status_code == 200
    assert response.json()["users"][0]["role"] == "owner"
    assert all("password_hash" not in user for user in response.json()["users"])


def test_owner_can_create_user(admin_headers):
    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=admin_headers,
            json={"name": "Client One", "email": "client1@example.com", "password": "temporary-password", "role": "user"},
        )
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["email"] == "client1@example.com"
    assert payload["role"] == "user"
    assert payload["force_password_change"] is True
    assert "password_hash" not in payload


def test_owner_can_reset_another_users_password(admin_headers):
    user = auth.create_user("Reset User", "reset-user@example.com", "temporary-password", "user")

    response = asyncio.run(
        _request(
            "patch",
            f"/admin/users/{user['id']}",
            headers=admin_headers,
            json={"password": "new-temporary-password"},
        )
    )

    assert response.status_code == 200
    assert response.json()["force_password_change"] is True
    assert "password_hash" not in response.json()


def test_admin_can_reset_another_users_password():
    admin_headers, _ = _token_for_user("Trusted Admin", "reset-admin@example.com", "admin")
    user = auth.create_user("Reset User", "admin-reset-user@example.com", "temporary-password", "user")

    response = asyncio.run(
        _request(
            "patch",
            f"/admin/users/{user['id']}",
            headers=admin_headers,
            json={"password": "new-temporary-password"},
        )
    )

    assert response.status_code == 200
    assert response.json()["force_password_change"] is True
    assert "password_hash" not in response.json()


def test_reset_password_works_for_login(admin_headers):
    user = auth.create_user("Reset Login User", "reset-login@example.com", "temporary-password", "user")

    reset_response = asyncio.run(
        _request(
            "patch",
            f"/admin/users/{user['id']}",
            headers=admin_headers,
            json={"password": "new-temporary-password"},
        )
    )
    login_response = asyncio.run(
        _request(
            "post",
            "/auth/login",
            json={"email": "reset-login@example.com", "password": "new-temporary-password"},
        )
    )

    assert reset_response.status_code == 200
    assert login_response.status_code == 200
    assert login_response.json()["user"]["force_password_change"] is True


def test_current_owner_cannot_reset_own_password_from_admin_api(admin_headers):
    owner = auth.authenticate_user("owner@example.com", "owner-password")

    response = asyncio.run(
        _request(
            "patch",
            f"/admin/users/{owner['id']}",
            headers=admin_headers,
            json={"password": "new-owner-password"},
        )
    )

    assert response.status_code == 403
    assert "account settings" in response.json()["detail"].lower()


def test_user_can_change_own_password_with_correct_current_password():
    user = auth.create_user("Customer", "customer-change@example.com", "temporary-password", "user")
    token = auth.create_access_token(user)

    response = asyncio.run(
        _request(
            "post",
            "/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "temporary-password",
                "new_password": "new-safe-password",
                "confirm_new_password": "new-safe-password",
            },
        )
    )

    assert response.status_code == 200
    assert response.json()["user"]["force_password_change"] is False
    assert auth.authenticate_user("customer-change@example.com", "new-safe-password")["email"] == "customer-change@example.com"


def test_change_password_wrong_current_password_fails():
    user = auth.create_user("Customer", "customer-wrong-current@example.com", "temporary-password", "user")
    token = auth.create_access_token(user)

    response = asyncio.run(
        _request(
            "post",
            "/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "wrong-password",
                "new_password": "new-safe-password",
                "confirm_new_password": "new-safe-password",
            },
        )
    )

    assert response.status_code == 400


def _token_for_user(name, email, role):
    user = auth.create_user(name, email, "temporary-password", role)
    token = auth.create_access_token(user)
    return {"Authorization": f"Bearer {token}"}, user


def test_admin_can_create_user():
    admin_headers, _ = _token_for_user("Trusted Admin", "admin@example.com", "admin")

    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=admin_headers,
            json={"name": "Customer", "email": "customer@example.com", "password": "temporary-password", "role": "user"},
        )
    )

    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_admin_can_list_admin_users():
    admin_headers, _ = _token_for_user("Trusted Admin", "list-admin@example.com", "admin")

    response = asyncio.run(_request("get", "/admin/users", headers=admin_headers))

    assert response.status_code == 200
    assert any(user["email"] == "list-admin@example.com" for user in response.json()["users"])


def test_admin_cannot_create_admin():
    admin_headers, _ = _token_for_user("Trusted Admin", "admin@example.com", "admin")

    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=admin_headers,
            json={"name": "Other Admin", "email": "otheradmin@example.com", "password": "temporary-password", "role": "admin"},
        )
    )

    assert response.status_code == 403


def test_admin_cannot_create_owner():
    admin_headers, _ = _token_for_user("Trusted Admin", "admin@example.com", "admin")

    response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=admin_headers,
            json={"name": "Other Owner", "email": "otherowner@example.com", "password": "temporary-password", "role": "owner"},
        )
    )

    assert response.status_code == 403


def test_admin_cannot_deactivate_owner():
    admin_headers, _ = _token_for_user("Trusted Admin", "admin@example.com", "admin")
    owner = auth.authenticate_user("owner@example.com", "owner-password")

    response = asyncio.run(_request("delete", f"/admin/users/{owner['id']}", headers=admin_headers))

    assert response.status_code == 403


def test_owner_can_deactivate_user_and_admin(admin_headers):
    user = auth.create_user("Customer", "deactivate-user@example.com", "temporary-password", "user")
    admin = auth.create_user("Trusted Admin", "deactivate-admin@example.com", "temporary-password", "admin")

    user_response = asyncio.run(_request("delete", f"/admin/users/{user['id']}", headers=admin_headers))
    admin_response = asyncio.run(_request("delete", f"/admin/users/{admin['id']}", headers=admin_headers))

    assert user_response.status_code == 200
    assert user_response.json()["is_active"] is False
    assert admin_response.status_code == 200
    assert admin_response.json()["is_active"] is False


def test_admin_can_deactivate_user_only():
    admin_headers, _ = _token_for_user("Trusted Admin", "manage-admin@example.com", "admin")
    user = auth.create_user("Customer", "managed-user@example.com", "temporary-password", "user")
    other_admin = auth.create_user("Other Admin", "other-managed-admin@example.com", "temporary-password", "admin")

    user_response = asyncio.run(_request("delete", f"/admin/users/{user['id']}", headers=admin_headers))
    admin_response = asyncio.run(_request("delete", f"/admin/users/{other_admin['id']}", headers=admin_headers))

    assert user_response.status_code == 200
    assert user_response.json()["is_active"] is False
    assert admin_response.status_code == 403


def test_cannot_deactivate_last_active_owner(admin_headers):
    owner = auth.authenticate_user("owner@example.com", "owner-password")

    response = asyncio.run(_request("delete", f"/admin/users/{owner['id']}", headers=admin_headers))

    assert response.status_code == 403


def test_cannot_deactivate_current_owner(admin_headers):
    other_owner = auth.create_user("Other Owner", "other-owner@example.com", "temporary-password", "owner")
    assert other_owner["role"] == "owner"
    current_owner = auth.authenticate_user("owner@example.com", "owner-password")

    response = asyncio.run(_request("delete", f"/admin/users/{current_owner['id']}", headers=admin_headers))

    assert response.status_code == 403
    assert "currently logged-in owner" in response.json()["detail"]


def test_owner_can_deactivate_placeholder_owner_if_another_active_owner_exists(monkeypatch):
    monkeypatch.setenv("ASSUREBENCH_OWNER_EMAIL", "real-owner@example.com")
    real_owner = auth.create_user("Real Owner", "real-owner@example.com", "temporary-password", "owner")
    placeholder = auth.authenticate_user("owner@example.com", "owner-password")
    token = auth.create_access_token(real_owner)
    headers = {"Authorization": f"Bearer {token}"}

    response = asyncio.run(_request("delete", f"/admin/users/{placeholder['id']}", headers=headers))

    assert response.status_code == 200
    assert response.json()["email"] == "owner@example.com"
    assert response.json()["is_active"] is False


def test_user_cannot_access_admin_endpoints():
    user_headers, _ = _token_for_user("Customer", "customer@example.com", "user")

    response = asyncio.run(_request("get", "/admin/users", headers=user_headers))

    assert response.status_code == 403


def test_user_cannot_manage_accounts_or_access_requests():
    user_headers, user = _token_for_user("Customer", "blocked-customer@example.com", "user")

    create_response = asyncio.run(
        _request(
            "post",
            "/admin/users",
            headers=user_headers,
            json={"name": "Blocked", "email": "blocked-user@example.com", "password": "temporary-password", "role": "user"},
        )
    )
    deactivate_response = asyncio.run(_request("delete", f"/admin/users/{user['id']}", headers=user_headers))
    reactivate_response = asyncio.run(
        _request("patch", f"/admin/users/{user['id']}", headers=user_headers, json={"is_active": True})
    )
    reset_response = asyncio.run(
        _request("patch", f"/admin/users/{user['id']}", headers=user_headers, json={"password": "new-password"})
    )
    access_requests_response = asyncio.run(_request("get", "/admin/access-requests", headers=user_headers))

    assert create_response.status_code == 403
    assert deactivate_response.status_code == 403
    assert reactivate_response.status_code == 403
    assert reset_response.status_code == 403
    assert access_requests_response.status_code == 403


def _access_request_payload():
    return {
        "full_name": "Dipin Test",
        "email": "dipin@example.com",
        "company_or_project": "AssureBench Pilot",
        "intended_use": "Evaluate chatbot endpoints",
        "expected_usage": "Weekly assurance runs",
        "message": "Please review my access request.",
    }


def test_access_request_can_be_submitted():
    payload = _access_request_payload()
    payload["company_or_project"] = None
    payload["message"] = None
    response = asyncio.run(_request("post", "/access-requests", json=payload))

    payload = response.json()
    assert response.status_code == 200
    assert payload["message"].startswith("Access request submitted")
    assert payload["request"]["status"] == "pending"
    assert payload["request"]["email"] == "dipin@example.com"
    assert payload["request"]["company_or_project"] == ""
    assert payload["request"]["message"] == ""


def test_access_request_missing_required_fields_fails_validation():
    payload = _access_request_payload()
    payload["intended_use"] = ""

    response = asyncio.run(_request("post", "/access-requests", json=payload))

    assert response.status_code == 422


def test_access_request_invalid_email_fails_validation():
    payload = _access_request_payload()
    payload["email"] = "not-an-email"

    response = asyncio.run(_request("post", "/access-requests", json=payload))

    assert response.status_code == 422


def test_admin_can_list_access_requests(admin_headers):
    asyncio.run(_request("post", "/access-requests", json=_access_request_payload()))

    response = asyncio.run(_request("get", "/admin/access-requests", headers=admin_headers))

    assert response.status_code == 200
    assert response.json()["access_requests"][0]["full_name"] == "Dipin Test"
    assert response.json()["access_requests"][0]["message"] == "Please review my access request."


def test_non_admin_cannot_list_access_requests():
    user_headers, _ = _token_for_user("Customer", "customer@example.com", "user")

    response = asyncio.run(
        _request("get", "/admin/access-requests", headers=user_headers)
    )

    assert response.status_code == 403


def test_admin_can_update_access_request_status(admin_headers):
    submit_response = asyncio.run(_request("post", "/access-requests", json=_access_request_payload()))
    request_id = submit_response.json()["request"]["id"]

    response = asyncio.run(
        _request(
            "patch",
            f"/admin/access-requests/{request_id}",
            headers=admin_headers,
            json={"status": "contacted"},
        )
    )

    assert response.status_code == 200
    assert response.json()["status"] == "contacted"
