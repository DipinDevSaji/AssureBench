"""Builds developer remediation briefs from AssureBench run results."""

import json
from datetime import datetime
from typing import Dict, List, Optional

from . import analysis, reports


DEVELOPER_PROMPT = (
    "Review this AssureBench risk report and propose safe code/configuration changes. "
    "Do not make changes automatically. Identify root causes, suggest mitigations, "
    "and list tests that should be added."
)


def _is_item_risky(item: Dict) -> bool:
    failed_status = item.get("status_code") is not None and not (200 <= int(item.get("status_code")) < 300)
    return bool(item.get("risky") or float(item.get("risk_score") or 0) > 0 or failed_status or item.get("error"))


def _response_text(item: Dict) -> str:
    response_json = item.get("response_json")
    if isinstance(response_json, dict):
        for key in ("response", "detail", "result"):
            if response_json.get(key):
                return str(response_json[key])
    return str(item.get("response_text") or item.get("response") or item.get("error") or "")


def _summarize_response(text: str, limit: int = 240) -> str:
    redacted = analysis.redact_sensitive_text(text).replace("\n", " ").strip()
    if len(redacted) <= limit:
        return redacted
    return redacted[: limit - 3].rstrip() + "..."


def _mitigation_for_category(category: str) -> Dict:
    rule = reports.RECOMMENDATION_RULES.get(category) or {}
    return {
        "title": rule.get("title") or category.replace("_", " ").title(),
        "items": rule.get("items") or ["Review the risky behavior and add targeted safeguards and regression tests."],
    }


def _developer_actions(category: str) -> List[str]:
    mitigation = _mitigation_for_category(category)
    return [
        f"Review root cause for {mitigation['title']} findings.",
        *mitigation["items"][:3],
        f"Add regression tests for {mitigation['title']} prompts that failed or were risky.",
    ]


def build_remediation_payload(run_result: Dict) -> Dict:
    summary = run_result.get("summary") or {}
    details = run_result.get("details") or []
    risky_tests = [item for item in details if _is_item_risky(item)]
    risky_categories = sorted({item.get("category") or item.get("test_id") or "uncategorized" for item in risky_tests})

    failed_tests = []
    for item in risky_tests:
        category = item.get("category") or item.get("test_id") or "uncategorized"
        mitigation = _mitigation_for_category(category)
        prompt = analysis.redact_sensitive_text(item.get("prompt") or "")
        expected_behavior = analysis.redact_sensitive_text(item.get("expected_behavior") or "")
        failed_tests.append(
            {
                "test_id": item.get("test_id"),
                "name": item.get("name"),
                "category": category,
                "severity": item.get("severity"),
                "prompt": prompt,
                "response_summary": _summarize_response(_response_text(item)),
                "expected_behavior": expected_behavior,
                "recommended_mitigation": mitigation["items"][0],
                "developer_action_items": _developer_actions(category),
            }
        )

    fixes = []
    for category in risky_categories:
        mitigation = _mitigation_for_category(category)
        fixes.append(
            {
                "category": category,
                "title": mitigation["title"],
                "actions": _developer_actions(category),
            }
        )

    return {
        "run_id": run_result.get("run_id"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "risk_score": summary.get("risk_score") or run_result.get("risk_score"),
        "risk_level": summary.get("risk_level") or run_result.get("risk_level"),
        "risky_categories": risky_categories,
        "failed_or_risky_tests": failed_tests,
        "suggested_fixes": fixes,
        "validation_checklist": [
            "Re-run the full AssureBench suite after remediation.",
            "Add regression tests for every failed or risky prompt.",
            "Review logs to confirm no secrets or personal data are exposed.",
            "Confirm refusal behavior remains appropriate for harmful prompts and helpful for benign prompts.",
        ],
        "suggested_developer_prompt": DEVELOPER_PROMPT,
    }


def build_markdown(payload: Dict) -> str:
    lines = [
        "# AssureBench Developer Remediation Brief",
        "",
        "## Summary",
        "",
        f"- Run ID: `{payload.get('run_id')}`",
        f"- Generated at: {payload.get('generated_at')}",
        f"- Risk score: {payload.get('risk_score')}",
        f"- Risk level: {payload.get('risk_level')}",
        f"- Risky categories: {', '.join(payload.get('risky_categories') or ['None'])}",
        "",
        "## Risk Categories",
        "",
    ]

    if payload.get("risky_categories"):
        lines.extend([f"- {category.replace('_', ' ').title()}" for category in payload["risky_categories"]])
    else:
        lines.append("- None")

    lines.extend(["", "## Failed/Risky Tests", ""])
    if payload.get("failed_or_risky_tests"):
        for item in payload["failed_or_risky_tests"]:
            lines.extend(
                [
                    f"### {item.get('test_id')} - {item.get('name')}",
                    "",
                    f"- Category: {item.get('category')}",
                    f"- Severity: {item.get('severity')}",
                    f"- Prompt: {item.get('prompt')}",
                    f"- Response summary: {item.get('response_summary')}",
                    f"- Expected behavior: {item.get('expected_behavior')}",
                    f"- Recommended mitigation: {item.get('recommended_mitigation')}",
                    "",
                ]
            )
    else:
        lines.append("No failed or risky tests were found.")

    lines.extend(["", "## Suggested Fixes", ""])
    for fix in payload.get("suggested_fixes") or []:
        lines.append(f"### {fix.get('title')}")
        lines.extend([f"- {action}" for action in fix.get("actions") or []])
        lines.append("")
    if not payload.get("suggested_fixes"):
        lines.append("No remediation fixes are needed for this run.")

    lines.extend(["", "## Validation Checklist", ""])
    lines.extend([f"- {item}" for item in payload.get("validation_checklist") or []])

    lines.extend(["", "## Suggested Developer Prompt", "", f"> {payload.get('suggested_developer_prompt')}"])
    return "\n".join(lines).strip() + "\n"


def build_package(run_result: Dict, output_format: str = "markdown") -> Dict:
    payload = build_remediation_payload(run_result)
    if output_format == "json":
        content = json.dumps(payload, indent=2)
    else:
        output_format = "markdown"
        content = build_markdown(payload)
    return {
        "run_id": payload.get("run_id"),
        "format": output_format,
        "content": content,
    }


def build_remediation_summary(run_result: Dict) -> Optional[Dict]:
    payload = build_remediation_payload(run_result)
    if not payload["failed_or_risky_tests"]:
        return None
    return {
        "generated_at": payload["generated_at"],
        "risky_categories": payload["risky_categories"],
        "failed_or_risky_count": len(payload["failed_or_risky_tests"]),
        "suggested_developer_prompt": payload["suggested_developer_prompt"],
    }
