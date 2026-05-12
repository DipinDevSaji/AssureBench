import pytest

from app import auth, reports


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


def test_reports_dir_defaults_to_local_reports(monkeypatch):
    monkeypatch.delenv("ASSUREBENCH_DATA_DIR", raising=False)

    assert reports._get_reports_dir() == reports.Path(__file__).resolve().parents[2] / "reports"


def test_reports_dir_uses_data_dir_and_creates_folder(monkeypatch, tmp_path):
    data_dir = tmp_path / "assurebench-data"
    monkeypatch.setenv("ASSUREBENCH_DATA_DIR", str(data_dir))

    reports_dir = reports._get_reports_dir()

    assert reports_dir == data_dir.resolve() / "reports"
    assert reports_dir.exists()


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
    owner = auth.authenticate_user("owner@example.com", "owner-password")

    result = reports.delete_exported_report(report_path.name, owner)

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


def _run_result(run_id="run_test"):
    return {
        "run_id": run_id,
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


def test_report_export_uses_user_specific_folder_and_owner_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    user = auth.create_user("Customer A", "customer-a@example.com", "temporary-password", "user")

    result = reports.export_json_report(_run_result("run_customer_a"), user)
    report_path = tmp_path / str(user["id"]) / result["filename"]
    report = reports.json.loads(report_path.read_text(encoding="utf-8"))

    assert report_path.exists()
    assert report["owner"]["user_id"] == user["id"]
    assert report["owner"]["email"] == "customer-a@example.com"


def test_user_sees_own_reports_only(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    user_a = auth.create_user("Customer A", "own-a@example.com", "temporary-password", "user")
    user_b = auth.create_user("Customer B", "own-b@example.com", "temporary-password", "user")
    report_a = reports.export_json_report(_run_result("run_a"), user_a)
    reports.export_json_report(_run_result("run_b"), user_b)

    visible_reports = reports.list_exported_reports(user_a)

    assert [item["filename"] for item in visible_reports] == [report_a["filename"]]
    assert visible_reports[0]["owner_email"] == "own-a@example.com"


def test_owner_and_admin_can_see_all_reports_and_legacy(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    user = auth.create_user("Customer", "customer-report@example.com", "temporary-password", "user")
    admin = auth.create_user("Trusted Admin", "admin-report@example.com", "temporary-password", "admin")
    owner = auth.authenticate_user("owner@example.com", "owner-password")
    legacy = tmp_path / "assurebench_report_run_legacy_20260511010101.json"
    legacy.write_text("{}", encoding="utf-8")
    customer_report = reports.export_json_report(_run_result("run_customer"), user)

    owner_reports = reports.list_exported_reports(owner)
    admin_reports = reports.list_exported_reports(admin)

    owner_filenames = {item["filename"] for item in owner_reports}
    admin_filenames = {item["filename"] for item in admin_reports}
    assert customer_report["filename"] in owner_filenames
    assert legacy.name in owner_filenames
    assert customer_report["filename"] in admin_filenames
    assert legacy.name in admin_filenames
    assert any(item["filename"] == legacy.name and item["legacy"] is True for item in owner_reports)


def test_ownerless_legacy_reports_are_hidden_from_normal_users(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    user = auth.create_user("Customer", "legacy-hidden@example.com", "temporary-password", "user")
    legacy = tmp_path / "assurebench_report_run_legacy_20260511010101.json"
    legacy.write_text("{}", encoding="utf-8")

    visible_reports = reports.list_exported_reports(user)

    assert visible_reports == []


def test_user_cannot_resolve_or_delete_another_users_report(tmp_path, monkeypatch):
    monkeypatch.setattr(reports, "_get_reports_dir", lambda: tmp_path)
    user_a = auth.create_user("Customer A", "secure-a@example.com", "temporary-password", "user")
    user_b = auth.create_user("Customer B", "secure-b@example.com", "temporary-password", "user")
    report_b = reports.export_json_report(_run_result("run_secure_b"), user_b)

    with pytest.raises(FileNotFoundError):
        reports.get_exported_report_path(report_b["filename"], user_a)
    with pytest.raises(FileNotFoundError):
        reports.delete_exported_report(report_b["filename"], user_a)
