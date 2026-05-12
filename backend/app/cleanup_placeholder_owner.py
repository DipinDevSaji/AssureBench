"""Deactivate the legacy local placeholder owner account when safe."""

from . import auth


PLACEHOLDER_OWNER_EMAIL = "owner@example.com"


def main() -> None:
    auth.load_local_env()
    auth._ensure_storage_schema()
    configured_owner_email = auth._owner_env_values()["email"]

    if not configured_owner_email:
        raise SystemExit("ASSUREBENCH_OWNER_EMAIL is not configured. No changes made.")

    if configured_owner_email == PLACEHOLDER_OWNER_EMAIL:
        raise SystemExit("Configured owner is the placeholder owner. No changes made.")

    real_owner = auth.get_user_with_password(configured_owner_email)
    if not real_owner or real_owner.get("role") != "owner" or not bool(real_owner.get("is_active")):
        raise SystemExit("Configured owner account is missing or inactive. No changes made.")

    placeholder = auth.get_user_with_password(PLACEHOLDER_OWNER_EMAIL)
    if not placeholder:
        print("Placeholder owner account not found. No changes needed.")
        return

    if placeholder.get("role") != "owner":
        print("Placeholder account exists but is not an owner. No changes needed.")
        return

    if not bool(placeholder.get("is_active")):
        print("Placeholder owner account is already inactive.")
        return

    if auth._active_owner_count() <= 1:
        raise SystemExit("Cannot deactivate placeholder owner because it is the last active owner.")

    auth.update_user(placeholder["id"], is_active=False)
    print(f"Deactivated placeholder owner account: {PLACEHOLDER_OWNER_EMAIL}")


if __name__ == "__main__":
    main()
