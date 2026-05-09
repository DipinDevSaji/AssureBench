export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function runAssurance(endpointUrl) {
  const response = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint_url: endpointUrl }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function exportJsonReport(runResult) {
  const response = await fetch(`${API_BASE}/reports/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runResult),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function exportPdfReport(runResult) {
  const response = await fetch(`${API_BASE}/reports/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runResult),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function fetchReports() {
  const response = await fetch(`${API_BASE}/reports`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.reports || [];
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
