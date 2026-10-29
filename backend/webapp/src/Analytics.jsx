import { useEffect, useState } from "react";
import { TYPES, fmtMs } from "./depts.js";

const SOURCE = { web: "People (web app)", "edge-pi": "Raspberry Pi load test" };

function LatencyChart({ points }) {
  if (points.length < 2) return <p className="muted">The chart fills in as the Pi reports (one point per minute).</p>;
  const W = 900, H = 220, L = 50, B = 26, T = 12;
  const max = Math.max(2300, ...points.map(p => p.p95 || 0)) * 1.1;
  const x = i => L + i * (W - L - 12) / (points.length - 1);
  const y = v => H - B - v / max * (H - B - T);
  const line = pts => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="p95 latency per minute">
      {[0, 500, 1000, 1500, 2000].map(v => <g key={v}>
        <line x1={L} x2={W - 12} y1={y(v)} y2={y(v)} className="grid" />
        <text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{v}</text></g>)}
      <line x1={L} x2={W - 12} y1={y(2000)} y2={y(2000)} className="slo" />
      <text x={W - 14} y={y(2000) - 5} textAnchor="end" className="slo-label">SLO p95 2000 ms</text>
      {points.map((p, i) => (p.events || []).some(e => e.startsWith("FAIL")) &&
        <g key={i}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} className="event" />
          <text x={x(i) + 4} y={T + 10} className="event-label">{p.events.filter(e => e.startsWith("FAIL")).join(", ").toLowerCase()}</text></g>)}
      <path d={line(points.map(p => p.p50 || 0))} className="p50" />
      <path d={line(points.map(p => p.p95 || 0))} className="p95" />
      <text x={L} y={H - 6} className="axis">{new Date(points[0].ts).toLocaleTimeString()}</text>
      <text x={W - 12} y={H - 6} textAnchor="end" className="axis">{new Date(points[points.length - 1].ts).toLocaleTimeString()}</text>
    </svg>
  );
}

export function Analytics({ api }) {
  const [stats, setStats] = useState([]);
  const [tel, setTel] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [s, t] = await Promise.all([api.call("GET", "/stats"), api.call("GET", "/telemetry")]);
      setStats(s.items); setTel(t.items.slice().reverse()); setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  const last = tel[tel.length - 1];
  const recent = tel.slice(-30);
  const calls = recent.reduce((a, s) => a + (s.count || 0), 0);
  const errs = recent.reduce((a, s) => a + (s.errors || 0), 0);
  return (
    <div className="grid">
      {error && <p className="error">{error}</p>}
      <section className="card wide">
        <h2>Edge-measured latency (Raspberry Pi)</h2>
        <div className="kpis">
          <div><span>p95 now</span><b className={last && last.p95 < 2000 ? "ok" : "bad"}>{fmtMs(last?.p95)}</b></div>
          <div><span>load</span><b>{last ? `${Math.round(last.reqPerMin)}/min` : "–"}</b></div>
          <div><span>success, last 30 min</span><b>{calls ? `${(100 * (1 - errs / calls)).toFixed(2)} %` : "–"}</b></div>
          <div><span>serving cloud</span><b>{last?.activeCloud || "–"}</b></div>
          <div><span>Pi CPU</span><b>{last?.pi?.cpuTempC ? `${last.pi.cpuTempC} °C` : "–"}</b></div>
        </div>
        <LatencyChart points={recent} />
        <p className="muted small"><span className="key p95" /> p95 <span className="key p50" /> p50, one point per minute as reported by the Pi; orange lines mark failover and failback.</p>
      </section>
      <section className="card wide">
        <h2>Approval turnaround</h2>
        <p className="muted small">Target from the SMART objectives: requests decided in under 2 hours (down from 3–7 days by email).</p>
        <table>
          <thead><tr><th>Source</th><th>Workflow</th><th>Submitted</th><th>Completed</th><th>Rejected</th><th>Escalated</th><th>Avg turnaround</th><th>Under 2 h?</th></tr></thead>
          <tbody>{stats.map(r => (
            <tr key={r.source + r.type}>
              <td>{SOURCE[r.source] || r.source}</td><td>{TYPES[r.type]?.label || r.type}</td>
              <td>{r.submitted}</td><td>{r.completed}</td><td>{r.rejected}</td><td>{r.escalated}</td>
              <td>{fmtMs(r.avgTurnaroundMs)}</td>
              <td className={r.avgTurnaroundMs == null ? "" : r.avgTurnaroundMs < 7200000 ? "ok" : "bad"}>
                {r.avgTurnaroundMs == null ? "–" : r.avgTurnaroundMs < 7200000 ? "yes" : "no"}</td>
            </tr>))}
          </tbody>
        </table>
        {!stats.length && <p className="muted">No decisions yet.</p>}
      </section>
    </div>
  );
}
