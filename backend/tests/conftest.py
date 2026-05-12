import pytest

from app import auth, rate_limiter


@pytest.fixture(autouse=True)
def isolated_test_state(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "DB_PATH", tmp_path / "auth_test.db")
    monkeypatch.setattr(auth, "ENV_PATH", tmp_path / ".env")
    monkeypatch.setenv("ASSUREBENCH_JWT_SECRET", "test-secret")
    monkeypatch.setenv("ASSUREBENCH_OWNER_NAME", "Owner")
    monkeypatch.setenv("ASSUREBENCH_OWNER_EMAIL", "owner@example.com")
    monkeypatch.setenv("ASSUREBENCH_OWNER_PASSWORD", "owner-password")
    monkeypatch.setenv("ASSUREBENCH_EXTERNAL_ANALYSIS_ENABLED", "false")
    monkeypatch.setenv("ASSUREBENCH_ANALYSIS_PROVIDER", "disabled")
    auth.initialize_auth_storage()
    rate_limiter.reset_rate_limits()
    yield
    rate_limiter.reset_rate_limits()


@pytest.fixture
def admin_headers():
    user = auth.authenticate_user("owner@example.com", "owner-password")
    token = auth.create_access_token(user)
    return {"Authorization": f"Bearer {token}"}
