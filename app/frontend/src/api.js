// Thin wrapper around the HeLPR backend (FastAPI on :8000, proxied by Vite).
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      msg = (await res.json()).detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  overview: () => request("GET", "/api/dashboard/overview"),
  retailers: () => request("GET", "/api/retailers"),
  retailerOverview: (id) => request("GET", `/api/retailers/${id}/overview`),
  audits: (retailerId) => request("GET", `/api/audits${retailerId ? `?retailer_id=${retailerId}` : ""}`),
  todo: (runId) => request("GET", `/api/audits/${runId}/todo`),
  startAudit: (body) => request("POST", "/api/audits", body),
  overrideVerdict: (id, body) => request("PATCH", `/api/verdicts/${id}`, body),
  feedback: (id, body) => request("POST", `/api/verdicts/${id}/feedback`, body),
  rejudge: (id) => request("POST", `/api/verdicts/${id}/rejudge`),
  criteria: () => request("GET", "/api/criteria"),
  updateCriterion: (id, body) => request("PATCH", `/api/criteria/${id}`, body),
  notifications: () => request("GET", "/api/notifications"),
  readAll: () => request("POST", "/api/notifications/read-all"),
  schedule: () => request("GET", "/api/settings/schedule"),
  setSchedule: (body) => request("PUT", "/api/settings/schedule", body),
  defaults: () => request("GET", "/api/settings/audit-defaults"),
  setDefaults: (body) => request("PUT", "/api/settings/audit-defaults", body),
  aiStatus: () => request("GET", "/api/ai/status"),
  simulate: (body) => request("POST", "/api/ai/simulate", body),
};

export const reportUrl = (runId, kind) => `/api/audits/${runId}/report.${kind}`;

// Reviewer name, remembered in the browser (no login in the prototype).
export function reviewerName() {
  try {
    return localStorage.getItem("helpr.reviewer") || "";
  } catch {
    return "";
  }
}
export function setReviewerName(name) {
  try {
    localStorage.setItem("helpr.reviewer", name);
  } catch {}
}
