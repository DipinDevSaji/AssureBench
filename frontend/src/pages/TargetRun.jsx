import React from "react";
import RunResults from "./RunResults";

function TargetRun({
  description,
  endpointLabel = "Endpoint URL",
  endpointProps,
  error,
  isRunning,
  isRunDisabled = false,
  onReportExported,
  onRun,
  onViewRecommendations,
  panelCopy,
  readyText,
  run,
  runCompleteText = "Run complete. Results are shown below.",
  settings,
  status,
  title,
  titleId,
}) {
  return (
    <>
      <section className="control-panel" aria-labelledby={titleId}>
        <div>
          <p className="section-kicker">{description}</p>
          <h2 id={titleId}>{title}</h2>
          <p className="panel-copy">{panelCopy}</p>
        </div>

        <div className="endpoint-row">
          <label htmlFor={endpointProps.id}>{endpointLabel}</label>
          <input type="text" {...endpointProps} />
        </div>

        <div className="action-row">
          <button className="primary-button" disabled={isRunDisabled || isRunning} onClick={onRun}>
            {isRunning ? "Running..." : "Run Assurance Tests"}
          </button>
          <span className={`status-text status-${status}`}>
            {status === "complete" ? runCompleteText : readyText}
          </span>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
      </section>

      {run ? (
        <RunResults
          hasRun={Boolean(run)}
          onReportExported={onReportExported}
          onViewRecommendations={onViewRecommendations}
          run={run}
          settings={settings}
        />
      ) : null}
    </>
  );
}

export default TargetRun;
