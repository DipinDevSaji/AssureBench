import React, { useMemo, useState } from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function TestSuites({ configuredTestCount, expandedSuite, onToggleSuite, run, testSuites }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filteredSuites = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return testSuites
      .map((suite) => {
        const categoryLabel = formatCategoryLabel(suite.category);
        const categoryMatches = categoryLabel.toLowerCase().includes(normalizedSearch) ||
          suite.category.toLowerCase().includes(normalizedSearch);
        const tests = suite.tests.filter((test) => {
          const matchesSeverity = severityFilter === "all" || test.severity === severityFilter;
          const matchesSearch =
            !normalizedSearch ||
            categoryMatches ||
            test.test_id.toLowerCase().includes(normalizedSearch) ||
            test.prompt.toLowerCase().includes(normalizedSearch);

          return matchesSeverity && matchesSearch;
        });

        return { ...suite, categoryLabel, filteredTests: tests };
      })
      .filter((suite) => suite.filteredTests.length > 0);
  }, [searchQuery, severityFilter, testSuites]);

  const filteredTestCount = filteredSuites.reduce((count, suite) => count + suite.filteredTests.length, 0);

  return (
    <section className="suite-panel" aria-labelledby="suite-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Test Suites</p>
          <h2 id="suite-title">Assurance Test Categories</h2>
          <p className="panel-copy">Each category contains built-in prompts used to evaluate chatbot risk behavior.</p>
        </div>
        <span className="report-count">{run?.summary?.test_count || configuredTestCount} tests</span>
      </div>

      <div className="suite-toolbar" aria-label="Test suite filters">
        <label className="search-filter">
          Search
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Category, test ID, or prompt"
          />
        </label>
        <label className="category-filter">
          Severity
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <span className="suite-filter-count">
          Showing {filteredTestCount} of {configuredTestCount} prompts
        </span>
      </div>

      <div className="suite-safety-note">Prompts are used for controlled evaluation only.</div>

      <div className="suite-grid">
        {filteredSuites.map((suite) => {
          const isExpanded = expandedSuite === suite.category;

          return (
            <article className={isExpanded ? "suite-card suite-card-expanded" : "suite-card"} key={suite.category}>
              <button
                aria-expanded={isExpanded}
                className="suite-card-button"
                onClick={() => onToggleSuite(isExpanded ? null : suite.category)}
              >
                <span>{suite.categoryLabel}</span>
                <strong>{suite.filteredTests.length}</strong>
                <p>{suite.description}</p>
                <em className="suite-toggle-pill">{isExpanded ? "Hide tests" : "View tests"}</em>
              </button>
              {isExpanded ? (
                <div className="suite-test-list">
                  {suite.filteredTests.map((test) => (
                    <article className="suite-test-card" key={test.test_id}>
                      <div className="suite-test-header">
                        <div>
                          <span>{test.test_id}</span>
                          <h3>{test.name}</h3>
                        </div>
                        <strong className={`severity-pill severity-${test.severity}`}>{test.severity}</strong>
                      </div>
                      <dl>
                        <div>
                          <dt>Prompt</dt>
                          <dd>{test.prompt}</dd>
                        </div>
                        <div>
                          <dt>Expected behavior</dt>
                          <dd>{test.expected_behavior}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {!filteredSuites.length ? <div className="table-empty">No test prompts match the selected filters.</div> : null}
    </section>
  );
}

export default TestSuites;
