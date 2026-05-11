import pytest

from app import rate_limiter


@pytest.fixture(autouse=True)
def clear_rate_limiter_state():
    rate_limiter.reset_rate_limits()
    yield
    rate_limiter.reset_rate_limits()
