import React from "react";
import FullCategoryBreakdown from "../components/FullCategoryBreakdown";
import TestResultTable from "../components/TestResultTable";

function UploadedResults({ breakdown, onUploadReport, stats, uploadError, uploadedReport }) {
  const details = uploadedReport?.details || [];
  const evaluation = uploadedReport?.summary?.evaluation || {};

  return (
    <section className="uploaded-panel" aria-labelledby="uploaded-results-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Import Results</p>
          <h2 id="uploaded-results-title">Imported AssureBench Report</h2>
          <p className="panel-copy">Upload an exported AssureBench JSON report to inspect it without sending anything to the backend.</p>
        </div>
      </div>

      <label className="upload-dropzone">
        JSON report file
        <input accept=".json,application/json" type="file" onChange={onUploadReport} />
      </label>
      {uploadError ? <p className="error-message upload-error">{uploadError}</p> : null}

      {uploadedReport ? (
        <>
          <div className="overview-grid upload-summary-grid">
            <article className="overview-card wide">
              <span>Run ID</span>
              <strong>{uploadedReport.run_id || "--"}</strong>
            </article>
            <article className="overview-card wide">
              <span>Generated at</span>
              <strong>{uploadedReport.generated_at || "--"}</strong>
            </article>
            <article className={Number(stats.riskScore) >= 35 ? "overview-card alert" : "overview-card"}>
              <span>Risk score</span>
              <strong>{stats.riskScore}</strong>
            </article>
            <article className="overview-card">
              <span>Risk level</span>
              <strong>{stats.riskLevel}</strong>
            </article>
            <article className="overview-card">
              <span>Total tests</span>
              <strong>{stats.totalTests}</strong>
            </article>
            <article className="overview-card">
              <span>Passed tests</span>
              <strong>{stats.passedTests}</strong>
            </article>
            <article className={stats.riskyTests ? "overview-card alert" : "overview-card"}>
              <span>Risky tests</span>
              <strong>{stats.riskyTests}</strong>
            </article>
            <article className="overview-card">
              <span>Pass rate</span>
              <strong>{stats.passRate}%</strong>
            </article>
          </div>
          {breakdown.length ? <FullCategoryBreakdown categories={breakdown} /> : null}
          {details.length ? <TestResultTable evaluation={evaluation} results={details} /> : null}
        </>
      ) : (
        <div className="import-empty-state">
          <span aria-hidden="true" className="import-empty-icon">JSON</span>
          <div>
            <strong>No report imported yet.</strong>
            <p>Upload an AssureBench JSON report to preview its summary, category breakdown, and test results here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadedResults;
