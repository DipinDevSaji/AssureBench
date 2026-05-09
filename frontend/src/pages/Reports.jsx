import React, { useCallback, useEffect, useState } from "react";
import { fetchReports, getReportDownloadUrl } from "../api";

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) {
    return "--";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "--" : value;
}

function Reports({ refreshKey }) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const result = await fetchReports();
      setReports(result);
      setStatus("complete");
    } catch (err) {
      setError(err.message || "Unable to load reports.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshKey]);

  return (
    <section className="reports-panel" id="reports" aria-labelledby="reports-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Reports</p>
          <h2 id="reports-title">Exported Reports</h2>
        </div>
        <div className="reports-toolbar">
          <span className="report-count">{reports.length} files</span>
          <button className="secondary-button" disabled={status === "loading"} onClick={loadReports}>
            {status === "loading" ? "Refreshing..." : "Refresh Reports"}
          </button>
        </div>
      </div>

      {error ? <div className="reports-error">{error}</div> : null}

      {!error && !reports.length ? (
        <div className="reports-empty">
          {status === "loading" ? "Loading exported reports..." : "Export a JSON or PDF report to see it here."}
        </div>
      ) : null}

      {reports.length ? (
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Created date</th>
                <th>Size</th>
                <th>Risk score</th>
                <th>Risk level</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Risky</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const fileType = report.file_type || report.type;
                const url = getReportDownloadUrl(report);

                return (
                  <tr key={report.filename}>
                    <td className="report-filename">{report.filename}</td>
                    <td>
                      <span className={`report-type ${fileType}`}>{String(fileType || "").toUpperCase()}</span>
                    </td>
                    <td>{formatDate(report.created_at)}</td>
                    <td>{formatSize(report.size_bytes)}</td>
                    <td>{formatValue(report.risk_score)}</td>
                    <td>{formatValue(report.risk_level)}</td>
                    <td>{formatValue(report.total_tests)}</td>
                    <td>{formatValue(report.passed_tests)}</td>
                    <td>{formatValue(report.risky_tests)}</td>
                    <td>
                      {fileType === "json" ? (
                        <a className="secondary-button" href={url} target="_blank" rel="noreferrer">
                          View JSON
                        </a>
                      ) : null}
                      {fileType === "pdf" ? (
                        <a className="secondary-button" href={url} download>
                          Download PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default Reports;
