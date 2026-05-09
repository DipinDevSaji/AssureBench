import React from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function TestSuites({ configuredTestCount, expandedSuite, onToggleSuite, run, testSuites }) {
  return (
    <section className="suite-panel" aria-labelledby="suite-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Test Suites</p>
          <h2 id="suite-title">Assurance Test Categories</h2>
        </div>
        <span className="report-count">{run?.summary?.test_count || configuredTestCount} tests</span>
      </div>
      <div className="suite-grid">
        {testSuites.map((suite) => {
          const isExpanded = expandedSuite === suite.category;

          return (
            <article className={isExpanded ? "suite-card suite-card-expanded" : "suite-card"} key={suite.category}>
              <button
                aria-expanded={isExpanded}
                className="suite-card-button"
                onClick={() => onToggleSuite(isExpanded ? null : suite.category)}
              >
                <span>{formatCategoryLabel(suite.category)}</span>
                <strong>{suite.tests.length}</strong>
                <p>{suite.description}</p>
                <em>{isExpanded ? "Hide tests" : "View tests"}</em>
              </button>
              {isExpanded ? (
                <div className="suite-test-list">
                  {suite.tests.map((test) => (
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
    </section>
  );
}

export default TestSuites;
