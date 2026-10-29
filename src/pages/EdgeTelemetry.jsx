import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Gauge, Thermometer, Timer, Cloud, AlertTriangle, RefreshCw } from 'lucide-react';
import { IS_LIVE } from '../services/cloudApi';
import * as live from '../services/liveService';
import { EmptyState } from '../components/common/EmptyState';

const SLO_P95_MS = 2000;
const TARGET_TURNAROUND_MS = 2 * 3600 * 1000;

const fmtMs = (ms) => (ms == null ? '—' : ms >= 60000 ? `${(ms / 60000).toFixed(1)} min` : `${Math.round(ms)} ms`);

const Tile = ({ icon: Icon, label, value, sub, tone = 'text-slate-900' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      <Icon className="h-4 w-4 text-indigo-500" />
      {label}
    </div>
    <p className={`mt-2 text-2xl font-black tracking-tight ${tone}`}>{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
  </div>
);

/** p95 per telemetry window, with the 2 s SLO line. Bars on the DR stack are amber. */
const P95Chart = ({ rows }) => {
  const w = 640;
  const h = 180;
  const max = Math.max(SLO_P95_MS * 1.1, ...rows.map((r) => r.p95 || 0));
  const bw = w / Math.max(rows.length, 1);
  const y = (v) => h - (v / max) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full h-56" role="img" aria-label="p95 latency per window">
      {rows.map((r, i) => (
        <rect
          key={r.ts}
          x={i * bw + 1}
          width={Math.max(bw - 2, 1)}
          y={y(r.p95 || 0)}
          height={h - y(r.p95 || 0)}
          rx="2"
          className={r.activeEndpoint === 'secondary' ? 'fill-amber-400' : 'fill-indigo-500'}
        >
          <title>{`${new Date(r.ts).toLocaleTimeString()} p95 ${r.p95} ms via ${r.activeCloud || r.activeEndpoint}`}</title>
        </rect>
      ))}
      <line x1="0" x2={w} y1={y(SLO_P95_MS)} y2={y(SLO_P95_MS)} className="stroke-rose-500" strokeDasharray="6 4" />
      <text x={w - 4} y={y(SLO_P95_MS) - 4} textAnchor="end" className="fill-rose-600 text-[11px] font-semibold">SLO p95 2 s</text>
      <text x="0" y={h + 14} className="fill-slate-400 text-[10px]">older</text>
      <text x={w} y={h + 14} textAnchor="end" className="fill-slate-400 text-[10px]">latest</text>
    </svg>
  );
};

export const EdgeTelemetry = () => {
  const [telemetry, setTelemetry] = useState([]);
  const [stats, setStats] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(IS_LIVE);

  const load = async () => {
    if (!IS_LIVE) return;
    try {
      const [t, s] = await Promise.all([live.getTelemetry(), live.getStats()]);
      setTelemetry([...(t.items || [])].sort((a, b) => a.ts - b.ts));
      setStats(s.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = IS_LIVE ? setInterval(load, 20000) : null;
    return () => timer && clearInterval(timer);
  }, []);

  if (!IS_LIVE) {
    return (
      <EmptyState
        icon={Activity}
        title="Edge telemetry needs the live AWS API"
        description="Set VITE_MOCK_MODE=false and the API URLs in .env to see the Raspberry Pi's latency, failover and turnaround numbers here."
      />
    );
  }

  const latest = telemetry[telemetry.length - 1];
  const total = telemetry.reduce((n, r) => n + (r.count || 0), 0);
  const errors = telemetry.reduce((n, r) => n + (r.errors || 0), 0);
  const failovers = telemetry.filter((r) => r.failoverMs != null);
  const events = telemetry.flatMap((r) => (r.events || []).map((e) => ({ ts: r.ts, e, node: r.node, ms: r.failoverMs })));
  const human = stats.filter((r) => r.source !== 'edge-pi');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Edge Telemetry & Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Raspberry Pi 3 B+ synthetic load against the AWS primary and DR stacks, plus approval turnaround from DynamoDB Streams.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>
      )}

      {!loading && !latest ? (
        <EmptyState
          icon={Cpu}
          title="No telemetry yet"
          description="Start the prober on the Pi (systemctl start edge-prober). Each window it reports p50/p95, request rate and failover events here."
        />
      ) : latest && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Tile icon={Gauge} label="Latest p95" value={fmtMs(latest.p95)}
                  sub={`SLO < 2 s: ${latest.p95 < SLO_P95_MS ? 'met' : 'missed'}`}
                  tone={latest.p95 < SLO_P95_MS ? 'text-emerald-700' : 'text-rose-700'} />
            <Tile icon={Activity} label="Request rate" value={`${latest.reqPerMin}/min`} sub={`${latest.count} calls last window`} />
            <Tile icon={Cloud} label="Serving stack" value={latest.activeEndpoint === 'secondary' ? 'DR' : 'Primary'}
                  sub={`${latest.node} via ${latest.activeCloud || 'aws'}`} tone={latest.activeEndpoint === 'secondary' ? 'text-amber-600' : 'text-slate-900'} />
            <Tile icon={Timer} label="Success rate" value={total ? `${(((total - errors) / total) * 100).toFixed(2)}%` : '—'}
                  sub={`${total.toLocaleString()} calls in ${telemetry.length} windows`} />
            <Tile icon={Thermometer} label="Pi CPU temp" value={latest.pi?.cpuTempC != null ? `${latest.pi.cpuTempC} °C` : '—'}
                  sub={latest.pi?.load1 != null ? `load ${latest.pi.load1}` : latest.hostname} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">p95 latency per telemetry window</h2>
            <p className="text-[11px] text-slate-500 mb-2">Last {telemetry.length} windows reported by the edge node. Amber bars were served by the DR stack.</p>
            <P95Chart rows={telemetry} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Failover events
              </h2>
              {events.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No failover in the recent windows. Run chaos.sh to trigger one.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-xs">
                  {events.slice(-10).reverse().map((ev, i) => (
                    <li key={i} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                      <span className="font-mono font-semibold text-slate-800">{ev.e}</span>
                      <span className="text-slate-500">{new Date(ev.ts).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
              {failovers.length > 0 && (
                <p className="mt-3 text-xs text-slate-600">
                  Last measured failover: <strong>{fmtMs(failovers[failovers.length - 1].failoverMs)}</strong> (target &lt; 15 s)
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Approval turnaround (people, not the Pi)</h2>
              {human.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No completed human workflows yet.</p>
              ) : (
                <table className="mt-3 w-full text-xs">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <tr><th className="py-1">Workflow</th><th>Submitted</th><th>Done</th><th>Escalated</th><th>Avg turnaround</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {human.map((r) => (
                      <tr key={`${r.source}${r.type}`}>
                        <td className="py-1.5 font-semibold text-slate-800">{r.type}</td>
                        <td>{r.submitted}</td>
                        <td>{r.completed + r.rejected}</td>
                        <td>{r.escalated || 0}</td>
                        <td className={r.avgTurnaroundMs != null && r.avgTurnaroundMs <= TARGET_TURNAROUND_MS ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
                          {fmtMs(r.avgTurnaroundMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-[11px] text-slate-500">Target: decision within 2 h. Requests waiting longer are escalated every 15 min by EventBridge.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EdgeTelemetry;
