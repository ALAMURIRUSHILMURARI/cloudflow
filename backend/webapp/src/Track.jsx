import { useEffect, useState } from "react";
import { TYPES, fmtMs, fmtTime } from "./depts.js";
import { Chain, Status } from "./Requests.jsx";

export function Track({ api, initialId }) {
  const [id, setId] = useState(initialId || "");
  const [req, setReq] = useState(null);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");

  async function load(rid = id) {
    if (!rid.trim()) return;
    try {
      const r = await api.call("GET", `/requests/${rid.trim()}`);
      setReq(r);
      setAudit((await api.call("GET", `/requests/${rid.trim()}/audit`)).entries);
      setError("");
    } catch (e) { setReq(null); setAudit([]); setError(e.message); }
  }
  useEffect(() => { if (initialId) load(initialId); }, [initialId]);

  return (
    <div className="grid">
      <section className="card wide">
        <h2>Track a request</h2>
        <form className="row" onSubmit={e => { e.preventDefault(); load(); }}>
          <input placeholder="Request ID" value={id} onChange={e => setId(e.target.value)} />
          <button>Show</button>
        </form>
        {error && <p className="error">{error}</p>}
        {req && <>
          <h3>{req.title} <Status r={req} /></h3>
          <p className="muted">{TYPES[req.type]?.label} from {req.requester}{req.amount != null ? `, amount ${req.amount}` : ""}
            {req.turnaroundMs != null ? ` · turnaround ${fmtMs(req.turnaroundMs)}` : ""}{req.outcome ? ` · ${req.outcome}` : ""}</p>
          <Chain r={req} />
          <h3>History</h3>
          <ol className="timeline">
            {req.history.map((h, i) => (
              <li key={i} className={h.action.toLowerCase()}>
                <b>{h.action}</b> by {h.by} ({h.role}) <span className="muted small">{fmtTime(h.at)}</span>
                {h.comment && <div className="small">“{h.comment}”</div>}
              </li>))}
          </ol>
          {!!req.attachments?.length && <p className="small">Attachments in encrypted S3: {req.attachments.join(", ")}</p>}
        </>}
      </section>
      {req && <section className="card wide">
        <h2>Immutable audit ledger</h2>
        <p className="muted small">Written once by the DynamoDB Streams function for every state change. The SHA-256 fingerprint covers the full record at that version, so any later edit would show up as a mismatch.</p>
        <table>
          <thead><tr><th>Time</th><th>Event</th><th>By</th><th>Version</th><th>SHA-256</th></tr></thead>
          <tbody>{audit.map((a, i) => (
            <tr key={i}><td>{fmtTime(a.at)}</td><td>{a.event}</td><td>{a.actor} {a.actorRole && <span className="muted">({a.actorRole})</span>}</td>
              <td>v{a.version}</td><td className="mono">{a.sha256 ? a.sha256.slice(0, 20) + "…" : ""}</td></tr>))}
          </tbody>
        </table>
        {!audit.length && <p className="muted">The ledger entry appears a second or two after each change.</p>}
      </section>}
    </div>
  );
}
