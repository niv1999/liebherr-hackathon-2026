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
  aiConnections: () => request("GET", "/api/ai/connections"),
  addAiConnection: (body) => request("POST", "/api/ai/connections", body),
  activateAiConnection: (id) => request("POST", `/api/ai/connections/${id}/activate`),
  deleteAiConnection: (id) => request("DELETE", `/api/ai/connections/${id}`),
  markFixed: (runId, criterionId, by) => request("POST", `/api/audits/${runId}/todo/${criterionId}/fixed`, { by }),
  createCriterion: (body) => request("POST", "/api/criteria", body),
  deleteCriterion: (id) => request("DELETE", `/api/criteria/${id}`),
  products: () => request("GET", "/api/products"),
  createProduct: (body) => request("POST", "/api/products", body),
  updateProduct: (id, body) => request("PATCH", `/api/products/${id}`, body),
  deleteProduct: (id) => request("DELETE", `/api/products/${id}`),
  allRetailers: () => request("GET", "/api/retailers?include_inactive=true"),
  createRetailer: (body) => request("POST", "/api/retailers", body),
  updateRetailer: (id, body) => request("PATCH", `/api/retailers/${id}`, body),
  deleteRetailer: (id) => request("DELETE", `/api/retailers/${id}`),
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
