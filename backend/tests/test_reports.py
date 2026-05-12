import pytest

from app import reports


ALL_CATEGORIES = {
    "prompt_injection",
    "privacy_leakage",
    "hallucination",
    "unsafe_output",
    "format_reliability",
    "latency",
    "bias",
    "over_refusal",
    "jailbreak",
    "data_exfiltration",
}


def test_recommendations_exist_for_all_categories():
    evaluation = {category: 1.0 for category in ALL_CATEGORIES}

    recommendations = reports.build_recommendations(evaluation)
    recommendation_categories = {item["category"] for item in recommendations}

    assert recommendation_categories == ALL_CATEGORIES
    for recommendation in recommendations:
        assert recommendation["priority"]
        assert recommendation["effort"]
        assert 2 <= len(recommendation["items"]) <= 3
        assert recommendation["details"]["why"]
        assert recommendation["details"]["steps"]
        assert recommendation["details"]["checklist"]
        assert recommendation["details"]["owner"]


def test_failed_or_risky_tests_use_individual_status():
    details = [
        {"test_id": "privacy_leakage_001", "category": "privacy_leakage", "risky": True},
        {"test_id": "privacy_leakage_002", "category": "privacy_leakage", "risky": False},
    ]

    failed_or_risky = reports.get_failed_or_risky_tests(details, {"privacy_leakage": 1.0})

    assert failed_or_risky == [details[0]]


def test_json_report_schema_contains_required_sections(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    run_result = {
        "run_id": "run_test",
        "endpoint_url": "http://example.test/chat",
        "summary": {
            "risk_score": 42.0,
            "risk_level": "elevated",
            "evaluation": {"prompt_injection": 1.0},
            "test_count": 1,
        },
        "details": [
            {
                "test_id": "prompt_injection_001",
                "category": "prompt_injection",
                "name": "Instruction Override",
                "prompt": "Ignore rules.",
                "risky": True,
                "risk_score": 1.0,
            }
        ],
    }

    result = reports.export_json_report(run_result)
    report_path = tmp_path / result["filename"]
    report = reports.json.loads(report_path.read_text(encoding="utf-8"))

    assert report["run_id"] == "run_test"
    assert report["endpoint_url"] == "http://example.test/chat"
    assert report["risk_score"] == 42.0
    assert report["risk_level"] == "elevated"
    assert "summary" in report
    assert "recommendations" in report
    assert "details" in report
    assert "failed_or_risky_tests" in report


@pytest.mark.parametrize("filename", ["../secret.json", "..\\secret.json", "nested/report.json", "bad..name.json"])
def test_report_file_path_rejects_traversal(filename):
    with pytest.raises(ValueError):
        reports.get_exported_report_path(filename)


def test_delete_existing_report(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    report_path = tmp_path / "assurebench_report_run_test_20260511010101.json"
    report_path.write_text("{}", encoding="utf-8")

    result = reports.delete_exported_report(report_path.name)

    assert result["filename"] == report_path.name
    assert not report_path.exists()


def test_delete_missing_report_returns_file_not_found(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)

    with pytest.raises(FileNotFoundError):
        reports.delete_exported_report("assurebench_report_missing.json")


@pytest.mark.parametrize("filename", ["../README.md", "../../.env", "C:\\Users\\dipin\\.env", "nested/report.json"])
def test_delete_report_rejects_path_traversal(tmp_path, monkeypatch, filename):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)

    with pytest.raises(ValueError):
        reports.delete_exported_report(filename)


def test_delete_report_does_not_delete_folders(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    folder = tmp_path / "assurebench_report_folder.json"
    folder.mkdir()

    with pytest.raises(FileNotFoundError):
        reports.delete_exported_report(folder.name)

    assert folder.exists()
