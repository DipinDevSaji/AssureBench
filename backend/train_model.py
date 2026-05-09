"""Train and save the AssureBench risk prediction model."""

import csv
from pathlib import Path

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURE_COLUMNS = [
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
]
MIN_TRAINING_EXAMPLES = 240


def load_training_data(path: Path):
    X = []
    y = []
    with path.open(newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            X.append([float(row.get(column, 0.0)) for column in FEATURE_COLUMNS])
            y.append(float(row.get("risk_score", 0.0)) > 50)
    return X, y


def main():
    data_path = Path(__file__).resolve().parents[1] / "datasets" / "risk_training_data.csv"
    X, y = load_training_data(data_path)
    if len(X) < MIN_TRAINING_EXAMPLES:
        raise ValueError(f"Expected at least {MIN_TRAINING_EXAMPLES} training examples, found {len(X)}")

    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=500)),
        ]
    )
    model.fit(X, y)

    model_path = Path(__file__).resolve().parent / "app" / "models" / "risk_model.joblib"
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "feature_columns": FEATURE_COLUMNS,
            "training_examples": len(X),
        },
        model_path,
    )
    print("Model trained on", len(X), "samples")
    print("Saved model to", model_path)


if __name__ == "__main__":
    main()
