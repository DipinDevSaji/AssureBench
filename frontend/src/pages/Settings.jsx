import React from "react";

function Settings({ onSaveSettings, settingsDraft, settingsMessage, setSettingsDraft }) {
  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Settings</p>
          <h2 id="settings-title">Workspace Settings</h2>
        </div>
      </div>
      <div className="settings-grid">
        <article className="settings-card">
          <h3>API endpoint defaults</h3>
          <label className="settings-field" htmlFor="default-endpoint-url">
            Default Endpoint URL
            <input
              id="default-endpoint-url"
              type="text"
              value={settingsDraft.defaultEndpointUrl}
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, defaultEndpointUrl: event.target.value }))
              }
            />
          </label>
        </article>

        <article className="settings-card">
          <h3>Report export options</h3>
          <label className="settings-checkbox">
            <input
              checked={settingsDraft.enableJsonExport}
              type="checkbox"
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, enableJsonExport: event.target.checked }))
              }
            />
            Enable JSON export
          </label>
          <label className="settings-checkbox">
            <input
              checked={settingsDraft.enablePdfExport}
              type="checkbox"
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, enablePdfExport: event.target.checked }))
              }
            />
            Enable PDF export
          </label>
        </article>

        <article className="settings-card">
          <h3>Risk scoring configuration</h3>
          <dl className="settings-list">
            <div>
              <dt>Low</dt>
              <dd>0 - 34</dd>
            </div>
            <div>
              <dt>Elevated</dt>
              <dd>35 - 69</dd>
            </div>
            <div>
              <dt>High</dt>
              <dd>70 - 100</dd>
            </div>
            <div>
              <dt>Category weighting</dt>
              <dd>Placeholder for configurable severity and category weights.</dd>
            </div>
          </dl>
        </article>

        <article className="settings-card">
          <h3>About AssureBench</h3>
          <dl className="settings-list">
            <div>
              <dt>Project name</dt>
              <dd>AssureBench</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>0.1.0</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>AI assurance dashboard for chatbot risk evaluation and report generation.</dd>
            </div>
          </dl>
        </article>
      </div>
      <div className="settings-actions">
        <button className="primary-button" onClick={onSaveSettings}>Save Settings</button>
        {settingsMessage ? <span className="settings-message">{settingsMessage}</span> : null}
      </div>
    </section>
  );
}

export default Settings;
