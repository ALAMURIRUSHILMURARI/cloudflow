import { useEffect, useState } from "react";
import { DEPARTMENTS, TYPES, fmtMs, fmtTime } from "./depts.js";
import { Chain } from "./Requests.jsx";

export function Approvals({ api, role, onTrack }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [comments, setComments] = useState({});

  async function load() {
    try { setItems((await api.call("GET", "/requests", { role })).items); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [role]);

  async function act(r, action) {
    try {
      await api.call("POST", `/requests/${r.id}/actions`, { role, body: { action, version: r.version, comment: comments[r.id] || "" } });
      setItems(items.filter(i => i.id !== r.id));
      setComments(({ [r.id]: _, ...rest }) => rest);
    } catch (e) { setError(e.message); load(); }
  }

  const shown = items;
  const now = Date.now();
  return (
    <section className="card wide">
      <h2>{DEPARTMENTS[role].label} approval queue <span className="pill">{shown.length}</span>
      </h2>
      {error && <p className="error">{error}</p>}
      {!shown.length && !error && <p className="muted">Nothing waiting on {DEPARTMENTS[role].label}.</p>}
      <div className="queue">
        {shown.map(r => {
          const waiting = now - (r.history?.[r.history.length - 1]?.at || r.createdAt);
          const escalated = r.escalatedStage === r.stage;
          const needsReceipt = TYPES[r.type]?.receipt && r.pendingRole === "Finance" && !r.attachments?.length;
          return (
            <div key={r.id} className={"item" + (escalated ? " escalated" : "")}>
              <div className="row">
                <div>
                  <b>{r.title}</b> {escalated && <span className="pill bad">escalated</span>}
                  <div className="muted small">{TYPES[r.type]?.label} from {r.requester} · {r.amount != null ? `amount ${r.amount} · ` : ""}
                    submitted {fmtTime(r.createdAt)} · waiting {fmtMs(waiting)}</div>
                  {r.details && <div className="small">{r.details}</div>}
                </div>
                <Chain r={r} />
              </div>
              <div className="row">
                <input placeholder="Comment (saved in the audit trail)" value={comments[r.id] || ""}
                       onChange={e => setComments({ ...comments, [r.id]: e.target.value })} />
                <button disabled={needsReceipt} title={needsReceipt ? "Waiting for the receipt upload" : ""}
                        onClick={() => act(r, "APPROVE")}>{DEPARTMENTS[role].verb || "Approve"}</button>
                <button className="bad" onClick={() => act(r, "REJECT")}>Reject</button>
                <button className="secondary" onClick={() => onTrack(r.id)}>Details</button>
              </div>
              {needsReceipt && <p className="muted small">Finance audit needs the employee's receipt first.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
