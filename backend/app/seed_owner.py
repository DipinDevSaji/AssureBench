"""Local development helper for creating or updating the owner account."""

from . import auth


def main() -> None:
    owner = auth.seed_owner_from_env()
    print(f"Owner account ready: {owner['email']} ({owner['role']})")


if __name__ == "__main__":
    main()
