import { animate, stagger } from "animejs";
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Check, ChevronRight, CircleDollarSign,
  Clock3, Cloud, Database, Fingerprint, Gauge, MapPin, Network, Play, RotateCcw,
  Route, Search, ShieldCheck, Sparkles, Truck, UserRound, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountUp, MagnetButton, ShinyText, SpotlightCard } from "./components/react-bits";
import { Receipt } from "./components/Receipt";
import {
  fetchScenarios, runMission, READ_ONLY_TOOLS, TOOL_LABELS,
  type AgentEvent, type MissionComplete, type MissionStart, type Scenario,
} from "./agentStream";

/** One row in the live trace: a tool call and, once it lands, its result. */
type TraceRow = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: "running" | "confirmed" | "blocked" | "ok";
  detail: string;
  receipt?: string;
  elapsedMs: number;
};

type Health = { model: string; revision: string; service: string; vertex_ai: boolean; checkpoint_backend: string };

const TOOL_ICONS: Record<string, typeof Truck> = {
  assess_incident: Gauge,
  list_fleet_options: Search,
  find_partner_capacity: Network,
  reserve_vehicle: Truck,
  claim_partner_capacity: MapPin,
  dispatch_rescue: Route,
  escalate_to_human: UserRound,
};

/** Turn a raw tool result into one line a human can read at a glance. */
function describe(tool: string, r: Record<string, any>): string {
  if (r.status === "blocked") return r.reason ?? "Blocked by policy";
  switch (tool) {
    case "assess_incident":
      return `${r.meals_at_risk?.toLocaleString()} meals · ${r.safe_minutes_remaining} min window · $${r.max_spend_usd} ceiling`;
    case "list_fleet_options":
      return `${r.vehicles?.length ?? 0} vehicles available`;
    case "find_partner_capacity":
      return `${r.partners?.length ?? 0} verified partners · ${r.total_available_meals?.toLocaleString()} meals of capacity`;
    case "reserve_vehicle":
      return `${r.vehicle_id} · $${r.cost_usd} · arrives in ${r.eta_minutes} min`;
    case "claim_partner_capacity":
      return `${r.partner_id} · ${r.meals?.toLocaleString()} meals`;
    case "dispatch_rescue":
      return `${r.total_meals?.toLocaleString()} meals · ${r.partner_ids?.length} partners · ${r.notifications} notifications`;
    case "escalate_to_human":
      return `${r.unplaced_meals?.toLocaleString()} meals escalated to ${r.paged}`;
    default:
      return r.status ?? "";
  }
}

export default function Console() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<string>("RLY-2048");
  const [health, setHealth] = useState<Health | null>(null);

  const [running, setRunning] = useState(false);
  const [start, setStart] = useState<MissionStart | null>(null);
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [result, setResult] = useState<MissionComplete | null>(null);
  const [error, setError] = useState<string | null>(null);

  const root = useRef<HTMLElement>(null);
  const abort = useRef<AbortController | null>(null);
  const traceEnd = useRef<HTMLDivElement>(null);

  const scenario = useMemo(
    () => scenarios.find((s) => s.mission_id === selected),
    [scenarios, selected],
  );

  useEffect(() => {
    fetchScenarios().then((s) => { setScenarios(s); if (s[0]) setSelected(s[0].mission_id); }).catch(() => {});
    fetch("/healthz").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const entrance = animate(root.current.querySelectorAll("[data-enter]"), {
      opacity: [0, 1], y: [18, 0], duration: 780, delay: stagger(65), ease: "outExpo",
    });
    return () => { entrance.cancel(); };
  }, []);

  // Keep the newest trace row in view while the agent works.
  useEffect(() => { traceEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [rows.length]);

  useEffect(() => () => abort.current?.abort(), []);

  const apply = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "mission_start":
        setStart(event.data);
        break;
      case "tool_call":
        setRows((prev) => [...prev, {
          id: event.data.id, tool: event.data.tool, args: event.data.args,
          status: "running", detail: "Awaiting policy decision…", elapsedMs: event.data.elapsed_ms,
        }]);
        break;
      case "tool_result":
        setRows((prev) => {
          const next = [...prev];
          // Match the newest still-running row for this tool.
          let i = next.findIndex((r) => r.id === event.data.id && r.status === "running");
          if (i === -1) i = next.map((r) => r.tool === event.data.tool && r.status === "running").lastIndexOf(true);
          if (i === -1) return next;
          const r = event.data.result;
          next[i] = {
            ...next[i],
            status: r.status === "blocked" ? "blocked" : r.status === "confirmed" ? "confirmed" : "ok",
            detail: describe(event.data.tool, r),
            receipt: r.receipt_id,
            elapsedMs: event.data.elapsed_ms,
          };
          return next;
        });
        break;
      case "mission_complete":
        setResult(event.data);
        setRunning(false);
        break;
      case "error":
        setError(event.data.message);
        setRunning(false);
        break;
    }
  }, []);

  const launch = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true); setRows([]); setResult(null); setError(null); setStart(null);
    try {
      for await (const event of runMission(selected, controller.signal)) apply(event);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : String(e));
        setRunning(false);
      }
    }
  }, [apply, selected]);

  const reset = useCallback(() => {
    abort.current?.abort();
    setRunning(false); setRows([]); setResult(null); setError(null); setStart(null);
  }, []);

  useEffect(() => {
    if (!result || !root.current) return;
    animate(root.current.querySelectorAll(".receipt-chip"), {
      opacity: [0, 1], scale: [0.75, 1], delay: stagger(90), duration: 520, ease: "outBack",
    });
  }, [result]);

  const meals = start?.meals ?? scenario?.meals ?? 0;
  const ceiling = start?.max_spend_usd ?? scenario?.max_spend_usd ?? 250;
  const mutations = rows.filter((r) => !READ_ONLY_TOOLS.has(r.tool));
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const partial = !!result && result.meals_escalated > 0;
  const complete = !!result;

  return (
    <main className="app-shell" ref={root}>
      <aside className="side-rail" aria-label="Primary navigation">
        <div className="relay-brand" data-enter>
          <span className="relay-mark"><Zap size={18} strokeWidth={2.8} /></span>
          <span><b>RELAY</b><small>FOOD RESCUE OS</small></span>
        </div>
        <nav data-enter>
          <button className="nav-link active"><Activity size={17} /><span>Live operations</span><b>{scenarios.length}</b></button>
          <button className="nav-link"><Route size={17} /><span>Missions</span></button>
          <button className="nav-link"><Network size={17} /><span>Partner network</span></button>
          <button className="nav-link"><ShieldCheck size={17} /><span>Policy center</span></button>
        </nav>

        <div className="stack-status" data-enter>
          <div className="status-title"><span className="status-pulse" />Live stack</div>
          <div><Sparkles size={14} /><span>Model</span><b>{health?.model ?? "…"}</b></div>
          <div><Cloud size={14} /><span>{health?.service && health.service !== "local" ? "Cloud Run" : "Runtime"}</span><b>{health?.revision ?? "…"}</b></div>
          <div><Database size={14} /><span>Checkpoints</span><b>{health?.checkpoint_backend ?? "…"}</b></div>
        </div>

        <div className="operator" data-enter><span>NK</span><div><b>Nia Kim</b><small>Duty operator</small></div><ChevronRight size={15} /></div>
      </aside>

      <section className="control-room">
        <header className="topbar" data-enter>
          <div><span className="kicker">AUTONOMOUS COLD-CHAIN RECOVERY</span><h1>Mission control</h1></div>
          <div className="topbar-actions">
            <span className="system-health"><i /> {health ? "Agent online" : "Connecting…"}</span>
            <button className="round-button" aria-label="Notifications"><Bell size={17} /><i /></button>
          </div>
        </header>

        <section className={`incident-banner ${complete ? (partial ? "is-partial" : "is-resolved") : ""}`} data-enter aria-live="polite">
          <span className="incident-icon">
            {complete ? (partial ? <AlertTriangle size={18} /> : <Check size={18} />) : <Gauge size={18} />}
          </span>
          <div>
            <span>{complete ? (partial ? "PARTIAL RESCUE · ESCALATED" : "MISSION RESOLVED") : "COLD-CHAIN EXCEPTION"}</span>
            <strong>
              {complete
                ? partial
                  ? `${result!.meals_dispatched.toLocaleString()} meals recovered · ${result!.meals_escalated.toLocaleString()} escalated to an operator`
                  : `${result!.meals_dispatched.toLocaleString()} meals protected for $${result!.spend_usd}`
                : (scenario?.label ?? "Loading open incidents…")}
            </strong>
          </div>
          <div className="incident-meta"><span>SEVERITY</span><b>{complete ? (partial ? "ESCALATED" : "CLEARED") : "P1 · URGENT"}</b></div>
          <div className="incident-meta"><span>MISSION</span><b>{selected}</b></div>
          <time>{running ? "running now" : complete ? `${(result!.duration_ms / 1000).toFixed(1)}s ago` : "open"}</time>
        </section>

        <div className="dashboard-grid">
          <SpotlightCard className="mission-panel">
            <div className="scenario-picker" data-enter role="tablist" aria-label="Open incidents">
              {scenarios.map((s) => (
                <button
                  key={s.mission_id}
                  role="tab"
                  aria-selected={s.mission_id === selected}
                  className={`scenario-chip ${s.mission_id === selected ? "active" : ""}`}
                  disabled={running}
                  onClick={() => { setSelected(s.mission_id); reset(); }}
                >
                  <b>{s.mission_id}</b>
                  <span>{s.label}</span>
                  <small>{s.summary}</small>
                </button>
              ))}
            </div>

            <div className="panel-head" data-enter>
              <div>
                <span className="live-label"><i /> {running ? "AGENT RUNNING" : "AUTONOMOUS MISSION"}</span>
                <h2>Beat the cold window.<br /><em>Save every meal.</em></h2>
              </div>
              <div className="countdown">
                <Clock3 size={15} /><span>SAFE WINDOW</span>
                <strong>{scenario ? `${scenario.safe_minutes} min` : "—"}</strong>
                <small>{scenario ? `${scenario.temperature_c}°C AND RISING` : ""}</small>
              </div>
            </div>

            <div className="mission-canvas" data-enter>
              <div className="canvas-grid" />
              <svg className="route-map" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
                <path className="route-path" d="M125 164 C285 164 315 164 430 164 C560 164 635 72 820 72" />
                <path className="route-path" d="M430 164 C560 164 650 248 820 248" />
                <path className={`route-progress route-progress-one ${mutations.length >= 2 ? "active" : ""}`} d="M430 164 C560 164 635 72 820 72" />
                <path className={`route-progress route-progress-two ${mutations.length >= 3 ? "active" : ""}`} d="M430 164 C560 164 650 248 820 248" />
              </svg>

              <div className="map-node truck-node">
                <span><Truck size={19} /></span>
                <div><b>{scenario?.label.split("·")[1]?.trim() ?? "Truck"}</b><small>Refrigeration failed</small></div>
                <em>{scenario ? `${scenario.temperature_c}°C` : ""}</em>
              </div>

              <div className={`map-node agent-node ${running ? "is-thinking" : ""}`}>
                <span><Sparkles size={19} /></span>
                <div>
                  <b>Relay planner</b>
                  <small>{running ? (rows.at(-1) ? TOOL_LABELS[rows.at(-1)!.tool] ?? "Planning" : "Planning") : complete ? "Receipts verified" : "Idle · awaiting incident"}</small>
                </div>
                <em>{complete ? "DONE" : "GEMINI"}</em>
              </div>

              {(() => {
                const claims = rows.filter((r) => r.tool === "claim_partner_capacity" && r.status === "confirmed");
                const slots = ["north", "harbor"];
                return slots.map((slot, i) => {
                  const claim = claims[i];
                  const pid = claim?.args?.partner_id as string | undefined;
                  return (
                    <div className={`map-node partner-node ${slot} ${claim ? "is-claimed" : ""}`} key={slot}>
                      <span><MapPin size={19} /></span>
                      <div>
                        <b>{pid ? pid.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "Awaiting plan"}</b>
                        <small>{claim ? `Confirmed · ${claim.receipt}` : "Verified partner"}</small>
                      </div>
                      <em>{claim ? Number(claim.args.meals).toLocaleString() : "—"}</em>
                    </div>
                  );
                });
              })()}

              <div className="safety-zone">{meals ? `${meals.toLocaleString()} MEALS AT RISK` : "STANDBY"}</div>
            </div>

            <div className="mission-command" data-enter>
              <div>
                <span>{complete ? `MISSION RECEIPT · ${selected}` : "OPEN INCIDENT"}</span>
                <strong>
                  {complete
                    ? partial ? "Partial rescue reported honestly" : "Every action confirmed and auditable"
                    : (scenario?.summary ?? "Select an incident")}
                </strong>
                <small>
                  {complete
                    ? `$${result!.spend_usd} of $${result!.spend_ceiling_usd} · ${result!.receipts} receipts · ${blocked} blocked · ${(result!.duration_ms / 1000).toFixed(1)}s`
                    : running ? "Gemini 3.5 Flash is planning and executing scoped tools…"
                    : "Relay will plan and execute the recovery autonomously."}
                </small>
              </div>
              <div className="command-actions">
                {(complete || error) && (
                  <button className="reset-button" onClick={reset} aria-label="Reset mission"><RotateCcw size={16} /></button>
                )}
                <MagnetButton
                  className={`run-button ${running || complete ? "running" : ""}`}
                  onClick={launch}
                  disabled={running || complete || !scenario}
                >
                  {complete ? <><Check size={17} /> {partial ? "Escalated" : "Rescue secured"}</>
                    : running ? <><span className="loader" /> {mutations.length ? `Action ${mutations.length}` : "Planning"}</>
                    : <><Play size={16} fill="currentColor" /> Run rescue</>}
                </MagnetButton>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="trace-panel">
            <div className="trace-head" data-enter>
              <div><span className="kicker">LIVE AGENT TRACE</span><h3>Inspectable by design</h3></div>
              <button aria-label="Open trace"><ArrowUpRight size={16} /></button>
            </div>

            <div className="trace-scroll">
              {!rows.length && !error && (
                <div className="trace-empty">
                  <Sparkles size={18} />
                  <b>{running ? "Contacting Gemini 3.5 Flash…" : "No run yet"}</b>
                  <small>
                    {running
                      ? "Tool calls appear here the moment the model makes them."
                      : "Press Run rescue. Every call below is a real Gemini tool call against a live policy gate — nothing here is pre-recorded."}
                  </small>
                </div>
              )}

              {error && (
                <div className="trace-error" role="alert">
                  <AlertTriangle size={16} /><div><b>Run failed</b><small>{error}</small></div>
                </div>
              )}

              {rows.map((row, i) => {
                const Icon = TOOL_ICONS[row.tool] ?? Activity;
                const readOnly = READ_ONLY_TOOLS.has(row.tool);
                return (
                  <div className={`tool-row ${row.status} ${readOnly ? "is-read" : ""}`} key={`${row.id}-${i}`}>
                    <span className="tool-icon">
                      {row.status === "blocked" ? <AlertTriangle size={15} />
                        : row.status === "running" ? <span className="loader dark" />
                        : <Check size={15} />}
                    </span>
                    <div>
                      <b>{TOOL_LABELS[row.tool] ?? row.tool}{readOnly && <i className="read-tag">read</i>}</b>
                      <small>{row.detail}</small>
                    </div>
                    <span className="tool-state">
                      {row.status === "blocked" ? "BLOCKED"
                        : row.status === "running" ? "RUNNING"
                        : row.receipt ?? "OK"}
                    </span>
                  </div>
                );
              })}

              {result?.final_text && (
                <div className="agent-summary">
                  <span className="kicker">AGENT MISSION RECEIPT</span>
                  <Receipt markdown={result.final_text} />
                </div>
              )}
              <div ref={traceEnd} />
            </div>

            <div className="policy-card" data-enter>
              <div className="policy-title">
                <ShieldCheck size={17} />
                <div><b>Deterministic policy gate</b><small>The model proposes. Policy decides.</small></div>
                <span className={blocked ? "warn" : ""}>{blocked ? `${blocked} BLOCKED` : "ENFORCED"}</span>
              </div>
              <div className="policy-grid">
                <div><CircleDollarSign size={14} /><span>Spend ceiling</span><b>${result?.spend_usd ?? 0} / ${ceiling}</b></div>
                <div><ShieldCheck size={14} /><span>Approved partners</span><b>{rows.filter((r) => r.tool === "claim_partner_capacity" && r.status === "confirmed").length} claimed</b></div>
                <div><Fingerprint size={14} /><span>Data boundary</span><b>No PII shared</b></div>
              </div>
            </div>
          </SpotlightCard>
        </div>

        <section className="impact-grid" data-enter>
          <SpotlightCard className="impact-card accent">
            <span>MEALS RECOVERED</span>
            <strong>{result ? <CountUp value={result.meals_dispatched} /> : "—"}</strong>
            <small>{result ? `of ${result.meals_at_risk.toLocaleString()} at risk` : "this mission"}</small>
          </SpotlightCard>
          <SpotlightCard className="impact-card">
            <span>RECOVERY TIME</span>
            <strong>{result ? `${(result.duration_ms / 1000).toFixed(1)}s` : "—"}</strong>
            <small>vs. 47m manual</small>
          </SpotlightCard>
          <SpotlightCard className="impact-card">
            <span>MISSION SPEND</span>
            <strong>{result ? `$${result.spend_usd}` : "—"}</strong>
            <small>ceiling ${ceiling}</small>
          </SpotlightCard>
          <SpotlightCard className="impact-card">
            <span>AUDITED RECEIPTS</span>
            <strong>{result ? <CountUp value={result.receipts} /> : "—"}</strong>
            <small>{blocked ? `${blocked} action blocked by policy` : "every side effect"}</small>
          </SpotlightCard>
          <SpotlightCard className="proof-card">
            <div><span>DEPLOYMENT EVIDENCE</span><strong><ShinyText>{health?.service && health.service !== "local" ? "Running on Google Cloud Run" : "Google stack, clearly labeled"}</ShinyText></strong></div>
            <div className="proof-stack">
              <span className="receipt-chip"><Cloud size={13} /> {health?.revision ?? "local"}</span>
              <span className="receipt-chip"><Sparkles size={13} /> {health?.model ?? "gemini"}</span>
              <span className="receipt-chip"><Database size={13} /> {health?.checkpoint_backend ?? "state"}</span>
            </div>
          </SpotlightCard>
        </section>
      </section>
    </main>
  );
}
