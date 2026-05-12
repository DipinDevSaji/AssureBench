import React, { useEffect, useState } from "react";
import {
  createAdminUser,
  deactivateAdminUser,
  fetchAccessRequests,
  fetchAdminUsers,
  updateAdminUser,
  updateAccessRequestStatus,
} from "../api";

function canToggleUser(currentUser, targetUser) {
  if (!currentUser || !targetUser) {
    return false;
  }
  if (currentUser.role === "owner") {
    if (targetUser.role === "owner") {
      return targetUser.id !== currentUser.id && targetUser.email === "owner@example.com";
    }
    return true;
  }
  if (currentUser.role === "admin") {
    return targetUser.role === "user";
  }
  return false;
}

function getProtectedReason(currentUser, targetUser) {
  if (targetUser.role === "owner" && targetUser.id === currentUser?.id) {
    return "Cannot deactivate current owner";
  }
  if (targetUser.role === "owner" && targetUser.email !== "owner@example.com") {
    return "Protected owner";
  }
  if (currentUser?.role === "admin" && targetUser.role !== "user") {
    return "Protected owner";
  }
  return "Protected account";
}

function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const canCreateAdmin = currentUser?.role === "owner";

  async function loadUsers() {
    setStatus("loading");
    setError("");
    try {
      const [userResult, requestResult] = await Promise.all([fetchAdminUsers(), fetchAccessRequests()]);
      setUsers(userResult);
      setAccessRequests(requestResult);
      setStatus("complete");
    } catch (err) {
      setError(err.message || "Unable to load users.");
      setStatus("error");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await createAdminUser(form);
      setForm({ name: "", email: "", password: "", role: "user" });
      setMessage("User created.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to create user.");
    }
  }

  async function handleDeactivate(userId) {
    setMessage("");
    setError("");
    try {
      await deactivateAdminUser(userId);
      setMessage("User deactivated.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to deactivate user.");
    }
  }

  async function handleReactivate(userId) {
    setMessage("");
    setError("");
    try {
      await updateAdminUser(userId, { is_active: true });
      setMessage("User reactivated.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to reactivate user.");
    }
  }

  async function handleAccessRequestStatus(requestId, statusValue) {
    setMessage("");
    setError("");
    try {
      await updateAccessRequestStatus(requestId, statusValue);
      setMessage("Access request updated.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to update access request.");
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="admin-users-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Admin</p>
          <h2 id="admin-users-title">User Access</h2>
        </div>
        <button className="secondary-button" disabled={status === "loading"} onClick={loadUsers}>
          Refresh Users
        </button>
      </div>

      <form className="admin-user-form" onSubmit={handleCreateUser}>
        <div className="admin-form-field">
          <label htmlFor="new-name">Name</label>
          <input
            id="new-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="new-email">Email</label>
          <input
            id="new-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="new-password">Temporary password</label>
          <input
            id="new-password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="new-role">Role</label>
          <select
            id="new-role"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="user">user</option>
            {canCreateAdmin ? <option value="admin">admin</option> : null}
          </select>
        </div>

        <button className="primary-button" disabled={!form.name || !form.email || !form.password} type="submit">
          Create User
        </button>
      </form>

      {message ? <p className="export-success">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="report-filename">{user.name}</td>
                <td>{user.email}</td>
                <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                <td>
                  <span className={user.is_active ? "status-badge passed" : "status-badge inactive"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleString() : "--"}</td>
                <td>
                  {user.is_active && canToggleUser(currentUser, user) ? (
                    <button
                      className="secondary-button"
                      onClick={() => handleDeactivate(user.id)}
                      type="button"
                    >
                      Deactivate
                    </button>
                  ) : !user.is_active && canToggleUser(currentUser, user) ? (
                    <button
                      className="secondary-button"
                      onClick={() => handleReactivate(user.id)}
                      type="button"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <span className="protected-account-note">{getProtectedReason(currentUser, user)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-heading compact admin-subsection-heading">
        <div>
          <p className="section-kicker">Access Requests</p>
          <h2>Access Requests</h2>
        </div>
      </div>

      <div className="reports-table-wrap">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company/project</th>
              <th>Intended use</th>
              <th>Expected usage</th>
              <th>Status</th>
              <th>Created date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {accessRequests.map((request) => (
              <tr key={request.id}>
                <td className="report-filename">{request.full_name}</td>
                <td>{request.email}</td>
                <td>{request.company_or_project}</td>
                <td>{request.intended_use}</td>
                <td>{request.expected_usage}</td>
                <td>{request.status}</td>
                <td>{request.created_at ? new Date(request.created_at).toLocaleString() : "--"}</td>
                <td>
                  <select
                    aria-label={`Update status for ${request.full_name}`}
                    value={request.status}
                    onChange={(event) => handleAccessRequestStatus(request.id, event.target.value)}
                  >
                    <option value="pending">pending</option>
                    <option value="contacted">contacted</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!accessRequests.length ? <div className="reports-empty">No access requests yet.</div> : null}
      </div>
    </section>
  );
}

export default AdminUsers;
