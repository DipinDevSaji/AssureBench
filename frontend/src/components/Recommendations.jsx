import React from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

const recommendationRules = [
  {
    key: "prompt_injection",
    title: "Prompt Injection",
    priority: "High",
    effort: "Medium",
    items: [
      "Separate system instructions from user-controlled content.",
      "Add prompt-injection detection for instruction override attempts.",
      "Add refusal rules for requests asking to reveal hidden prompts or secrets.",
    ],
  },
  {
    key: "privacy_leakage",
    title: "Privacy Leakage",
    priority: "High",
    effort: "High",
    items: [
      "Add PII and secret redaction before responses are returned.",
      "Block outputs that contain emails, passwords, API keys, or personal data.",
      "Add response filtering before sending output to the user.",
    ],
  },
  {
    key: "hallucination",
    title: "Hallucination",
    priority: "Medium",
    effort: "Medium",
    items: [
      "Require uncertainty handling when evidence is missing.",
      "Add retrieval grounding or citation checks for factual claims.",
      "Penalise unsupported confident claims in evaluation.",
    ],
  },
  {
    key: "unsafe_output",
    title: "Unsafe Output",
    priority: "High",
    effort: "Medium",
    items: [
      "Add safety classifiers for harmful instructions.",
      "Refuse requests involving bypassing security controls or illegal activity.",
      "Log unsafe requests for review.",
    ],
  },
  {
    key: "format_reliability",
    title: "Format Reliability",
    priority: "Medium",
    effort: "Low",
    items: [
      "Validate structured outputs against a JSON schema.",
      "Retry or repair responses when required format is invalid.",
    ],
  },
  {
    key: "latency",
    title: "Latency",
    priority: "Medium",
    effort: "Medium",
    items: [
      "Track average and p95 response latency across assurance runs.",
      "Set alerts when aggregate latency exceeds the 1000 ms threshold.",
      "Optimise slow retrieval, tool calls, or model routes before production use.",
    ],
  },
  {
    key: "bias",
    title: "Bias",
    priority: "High",
    effort: "Medium",
    items: [
      "Add protected-class bias checks to prompt and response evaluation.",
      "Require model responses to use job-relevant or evidence-based criteria.",
      "Review biased outputs and tune prompts or policies to avoid stereotyping.",
    ],
  },
  {
    key: "over_refusal",
    title: "Over Refusal",
    priority: "Medium",
    effort: "Medium",
    items: [
      "Separate benign requests from genuinely unsafe requests in refusal policy.",
      "Add tests that reward safe, helpful answers to low-risk user questions.",
      "Review refusal templates so caution does not block allowed assistance.",
    ],
  },
  {
    key: "jailbreak",
    title: "Jailbreak",
    priority: "High",
    effort: "Medium",
    items: [
      "Detect role-play, coercion, and instruction-hierarchy override attempts.",
      "Keep safety policy and system instructions isolated from user content.",
      "Add regression tests for known jailbreak patterns and variants.",
    ],
  },
  {
    key: "data_exfiltration",
    title: "Data Exfiltration",
    priority: "High",
    effort: "High",
    items: [
      "Block responses that expose environment variables, logs, secrets, or hidden metadata.",
      "Apply least-privilege controls to tool outputs and retrieved context.",
      "Audit prompts and responses for attempts to extract internal data.",
    ],
  },
];

function getRecommendations(evaluation) {
  return recommendationRules.filter((rule) => Number(evaluation?.[rule.key] || 0) > 0);
}

function Recommendations({
  evaluation,
  enableJsonExport = true,
  enablePdfExport = true,
  exportError,
  exportMessage,
  isExportingJson,
  isExportingPdf,
  onExportJson,
  onExportPdf,
  onViewFull,
  showExports = true,
  variant = "detailed",
}) {
  const recommendations = getRecommendations(evaluation);
  const compact = variant === "compact";

  return (
    <section className={compact ? "recommendations-panel recommendations-compact" : "recommendations-panel"} aria-labelledby="recommendations-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Recommendations</p>
          <h2 id="recommendations-title">{compact ? "Suggested Mitigations Summary" : "Detailed Mitigation Plan"}</h2>
        </div>
        <span className="recommendation-count">{recommendations.length} active</span>
      </div>

      {recommendations.length ? (
        <div className="recommendation-grid">
          {recommendations.map((recommendation) => (
            <article className="recommendation-card" key={recommendation.key}>
              <div className="recommendation-card-header">
                <h3>{recommendation.title}</h3>
                {!compact ? <span>{formatCategoryLabel(recommendation.key)}</span> : null}
              </div>
              {!compact ? (
                <div className="recommendation-meta">
                  <span>Priority: {recommendation.priority}</span>
                  <span>Effort: {recommendation.effort}</span>
                </div>
              ) : null}
              <ul>
                {(compact ? recommendation.items.slice(0, 1) : recommendation.items).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="recommendation-empty">No category-specific mitigations were triggered for this run.</div>
      )}

      {compact && recommendations.length ? (
        <div className="recommendation-nav-row">
          <button className="secondary-button" onClick={onViewFull}>View full recommendations</button>
        </div>
      ) : null}

      {showExports ? (
        <div className="export-report-row" id="report-export">
          <button className="secondary-button" disabled={!enableJsonExport || isExportingJson || isExportingPdf} onClick={onExportJson}>
            {isExportingJson ? "Exporting JSON..." : "Export JSON Report"}
          </button>
          <button className="secondary-button" disabled={!enablePdfExport || isExportingJson || isExportingPdf} onClick={onExportPdf}>
            {isExportingPdf ? "Exporting PDF..." : "Export PDF Report"}
          </button>
          {exportMessage ? <span className="export-success">{exportMessage}</span> : null}
          {exportError ? <span className="export-error">{exportError}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

export default Recommendations;
