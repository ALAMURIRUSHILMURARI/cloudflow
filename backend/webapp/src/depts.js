// What each Cognito group does in the approval chains (module 4, department action modules).
export const DEPARTMENTS = {
  Employee:    { label: "Employee", desc: "Submit and track your own requests" },
  Manager:     { label: "Manager", desc: "First approval on every request", verb: "Approve" },
  Procurement: { label: "Procurement", desc: "Vendor and quote check on purchases", verb: "Approve vendor & quote" },
  Finance:     { label: "Finance", desc: "Invoice audit and disbursement", verb: "Audit & disburse" },
  HR:          { label: "HR", desc: "Leave balance check and calendar", verb: "Approve & record leave" },
  IT:          { label: "IT Security", desc: "Access review and provisioning", verb: "Approve & provision" },
  Admin:       { label: "Admin", desc: "Any stage, escalations, analytics", verb: "Approve (admin)" },
};

export const TYPES = {
  PURCHASE: { label: "Purchase request", chain: ["Manager", "Procurement", "Finance"], amount: true },
  LEAVE: { label: "Leave application", chain: ["Manager", "HR"] },
  EXPENSE: { label: "Expense claim", chain: ["Manager", "Finance"], amount: true, receipt: true },
  IT_ACCESS: { label: "IT software access", chain: ["Manager", "IT"] },
};

export const fmtMs = ms => ms == null ? "–" : ms < 1000 ? `${Math.round(ms)} ms`
  : ms < 120000 ? `${(ms / 1000).toFixed(1)} s` : ms < 7200000 ? `${Math.round(ms / 60000)} min` : `${(ms / 3600000).toFixed(1)} h`;

export const fmtTime = t => t ? new Date(t).toLocaleString() : "";
