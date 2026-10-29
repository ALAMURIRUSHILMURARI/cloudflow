import { useEffect, useState } from "react";
import { TYPES, fmtMs, fmtTime } from "./depts.js";

const key = user => `wf2_mine_${user}`;
const loadIds = user => { try { return JSON.parse(localStorage.getItem(key(user)) || "[]"); } catch { return []; } };
const saveIds = (user, ids) => { try { localStorage.setItem(key(user), JSON.stringify(ids.slice(0, 50))); } catch { /* ignore */ } };

export function Status({ r }) {
  const cls = r.status === "COMPLETED" ? "ok" : r.status === "REJECTED" ? "bad" : "pending";
  return <span className={"pill " + cls}>{r.status === "PENDING" ? `waiting on ${r.pendingRole}` : r.status.toLowerCase()}
    {r.escalatedStage === r.stage && r.status === "PENDING" ? " · escalated" : ""}</span>;
}

export function Chain({ r }) {
  const chain = TYPES[r.type]?.chain || [];
  return <div className="chain">
    {chain.map((role, i) => {
      const state = r.status === "REJECTED" && i === r.stage ? "bad" : i < r.stage || r.status === "COMPLETED" ? "done"
        : i === r.stage && r.status === "PENDING" ? "now" : "";
      return <span key={role} className={"step " + state}>{role}</span>;
    })}
  </div>;
}

export function Requests({ api, onTrack }) {
  const user = api.user.name;
  const [form, setForm] = useState({ type: "PURCHASE", title: "", amount: "", details: "" });
  const [mine, setMine] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const ids = loadIds(user);
    const rows = await Promise.all(ids.map(id => api.call("GET", `/requests/${id}`).catch(() => null)));
    setMine(rows.filter(Boolean));
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await api.call("POST", "/requests", { body: { ...form, amount: TYPES[form.type].amount ? form.amount : undefined } });
      saveIds(user, [r.id, ...loadIds(user)]);
      setMsg(`Submitted ${r.id}. It is now waiting on ${r.pendingRole}.`);
      setForm({ ...form, title: "", amount: "", details: "" });
      refresh();
    } catch (err) { setMsg("Error: " + err.message); }
    finally { setBusy(false); }
  }

  async function upload(r, file) {
    if (!file) return;
    try {
      const u = await api.call("POST", `/requests/${r.id}/upload-url`, { body: { filename: file.name, contentType: file.type || "application/octet-stream" } });
      const res = await fetch(u.uploadUrl, { method: "PUT", headers: { "Content-Type": u.contentType }, body: file });
      setMsg(res.ok ? `Receipt stored in encrypted S3 as ${u.key}` : `S3 upload failed (HTTP ${res.status})`);
      refresh();
    } catch (err) { setMsg("Error: " + err.message); }
  }

  const t = TYPES[form.type];
  return (
    <div className="grid">
      <section className="card">
        <h2>New request</h2>
        <form onSubmit={submit}>
          <label>Type
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <p className="muted small">Approval chain: {t.chain.join(" → ")}{t.receipt ? " (receipt needed before Finance)" : ""}</p>
          <label>Title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} minLength={3} maxLength={200} required /></label>
          {t.amount && <label>Amount<input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></label>}
          <label>Details<textarea rows={3} value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} /></label>
          <button disabled={busy}>Submit</button>
        </form>
        {msg && <p className="note">{msg}</p>}
      </section>
      <section className="card wide">
        <h2>My requests <button className="secondary small" onClick={refresh}>Refresh</button></h2>
        {!mine.length && <p className="muted">Nothing submitted from this browser yet.</p>}
        <table>
          <thead><tr><th>Request</th><th>Progress</th><th>Status</th><th>Turnaround</th><th /></tr></thead>
          <tbody>{mine.map(r => (
            <tr key={r.id}>
              <td><b>{r.title}</b><div className="muted small">{[TYPES[r.type]?.label, r.amount, fmtTime(r.createdAt)].filter(v => v != null && v !== "").join(" · ")}</div></td>
              <td><Chain r={r} /></td>
              <td><Status r={r} /></td>
              <td>{fmtMs(r.turnaroundMs)}</td>
              <td className="actions">
                <button className="secondary small" onClick={() => onTrack(r.id)}>Track</button>
                {TYPES[r.type]?.receipt && r.status === "PENDING" && !r.attachments?.length &&
                  <label className="upload small">Upload receipt<input type="file" onChange={e => upload(r, e.target.files[0])} /></label>}
              </td>
            </tr>))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
