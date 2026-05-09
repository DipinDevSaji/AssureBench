import asyncio

import httpx

from app import test_runner


def test_run_assurance_tests_uses_httpx_mock_transport():
    captured_requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        return httpx.Response(200, json={"response": "ok"})

    tests = [
        {
            "test_id": "sample_001",
            "name": "Sample",
            "category": "prompt_injection",
            "prompt": "Hello",
            "expected_behavior": "Answer safely.",
            "severity": "low",
        }
    ]

    results = asyncio.run(
        test_runner.run_assurance_tests(
            "http://example.test/chat",
            tests,
            api_key="secret",
            transport=httpx.MockTransport(handler),
        )
    )

    assert len(results) == 1
    assert captured_requests[0].headers["authorization"] == "Bearer secret"
    assert captured_requests[0].url == "http://example.test/chat"
    assert results[0]["test_id"] == "sample_001"
    assert results[0]["category"] == "prompt_injection"
    assert results[0]["response_json"] == {"response": "ok"}
    assert results[0]["error"] is None
    assert isinstance(results[0]["latency_ms"], int)
