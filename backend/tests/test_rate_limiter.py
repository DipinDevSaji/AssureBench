import asyncio

import httpx

from app import main, rate_limiter


def _minimal_report_payload():
    return {
        "run_id": "run_rate_limit",
        "endpoint_url": "http://example.test/chat",
        "summary": {"risk_score": 0, "risk_level": "low", "evaluation": {}, "test_count": 0},
        "details": [],
    }


async def _post(path, payload, headers=None):
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.post(path, json=payload, headers=headers)


def _patch_run_pipeline(monkeypatch):
    async def run_assurance_tests(*args, **kwargs):
        return []

    monkeypatch.setattr(main.sample_tests, "get_sample_tests", lambda: [])
    monkeypatch.setattr(main.test_runner, "run_assurance_tests", run_assurance_tests)
    monkeypatch.setattr(main.evaluator, "evaluate_responses", lambda results: {})
    monkeypatch.setattr(main.ml_risk, "compute_risk_score", lambda evaluation, details=None: 0.0)
    monkeypatch.setattr(
        main.reports,
        "build_report",
        lambda endpoint_url, results, evaluation, risk: {
            "run_id": "run_rate_limit",
            "summary": {"risk_score": risk, "risk_level": "low", "evaluation": evaluation, "test_count": 0},
            "details": results,
        },
    )


def _patch_report_exports(monkeypatch):
    monkeypatch.setattr(
        main.reports,
        "export_json_report",
        lambda payload: {"message": "Report exported successfully", "filename": "test.json", "path": "reports/test.json"},
    )
    monkeypatch.setattr(
        main.reports,
        "export_pdf_report",
        lambda payload: {"message": "PDF report exported successfully", "filename": "test.pdf", "path": "reports/test.pdf"},
    )


def test_requests_under_limit_pass(monkeypatch, admin_headers):
    _patch_report_exports(monkeypatch)

    async def scenario():
        responses = [
            await _post("/reports/json", _minimal_report_payload(), admin_headers)
            for _ in range(rate_limiter.RATE_LIMITS["/reports/json"].requests)
        ]
        return responses

    responses = asyncio.run(scenario())

    assert all(response.status_code == 200 for response in responses)


def test_requests_over_limit_return_429(monkeypatch, admin_headers):
    _patch_report_exports(monkeypatch)

    async def scenario():
        limit = rate_limiter.RATE_LIMITS["/reports/json"].requests
        response = None
        for _ in range(limit + 1):
            response = await _post("/reports/json", _minimal_report_payload(), admin_headers)
        return response

    response = asyncio.run(scenario())

    assert response.status_code == 429
    assert response.json() == {"detail": rate_limiter.RATE_LIMIT_DETAIL}
    assert int(response.headers["retry-after"]) > 0


def test_runs_and_report_exports_have_separate_limits(monkeypatch, admin_headers):
    _patch_run_pipeline(monkeypatch)
    _patch_report_exports(monkeypatch)

    async def scenario():
        runs_limit = rate_limiter.RATE_LIMITS["/runs"].requests
        run_response = None
        for _ in range(runs_limit + 1):
            run_response = await _post("/runs", {"endpoint_url": "http://example.test/chat"}, admin_headers)

        report_response = await _post("/reports/json", _minimal_report_payload(), admin_headers)
        return run_response, report_response

    run_response, report_response = asyncio.run(scenario())

    assert run_response.status_code == 429
    assert report_response.status_code == 200


def test_report_export_routes_have_separate_limits(monkeypatch, admin_headers):
    _patch_report_exports(monkeypatch)

    async def scenario():
        json_limit = rate_limiter.RATE_LIMITS["/reports/json"].requests
        json_response = None
        for _ in range(json_limit + 1):
            json_response = await _post("/reports/json", _minimal_report_payload(), admin_headers)

        pdf_response = await _post("/reports/pdf", _minimal_report_payload(), admin_headers)
        return json_response, pdf_response

    json_response, pdf_response = asyncio.run(scenario())

    assert json_response.status_code == 429
    assert pdf_response.status_code == 200
