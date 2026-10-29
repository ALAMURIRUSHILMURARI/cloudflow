/**
 * Live implementations of the CloudFlow services, backed by the AWS API (see cloudApi.js).
 * The mock services call into these when IS_LIVE is true.
 */

import { api, approverRoles, toApiType, toUi } from './cloudApi';

const SESSION_KEY = 'cloudflow_auth_session';

const currentUser = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.user || null; } catch { return null; }
};

let pendingFile = null;   // the form uploads before the request exists; we PUT it to S3 after create

export function holdUpload(file) {
  pendingFile = file;
  const size = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
  return { fileName: file.name, fileSize: size, s3Key: null, s3Url: null, uploadedAt: new Date().toISOString() };
}

async function uploadTo(requestId, file) {
  const contentType = file.type || 'application/octet-stream';
  const up = await api('POST', `/requests/${requestId}/upload-url`, { body: { filename: file.name, contentType } });
  const res = await fetch(up.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  return up.key;
}

async function queues(user) {
  const roles = approverRoles(user);
  const isAdmin = (user?.groups || []).includes('Admin');
  const lists = await Promise.all(roles.map((r) =>
    api('GET', '/requests', { role: isAdmin ? 'Admin' : r, queueRole: r }).then((d) => d.items).catch(() => [])));
  return lists.flat();
}

export async function getRequests() {
  const user = currentUser();
  const [mine, queued] = await Promise.all([api('GET', '/requests/mine').then((d) => d.items), queues(user)]);
  const byId = new Map();
  [...mine, ...queued].forEach((i) => byId.set(i.id, i));
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).map((i) => toUi(i, user));
}

export async function getPendingApprovals() {
  const user = currentUser();
  return (await queues(user)).map((i) => toUi(i, user));
}

export async function getRequestById(id) {
  return toUi(await api('GET', `/requests/${id}`), currentUser());
}

export async function createRequest({ type, title, priority = 'Normal', requester, data = {} }) {
  const amount = data.estimatedCost ?? data.amount;
  const details = data.businessJustification || data.description || data.reason || '';
  const created = await api('POST', '/requests', {
    body: { type: toApiType(type), title, priority, amount, details, data, requesterProfile: requester },
  });
  const named = data.attachment || data.receiptUpload;
  if (pendingFile && named === pendingFile.name) {
    const file = pendingFile;
    pendingFile = null;
    await uploadTo(created.id, file);
    return getRequestById(created.id);
  }
  return toUi(created, currentUser());
}

async function act(requestId, action, comment) {
  const item = await api('GET', `/requests/${requestId}`);
  const user = currentUser();
  const updated = await api('POST', `/requests/${requestId}/actions`, {
    role: item.pendingRole || 'Employee',
    body: { action, version: item.version, comment },
  });
  return toUi(updated, user);
}

export const approveRequest = (id, { comments } = {}) => act(id, 'APPROVE', comments || 'Approved');
export const rejectRequest = (id, { reason } = {}) => act(id, 'REJECT', reason || 'Rejected');

export const getStats = () => api('GET', '/stats');
export const getTelemetry = () => api('GET', '/telemetry');
export const getAudit = (id) => api('GET', `/requests/${id}/audit`);
