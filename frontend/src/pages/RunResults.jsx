import React, { useState } from "react";
import RiskCard from "../components/RiskCard";
import TestResultTable from "../components/TestResultTable";
import CategoryChart from "../components/CategoryChart";
import FullCategoryBreakdown from "../components/FullCategoryBreakdown";
import Recommendations from "../components/Recommendations";
import { exportJsonReport, exportPdfReport, generateRemediationPackage } from "../api";
import { formatCategoryLabel } from "../utils/categoryLabels";

const categoryLabels = {
  prompt_injection: "Prompt Injection",
  privacy_leakage: "Privacy Leakage",
  hallucination: "Hallucination",
  unsafe_output: "Unsafe Output",
  format_reliability: "Format Reliability",
};

function countRisk(value) {
  return Number(value || 0) > 0 ? 1 : 0;
}

function getAverageLatency(details) {
  const latencyValues = details
    .map((item) => item.latency_ms)
    .filter((value) => typeof value === "number");

  if (!latencyValues.length) {
    return null;
  }

  return Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length);
}

function getCategory(item) {
  return item.category || item.test_id || "uncategorized";
}

function isItemRisky(item) {
  const failedStatus = item.status_code != null && (item.status_code < 200 || item.status_code >= 300);
  return Boolean(item.risky || Number(item.risk_score || 0) > 0 || failedStatus || item.error);
}

function getCategoryBreakdown(details, evaluation) {
  const grouped = details.reduce((acc, item) => {
    const category = getCategory(item);
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, items]) => {
      const total = items.length;
      const riskyCount = items.filter(isItemRisky).length;
      const passedCount = Math.max(0, total - riskyCount);

      return {
        key,
        total,
        riskyCount,
        passedCount,
        riskPercentage: total ? Math.round((riskyCount / total) * 100) : 0,
        score: Number(evaluation?.[key] || 0),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function RunResults({ hasRun, onReportExported, onViewRecommendations, run, settings }) {
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [remediationPackage, setRemediationPackage] = useState(null);
  const [remediationStatus, setRemediationStatus] = useState("");
  const [remediationError, setRemediationError] = useState("");
  const summary = run?.summary || {};
  const evaluation = summary.evaluation || {};
  const majorEvaluation = summary.major_evaluation || evaluation;
  const details = run?.details || [];
  const averageLatency = getAverageLatency(details);
  const totalTestCount = summary.test_count ?? details.length;
  const fullCategoryBreakdown = getCategoryBreakdown(details, evaluation);
  const externalAnalysis = summary.external_analysis;
  const riskyTestCount = details.filter(isItemRisky).length;
  const passedTestCount = Math.max(0, details.length - riskyTestCount);
  const passRate = details.length ? Math.round((passedTestCount / details.length) * 100) : 0;

  const categoryMetrics = Object.entries(categoryLabels).map(([key, label]) => ({
    key,
    label: label || formatCategoryLabel(key),
    count: countRisk(majorEvaluation[key]),
    score: Number(majorEvaluation[key] || 0),
  }));

  async function handleExportJson() {
    if (!run) {
      return;
    }

    setIsExportingJson(true);
    setExportMessage("");
    setExportError("");

    try {
      const result = await exportJsonReport(run);
      setExportMessage(`Report exported: ${result.filename}`);
      onReportExported?.();
    } catch (error) {
      setExportError(error.message || "Unable to export JSON report.");
    } finally {
      setIsExportingJson(false);
    }
  }

  async function handleExportPdf() {
    if (!run) {
      return;
    }

    setIsExportingPdf(true);
    setExportMessage("");
    setExportError("");

    try {
      const result = await exportPdfReport(run);
      setExportMessage(`PDF report exported: ${result.filename}`);
      onReportExported?.();
    } catch (error) {
      setExportError(error.message || "Unable to export PDF report.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleGenerateRemediation() {
    if (!run?.run_id) {
      return;
    }

    setRemediationStatus("Generating remediation brief...");
    setRemediationError("");
    try {
      const result = await generateRemediationPackage(run.run_id, "markdown");
      setRemediationPackage(result);
      setRemediationStatus("Remediation brief generated.");
    } catch (error) {
      setRemediationError(error.message || "Unable to generate remediation brief.");
      setRemediationStatus("");
    }
  }

  async function handleCopyRemediation() {
    if (!remediationPackage?.content) {
      return;
    }
    try {
      await navigator.clipboard.writeText(remediationPackage.content);
      setRemediationStatus("Markdown copied to clipboard.");
    } catch {
      setRemediationError("Unable to copy markdown. You can still download the brief.");
    }
  }

  function downloadRemediation(format) {
    if (!run?.run_id) {
      return;
    }
    const isJson = format === "json";
    const content = isJson
      ? JSON.stringify({ run_id: run.run_id, remediation_package: remediationPackage }, null, 2)
      : remediationPackage?.content || "";
    const blob = new Blob([content], { type: isJson ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assurebench_remediation_${run.run_id}.${isJson ? "json" : "md"}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="results-panel" id="results" aria-labelledby="results-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Results</p>
          <h2 id="results-title">Run Summary</h2>
        </div>
        {hasRun ? <span className="run-id">Run ID: {run.run_id}</span> : null}
      </div>

      {!hasRun ? (
        <div className="empty-state">Run assurance tests to populate this dashboard.</div>
      ) : (
        <>
          <div className="metrics-grid">
            <RiskCard score={summary.risk_score} />
            {categoryMetrics.map((metric) => (
              <article className={metric.count ? "metric-card metric-risk" : "metric-card"} key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metric.count}</strong>
              </article>
            ))}
            <article className={averageLatency != null && averageLatency > 1000 ? "metric-card metric-risk" : "metric-card"}>
              <span>Latency</span>
              <strong>{averageLatency != null ? `${averageLatency} ms` : "--"}</strong>
            </article>
            <article className="metric-card">
              <span>Total tests</span>
              <strong>{totalTestCount}</strong>
            </article>
            <article className="metric-card">
              <span>Passed tests</span>
              <strong>{passedTestCount}</strong>
            </article>
            <article className={riskyTestCount ? "metric-card metric-risk" : "metric-card"}>
              <span>Risky tests</span>
              <strong>{riskyTestCount}</strong>
            </article>
            <article className="metric-card">
              <span>Pass rate</span>
              <strong>{passRate}%</strong>
            </article>
          </div>

          <div id="test-suites">
            <CategoryChart categories={fullCategoryBreakdown} />
          </div>
          <FullCategoryBreakdown categories={fullCategoryBreakdown} />
          {externalAnalysis?.enabled ? (
            <section className="recommendations-panel external-analysis-panel" aria-labelledby="external-analysis-title">
              <div className="section-heading compact">
                <div>
                  <p className="section-kicker">External AI analysis</p>
                  <h2 id="external-analysis-title">Provider Enrichment</h2>
                  <p className="panel-copy">
                    Optional provider analysis enriched this run without replacing AssureBench scoring.
                  </p>
                </div>
                <span className="report-count">{externalAnalysis.provider}</span>
              </div>
              <div className="overview-grid">
                <article className="overview-card">
                  <span>Analyzed tests</span>
                  <strong>{externalAnalysis.analyzed_tests}</strong>
                </article>
                <article className="overview-card">
                  <span>High findings</span>
                  <strong>{externalAnalysis.high_findings}</strong>
                </article>
                <article className="overview-card">
                  <span>Elevated findings</span>
                  <strong>{externalAnalysis.elevated_findings}</strong>
                </article>
                <article className="overview-card">
                  <span>Redaction</span>
                  <strong>{externalAnalysis.redacted ? "On" : "Off"}</strong>
                </article>
              </div>
            </section>
          ) : null}
          <div id="recommendations">
            <Recommendations
              evaluation={evaluation}
              exportError={exportError}
            exportMessage={exportMessage}
            enableJsonExport={settings?.enableJsonExport !== false}
            enablePdfExport={settings?.enablePdfExport !== false}
            isExportingJson={isExportingJson}
            isExportingPdf={isExportingPdf}
              onViewFull={onViewRecommendations}
              onExportJson={handleExportJson}
              onExportPdf={handleExportPdf}
              variant="compact"
            />
          </div>
          <section className="recommendations-panel remediation-panel" aria-labelledby="developer-remediation-title">
            <div className="section-heading compact">
              <div>
                <p className="section-kicker">Developer Remediation</p>
                <h2 id="developer-remediation-title">Developer Remediation</h2>
                <p className="panel-copy">
                  Generate a redacted Markdown brief for Codex, Cursor, GitHub Issues, Jira, Linear, or a developer ticket.
                </p>
              </div>
            </div>
            {!riskyTestCount ? (
              <div className="empty-state">No remediation brief needed. This run has no risky tests.</div>
            ) : (
              <>
                <div className="recommendation-actions export-actions">
                  <button className="primary-button" onClick={handleGenerateRemediation} type="button">
                    Generate Remediation Brief
                  </button>
                  <button className="secondary-button" disabled={!remediationPackage} onClick={handleCopyRemediation} type="button">
                    Copy Markdown
                  </button>
                  <button className="secondary-button" disabled={!remediationPackage} onClick={() => downloadRemediation("json")} type="button">
                    Download JSON
                  </button>
                  <button className="secondary-button" disabled={!remediationPackage} onClick={() => downloadRemediation("markdown")} type="button">
                    Download Markdown
                  </button>
                </div>
                {remediationStatus ? <p className="settings-message">{remediationStatus}</p> : null}
                {remediationError ? <p className="error-message">{remediationError}</p> : null}
                {remediationPackage ? (
                  <pre className="remediation-preview">{remediationPackage.content.slice(0, 900)}</pre>
                ) : null}
              </>
            )}
          </section>
          <TestResultTable evaluation={evaluation} results={details} />
        </>
      )}
    </section>
  );
}

export default RunResults;
