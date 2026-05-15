export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "assurebench.authToken";

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function parseError(response) {
  try {
    const payload = await response.json();
    return payload.detail || `Request failed with ${response.status}`;
  } catch {
    return (await response.text()) || `Request failed with ${response.status}`;
  }
}

async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredToken();
    }
    throw new Error(await parseError(response));
  }

  return response;
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function submitAccessRequest(request) {
  const response = await fetch(`${API_BASE}/access-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function fetchCurrentUser() {
  const response = await apiFetch("/auth/me");
  return response.json();
}

export async function fetchAnalysisConfig() {
  const response = await apiFetch("/analysis/config");
  return response.json();
}

export async function fetchAdminUsers() {
  const response = await apiFetch("/admin/users");
  const payload = await response.json();
  return payload.users || [];
}

export async function createAdminUser(user) {
  const response = await apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
  return response.json();
}

export async function changePassword(payload) {
  const response = await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function updateAdminUser(userId, payload) {
  const response = await apiFetch(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deactivateAdminUser(userId) {
  const response = await apiFetch(`/admin/users/${userId}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function fetchAccessRequests() {
  const response = await apiFetch("/admin/access-requests");
  const payload = await response.json();
  return payload.access_requests || [];
}

export async function updateAccessRequestStatus(requestId, status) {
  const response = await apiFetch(`/admin/access-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return response.json();
}

export async function runAssurance(endpointUrl) {
  const response = await apiFetch("/runs", {
    method: "POST",
    body: JSON.stringify({ endpoint_url: endpointUrl }),
  });

  return response.json();
}

export async function exportJsonReport(runResult) {
  const response = await apiFetch("/reports/json", {
    method: "POST",
    body: JSON.stringify(runResult),
  });

  return response.json();
}

export async function exportPdfReport(runResult) {
  const response = await apiFetch("/reports/pdf", {
    method: "POST",
    body: JSON.stringify(runResult),
  });

  return response.json();
}

export async function generateRemediationPackage(runId, format = "markdown") {
  const response = await apiFetch("/remediation/package", {
    method: "POST",
    body: JSON.stringify({ run_id: runId, format }),
  });

  return response.json();
}

export async function fetchReports() {
  const response = await apiFetch("/reports");

  const data = await response.json();
  return data.reports || [];
}

export async function deleteReport(filename) {
  const response = await apiFetch(`/reports/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });

  return response.json();
}

export async function fetchReportFile(report) {
  const path = report.download_url || `/reports/${encodeURIComponent(report.filename)}`;
  const response = await apiFetch(path);
  return response.blob();
}

export function getReportUrl(filename) {
  return `${API_BASE}/reports/${encodeURIComponent(filename)}`;
}

export function getReportDownloadUrl(report) {
  if (report.download_url) {
    return `${API_BASE}${report.download_url}`;
  }

  return getReportUrl(report.filename);
}
