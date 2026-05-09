import React from "react";

function NewRun({ endpointUrl, error, isRunning, onEndpointChange, onRun, status }) {
  const statusText = {
    idle: "Ready to run the default demo chatbot checks.",
    running: "Running assurance tests...",
    complete: "Run complete. Results are shown below.",
    error: "Run failed. Check the endpoint and backend server.",
  }[status];

  return (
    <section className="control-panel" aria-labelledby="new-run-title">
      <div>
        <p className="section-kicker">Target</p>
        <h2 id="new-run-title">New Assurance Run</h2>
      </div>

      <div className="endpoint-row">
        <label htmlFor="endpoint-url">Endpoint URL</label>
        <input
          id="endpoint-url"
          type="text"
          value={endpointUrl}
          onChange={(event) => onEndpointChange(event.target.value)}
          placeholder="http://127.0.0.1:8000/demo-chatbot"
        />
      </div>

      <div className="action-row">
        <button className="primary-button" disabled={isRunning} onClick={onRun}>
          {isRunning ? "Running..." : "Run Assurance Tests"}
        </button>
        <span className={`status-text status-${status}`}>{statusText}</span>
      </div>

      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}

export default NewRun;
