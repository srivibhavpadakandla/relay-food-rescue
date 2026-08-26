"use client";

import { animate, stagger } from "animejs";
import {
  Activity, ArrowUpRight, Bell, Box, Check, ChevronRight, CircleDollarSign,
  Clock3, Cloud, Database, Fingerprint, Gauge, MapPin, Network, Play,
  RotateCcw, Route, ShieldCheck, Sparkles, Truck, Users, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CountUp, MagnetButton, ShinyText, SpotlightCard } from "./components/react-bits";

const timeline = [
  { time: "10:42:03", title: "Temperature event ingested", detail: "Pub/Sub · route-14.temp.high" },
  { time: "10:42:04", title: "Risk window calculated", detail: "1,240 meals · 71 minutes remaining" },
  { time: "10:42:06", title: "Gemini plan proposed", detail: "2 partners · backup vehicle · $186 cap" },
];

const toolActions = [
  { title: "Reserve van V-08", detail: "Fleet adapter", receipt: "FLT-8814", icon: Truck },
  { title: "Claim Northside capacity", detail: "760 meals", receipt: "CAP-760N", icon: Users },
  { title: "Claim Harbor capacity", detail: "480 meals", receipt: "CAP-480H", icon: Box },
  { title: "Dispatch + notify", detail: "Route, SMS, email", receipt: "DSP-2048", icon: Route },
];

const policies = [
  { label: "Spend ceiling", value: "$186 / $250", icon: CircleDollarSign },
  { label: "Approved partners", value: "2 / 2 verified", icon: ShieldCheck },
  { label: "Data boundary", value: "No PII shared", icon: Fingerprint },
];

export default function Home() {
  const [phase, setPhase] = useState(0);
  const root = useRef<HTMLElement>(null);
  const running = phase > 0 && phase < 5;
  const complete = phase === 5;

  useEffect(() => {
    if (!root.current) return;
    const entrance = animate(root.current.querySelectorAll("[data-enter]"), {
      opacity: [0, 1], y: [18, 0], duration: 780, delay: stagger(65), ease: "outExpo",
    });
    return () => entrance.cancel();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setPhase((value) => Math.min(5, value + 1)), 1050);
    return () => window.clearTimeout(timer);
  }, [phase, running]);

  useEffect(() => {
    if (!root.current || phase === 0) return;
    const active = root.current.querySelector(`[data-action-index="${Math.min(phase - 1, 3)}"]`);
    if (active) animate(active, { scale: [0.97, 1.02, 1], duration: 560, ease: "outBack" });
    if (complete) {
      animate(root.current.querySelectorAll(".receipt-chip"), {
        opacity: [0, 1], scale: [0.75, 1], delay: stagger(90), duration: 520, ease: "outBack",
      });
    }
  }, [complete, phase]);

  return (
    <main className="app-shell" ref={root}>
      <aside className="side-rail" aria-label="Primary navigation">
        <div className="relay-brand" data-enter>
          <span className="relay-mark"><Zap size={18} strokeWidth={2.8} /></span>
          <span><b>RELAY</b><small>FOOD RESCUE OS</small></span>
        </div>
        <nav data-enter>
          <button className="nav-link active"><Activity size={17} /><span>Live operations</span><b>1</b></button>
          <button className="nav-link"><Route size={17} /><span>Missions</span></button>
          <button className="nav-link"><Network size={17} /><span>Partner network</span></button>
          <button className="nav-link"><ShieldCheck size={17} /><span>Policy center</span></button>
        </nav>
        <div className="stack-status" data-enter>
          <div className="status-title"><span className="status-pulse" />Validated stack</div>
          <div><Cloud size={14} /><span>Cloud Run image</span><b>ready</b></div>
          <div><Sparkles size={14} /><span>Gemini 3.5 Flash</span><b>verified</b></div>
          <div><Database size={14} /><span>Mission state</span><b>local</b></div>
        </div>
        <div className="operator" data-enter><span>NK</span><div><b>Nia Kim</b><small>Duty operator</small></div><ChevronRight size={15} /></div>
      </aside>

      <section className="control-room">
        <header className="topbar" data-enter>
          <div><span className="kicker">TUESDAY · AUG 25 · 10:42 PDT</span><h1>Mission control</h1></div>
          <div className="topbar-actions">
            <span className="system-health"><i /> All systems nominal</span>
            <button className="round-button" aria-label="Notifications"><Bell size={17} /><i /></button>
          </div>
        </header>

        <section className={`incident-banner ${complete ? "is-resolved" : ""}`} data-enter aria-live="polite">
          <span className="incident-icon">{complete ? <Check size={18} /> : <Gauge size={18} />}</span>
          <div><span>{complete ? "MISSION RESOLVED" : "COLD-CHAIN EXCEPTION"}</span><strong>{complete ? "1,240 meals protected with 23 minutes to spare" : "Refrigeration failure detected · Truck R-14"}</strong></div>
          <div className="incident-meta"><span>SEVERITY</span><b>{complete ? "CLEARED" : "P1 · URGENT"}</b></div>
          <div className="incident-meta"><span>MISSION</span><b>RLY-2048</b></div>
          <time>{complete ? "just now" : "38 sec ago"}</time>
        </section>

        <div className="dashboard-grid">
          <SpotlightCard className="mission-panel">
            <div className="panel-head" data-enter>
              <div><span className="live-label"><i /> AUTONOMOUS MISSION</span><h2>Beat the cold window.<br /><em>Save every meal.</em></h2></div>
              <div className="countdown"><Clock3 size={15} /><span>SAFE WINDOW</span><strong>01:11:36</strong><small>9.8°C AND RISING</small></div>
            </div>

            <div className="mission-canvas" data-enter>
              <div className="canvas-grid" />
              <svg className="route-map" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
                <path className="route-path" d="M125 164 C285 164 315 164 430 164 C560 164 635 72 820 72" />
                <path className="route-path" d="M430 164 C560 164 650 248 820 248" />
                <path className={`route-progress route-progress-one ${phase >= 3 ? "active" : ""}`} d="M430 164 C560 164 635 72 820 72" />
                <path className={`route-progress route-progress-two ${phase >= 4 ? "active" : ""}`} d="M430 164 C560 164 650 248 820 248" />
              </svg>
              <div className="map-node truck-node"><span><Truck size={19} /></span><div><b>Truck R-14</b><small>Refrigeration failed</small></div><em>9.8°C</em></div>
              <div className={`map-node agent-node ${running ? "is-thinking" : ""}`}><span><Sparkles size={19} /></span><div><b>Relay planner</b><small>{complete ? "Receipts verified" : running ? "Executing approved tools" : "Plan ready · confidence 97%"}</small></div><em>{complete ? "DONE" : "GEMINI"}</em></div>
              <div className="map-node partner-node north"><span><MapPin size={19} /></span><div><b>Northside Pantry</b><small>Verified partner</small></div><em>760</em></div>
              <div className="map-node partner-node harbor"><span><MapPin size={19} /></span><div><b>Harbor Kitchen</b><small>Verified partner</small></div><em>480</em></div>
              <div className="safety-zone">23 MIN BUFFER</div>
            </div>

            <div className="mission-command" data-enter>
              <div><span>{complete ? "MISSION RECEIPT · RLY-2048" : "RECOMMENDED ACTION"}</span><strong>{complete ? "Every action confirmed and auditable" : "Split the load across two verified partners"}</strong><small>{complete ? "$186 spent · 4 tools · 6 notifications · 0 exceptions" : "Backup van arrives in 14 min · estimated recovery in 17 min"}</small></div>
              <div className="command-actions">
                {complete && <button className="reset-button" onClick={() => setPhase(0)} aria-label="Reset mission"><RotateCcw size={16} /></button>}
                <MagnetButton className={`run-button ${running || complete ? "running" : ""}`} onClick={() => setPhase(1)} disabled={running || complete}>
                  {complete ? <><Check size={17} /> Rescue secured</> : running ? <><span className="loader" /> Action {phase} of 4</> : <><Play size={16} fill="currentColor" /> Run rescue</>}
                </MagnetButton>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="trace-panel">
            <div className="trace-head" data-enter><div><span className="kicker">LIVE AGENT TRACE</span><h3>Inspectable by design</h3></div><button aria-label="Open trace"><ArrowUpRight size={16} /></button></div>
            <div className="trace-scroll">
              {timeline.map((item) => <div className="trace-event" key={item.time} data-enter><span className="trace-dot" /><time>{item.time}</time><div><b>{item.title}</b><small>{item.detail}</small></div><Check size={14} /></div>)}
              <div className="tool-divider"><span>SCOPED TOOL EXECUTION</span><i /></div>
              {toolActions.map((action, index) => {
                const state = phase > index + 1 ? "done" : phase === index + 1 ? "working" : "pending";
                const Icon = action.icon;
                return <div className={`tool-row ${state}`} data-action-index={index} key={action.title}>
                  <span className="tool-icon">{state === "done" ? <Check size={15} /> : <Icon size={15} />}</span>
                  <div><b>{action.title}</b><small>{action.detail}</small></div>
                  <span className="tool-state">{state === "done" ? action.receipt : state === "working" ? "RUNNING" : "QUEUED"}</span>
                </div>;
              })}
            </div>
            <div className="policy-card" data-enter>
              <div className="policy-title"><ShieldCheck size={17} /><div><b>Deterministic policy gate</b><small>The model proposes. Policy decides.</small></div><span>PASSED</span></div>
              <div className="policy-grid">{policies.map(({ label, value, icon: Icon }) => <div key={label}><Icon size={14} /><span>{label}</span><b>{value}</b></div>)}</div>
            </div>
          </SpotlightCard>
        </div>

        <section className="impact-grid" data-enter>
          <SpotlightCard className="impact-card accent"><span>MEALS PROTECTED</span><strong><CountUp value={28410} /></strong><small><b>↗ 18%</b> this month</small></SpotlightCard>
          <SpotlightCard className="impact-card"><span>AVG. RECOVERY</span><strong>16m 42s</strong><small>vs. 47m manual</small></SpotlightCard>
          <SpotlightCard className="impact-card"><span>WASTE AVOIDED</span><strong>8.2 t</strong><small>≈ 21.4 tCO₂e</small></SpotlightCard>
          <SpotlightCard className="impact-card"><span>AUTONOMOUS ACTIONS</span><strong>94.7%</strong><small>2 required approval</small></SpotlightCard>
          <SpotlightCard className="proof-card"><div><span>DEPLOYMENT EVIDENCE</span><strong><ShinyText>Google stack, clearly labeled</ShinyText></strong></div><div className="proof-stack"><span className="receipt-chip"><Cloud size={13} /> Run-ready</span><span className="receipt-chip"><Sparkles size={13} /> Gemini verified</span><span className="receipt-chip"><Database size={13} /> State local</span></div></SpotlightCard>
        </section>
      </section>
    </main>
  );
}
