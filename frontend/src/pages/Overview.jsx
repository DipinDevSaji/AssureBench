import React from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function Overview({
  configuredTestCount,
  currentTargetLabel = "Built-in Demo",
  hasRun,
  onOpenCustomEndpoint,
  onOpenDemo,
  onOpenNewRun,
  onOpenTestSuites,
  stats,
  testSuites,
}) {
  const targetCardValue = currentTargetLabel === "Custom Endpoint" ? "Custom Endpoint" : "Built-in Demo Chatbot";

  const capabilityCards = [
    {
      label: "Total test categories",
      value: testSuites.length,
      note: "Risk domains covered by the suite",
    },
    {
      label: "Built-in assurance checks",
      value: configuredTestCount,
      note: "Ready-to-run chatbot evaluations",
    },
    {
      label: "Export formats",
      value: "JSON and PDF",
      note: "Evidence-ready reporting outputs",
    },
    {
      label: "Current target",
      value: targetCardValue,
      note: "Default local/demo endpoint for first assurance runs.",
    },
  ];

  const workflowSteps = [
    {
      title: "Choose endpoint",
      text: "Use the demo chatbot, a custom API endpoint, or a production target.",
    },
    {
      title: "Run assurance tests",
      text: "Execute the configured checks across security, safety, reliability, and latency.",
    },
    {
      title: "Review risk signals",
      text: "Inspect category breakdowns, risky tests, responses, and suggested mitigations.",
    },
    {
      title: "Export report",
      text: "Generate JSON or PDF reports for review, audit, and portfolio evidence.",
    },
  ];

  return (
    <>
      <section className="overview-panel overview-capabilities" aria-labelledby="overview-capabilities-title">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Workspace readiness</p>
            <h2 id="overview-capabilities-title">Assurance Coverage at a Glance</h2>
          </div>
        </div>
        <div className="capability-grid">
          {capabilityCards.map((card) => (
            <article className="capability-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </article>
          ))}
        </div>
      </section>

      {hasRun ? (
        <section className="overview-panel overview-snapshot-panel" aria-labelledby="overview-title">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">Latest run</p>
              <h2 id="overview-title">Latest Assurance Snapshot</h2>
            </div>
          </div>
          <div className="overview-grid snapshot-grid">
            <article className="overview-card wide">
              <span>Latest run ID</span>
              <strong>{stats.latestRunId}</strong>
            </article>
            <article className="overview-card">
              <span>Total tests</span>
              <strong>{stats.totalTests}</strong>
            </article>
            <article className="overview-card success">
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
            <article className={Number(stats.latestRiskScore) >= 35 ? "overview-card alert" : "overview-card"}>
              <span>Latest risk score</span>
              <strong>{stats.latestRiskScore}</strong>
            </article>
          </div>
        </section>
      ) : (
        <section className="overview-empty-hero" aria-labelledby="overview-empty-title">
          <div>
            <p className="section-kicker">First report</p>
            <h2 id="overview-empty-title">No assurance run completed yet</h2>
            <p>Start with the built-in demo chatbot or test your own chatbot API endpoint.</p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={onOpenDemo}>
              Run Built-in Demo
            </button>
            <button className="secondary-button" onClick={onOpenCustomEndpoint || onOpenNewRun}>
              Test Custom Endpoint
            </button>
          </div>
        </section>
      )}

      <section className="overview-panel" aria-labelledby="how-it-works-title">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Workflow</p>
            <h2 id="how-it-works-title">How It Works</h2>
          </div>
        </div>
        <div className="workflow-grid">
          {workflowSteps.map((step, index) => (
            <article className="workflow-card" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-panel" aria-labelledby="risk-preview-title">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Coverage preview</p>
            <h2 id="risk-preview-title">Risk Categories Covered</h2>
          </div>
        </div>
        <div className="risk-preview-grid">
          {testSuites.map((suite) => (
            <span className="risk-preview-pill" key={suite.category}>
              {formatCategoryLabel(suite.category)}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

export default Overview;
