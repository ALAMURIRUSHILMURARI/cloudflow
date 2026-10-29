import { useEffect, useMemo, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Api } from "./api.js";
import { Requests } from "./Requests.jsx";
import { Approvals } from "./Approvals.jsx";
import { Track } from "./Track.jsx";
import { Analytics } from "./Analytics.jsx";
import { DEPARTMENTS } from "./depts.js";

const store = {
  get(k, d = "") { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

function SignIn({ onDone }) {
  const cfg = window.APP_CONFIG || {};
  const [primary, setPrimary] = useState(cfg.primaryUrl || store.get("wf2_primary"));
  const [secondary, setSecondary] = useState(cfg.secondaryUrl || store.get("wf2_secondary"));
  const [user, setUser] = useState(store.get("wf2_user", "employee1"));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    store.set("wf2_primary", primary); store.set("wf2_secondary", secondary); store.set("wf2_user", user);
    const api = new Api([{ name: "primary", url: primary }, { name: "secondary", url: secondary }]);
    try { await api.signIn(user.trim(), password); onDone(api); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="signin">
      <form className="card" onSubmit={submit}>
        <h1>Workflow Approvals</h1>
        <p className="muted">Purchase, leave, expense and IT access approvals on a serverless multi-cloud backend.</p>
        {!cfg.primaryUrl && <>
          <label>Primary API URL<input value={primary} onChange={e => setPrimary(e.target.value)} required /></label>
          <label>DR API URL (optional)<input value={secondary} onChange={e => setSecondary(e.target.value)} /></label>
        </>}
        <label>Username<input value={user} onChange={e => setUser(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && <p className="error">{error}</p>}
        <p className="muted small">Demo users: employee1, manager1, procurement1, finance1, hr1, it1, admin1</p>
      </form>
    </div>
  );
}

function Shell({ api, onSignOut }) {
  useEffect(() => { const t = setInterval(() => api.checkFailback(), 10000); return () => clearInterval(t); }, [api]);

  const roles = useMemo(() => {
    const g = api.user?.groups || [];
    return ["Employee", ...Object.keys(DEPARTMENTS).filter(r => r !== "Employee" && (g.includes(r) || g.includes("Admin")))];
  }, [api.user]);
  const [role, setRole] = useState(roles[roles.length > 1 ? 1 : 0]);
  const tabs = role === "Employee" ? ["My requests", "Track", "Analytics"] : ["Approvals", "Track", "Analytics"];
  const [tab, setTab] = useState(tabs[0]);
  const [trackId, setTrackId] = useState("");
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [role]);

  const openTrack = useCallback(id => { setTrackId(id); setTab("Track"); }, []);
  const ep = api.activeEndpoint;
  const onDr = api.active !== 0;

  return (
    <div>
      <header>
        <h1>Workflow Approvals</h1>
        <span className={"cloud " + (onDr ? "dr" : "")} title={ep.url}>
          {onDr ? "⚠ running on DR stack" : "● primary"} · {ep.cloud || "aws"} {ep.region || ""}
        </span>
        <div className="spacer" />
        <label className="inline">Acting as
          <select value={role} onChange={e => setRole(e.target.value)}>
            {roles.map(r => <option key={r} value={r}>{DEPARTMENTS[r].label}</option>)}
          </select>
        </label>
        <span className="muted">{api.user.name}</span>
        <button className="secondary" onClick={() => { api.signOut(); onSignOut(); }}>Sign out</button>
      </header>
      <nav>
        {tabs.map(t => <button key={t} className={t === tab ? "tab active" : "tab"} onClick={() => setTab(t)}>{t}</button>)}
        <span className="muted small">{DEPARTMENTS[role].desc}</span>
      </nav>
      <main>
        {tab === "My requests" && <Requests api={api} onTrack={openTrack} />}
        {tab === "Approvals" && <Approvals api={api} role={role} onTrack={openTrack} />}
        {tab === "Track" && <Track api={api} initialId={trackId} />}
        {tab === "Analytics" && <Analytics api={api} />}
      </main>
    </div>
  );
}

function App() {
  const [api, setApi] = useState(null);
  const [, force] = useState(0);
  useEffect(() => api ? api.onChange(() => force(n => n + 1)) : undefined, [api]);   // failover, sign-out on expiry
  return api?.user ? <Shell api={api} onSignOut={() => setApi(null)} /> : <SignIn onDone={setApi} />;
}

createRoot(document.getElementById("root")).render(<App />);
