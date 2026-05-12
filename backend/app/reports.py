"""Builds structured reports for AI assurance runs."""

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


DETAILED_MITIGATION_PLANS = {
    "prompt_injection": {
        "why": "Prompt injection can cause a chatbot to ignore instruction hierarchy, reveal hidden prompts, or follow attacker-controlled content.",
        "steps": [
            "Separate system, developer, retrieved, and user-controlled content before constructing prompts.",
            "Add detection for instruction override attempts, hidden prompt requests, and role-confusion patterns.",
            "Add refusal templates for requests that ask the model to reveal prompts, secrets, or policies.",
        ],
        "checklist": [
            "Known prompt-injection tests are refused without leaking hidden context.",
            "Retrieved documents are not treated as instructions.",
            "System and developer instructions are never returned.",
        ],
        "owner": "Security / ML",
        "priority": "High",
        "effort": "Medium",
    },
    "privacy_leakage": {
        "why": "Privacy leakage can expose personal data, credentials, or customer-sensitive content.",
        "steps": [
            "Add pre-response scanning for emails, secrets, API keys, credentials, and personal data.",
            "Redact or block responses that contain sensitive values unless explicitly authorized.",
            "Limit retrieved context and tool outputs to the minimum data required.",
        ],
        "checklist": [
            "PII examples are redacted or refused.",
            "Secrets and API-key-like strings are blocked.",
            "Logs avoid storing raw sensitive responses.",
        ],
        "owner": "Security / Backend",
        "priority": "High",
        "effort": "High",
    },
    "hallucination": {
        "why": "Hallucination can produce unsupported claims with false confidence and mislead users.",
        "steps": [
            "Require uncertainty language when evidence is missing.",
            "Add grounding checks for factual claims and citations.",
            "Penalize confident claims that cannot be traced to evidence.",
        ],
        "checklist": [
            "Unknown factual prompts produce uncertainty.",
            "Citations point to available evidence.",
            "Unsupported confident claims are flagged.",
        ],
        "owner": "ML / Product",
        "priority": "Medium",
        "effort": "Medium",
    },
    "unsafe_output": {
        "why": "Unsafe outputs can provide harmful, illegal, or security-bypass guidance.",
        "steps": [
            "Add a safety classifier before and after generation.",
            "Use refusal templates for illegal activity and harmful instructions.",
            "Log unsafe attempts with review-safe metadata.",
        ],
        "checklist": [
            "Unsafe instruction prompts are refused.",
            "Responses avoid actionable harmful steps.",
            "Unsafe attempts are visible in review logs.",
        ],
        "owner": "Security / Backend",
        "priority": "High",
        "effort": "Medium",
    },
    "format_reliability": {
        "why": "Format failures break downstream integrations that expect structured output.",
        "steps": [
            "Validate structured responses against a JSON schema.",
            "Retry or repair invalid responses with a constrained format prompt.",
            "Add tests for required keys and invalid fallback strings.",
        ],
        "checklist": [
            "Required keys are present.",
            "Invalid JSON strings are repaired or retried.",
            "Schema failures are reported clearly.",
        ],
        "owner": "Backend / ML",
        "priority": "Medium",
        "effort": "Low",
    },
    "bias": {
        "why": "Bias can produce discriminatory or stereotyping responses about protected classes.",
        "steps": [
            "Add protected-class test prompts.",
            "Require task-relevant evidence rather than demographic generalizations.",
            "Track bias regressions during prompt, model, or policy changes.",
        ],
        "checklist": [
            "Protected-class prompts avoid stereotypes.",
            "Advice is based on relevant facts.",
            "Bias checks are included in release validation.",
        ],
        "owner": "ML / Product",
        "priority": "High",
        "effort": "Medium",
    },
    "jailbreak": {
        "why": "Jailbreak attempts try to bypass safety rules through role-play, coercion, or instruction attacks.",
        "steps": [
            "Detect role-play, no-rules personas, coercive framing, and policy override language.",
            "Keep system policy isolated and reinforce instruction hierarchy.",
            "Maintain regression tests for known jailbreak patterns.",
        ],
        "checklist": [
            "Role-play bypass prompts do not override policy.",
            "Forbidden requests remain refused after rephrasing.",
            "Jailbreak variants are tracked across releases.",
        ],
        "owner": "Security / ML",
        "priority": "High",
        "effort": "Medium",
    },
    "data_exfiltration": {
        "why": "Data exfiltration attempts try to extract logs, environment variables, secrets, or hidden tool outputs.",
        "steps": [
            "Apply least-privilege access to retrieved context, tools, logs, and metadata.",
            "Block outputs that mention internal files, secrets, or hidden tool data.",
            "Audit tool outputs and retrieved context before model use.",
        ],
        "checklist": [
            "Environment and log extraction prompts are refused.",
            "Tool outputs are filtered before model use.",
            "Internal metadata is never exposed.",
        ],
        "owner": "Security / Backend",
        "priority": "High",
        "effort": "High",
    },
    "over_refusal": {
        "why": "Over-refusal blocks safe user requests and reduces usefulness.",
        "steps": [
            "Separate benign requests from genuinely unsafe requests in refusal policy.",
            "Add examples that reward helpful answers to low-risk prompts.",
            "Tune refusal templates to offer safe alternatives.",
        ],
        "checklist": [
            "Benign prompts are answered.",
            "Safety refusals are limited to unsafe content.",
            "Safe alternatives are offered where possible.",
        ],
        "owner": "Product / ML",
        "priority": "Medium",
        "effort": "Medium",
    },
    "latency": {
        "why": "High latency damages user experience and can indicate slow retrieval, tools, routing, or infrastructure bottlenecks.",
        "steps": [
            "Track p95 latency by endpoint, category, and run.",
            "Profile slow retrieval, tool calls, model selection, and network paths.",
            "Add timeouts, caching, streaming, or faster fallback routes.",
        ],
        "checklist": [
            "p95 latency stays within target.",
            "Slow categories are visible in reports.",
            "Timeout and fallback behavior is tested.",
        ],
        "owner": "Backend / Platform",
        "priority": "Medium",
        "effort": "Medium",
    },
}


RECOMMENDATION_RULES = {
    "prompt_injection": {
        "title": "Prompt Injection",
        "priority": "High",
        "effort": "Medium",
        "items": [
            "Separate system instructions from user-controlled content.",
            "Add prompt-injection detection for instruction override attempts.",
            "Add refusal rules for requests asking to reveal hidden prompts or secrets.",
        ],
    },
    "privacy_leakage": {
        "title": "Privacy Leakage",
        "priority": "High",
        "effort": "High",
        "items": [
            "Add PII and secret redaction before responses are returned.",
            "Block outputs that contain emails, passwords, API keys, or personal data.",
            "Add response filtering before sending output to the user.",
        ],
    },
    "hallucination": {
        "title": "Hallucination",
        "priority": "Medium",
        "effort": "Medium",
        "items": [
            "Require uncertainty handling when evidence is missing.",
            "Add retrieval grounding or citation checks for factual claims.",
            "Penalise unsupported confident claims in evaluation.",
        ],
    },
    "unsafe_output": {
        "title": "Unsafe Output",
        "priority": "High",
        "effort": "Medium",
        "items": [
            "Add safety classifiers for harmful instructions.",
            "Refuse requests involving bypassing security controls or illegal activity.",
            "Log unsafe requests for review.",
        ],
    },
    "format_reliability": {
        "title": "Format Reliability",
        "priority": "Medium",
        "effort": "Low",
        "items": [
            "Validate structured outputs against a JSON schema.",
            "Retry or repair responses when required format is invalid.",
        ],
    },
    "bias": {
        "title": "Bias",
        "priority": "High",
        "effort": "Medium",
        "items": [
            "Add protected-class bias checks to prompt and response evaluation.",
            "Require model responses to use job-relevant or evidence-based criteria.",
            "Review biased outputs and tune prompts or policies to avoid stereotyping.",
        ],
    },
    "over_refusal": {
        "title": "Over Refusal",
        "priority": "Medium",
        "effort": "Medium",
        "items": [
            "Separate benign requests from genuinely unsafe requests in refusal policy.",
            "Add tests that reward safe, helpful answers to low-risk user questions.",
            "Review refusal templates so caution does not block allowed assistance.",
        ],
    },
    "jailbreak": {
        "title": "Jailbreak",
        "priority": "High",
        "effort": "Medium",
        "items": [
            "Detect role-play, coercion, and instruction-hierarchy override attempts.",
            "Keep safety policy and system instructions isolated from user content.",
            "Add regression tests for known jailbreak patterns and variants.",
        ],
    },
    "data_exfiltration": {
        "title": "Data Exfiltration",
        "priority": "High",
        "effort": "High",
        "items": [
            "Block responses that expose environment variables, logs, secrets, or hidden metadata.",
            "Apply least-privilege controls to tool outputs and retrieved context.",
            "Audit prompts and responses for attempts to extract internal data.",
        ],
    },
    "latency": {
        "title": "Latency",
        "priority": "Medium",
        "effort": "Medium",
        "items": [
            "Track average and p95 response latency across assurance runs.",
            "Set alerts when aggregate latency exceeds the 1000 ms threshold.",
            "Optimise slow retrieval, tool calls, or model routes before production use.",
        ],
    },
}

MAJOR_CATEGORIES = [
    "prompt_injection",
    "privacy_leakage",
    "hallucination",
    "unsafe_output",
    "format_reliability",
    "latency",
]


def build_report(endpoint_url: str, results: List[Dict], evaluation: Dict[str, float], risk_score: float) -> Dict:
    major_evaluation = {category: evaluation.get(category, 0.0) for category in MAJOR_CATEGORIES}
    extended_evaluation = {
        category: value
        for category, value in evaluation.items()
        if category not in MAJOR_CATEGORIES
    }

    return {
        "run_id": f"run_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "endpoint_url": endpoint_url,
        "summary": {
            "risk_score": risk_score,
            "risk_level": get_risk_level(risk_score),
            "evaluation": evaluation,
            "major_evaluation": major_evaluation,
            "extended_evaluation": extended_evaluation,
            "test_count": len(results),
        },
        "details": results,
    }


def build_recommendations(evaluation: Dict[str, float]) -> List[Dict]:
    recommendations = []
    for key, rule in RECOMMENDATION_RULES.items():
        if float(evaluation.get(key, 0) or 0) > 0:
            recommendations.append({"category": key, **rule, "details": DETAILED_MITIGATION_PLANS.get(key)})
    return recommendations


def get_risk_level(risk_score: float) -> str:
    if risk_score >= 70:
        return "high"
    if risk_score >= 35:
        return "elevated"
    return "low"


def get_failed_or_risky_tests(details: List[Dict], evaluation: Dict[str, float]) -> List[Dict]:
    failed_or_risky = []
    for item in details:
        status_code = item.get("status_code")
        failed_status = status_code is not None and (status_code < 200 or status_code >= 300)
        item_risky = bool(item.get("risky")) or float(item.get("risk_score") or 0) > 0
        if item.get("error") or failed_status or item_risky:
            failed_or_risky.append(item)
    return failed_or_risky


def _get_reports_dir() -> Path:
    data_dir = os.getenv("ASSUREBENCH_DATA_DIR")
    if data_dir:
        reports_dir = Path(data_dir).expanduser().resolve() / "reports"
    else:
        reports_dir = Path(__file__).resolve().parents[2] / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir


def _is_privileged_user(user: Optional[Dict]) -> bool:
    return bool(user and user.get("role") in {"owner", "admin"})


def _owner_metadata(user: Optional[Dict]) -> Dict:
    if not user:
        return {}
    return {
        "owner_user_id": user.get("id"),
        "owner_email": user.get("email"),
        "owner_role": user.get("role"),
    }


def _get_user_reports_dir(user: Optional[Dict]) -> Path:
    if not user or not user.get("id"):
        return _get_reports_dir()
    reports_dir = _get_reports_dir() / str(user["id"])
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir


def _public_report_path(path: Path) -> str:
    try:
        relative_path = path.relative_to(_get_reports_dir())
        return str(Path("reports") / relative_path).replace("\\", "/")
    except ValueError:
        return f"reports/{path.name}"


def _iter_report_paths_for_user(user: Optional[Dict]) -> List[Path]:
    reports_dir = _get_reports_dir()
    if _is_privileged_user(user):
        roots = [reports_dir, *[path for path in reports_dir.iterdir() if path.is_dir()]]
    elif user:
        user_dir = reports_dir / str(user["id"])
        roots = [user_dir] if user_dir.exists() else []
    else:
        roots = []

    report_paths = []
    for root in roots:
        report_paths.extend(
            path
            for path in root.glob("assurebench_report_*.*")
            if path.is_file() and path.suffix.lower() in {".json", ".pdf"}
        )
    return report_paths


def _get_run_metadata(run_result: Dict) -> Dict:
    summary = run_result.get("summary") or {}
    risk_score = float(summary.get("risk_score") or 0)
    generated_at = datetime.utcnow().isoformat() + "Z"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    run_id = str(run_result.get("run_id") or f"run_{timestamp}")
    safe_run_id = re.sub(r"[^A-Za-z0-9_-]+", "_", run_id).strip("_")

    return {
        "summary": summary,
        "evaluation": summary.get("evaluation") or {},
        "details": run_result.get("details") or [],
        "risk_score": risk_score,
        "risk_level": summary.get("risk_level") or run_result.get("risk_level") or get_risk_level(risk_score),
        "generated_at": generated_at,
        "timestamp": timestamp,
        "run_id": run_id,
        "safe_run_id": safe_run_id,
        "endpoint_url": run_result.get("endpoint_url"),
    }


def _get_category_breakdown(details: List[Dict], evaluation: Dict[str, float]) -> List[Dict]:
    grouped = {}
    for item in details:
        category = item.get("category") or item.get("test_id") or "uncategorized"
        grouped.setdefault(category, []).append(item)

    breakdown = []
    for category, items in grouped.items():
        total = len(items)
        risky_count = sum(
            1
            for item in items
            if bool(item.get("risky")) or float(item.get("risk_score") or 0) > 0
        )
        passed_count = max(0, total - risky_count)
        breakdown.append(
            {
                "category": category,
                "total": total,
                "risky_count": risky_count,
                "passed_count": passed_count,
                "risk_percentage": round((risky_count / total) * 100) if total else 0,
            }
        )

    return sorted(breakdown, key=lambda item: item["category"])


def _truncate(value, limit=100) -> str:
    text = str(value or "")
    return text if len(text) <= limit else text[: limit - 3] + "..."


def _paragraph(value, style):
    text = str(value or "")
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(text, style)


def _parse_run_id_from_filename(filename: str) -> str:
    match = re.match(r"assurebench_report_(.+)_\d{14}\.(json|pdf)$", filename)
    return match.group(1) if match else ""


def _get_file_generated_at(path: Path) -> str:
    return datetime.utcfromtimestamp(path.stat().st_mtime).isoformat() + "Z"


def _read_json_report_metadata(path: Path) -> Dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    summary = data.get("summary") or {}
    total_tests = int(summary.get("test_count") or len(data.get("details") or []))
    risky_tests = len(data.get("failed_or_risky_tests") or [])
    owner = data.get("owner") or {}

    return {
        "run_id": data.get("run_id") or _parse_run_id_from_filename(path.name),
        "risk_score": data.get("risk_score"),
        "risk_level": data.get("risk_level"),
        "total_tests": total_tests,
        "passed_tests": max(0, total_tests - risky_tests),
        "risky_tests": risky_tests,
        "owner_user_id": owner.get("user_id") or data.get("owner_user_id"),
        "owner_email": owner.get("email") or data.get("owner_email"),
        "legacy": not bool(owner or data.get("owner_user_id") or data.get("owner_email")),
    }


def list_exported_reports(current_user: Optional[Dict] = None) -> List[Dict]:
    report_paths = _iter_report_paths_for_user(current_user)
    metadata_by_run_id = {}
    for path in report_paths:
        if path.suffix.lower() != ".json":
            continue

        try:
            metadata = _read_json_report_metadata(path)
            if metadata.get("run_id"):
                metadata_by_run_id[(path.parent, metadata["run_id"])] = metadata
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            continue

    reports = []
    for path in sorted(report_paths, key=lambda item: item.stat().st_mtime, reverse=True):
        run_id = _parse_run_id_from_filename(path.name)
        metadata = metadata_by_run_id.get((path.parent, run_id), {})

        report = {
            "filename": path.name,
            "file_type": path.suffix.lower().lstrip("."),
            "created_at": _get_file_generated_at(path),
            "size_bytes": path.stat().st_size,
            "download_url": f"/reports/{path.name}",
            "run_id": metadata.get("run_id") or run_id or None,
            "risk_score": metadata.get("risk_score"),
            "risk_level": metadata.get("risk_level"),
            "total_tests": metadata.get("total_tests"),
            "passed_tests": metadata.get("passed_tests"),
            "risky_tests": metadata.get("risky_tests"),
            "owner_user_id": metadata.get("owner_user_id"),
            "owner_email": metadata.get("owner_email"),
            "legacy": bool(metadata.get("legacy")) or path.parent == _get_reports_dir(),
        }

        reports.append(report)

    return reports


def get_exported_report_path(filename: str, current_user: Optional[Dict] = None) -> Path:
    if "/" in filename or "\\" in filename or ".." in filename or Path(filename).name != filename:
        raise ValueError("Invalid report filename")

    candidate_paths = [path for path in _iter_report_paths_for_user(current_user) if path.name == filename]
    if not candidate_paths:
        raise FileNotFoundError(filename)

    path = candidate_paths[0]
    if not path.exists() or not path.is_file() or path.suffix.lower() not in {".json", ".pdf"}:
        raise FileNotFoundError(filename)

    return path


def delete_exported_report(filename: str, current_user: Optional[Dict] = None) -> Dict:
    path = get_exported_report_path(filename, current_user)
    path.unlink()
    return {"message": "Report deleted successfully", "filename": filename}


def export_json_report(run_result: Dict, current_user: Optional[Dict] = None) -> Dict:
    metadata = _get_run_metadata(run_result)
    summary = metadata["summary"]
    evaluation = metadata["evaluation"]
    details = metadata["details"]
    owner = _owner_metadata(current_user)

    report = {
        "run_id": metadata["run_id"],
        "endpoint_url": metadata["endpoint_url"],
        "generated_at": metadata["generated_at"],
        "risk_score": metadata["risk_score"],
        "risk_level": metadata["risk_level"],
        "owner": {
            "user_id": owner.get("owner_user_id"),
            "email": owner.get("owner_email"),
            "role": owner.get("owner_role"),
        },
        "summary": summary,
        "recommendations": run_result.get("recommendations") or build_recommendations(evaluation),
        "details": details,
        "failed_or_risky_tests": get_failed_or_risky_tests(details, evaluation),
    }
    if summary.get("external_analysis"):
        report["external_analysis"] = summary["external_analysis"]

    filename = f"assurebench_report_{metadata['safe_run_id']}_{metadata['timestamp']}.json"
    path = _get_user_reports_dir(current_user) / filename

    with path.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=2)

    return {
        "message": "Report exported successfully",
        "filename": filename,
        "path": _public_report_path(path),
    }


def export_pdf_report(run_result: Dict, current_user: Optional[Dict] = None) -> Dict:
    metadata = _get_run_metadata(run_result)
    summary = metadata["summary"]
    evaluation = metadata["evaluation"]
    details = metadata["details"]
    failed_or_risky = get_failed_or_risky_tests(details, evaluation)
    total_tests = int(summary.get("test_count") or len(details))
    risky_tests = len(failed_or_risky)
    passed_tests = max(0, total_tests - risky_tests)
    pass_rate = round((passed_tests / total_tests) * 100) if total_tests else 0
    recommendations = run_result.get("recommendations") or build_recommendations(evaluation)
    category_breakdown = _get_category_breakdown(details, evaluation)

    filename = f"assurebench_report_{metadata['safe_run_id']}_{metadata['timestamp']}.pdf"
    path = _get_user_reports_dir(current_user) / filename

    styles = getSampleStyleSheet()
    risky_header_style = ParagraphStyle(
        "RiskyHeader",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    risky_cell_style = ParagraphStyle(
        "RiskyCell",
        parent=styles["BodyText"],
        fontSize=7.5,
        leading=9.5,
        wordWrap="CJK",
    )
    doc = SimpleDocTemplate(
        str(path),
        pagesize=landscape(A4),
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.45 * inch,
    )
    story = [
        Paragraph("AssureBench AI Assurance Report", styles["Title"]),
        Spacer(1, 12),
    ]

    summary_rows = [
        ["Generated", metadata["generated_at"]],
        ["Run ID", metadata["run_id"]],
        ["Endpoint URL", metadata["endpoint_url"] or "Not provided"],
        ["Overall risk score", f"{metadata['risk_score']:.1f}"],
        ["Risk level", metadata["risk_level"]],
        ["Total tests", str(total_tests)],
        ["Passed tests", str(passed_tests)],
        ["Risky tests", str(risky_tests)],
        ["Pass rate", f"{pass_rate}%"],
    ]
    if summary.get("external_analysis"):
        external = summary["external_analysis"]
        summary_rows.extend(
            [
                ["External AI analysis", f"{external.get('provider', 'unknown')} ({external.get('analyzed_tests', 0)} tests)"],
                ["External analysis findings", f"High: {external.get('high_findings', 0)} / Elevated: {external.get('elevated_findings', 0)}"],
            ]
        )
    summary_table = Table(summary_rows, colWidths=[1.7 * inch, 5.0 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef3f8")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7d0dc")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([summary_table, Spacer(1, 16), Paragraph("Category Breakdown", styles["Heading2"])])

    category_rows = [["Category", "Total", "Passed", "Risky", "Risk %"]]
    category_rows.extend(
        [
            [
                item["category"],
                str(item["total"]),
                str(item["passed_count"]),
                str(item["risky_count"]),
                f"{item['risk_percentage']}%",
            ]
            for item in category_breakdown
        ]
    )
    category_table = Table(category_rows, colWidths=[2.2 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch])
    category_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d6f8f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7d0dc")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([category_table, Spacer(1, 16), Paragraph("Recommendations", styles["Heading2"])])

    if recommendations:
        for recommendation in recommendations:
            story.append(Paragraph(str(recommendation.get("title") or recommendation.get("category")), styles["Heading3"]))
            for item in recommendation.get("items", []):
                story.append(Paragraph(f"- {item}", styles["BodyText"]))
            details = recommendation.get("details") or {}
            if details:
                story.append(Paragraph(f"Why it matters: {details.get('why', '')}", styles["BodyText"]))
                story.append(
                    Paragraph(
                        f"Owner: {details.get('owner', '--')} | Priority: {details.get('priority', recommendation.get('priority', '--'))} | Effort: {details.get('effort', recommendation.get('effort', '--'))}",
                        styles["BodyText"],
                    )
                )
            story.append(Spacer(1, 8))
    else:
        story.append(Paragraph("No category-specific recommendations were triggered.", styles["BodyText"]))

    story.extend([PageBreak(), Paragraph("Failed or Risky Tests", styles["Heading2"]), Spacer(1, 8)])
    risky_rows = [[_paragraph("Status", risky_header_style), _paragraph("Category", risky_header_style), _paragraph("Test", risky_header_style), _paragraph("Prompt", risky_header_style), _paragraph("Latency", risky_header_style)]]
    risky_rows.extend(
        [
            [
                _paragraph("Risky" if not item.get("error") else "Failed", risky_cell_style),
                _paragraph(_truncate(item.get("category") or "", 32), risky_cell_style),
                _paragraph(_truncate(item.get("name") or item.get("test_id"), 60), risky_cell_style),
                _paragraph(_truncate(item.get("prompt"), 120), risky_cell_style),
                _paragraph(f"{item.get('latency_ms')} ms" if item.get("latency_ms") is not None else "--", risky_cell_style),
            ]
            for item in failed_or_risky
        ]
    )
    if len(risky_rows) == 1:
        risky_rows.append(
            [
                _paragraph("None", risky_cell_style),
                _paragraph("", risky_cell_style),
                _paragraph("No failed or risky tests", risky_cell_style),
                _paragraph("", risky_cell_style),
                _paragraph("", risky_cell_style),
            ]
        )

    risky_table = Table(
        risky_rows,
        colWidths=[0.75 * inch, 1.35 * inch, 2.0 * inch, 5.25 * inch, 0.8 * inch],
        repeatRows=1,
    )
    risky_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#a33a2e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7d0dc")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(risky_table)

    doc.build(story)

    return {
        "message": "PDF report exported successfully",
        "filename": filename,
        "path": _public_report_path(path),
    }
