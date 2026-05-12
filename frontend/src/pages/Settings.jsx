import React from "react";

function Settings({ onOpenAccountSettings, onSaveSettings, settingsDraft, settingsMessage, setSettingsDraft, user }) {
  const canEditWorkspaceSettings = ["owner", "admin"].includes(user?.role);

  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Settings</p>
          <h2 id="settings-title">Workspace Settings</h2>
          <p className="panel-copy">
            Manage local workspace defaults, report options, account access, and prototype security controls.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-heading">
            <span>{canEditWorkspaceSettings ? "Editable" : "Read-only"}</span>
            <h3>API endpoint defaults</h3>
          </div>
          <label className="settings-field" htmlFor="default-endpoint-url">
            Built-in Demo Chatbot
            <input
              disabled={!canEditWorkspaceSettings}
              id="default-endpoint-url"
              type="text"
              value={settingsDraft.defaultEndpointUrl}
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, defaultEndpointUrl: event.target.value }))
              }
            />
          </label>
          <p className="settings-note">
            This is the default target used for local/demo assurance runs. Users can enter their own endpoint on the Custom Endpoint page.
          </p>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span>{canEditWorkspaceSettings ? "Editable" : "Read-only"}</span>
            <h3>Report export options</h3>
          </div>
          <label className="settings-checkbox">
            <input
              checked={settingsDraft.enableJsonExport}
              disabled={!canEditWorkspaceSettings}
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
              disabled={!canEditWorkspaceSettings}
              type="checkbox"
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, enablePdfExport: event.target.checked }))
              }
            />
            Enable PDF export
          </label>
          <p className="settings-note">Controls which export buttons are visible in the Results page.</p>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span>Read-only</span>
            <h3>Risk scoring configuration</h3>
          </div>
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
              <dd>Category weighting is currently fixed for the prototype. Configurable weights are planned for a future version.</dd>
            </div>
          </dl>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span>Project</span>
            <h3>About AssureBench</h3>
          </div>
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

        <article className="settings-card">
          <div className="settings-card-heading">
            <span>Account</span>
            <h3>Account Settings</h3>
          </div>
          <dl className="settings-list">
            <div>
              <dt>Signed-in email</dt>
              <dd>{user?.email || "--"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd><span className={`role-badge ${user?.role || ""}`}>{user?.role || "--"}</span></dd>
            </div>
          </dl>
          <button className="secondary-button settings-card-action" onClick={onOpenAccountSettings} type="button">
            Change Password
          </button>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <span>Read-only</span>
            <h3>Security</h3>
          </div>
          <dl className="settings-list security-list">
            <div>
              <dt>Authentication</dt>
              <dd><span className="status-badge passed">Enabled</span></dd>
            </div>
            <div>
              <dt>Rate limiting</dt>
              <dd><span className="status-badge passed">Enabled</span></dd>
            </div>
            <div>
              <dt>Report deletion protection</dt>
              <dd><span className="status-badge passed">Enabled</span></dd>
            </div>
            <div>
              <dt>Public account creation</dt>
              <dd><span className="status-badge inactive">Disabled</span></dd>
            </div>
          </dl>
        </article>
      </div>
      <div className="settings-actions">
        <button className="primary-button" disabled={!canEditWorkspaceSettings} onClick={onSaveSettings}>
          Save Settings
        </button>
        {!canEditWorkspaceSettings ? (
          <span className="settings-readonly-message">Workspace defaults are managed by the owner or admin. You can still enter custom endpoints on run pages.</span>
        ) : null}
        {settingsMessage ? <span className="settings-message">{settingsMessage}</span> : null}
      </div>
    </section>
  );
}

export default Settings;
