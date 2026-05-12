import React, { useCallback, useEffect, useState } from "react";
import { deleteReport, fetchReportFile, fetchReports } from "../api";

const PAGE_SIZE = 10;
const reportFilters = ["all", "json", "pdf", "high", "elevated"];

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFilterLabel(filter) {
  if (filter === "all") {
    return "All";
  }
  if (filter === "json" || filter === "pdf") {
    return filter.toUpperCase();
  }
  return `${filter.charAt(0).toUpperCase()}${filter.slice(1)} risk`;
}

function getReportTitle(filename = "") {
  const runMatch = filename.match(/run_([^_.]+)/i);
  if (runMatch?.[1]) {
    return `Run ${runMatch[1]}`;
  }

  return filename.replace(/\.[^.]+$/, "").replaceAll("_", " ") || "AssureBench report";
}

function hasMetadata(report) {
  return ["risk_score", "risk_level", "total_tests", "passed_tests", "risky_tests"].some(
    (key) => report[key] !== null && report[key] !== undefined && report[key] !== "",
  );
}

function getFilteredReports(reports, activeFilter) {
  const sortedReports = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (activeFilter === "all") {
    return sortedReports;
  }

  if (activeFilter === "json" || activeFilter === "pdf") {
    return sortedReports.filter((report) => (report.file_type || report.type) === activeFilter);
  }

  return sortedReports.filter((report) => String(report.risk_level || "").toLowerCase() === activeFilter);
}

function Reports({ refreshKey }) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [deletingFilename, setDeletingFilename] = useState("");
  const [openingFilename, setOpeningFilename] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, reports.length]);

  async function handleDeleteReport(filename) {
    if (!window.confirm("Delete this report? This cannot be undone.")) {
      return;
    }

    setDeletingFilename(filename);
    setError("");

    try {
      await deleteReport(filename);
      await loadReports();
    } catch (err) {
      setError(err.message || "Unable to delete this report.");
    } finally {
      setDeletingFilename("");
    }
  }

  async function handleOpenReport(report, mode) {
    setOpeningFilename(report.filename);
    setError("");

    try {
      const blob = await fetchReportFile(report);
      const url = URL.createObjectURL(blob);
      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = report.filename;
        link.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "Unable to open this report.");
    } finally {
      setOpeningFilename("");
    }
  }

  const filteredReports = getFilteredReports(reports, activeFilter);
  const visibleReports = filteredReports.slice(0, visibleCount);
  const hiddenCount = Math.max(0, filteredReports.length - visibleReports.length);

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
          {status === "loading"
            ? "Loading exported reports..."
            : "No reports yet. Run an assurance test to generate your first evidence report."}
        </div>
      ) : null}

      {reports.length ? (
        <>
          <div className="report-filter-row" aria-label="Report filters">
            {reportFilters.map((filter) => (
              <button
                className={activeFilter === filter ? "filter-pill active" : "filter-pill"}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {formatFilterLabel(filter)}
              </button>
            ))}
          </div>

          {filteredReports.length ? (
            <>
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Type</th>
                      <th>Created</th>
                      <th>Size</th>
                      <th>Metadata</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReports.map((report) => {
                      const fileType = report.file_type || report.type;
                      const metadataAvailable = hasMetadata(report);

                      return (
                        <tr key={report.filename}>
                          <td className="report-filename">
                            <strong title={report.filename}>{getReportTitle(report.filename)}</strong>
                            <span title={report.filename}>{report.filename}</span>
                          </td>
                          <td>
                            <span className={`report-type ${fileType}`}>{String(fileType || "").toUpperCase()}</span>
                          </td>
                          <td>{formatDate(report.created_at)}</td>
                          <td>{formatSize(report.size_bytes)}</td>
                          <td>
                            {metadataAvailable ? (
                              <div className="report-metadata-grid">
                                {report.legacy ? <span>Legacy report</span> : null}
                                {report.risk_score !== null && report.risk_score !== undefined ? (
                                  <span>Score {report.risk_score}</span>
                                ) : null}
                                {report.risk_level ? <span>{report.risk_level}</span> : null}
                                {report.total_tests !== null && report.total_tests !== undefined ? (
                                  <span>{report.total_tests} tests</span>
                                ) : null}
                                {report.passed_tests !== null && report.passed_tests !== undefined ? (
                                  <span>{report.passed_tests} passed</span>
                                ) : null}
                                {report.risky_tests !== null && report.risky_tests !== undefined ? (
                                  <span>{report.risky_tests} risky</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="metadata-badge">{report.legacy ? "Legacy report" : "Metadata unavailable"}</span>
                            )}
                          </td>
                          <td>
                            <div className="report-actions">
                              {fileType === "json" ? (
                                <button
                                  className="secondary-button"
                                  disabled={openingFilename === report.filename}
                                  onClick={() => handleOpenReport(report, "view")}
                                  type="button"
                                >
                                  {openingFilename === report.filename ? "Opening..." : "View JSON"}
                                </button>
                              ) : null}
                              {fileType === "pdf" ? (
                                <button
                                  className="secondary-button"
                                  disabled={openingFilename === report.filename}
                                  onClick={() => handleOpenReport(report, "download")}
                                  type="button"
                                >
                                  {openingFilename === report.filename ? "Opening..." : "Download PDF"}
                                </button>
                              ) : null}
                              <button
                                className="danger-button subtle"
                                disabled={deletingFilename === report.filename}
                                onClick={() => handleDeleteReport(report.filename)}
                                type="button"
                              >
                                {deletingFilename === report.filename ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenCount ? (
                <div className="reports-pagination">
                  <span>
                    Showing {visibleReports.length} of {filteredReports.length} reports
                  </span>
                  <button
                    className="secondary-button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    type="button"
                  >
                    Show more
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="reports-empty">No reports match this filter.</div>
          )}
        </>
      ) : null}
    </section>
  );
}

export default Reports;
