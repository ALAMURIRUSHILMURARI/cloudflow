/**
 * CloudFlow live backend client (AWS primary + DR stack).
 *
 * Used when VITE_MOCK_MODE=false and VITE_API_BASE_URL is set. Each stack has its own Cognito
 * user pool; GET /health tells us its region and app client id, so the only build settings are
 * the two API URLs. Requests go to the active stack. After 2 failed calls the client switches to
 * the other one, and a health monitor switches back once the primary answers 3 checks in a row.
 */

import { MOCK_USERS, WORKFLOW_DEFINITIONS } from '../data/mockData';

const env = import.meta.env;
const clean = (u) => (u || '').trim().replace(/\/+$/, '');

export const ENDPOINTS = [
  { name: 'AWS primary', url: clean(env.VITE_API_BASE_URL) },
  { name: 'AWS DR', url: clean(env.VITE_API_SECONDARY_URL) },
].filter((e) => /^https?:\/\//.test(e.url));

export const IS_LIVE = env.VITE_MOCK_MODE === 'false' && ENDPOINTS.length > 0;

const TOKENS_KEY = 'cloudflow_live_tokens';
const TIMEOUT_MS = 6000;
const FAILOVER_AFTER = 2;
const FAILBACK_AFTER = 3;

const TYPE_TO_UI = { PURCHASE: 'purchase', LEAVE: 'leave', EXPENSE: 'expense', IT_ACCESS: 'software' };
const TYPE_TO_API = { purchase: 'PURCHASE', leave: 'LEAVE', expense: 'EXPENSE', software: 'IT_ACCESS' };
const APPROVER_ROLES = ['Manager', 'Procurement', 'Finance', 'HR', 'IT'];
const CHAIN_LENGTH = { PURCHASE: 3, LEAVE: 2, EXPENSE: 2, IT_ACCESS: 2 };

let active = 0;
let failures = 0;
let healthyPrimary = 0;
let password = null;         // memory only; refresh tokens cover page reloads
const authInfo = {};         // endpoint url -> { region, clientId }
const listeners = new Set();
let monitor = null;

const loadTokens = () => {
  try { return JSON.parse(sessionStorage.getItem(TOKENS_KEY)) || {}; } catch { return {}; }
};
let tokens = loadTokens();   // { username, byUrl: { [url]: { idToken, refreshToken, exp } } }
const saveTokens = () => {
  try { sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch { /* private mode */ }
};

export const status = () => ({
  live: IS_LIVE,
  active: ENDPOINTS[active]?.name,
  url: ENDPOINTS[active]?.url,
  failedOver: active !== 0,
  endpoints: ENDPOINTS.length,
});

export const onStatusChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((fn) => fn(status()));

const switchTo = (idx) => {
  if (idx === active || !ENDPOINTS[idx]) return;
  active = idx;
  failures = 0;
  healthyPrimary = 0;
  emit();
};

async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const decodeJwt = (jwt) => {
  const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(part))));
};

async function discoverAuth(url) {
  if (authInfo[url]) return authInfo[url];
  const res = await timedFetch(`${url}/health`);
  if (!res.ok) throw new Error(`health check failed (${res.status})`);
  const body = await res.json();
  if (body.auth?.type !== 'cognito') throw new Error('this API is not running in Cognito mode');
  authInfo[url] = body.auth;
  return body.auth;
}

async function cognito(region, target, payload) {
  const res = await timedFetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Cognito error ${res.status}`);
  if (body.ChallengeName) throw new Error(`Cognito asks for ${body.ChallengeName}; finish it in the AWS console first`);
  return body.AuthenticationResult;
}

async function signIn(url, username, pwd) {
  const { region, clientId } = await discoverAuth(url);
  const r = await cognito(region, 'InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH', ClientId: clientId,
    AuthParameters: { USERNAME: username, PASSWORD: pwd },
  });
  tokens.byUrl = { ...(tokens.byUrl || {}), [url]: { idToken: r.IdToken, refreshToken: r.RefreshToken, exp: Date.now() + r.ExpiresIn * 1000 } };
  saveTokens();
  return r.IdToken;
}

async function refresh(url) {
  const t = tokens.byUrl?.[url];
  if (!t?.refreshToken) return null;
  const { region, clientId } = await discoverAuth(url);
  const r = await cognito(region, 'InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH', ClientId: clientId,
    AuthParameters: { REFRESH_TOKEN: t.refreshToken },
  });
  tokens.byUrl[url] = { ...t, idToken: r.IdToken, exp: Date.now() + r.ExpiresIn * 1000 };
  saveTokens();
  return r.IdToken;
}

async function idTokenFor(url, force = false) {
  const t = tokens.byUrl?.[url];
  if (!force && t?.idToken && t.exp > Date.now() + 60_000) return t.idToken;
  try {
    const fresh = await refresh(url);
    if (fresh) return fresh;
  } catch { /* fall through to a password sign-in */ }
  if (password && tokens.username) return signIn(url, tokens.username, password);
  throw Object.assign(new Error('Session expired on this stack, please sign in again'), { status: 401 });
}

/** Sign in on every stack we can reach, so a failover later needs no second login. */
export async function login(username, pwd) {
  username = username.trim();
  let idToken = null;
  let lastErr = null;
  tokens = { username, byUrl: {} };
  for (const ep of ENDPOINTS) {
    try {
      const tok = await signIn(ep.url, username, pwd);
      idToken = idToken || tok;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!idToken) {
    tokens = {};
    saveTokens();
    throw lastErr || new Error('Sign-in failed');
  }
  password = pwd;
  if (!tokens.byUrl[ENDPOINTS[active].url]) switchTo(ENDPOINTS.findIndex((e) => tokens.byUrl[e.url]));
  return { idToken, claims: decodeJwt(idToken) };
}

export function logout() {
  password = null;
  tokens = {};
  try { sessionStorage.removeItem(TOKENS_KEY); } catch { /* ignore */ }
}

export function currentClaims() {
  const t = Object.values(tokens.byUrl || {})[0];
  if (!t?.idToken) return null;
  try { return decodeJwt(t.idToken); } catch { return null; }
}

export const groupsOf = (claims) => {
  const g = claims?.['cognito:groups'] || [];
  return Array.isArray(g) ? g : String(g).replace(/[[\],]/g, ' ').split(/\s+/).filter(Boolean);
};

/** Turn Cognito claims into the user object the rest of the UI expects. */
export function userFromClaims(claims) {
  const username = claims['cognito:username'] || claims.email || claims.sub;
  const groups = groupsOf(claims);
  const roleKey = groups.includes('Admin') ? 'admin' : groups.some((g) => APPROVER_ROLES.includes(g)) ? 'manager' : 'employee';
  const known = MOCK_USERS.find((u) => u.email.toLowerCase() === String(claims.email || username).toLowerCase())
    || MOCK_USERS.find((u) => u.roleKey === roleKey);
  const role = roleKey === 'admin' ? 'Administrator' : roleKey === 'manager' ? (groups.filter((g) => APPROVER_ROLES.includes(g)).join(' / ') || 'Manager') : 'Employee';
  return {
    ...known,
    id: claims.sub,
    username,
    email: claims.email || (username.includes('@') ? username : known?.email),
    name: known && known.email.toLowerCase() === String(username).toLowerCase() ? known.name : username,
    role,
    roleKey,
    groups,
  };
}

/** One API call with failover. role is sent as X-Role (must be one of the user's groups, or Admin). */
export async function api(method, path, { body, role = 'Employee', queueRole } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < ENDPOINTS.length + 1; attempt++) {
    const ep = ENDPOINTS[active];
    try {
      const send = async (force) => {
        const headers = { Authorization: `Bearer ${await idTokenFor(ep.url, force)}`, 'X-Role': role };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (queueRole) headers['X-Queue-Role'] = queueRole;
        return timedFetch(`${ep.url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      };
      let res = await send(false);
      if (res.status === 401) res = await send(true);
      if (res.status >= 500) throw Object.assign(new Error(`${ep.name} returned ${res.status}`), { retry: true });
      failures = 0;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
      return data;
    } catch (err) {
      lastErr = err;
      const transient = err.retry || err.name === 'AbortError' || err instanceof TypeError;
      if (!transient) throw err;
      failures += 1;
      if (failures >= FAILOVER_AFTER && ENDPOINTS.length > 1) switchTo((active + 1) % ENDPOINTS.length);
      else if (ENDPOINTS.length === 1 || attempt >= 1) break;
    }
  }
  throw lastErr;
}

/** Background health checks: failover when the active stack is down, failback when primary recovers. */
export function startMonitor(intervalMs = 10_000) {
  if (monitor || !IS_LIVE) return;
  const tick = async () => {
    const check = async (url) => {
      try { return (await timedFetch(`${url}/health`)).ok; } catch { return false; }
    };
    if (active === 0) {
      if (await check(ENDPOINTS[0].url)) failures = 0;
      else if (++failures >= FAILOVER_AFTER && ENDPOINTS.length > 1) switchTo(1);
    } else if (await check(ENDPOINTS[0].url)) {
      if (++healthyPrimary >= FAILBACK_AFTER) switchTo(0);
    } else {
      healthyPrimary = 0;
    }
  };
  monitor = setInterval(tick, intervalMs);
}

export const toApiType = (t) => TYPE_TO_API[t] || 'PURCHASE';

/** Map a backend request item to the shape the CloudFlow pages render. */
export function toUi(item, user) {
  const type = TYPE_TO_UI[item.type] || 'purchase';
  const steps = WORKFLOW_DEFINITIONS[type].steps;
  const humanStages = CHAIN_LENGTH[item.type] || 2;
  const decisions = (item.history || []).filter((h) => h.action === 'APPROVE' || h.action === 'REJECT');
  const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
  const profile = item.requesterProfile || {};
  const escalated = item.escalatedStage === item.stage && item.status === 'PENDING';

  const stepHistory = steps.map((step, idx) => {
    if (idx === 0) {
      return { stepId: step.id, label: step.label, status: 'Approved', actor: profile.name || item.requester,
               timestamp: iso(item.createdAt), notes: 'Submitted requisition' };
    }
    if (idx <= humanStages) {
      const d = decisions[idx - 1];
      if (d) {
        return { stepId: step.id, label: step.label, status: d.action === 'APPROVE' ? 'Approved' : 'Rejected',
                 actor: d.by, timestamp: iso(d.at), notes: d.comment || (d.action === 'APPROVE' ? 'Approved' : 'Rejected') };
      }
      if (item.status === 'PENDING' && idx === item.stage + 1) {
        return { stepId: step.id, label: step.label, status: 'Pending', actor: item.pendingRole, timestamp: null,
                 notes: escalated ? `Escalated: waiting on ${item.pendingRole} longer than the 2 h target` : `Awaiting ${step.label} review` };
      }
    } else if (item.status === 'COMPLETED') {
      return { stepId: step.id, label: step.label, status: 'Approved', actor: step.role, timestamp: iso(item.completedAt),
               notes: idx === humanStages + 1 ? item.outcome || 'Completed automatically' : 'Completed automatically' };
    }
    return { stepId: step.id, label: step.label, status: item.status === 'REJECTED' ? 'Cancelled' : 'Upcoming',
             actor: step.role, timestamp: null,
             notes: item.status === 'REJECTED' ? 'Cancelled due to upstream rejection' : 'Pending prior workflow approval' };
  });

  const rejectedIdx = stepHistory.findIndex((s) => s.status === 'Rejected');
  const groups = user?.groups || [];
  return {
    id: item.id,
    type,
    title: item.title,
    requester: {
      name: profile.name || item.requester,
      email: profile.email || '',
      department: profile.department || '',
      employeeId: profile.employeeId || '',
    },
    status: { PENDING: 'Pending', COMPLETED: 'Approved', REJECTED: 'Rejected' }[item.status] || item.status,
    currentStepIndex: item.status === 'PENDING' ? item.stage + 1 : item.status === 'COMPLETED' ? steps.length - 1 : rejectedIdx,
    currentStep: item.status === 'PENDING' ? steps[item.stage + 1]?.label || item.pendingRole
      : item.status === 'COMPLETED' ? 'Completed' : 'Rejected',
    priority: item.priority || 'Normal',
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
    workflow: steps,
    stepHistory,
    data: { ...(item.data || {}), amount: item.data?.amount ?? item.amount ?? undefined, attachments: item.attachments || [] },
    // live-only fields
    version: item.version,
    pendingRole: item.pendingRole,
    escalated,
    canAct: item.status === 'PENDING' && (groups.includes('Admin') || groups.includes(item.pendingRole)),
    servedBy: ENDPOINTS[active]?.name,
  };
}

export const approverRoles = (user) =>
  (user?.groups || []).includes('Admin') ? APPROVER_ROLES : (user?.groups || []).filter((g) => APPROVER_ROLES.includes(g));
