"use client";

import { useEffect, useState } from "react";

const steps = [
  { time: "10:42", label: "Cold-chain alarm received", detail: "Truck R-14 · 9.8°C and rising", tone: "hot" },
  { time: "10:43", label: "1,240 meals identified at risk", detail: "Safe handling window: 71 minutes", tone: "warn" },
  { time: "10:44", label: "Rescue plan ready", detail: "2 partners · 1 backup vehicle · $186", tone: "good" },
];

const actions = [
  { label: "Reserve backup van V-08", detail: "Fleet tool · idempotency key rv-1408" },
  { label: "Confirm Northside capacity", detail: "Partner webhook · 760 meals accepted" },
  { label: "Confirm Harbor capacity", detail: "Partner webhook · 480 meals accepted" },
  { label: "Dispatch route + notify teams", detail: "Maps, SMS and email tools · 6 receipts" },
];

export default function Home() {
  const [phase, setPhase] = useState(0);
  const running = phase > 0 && phase < 5;
  const complete = phase === 5;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setPhase((value) => Math.min(5, value + 1)), 1250);
    return () => window.clearTimeout(timer);
  }, [phase, running]);
  return (
    <main className="shell">
      <aside className="rail" aria-label="Primary navigation">
        <div className="brand"><span className="brand-mark">R</span><span>RELAY</span></div>
        <nav>
          <button className="nav-item active"><span>⌁</span> Live ops <b>1</b></button>
          <button className="nav-item"><span>◎</span> Missions</button>
          <button className="nav-item"><span>◇</span> Network</button>
          <button className="nav-item"><span>⌘</span> Policies</button>
        </nav>
        <div className="rail-foot"><div className="pulse-dot" /> Agent online<small>us-central1 · Cloud Run</small></div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">TUESDAY, AUG 25</span><h1>Operations center</h1></div>
          <div className="top-actions"><button className="icon-btn" aria-label="Notifications">◌<i /></button><div className="avatar">NK</div></div>
        </header>
        <div className={complete ? "alert-strip resolved" : "alert-strip"}><span className="alert-icon">{complete ? "✓" : "!"}</span><strong>{complete ? "Rescue secured" : "Cold-chain exception"}</strong><span>{complete ? "1,240 meals accepted by verified partners" : "Refrigeration failure detected on Route 14"}</span><time>{complete ? "just now" : "38s ago"}</time></div>
        <div className="content-grid">
          <section className="mission-card">
            <div className="mission-head">
              <div><span className="live-pill"><i /> LIVE MISSION</span><h2>Protect 1,240 meals<br />before the cold window closes.</h2></div>
              <div className="countdown"><span>SAFE WINDOW</span><strong>01:11:36</strong></div>
            </div>
            <div className="route-stage" aria-label="Route rescue plan">
              <div className="route-line line-one" /><div className="route-line line-two" />
              <div className="node origin"><span className="node-icon">▦</span><b>Truck R-14</b><small>9.8°C · stalled</small></div>
              <div className={running ? "node hub working" : "node hub"}><span className="node-icon">✦</span><b>Relay plan</b><small>{complete ? "Mission secured" : running ? "Executing tools" : "Ready to run"}</small></div>
              <div className="node partner p-one"><span className="node-icon">⌂</span><b>Northside Pantry</b><small>760 meal capacity</small></div>
              <div className="node partner p-two"><span className="node-icon">⌂</span><b>Harbor Kitchen</b><small>480 meal capacity</small></div>
              <div className={phase >= 3 ? "moving-dot dot-one active" : "moving-dot dot-one"} /><div className={phase >= 4 ? "moving-dot dot-two active" : "moving-dot dot-two"} />
            </div>
            <div className="plan-bar">
              <div><span>{complete ? "MISSION RECEIPT · RLY-2048" : "PROPOSED RESCUE"}</span><strong>{complete ? "All actions confirmed — 23 min safety buffer" : "Split load across 2 verified partners"}</strong><small>{complete ? "$186 spent · 6 notifications delivered · zero policy exceptions" : "Backup van V-08 arrives in 14 min · 23 min buffer"}</small></div>
              <button className={running || complete ? "run-button running" : "run-button"} onClick={() => setPhase(1)} disabled={running || complete}>{complete ? <>✓ Rescue secured</> : running ? <><i /> Action {phase} of 4</> : <>Run rescue <span>→</span></>}</button>
            </div>
          </section>
          <aside className="activity-card">
            <div className="activity-head"><div><span className="eyebrow">AGENT TRACE</span><h3>What Relay knows</h3></div><button aria-label="Expand agent trace">↗</button></div>
            <div className="steps">
              {steps.map((step) => <div className="step" key={step.time}><span className={`step-dot ${step.tone}`} /><time>{step.time}</time><div><b>{step.label}</b><small>{step.detail}</small></div></div>)}
              {actions.map((action, index) => {
                const actionPhase = index + 1;
                const state = phase > actionPhase ? "done" : phase === actionPhase ? "working" : "pending";
                return <div className={`action-row ${state}`} key={action.label}><span>{state === "done" ? "✓" : state === "working" ? "↻" : index + 1}</span><div><b>{action.label}</b><small>{action.detail}</small></div></div>;
              })}
            </div>
            <div className="guardrail"><span>✓</span><div><b>Policy guardrails passed</b><small>Spend &lt; $250 · partners verified · no PII shared</small></div></div>
          </aside>
        </div>
        <section className="stats-row">
          <article><span>MEALS PROTECTED</span><strong>28,410</strong><small><i className="up">↗ 18%</i> this month</small></article>
          <article><span>AVG. RECOVERY</span><strong>16m 42s</strong><small>vs. 47m manual</small></article>
          <article><span>WASTE AVOIDED</span><strong>8.2 t</strong><small>≈ 21.4 tCO₂e</small></article>
          <article><span>AUTONOMOUS ACTIONS</span><strong>94.7%</strong><small>2 required approval</small></article>
        </section>
      </section>
    </main>
  );
}
