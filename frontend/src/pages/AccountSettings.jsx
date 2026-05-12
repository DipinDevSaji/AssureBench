import React, { useState } from "react";
import { changePassword } from "../api";

function AccountSettings({ forced = false, onPasswordChanged, user }) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.current_password || !form.new_password || !form.confirm_new_password) {
      setError("Please complete all password fields.");
      return;
    }
    if (form.new_password !== form.confirm_new_password) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await changePassword(form);
      setMessage(result.message || "Password changed successfully.");
      setForm({ current_password: "", new_password: "", confirm_new_password: "" });
      onPasswordChanged?.(result.user);
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-panel account-settings-panel" aria-labelledby="account-settings-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">{forced ? "Required action" : "Account"}</p>
          <h2 id="account-settings-title">Change Password</h2>
          <p className="panel-copy">
            {forced
              ? "Change your temporary password before continuing to the dashboard."
              : "Update the password for your signed-in AssureBench account."}
          </p>
        </div>
        {user ? <span className={`role-badge ${user.role}`}>{user.role}</span> : null}
      </div>

      <form className="account-password-form" onSubmit={handleSubmit}>
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          type="password"
          value={form.current_password}
          onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))}
        />

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={form.new_password}
          onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
        />

        <label htmlFor="confirm-new-password">Confirm new password</label>
        <input
          id="confirm-new-password"
          type="password"
          value={form.confirm_new_password}
          onChange={(event) => setForm((current) => ({ ...current, confirm_new_password: event.target.value }))}
        />

        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Change Password"}
        </button>
      </form>

      {message ? <p className="export-success">{message}</p> : null}
      {error ? <p className="error-message account-error">{error}</p> : null}
    </section>
  );
}

export default AccountSettings;
