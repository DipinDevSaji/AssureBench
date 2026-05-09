"""Runs the configured assurance tests against a target chatbot endpoint."""

import time
from typing import List, Dict, Optional

import httpx


async def run_assurance_tests(
    endpoint_url: str,
    tests: List[dict],
    api_key: Optional[str] = None,
    transport: Optional[httpx.AsyncBaseTransport] = None,
) -> List[Dict]:
    endpoint_url = str(endpoint_url)
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    results: List[Dict] = []
    async with httpx.AsyncClient(timeout=15.0, transport=transport) as client:
        for test in tests:
            test_id = test.get("test_id") or test.get("id")
            payload = {"prompt": test["prompt"], "test_id": test_id}
            start = time.perf_counter()
            try:
                response = await client.post(str(endpoint_url), json=payload, headers=headers)
                latency_ms = int((time.perf_counter() - start) * 1000)
                response_text = response.text
                response_json = None
                try:
                    response_json = response.json()
                except ValueError:
                    pass

                results.append(
                    {
                        "test_id": test_id,
                        "name": test["name"],
                        "category": test.get("category", test_id),
                        "expected_behavior": test.get("expected_behavior"),
                        "severity": test.get("severity"),
                        "prompt": test["prompt"],
                        "status_code": response.status_code,
                        "response_text": response_text,
                        "response_json": response_json,
                        "latency_ms": latency_ms,
                        "error": None if response.is_success else f"HTTP {response.status_code}",
                    }
                )
            except httpx.RequestError as error:
                latency_ms = int((time.perf_counter() - start) * 1000)
                results.append(
                    {
                        "test_id": test_id,
                        "name": test["name"],
                        "category": test.get("category", test_id),
                        "expected_behavior": test.get("expected_behavior"),
                        "severity": test.get("severity"),
                        "prompt": test["prompt"],
                        "status_code": None,
                        "response_text": "",
                        "response_json": None,
                        "latency_ms": latency_ms,
                        "error": str(error),
                    }
                )
    return results
