// API client: Cognito sign-in on every stack, and client-side failover to the DR stack when the
// primary stops answering (same rule the Raspberry Pi uses, so the browser survives the chaos drill too).

const FAILOVER_AFTER = 2;

export class Api {
  constructor(endpoints) {
    this.endpoints = endpoints.filter(e => e.url).map(e => ({ ...e, url: e.url.replace(/\/$/, "") }));
    this.active = 0;
    this.fails = 0;
    this.tokens = {};          // endpoint name -> id token
    this.listeners = new Set();
    this.user = null;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach(fn => fn()); }
  get activeEndpoint() { return this.endpoints[this.active]; }

  async health(ep) {
    const r = await fetch(ep.url + "/health");
    if (!r.ok) throw new Error(`health HTTP ${r.status}`);
    return r.json();
  }

  // Signs in to every stack that is up; at least one must succeed.
  async signIn(username, password) {
    const errors = [];
    for (const ep of this.endpoints) {
      try {
        const h = await this.health(ep);
        ep.cloud = h.cloud; ep.region = h.region;
        if (h.auth?.type !== "cognito") { this.tokens[ep.name] = { bearer: password }; continue; }
        const r = await fetch(`https://cognito-idp.${h.auth.region}.amazonaws.com/`, {
          method: "POST",
          headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth" },
          body: JSON.stringify({ AuthFlow: "USER_PASSWORD_AUTH", ClientId: h.auth.clientId,
                                 AuthParameters: { USERNAME: username, PASSWORD: password } }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || data.__type || `HTTP ${r.status}`);
        const token = data.AuthenticationResult.IdToken;
        this.tokens[ep.name] = { bearer: token, claims: decode(token) };
      } catch (e) {
        errors.push(`${ep.name}: ${e.message}`);
      }
    }
    const signed = this.endpoints.filter(ep => this.tokens[ep.name]);
    if (!signed.length) throw new Error(errors.join("; ") || "no API configured");
    this.active = this.endpoints.indexOf(signed[0]);
    const claims = signed.map(ep => this.tokens[ep.name].claims).find(Boolean);
    // Shared-token stacks (local server, GCP) have no groups; the token holder may act as any role.
    this.user = claims ? { name: claims["cognito:username"] || username, groups: claims["cognito:groups"] || [] }
                       : { name: username, groups: ["Admin"] };
    this.emit();
    return this.user;
  }

  signOut() { this.tokens = {}; this.user = null; this.emit(); }

  async call(method, path, { role = "Employee", body } = {}) {
    const order = [this.active, ...this.endpoints.map((_, i) => i).filter(i => i !== this.active)];
    let lastErr;
    for (const i of order) {
      const ep = this.endpoints[i];
      if (!this.tokens[ep.name]) continue;
      try {
        const r = await fetch(ep.url + path, {
          method,
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + this.tokens[ep.name].bearer,
                     "X-Role": role, "X-User": this.user?.name || "web" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await r.json().catch(() => ({}));
        if (r.status === 401) { this.signOut(); throw new ApiError(401, "Session expired, sign in again"); }
        if (r.status >= 500) throw new Error(data.message || `HTTP ${r.status}`);
        this.fails = 0;
        if (i !== this.active) { this.active = i; this.emit(); }       // failover happened
        if (!r.ok) throw new ApiError(r.status, data.error || data.message || `HTTP ${r.status}`);
        return data;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        lastErr = e;
        if (i === this.active && ++this.fails < FAILOVER_AFTER) throw e;   // one blip is not an outage
      }
    }
    throw lastErr || new Error("no reachable cloud");
  }

  // Back to the primary once it answers health checks again.
  async checkFailback() {
    if (this.active === 0 || !this.tokens[this.endpoints[0].name]) return;
    try { await this.health(this.endpoints[0]); this.active = 0; this.fails = 0; this.emit(); } catch { /* still down */ }
  }
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function decode(jwt) {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch { return {}; }
}
