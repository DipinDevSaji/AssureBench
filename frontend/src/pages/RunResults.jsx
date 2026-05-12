import React, { useState } from "react";
import RiskCard from "../components/RiskCard";
import TestResultTable from "../components/TestResultTable";
import CategoryChart from "../components/CategoryChart";
import FullCategoryBreakdown from "../components/FullCategoryBreakdown";
import Recommendations from "../components/Recommendations";
import { exportJsonReport, exportPdfReport } from "../api";
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
          <TestResultTable evaluation={evaluation} results={details} />
        </>
      )}
    </section>
  );
}

export default RunResults;
