from pathlib import Path

from app import ml_risk
from train_model import FEATURE_COLUMNS, MIN_TRAINING_EXAMPLES, load_training_data


def _evaluation(**overrides):
    values = {category: 0.0 for category in ml_risk.DEFAULT_FEATURE_COLUMNS}
    values.update(overrides)
    return values


def _detail(index, category="hallucination", risky=False, severity="medium"):
    return {
        "test_id": f"{category}_{index:03d}",
        "name": f"{category} test {index}",
        "category": category,
        "severity": severity,
        "status_code": 200,
        "risk_score": 1.0 if risky else 0.0,
        "risky": risky,
        "error": None,
    }


def _details(total, risky_categories=None, severity="medium"):
    risky_categories = risky_categories or []
    rows = []
    for index in range(total):
        if index < len(risky_categories):
            rows.append(_detail(index, risky_categories[index], risky=True, severity=severity))
        else:
            rows.append(_detail(index, "format_reliability", risky=False, severity="low"))
    return rows


class FakeModel:
    def __init__(self, confidence):
        self.confidence = confidence

    def predict_proba(self, features):
        return [[1.0 - self.confidence, self.confidence]]


def _patch_model(monkeypatch, confidence):
    monkeypatch.setattr(
        ml_risk,
        "_load_model_bundle",
        lambda: {"model": FakeModel(confidence), "feature_columns": ml_risk.DEFAULT_FEATURE_COLUMNS},
    )


def test_compute_risk_score_range():
    evaluation = {
        "prompt_injection": 0.2,
        "privacy_leakage": 0.1,
        "hallucination": 0.0,
        "unsafe_output": 0.0,
        "format_reliability": 0.0,
        "latency": 0.3,
    }
    score = ml_risk.compute_risk_score(evaluation)
    assert 0.0 <= score <= 100.0


def test_compute_risk_score_uses_saved_model_bundle(monkeypatch):
    _patch_model(monkeypatch, 0.75)

    high_confidence_score = ml_risk.compute_risk_score({"prompt_injection": 1.0})

    _patch_model(monkeypatch, 0.10)
    low_confidence_score = ml_risk.compute_risk_score({"prompt_injection": 1.0})

    assert high_confidence_score > low_confidence_score


def test_zero_risky_out_of_thirty_is_low_risk(monkeypatch):
    _patch_model(monkeypatch, 0.80)

    score = ml_risk.compute_risk_score(_evaluation(), _details(30))

    assert score < 35


def test_six_risky_out_of_thirty_is_elevated_not_maximum(monkeypatch):
    _patch_model(monkeypatch, 0.90)
    risky_categories = [
        "prompt_injection",
        "privacy_leakage",
        "hallucination",
        "unsafe_output",
        "format_reliability",
        "bias",
    ]
    evaluation = _evaluation(**{category: 1.0 for category in risky_categories})

    score = ml_risk.compute_risk_score(evaluation, _details(30, risky_categories, severity="high"))

    assert 60 <= score <= 75


def test_twenty_plus_risky_out_of_thirty_is_high_risk(monkeypatch):
    _patch_model(monkeypatch, 0.90)
    risky_categories = [
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
    ] * 3
    evaluation = _evaluation(**{category: 1.0 for category in ml_risk.DEFAULT_FEATURE_COLUMNS})

    score = ml_risk.compute_risk_score(evaluation, _details(30, risky_categories[:22], severity="medium"))

    assert score >= 70


def test_repeated_severe_critical_failures_can_reach_high_risk(monkeypatch):
    _patch_model(monkeypatch, 0.95)
    risky_categories = ["privacy_leakage", "unsafe_output", "data_exfiltration"] * 2
    evaluation = _evaluation(privacy_leakage=1.0, unsafe_output=1.0, data_exfiltration=1.0)

    score = ml_risk.compute_risk_score(evaluation, _details(30, risky_categories, severity="critical"))

    assert score >= 70


def test_training_csv_has_200_plus_examples():
    data_path = Path(__file__).resolve().parents[2] / "datasets" / "risk_training_data.csv"
    X, y = load_training_data(data_path)

    assert len(X) >= 200
    assert len(y) == len(X)
    assert len(X) == MIN_TRAINING_EXAMPLES
    assert len(X[0]) == len(FEATURE_COLUMNS)
