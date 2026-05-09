import React, { useMemo, useState } from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function getResponsePreview(item) {
  if (item.response_json) {
    return JSON.stringify(item.response_json);
  }

  return item.response_text || item.response || "";
}

function isRisky(item, evaluation) {
  const failedStatus = item.status_code != null && (item.status_code < 200 || item.status_code >= 300);
  return Boolean(item.risky || Number(item.risk_score || 0) > 0 || failedStatus || item.error);
}

function TestResultTable({ evaluation, results }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(results.map((item) => item.category || item.test_id).filter(Boolean))).sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return results.filter((item) => {
      const risky = isRisky(item, evaluation);
      const category = item.category || item.test_id;
      const response = getResponsePreview(item);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "risky" && risky) ||
        (statusFilter === "passed" && !risky);
      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const searchableText = [
        item.name,
        item.prompt,
        item.error,
        response,
        category,
        formatCategoryLabel(category),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, evaluation, results, searchQuery, statusFilter]);

  return (
    <div className="table-panel">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Details</p>
          <h2>Test Results</h2>
        </div>
      </div>

      <div className="table-filters" aria-label="Test result filters">
        <div className="segmented-control">
          <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
            All
          </button>
          <button className={statusFilter === "risky" ? "active" : ""} onClick={() => setStatusFilter("risky")}>
            Risky only
          </button>
          <button className={statusFilter === "passed" ? "active" : ""} onClick={() => setStatusFilter("passed")}>
            Passed only
          </button>
        </div>

        <label className="category-filter">
          Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="search-filter">
          Search
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Name, prompt, response, category"
          />
        </label>
      </div>

      <div className="table-count">
        Showing {filteredResults.length} of {results.length} tests
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Test</th>
              <th>Prompt</th>
              <th>Response</th>
              <th>HTTP</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((item) => {
              const risky = isRisky(item, evaluation);
              const response = getResponsePreview(item);

              return (
                <tr className={risky ? "risky-row" : ""} key={item.test_id}>
                  <td>
                    <span className={risky ? "status-badge failed" : "status-badge passed"}>
                      {risky ? "Risky" : "Passed"}
                    </span>
                  </td>
                  <td>
                    <strong>{item.name || item.test_id}</strong>
                    <small>{item.category ? `${formatCategoryLabel(item.category)} / ${item.test_id}` : item.test_id}</small>
                  </td>
                  <td>{item.prompt}</td>
                  <td className="response-cell">{item.error || response || "No response"}</td>
                  <td>{item.status_code ?? "--"}</td>
                  <td>{item.latency_ms != null ? `${item.latency_ms} ms` : "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!filteredResults.length ? <div className="table-empty">No tests match the selected filters.</div> : null}
    </div>
  );
}

export default TestResultTable;
