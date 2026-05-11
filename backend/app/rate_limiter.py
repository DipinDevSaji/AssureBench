"""Simple in-memory IP-based rate limiting for high-cost API routes."""

import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, Tuple

from fastapi import HTTPException, Request


RATE_LIMIT_DETAIL = "Rate limit exceeded. Please try again later."


@dataclass(frozen=True)
class RateLimit:
    requests: int
    window_seconds: int = 60


RATE_LIMITS = {
    "/runs": RateLimit(requests=10),
    "/reports/json": RateLimit(requests=20),
    "/reports/pdf": RateLimit(requests=20),
}

_REQUEST_TIMESTAMPS: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _enforce_rate_limit(route_key: str, request: Request) -> None:
    limit = RATE_LIMITS[route_key]
    now = time.monotonic()
    key = (route_key, _client_ip(request))
    timestamps = _REQUEST_TIMESTAMPS[key]

    while timestamps and now - timestamps[0] >= limit.window_seconds:
        timestamps.popleft()

    if len(timestamps) >= limit.requests:
        retry_after = max(1, math.ceil(limit.window_seconds - (now - timestamps[0])))
        raise HTTPException(
            status_code=429,
            detail=RATE_LIMIT_DETAIL,
            headers={"Retry-After": str(retry_after)},
        )

    timestamps.append(now)


def rate_limit_dependency(route_key: str) -> Callable[[Request], None]:
    if route_key not in RATE_LIMITS:
        raise ValueError(f"No rate limit configured for {route_key}")

    def dependency(request: Request) -> None:
        _enforce_rate_limit(route_key, request)

    return dependency


def reset_rate_limits() -> None:
    """Clear in-memory state for tests and local debugging."""

    _REQUEST_TIMESTAMPS.clear()
