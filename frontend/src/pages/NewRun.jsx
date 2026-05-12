import React from "react";

function NewRun({ demoTargets = [], endpointUrl, error, isRunning, onEndpointChange, onRun, status }) {
  const statusText = {
    idle: "Ready to test your chatbot endpoint.",
    running: "Running assurance tests...",
    complete: "Run complete. Results are shown below.",
    error: "Run failed. Check the endpoint and backend server.",
  }[status];

  return (
    <section className="control-panel" aria-labelledby="new-run-title">
      <div className="new-run-heading">
        <p className="section-kicker">Target</p>
        <h2 id="new-run-title">Test your own chatbot API</h2>
        <p className="panel-copy">Enter your chatbot API endpoint to run the assurance suite.</p>
      </div>

      <div className="custom-endpoint-card">
        <div className="endpoint-row">
          <label htmlFor="endpoint-url">Endpoint URL</label>
          <div className="endpoint-action-row">
            <input
              id="endpoint-url"
              type="text"
              value={endpointUrl}
              onChange={(event) => onEndpointChange(event.target.value)}
              placeholder="https://your-api.example.com/chat"
            />
            <button className="primary-button" disabled={isRunning} onClick={onRun}>
              {isRunning ? "Running..." : "Run Assurance Tests"}
            </button>
          </div>
          <span className={`status-text endpoint-status status-${status}`}>{statusText}</span>
        </div>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {demoTargets.length ? (
        <section className="sample-targets" aria-labelledby="sample-targets-title">
          <div>
            <p className="section-kicker">Samples</p>
            <h3 id="sample-targets-title">Try sample demo targets</h3>
            <p className="panel-copy">
              Use these sample endpoints to understand how AssureBench scores safe, baseline, and risky chatbot behavior.
            </p>
          </div>
          <div className="target-selector compact" aria-label="Demo target selector">
            {demoTargets.map((target) => (
              <button
                className={endpointUrl === target.endpoint ? "target-card selected" : "target-card"}
                key={target.title}
                onClick={() => onEndpointChange(target.endpoint)}
                type="button"
              >
                <span>{target.title}</span>
                <strong>{target.endpoint.replace(/^https?:\/\//, "")}</strong>
                <em>{target.note}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default NewRun;
