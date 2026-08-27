import { animate, createDrawable, createTimeline, splitText, stagger, svg, utils } from "animejs";
import {
  ArrowRight, Boxes, CircleDollarSign, Clock3, FileCheck2, Gauge, MapPin,
  Network, Route, ShieldCheck, Sparkles, Truck, UserRound,
} from "lucide-react";
import { Logo } from "./components/Logo";
import { useEffect, useRef, useState } from "react";

import AnimatedContent from "./reactbits/AnimatedContent";
import CountUp from "./reactbits/CountUp";
import Magnet from "./reactbits/Magnet";
import ScrollFloat from "./reactbits/ScrollFloat";
import ScrollReveal from "./reactbits/ScrollReveal";
import ShinyText from "./reactbits/ShinyText";
import SpotlightCard from "./reactbits/SpotlightCard";
import DeliveryScene from "./DeliveryScene";
import { FALLBACK_SCENARIOS, fetchScenarios, type Scenario } from "./agentStream";

const SCATTERED = [
  { icon: Truck, label: "Fleet system" },
  { icon: Boxes, label: "Inventory record" },
  { icon: Network, label: "Partner directory" },
  { icon: Route, label: "Routing tool" },
  { icon: CircleDollarSign, label: "Spend policy" },
  { icon: ShieldCheck, label: "Safety rules" },
];

const STEPS = [
  {
    n: "01",
    title: "The model proposes",
    body: "Gemini 3.5 Flash reads the incident, discovers the fleet and the partner network, and plans a recovery. It is never handed the answer.",
    icon: Sparkles,
  },
  {
    n: "02",
    title: "Policy decides",
    body: "Deterministic Python checks the spend ceiling, the partner registry, the cold-chain rule and the safety window. A refused call comes back with a reason.",
    icon: ShieldCheck,
  },
  {
    n: "03",
    title: "Tools prove",
    body: "Approved actions mutate real state and return an idempotent receipt. Nothing is reported as done without one.",
    icon: FileCheck2,
  },
];

/** Outcomes captured from the verified runs in docs/evidence/LOCAL_ADK_RUN.md. */
const OUTCOMES: Record<string, {
  headline: string; recovered: number; escalated: number; spend: number;
  seconds: number; receipt: string; note: string;
}> = {
  "RLY-2048": {
    headline: "Split the load", recovered: 1240, escalated: 0, spend: 186,
    seconds: 26.3, receipt: "RES-2052",
    note: "No single partner can take 1,240 meals, so the agent splits them 760 / 480.",
  },
  "RLY-2071": {
    headline: "Beat the budget", recovered: 900, escalated: 0, spend: 140,
    seconds: 12.8, receipt: "RES-2055",
    note: "The fastest van costs $240 against a $150 ceiling; the cheapest is not refrigerated.",
  },
  "RLY-2090": {
    headline: "Escalate honestly", recovered: 1050, escalated: 450, spend: 210,
    seconds: 21.1, receipt: "ESC-2060",
    note: "Verified capacity tops out at 1,050. It refuses to fake the remaining 450.",
  },
};

const STACK = [
  "Gemini 3.5 Flash", "Google Agent Development Kit", "Cloud Run",
  "Vertex AI", "Firestore", "Cloud Pub/Sub",
];

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // The numbers on this page describe a real system, so read the live mission
  // definitions from the agent rather than hard-coding them here.
  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch(() => setScenarios(FALLBACK_SCENARIOS));
  }, []);

  // Deep links land at the top when the anchor resolves before webfonts settle.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 140);
    return () => window.clearTimeout(timer);
  }, []);

  // The hero uses anime.js: a drawable SVG and a marker riding the real path
  // are the things it does best. React Bits owns the scroll behaviour below.
  useEffect(() => {
    if (!root.current) return;
    const scope = root.current;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      utils.set(scope.querySelectorAll(".hero-line,.hero-sub,.hero-cta,.hero-badge,.hero-metric"), {
        opacity: 1, y: 0,
      });
      utils.set(scope.querySelectorAll(".chain-node,.chain-alert"), { opacity: 1 });
      return;
    }

    const cleanups: Array<() => void> = [];

    const headline = scope.querySelector<HTMLElement>(".hero-title");
    let chars: HTMLElement[] = [];
    if (headline) {
      const split = splitText(headline, { words: true, chars: true });
      chars = (split.chars ?? []) as HTMLElement[];
      chars.forEach((c) => c.classList.add("char"));
      ((split.words ?? []) as HTMLElement[]).forEach((w) => w.classList.add("word"));
      cleanups.push(() => split.revert?.());
    }

    const hero = createTimeline({ defaults: { ease: "outExpo" } });
    hero.add(".hero-badge", { opacity: [0, 1], y: [-10, 0], duration: 620 }, 0);
    if (chars.length) {
      hero.add(chars, { opacity: [0, 1], y: [26, 0], rotate: [6, 0], duration: 820, delay: stagger(16) }, 160);
    } else {
      hero.add(".hero-title", { opacity: [0, 1], y: [20, 0], duration: 700 }, 160);
    }
    hero
      .add(".hero-sub", { opacity: [0, 1], y: [16, 0], duration: 720 }, 520)
      .add(".hero-cta", { opacity: [0, 1], y: [14, 0], duration: 680, delay: stagger(90) }, 640)
      .add(".hero-metric", { opacity: [0, 1], y: [14, 0], duration: 640, delay: stagger(80) }, 760);
    cleanups.push(() => hero.revert?.());

    const drawables = scope.querySelectorAll<SVGPathElement>(".chain .draw");
    if (drawables.length) {
      const chain = createTimeline({ defaults: { ease: "inOutSine" } });
      chain.add(createDrawable(drawables), { draw: ["0 0", "0 1"], duration: 1400, delay: stagger(220) }, 300);
      chain.add(".chain-node", { opacity: [0, 1], scale: [0.7, 1], duration: 560, delay: stagger(180), ease: "outBack" }, 500);
      chain.add(".chain-alert", { opacity: [0, 1], scale: [0.4, 1], duration: 520, ease: "outBack" }, 420);
      cleanups.push(() => chain.revert?.());

      const path = scope.querySelector<SVGPathElement>("#chain-route");
      const truck = scope.querySelector<SVGGElement>(".chain-truck");
      if (path && truck) {
        const ride = animate(truck, {
          ...svg.createMotionPath(path), duration: 4200, ease: "inOutQuad", loop: true, delay: 1500,
        });
        cleanups.push(() => ride.revert?.());
      }
    }

    const temp = scope.querySelector<HTMLElement>("[data-temp]");
    if (temp) {
      const t = { v: 4.0 };
      const a = animate(t, {
        v: 9.8, duration: 2600, ease: "inOutQuad", delay: 700,
        onUpdate: () => { temp.textContent = `${t.v.toFixed(1)}°C`; },
      });
      cleanups.push(() => a.revert?.());
    }
    const clock = scope.querySelector<HTMLElement>("[data-clock]");
    if (clock) {
      const t = { v: 71 };
      const a = animate(t, {
        v: 48, duration: 3000, ease: "outQuad", delay: 900,
        onUpdate: () => { clock.textContent = `${Math.round(t.v)} min`; },
      });
      cleanups.push(() => a.revert?.());
    }

    return () => cleanups.forEach((fn) => { try { fn(); } catch { /* torn down */ } });
  }, []);

  const flagship = scenarios.find((s) => s.mission_id === "RLY-2048");

  return (
    <div className="landing" ref={root}>
      <header className="landing-nav">
        <a className="relay-brand" href="/" data-route>
          <span className="relay-mark"><Logo size={20} /></span>
          <span><b>RELAY</b><small>FOOD RESCUE OS</small></span>
        </a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#proof">Proof</a>
          <a href="https://github.com/srivibhavpadakandla/relay-food-rescue" target="_blank" rel="noreferrer">Source</a>
          <a className="nav-cta" href="/console" data-route>Open console <ArrowRight size={15} /></a>
        </nav>
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-badge"><i />ALL THINGS AGENTIC · THE TASKMASTER</span>
          <h1 className="hero-title">Every meal has a deadline.</h1>
          <p className="hero-sub">
            When a refrigerated truck fails, Relay turns one cold-chain event into a
            policy-bounded rescue mission — planned by <b>Gemini 3.5 Flash</b>, authorised by
            deterministic code, and proven by a receipt for every single action.
          </p>
          <div className="hero-actions">
            <Magnet padding={70} magnetStrength={5} wrapperClassName="hero-cta-magnet">
              <a className="hero-cta primary" href="/console" data-route>
                Watch it run <ArrowRight size={17} />
              </a>
            </Magnet>
            <a className="hero-cta ghost" href="https://github.com/srivibhavpadakandla/relay-food-rescue" target="_blank" rel="noreferrer">
              Read the source
            </a>
          </div>
          <dl className="hero-metrics">
            <div className="hero-metric">
              <dt>Meals recovered</dt>
              <dd><CountUp to={1240} duration={2} separator="," /></dd>
              <small>of {flagship ? flagship.meals.toLocaleString() : "1,240"} at risk</small>
            </div>
            <div className="hero-metric">
              <dt>Autonomous run</dt>
              <dd><CountUp to={26} duration={2} />s</dd>
              <small>vs. 47m by hand</small>
            </div>
            <div className="hero-metric">
              <dt>Spend</dt>
              <dd>$<CountUp to={186} duration={2} /></dd>
              <small>under a ${flagship ? flagship.max_spend_usd : 250} ceiling</small>
            </div>
          </dl>
        </div>

        <div className="hero-visual">
          <div className="hero-gauges">
            <span className="gauge danger"><Gauge size={14} /> LOAD TEMPERATURE <b data-temp>4.0°C</b></span>
            <span className="gauge"><Clock3 size={14} /> SAFE WINDOW <b data-clock>71 min</b></span>
          </div>

          <svg className="chain" viewBox="0 0 560 400" role="img" aria-label="A failed truck routed to two verified food banks">
            <defs>
              <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#177246" /><stop offset="100%" stopColor="#d8f34b" />
              </linearGradient>
            </defs>
            <path id="chain-route" className="draw" d="M80 200 C170 200 190 200 250 200 C320 200 360 96 470 96" fill="none" stroke="url(#lime)" strokeWidth="3" strokeLinecap="round" />
            <path className="draw" d="M250 200 C320 200 360 306 470 306" fill="none" stroke="url(#lime)" strokeWidth="3" strokeLinecap="round" />
            <g className="chain-truck"><circle r="15" fill="#103c2a" /><circle r="15" fill="none" stroke="#d8f34b" strokeWidth="2" opacity="0.9" /></g>
            <g transform="translate(80 200)"><g className="chain-node">
              <rect x="-44" y="-26" width="88" height="52" rx="14" fill="#fdecea" stroke="#e0897c" strokeWidth="1.5" />
              <text x="0" y="-4" textAnchor="middle" className="chain-label strong">R-14</text>
              <text x="0" y="12" textAnchor="middle" className="chain-label">failed</text>
            </g></g>
            <g transform="translate(250 200)"><g className="chain-node">
              <rect x="-52" y="-28" width="104" height="56" rx="15" fill="#103c2a" />
              <text x="0" y="-4" textAnchor="middle" className="chain-label light strong">RELAY</text>
              <text x="0" y="12" textAnchor="middle" className="chain-label light">planning</text>
            </g></g>
            <g transform="translate(470 96)"><g className="chain-node">
              <rect x="-58" y="-26" width="116" height="52" rx="14" fill="#fffefa" stroke="#177246" strokeWidth="1.5" />
              <text x="0" y="-4" textAnchor="middle" className="chain-label strong">Northside</text>
              <text x="0" y="12" textAnchor="middle" className="chain-label">760 meals</text>
            </g></g>
            <g transform="translate(470 306)"><g className="chain-node">
              <rect x="-58" y="-26" width="116" height="52" rx="14" fill="#fffefa" stroke="#177246" strokeWidth="1.5" />
              <text x="0" y="-4" textAnchor="middle" className="chain-label strong">Harbor</text>
              <text x="0" y="12" textAnchor="middle" className="chain-label">480 meals</text>
            </g></g>
            <g transform="translate(80 132)"><g className="chain-alert">
              <circle r="17" fill="#e55543" />
              <text x="0" y="6" textAnchor="middle" className="chain-label light strong">!</text>
            </g></g>
          </svg>
        </div>
      </section>

      {/* The food-delivery layer is scrubbed by the scroll of these bands. */}
      <div className="delivery-wrap">
      <DeliveryScene />

      {/* ---------------------------------------------------------------- */}
      <section className="band problem">
        <span className="kicker">THE FRICTION</span>
        <ScrollFloat
          containerClassName="float-head"
          textClassName="float-text"
          scrub={false}
          ease="power3.out"
          animationDuration={0.9}
          stagger={0.022}
          scrollStart="top bottom-=12%"
        >
          Six systems. One warming truck.
        </ScrollFloat>
        <ScrollReveal
          containerClassName="reveal-block"
          textClassName="reveal-text"
          baseOpacity={0.08}
          blurStrength={5}
          baseRotation={2}
        >
          Recovering a failed cold-chain load means an operator working across a fleet system, an inventory record, a partner directory, routing, spend policy and food-safety rules — by hand, while the clock runs down.
        </ScrollReveal>

        <div className="scatter">
          {SCATTERED.map(({ icon: Icon, label }, i) => (
            <AnimatedContent key={label} distance={40} duration={0.7} delay={i * 0.06} threshold={0.15} ease="power3.out">
              <span className="scatter-chip"><Icon size={15} /> {label}</span>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band how" id="how">
        <span className="kicker">HOW IT WORKS</span>
        <ScrollFloat
          containerClassName="float-head"
          textClassName="float-text"
          scrub={false}
          ease="power3.out"
          animationDuration={0.9}
          stagger={0.022}
          scrollStart="top bottom-=12%"
        >
          The model proposes. Policy decides. Tools prove.
        </ScrollFloat>

        <div className="steps">
          {STEPS.map(({ n, title, body, icon: Icon }, i) => (
            <AnimatedContent key={n} distance={70} duration={0.85} delay={i * 0.12} threshold={0.12} ease="power3.out" scale={0.96}>
              <SpotlightCard className="step" spotlightColor="rgba(216, 243, 75, 0.28)">
                <span className="step-n">{n}</span>
                <span className="step-icon"><Icon size={18} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </SpotlightCard>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band proof" id="proof">
        <span className="kicker">VERIFIED RUNS</span>
        <ScrollFloat
          containerClassName="float-head"
          textClassName="float-text"
          scrub={false}
          ease="power3.out"
          animationDuration={0.9}
          stagger={0.022}
          scrollStart="top bottom-=12%"
        >
          Three missions. One is unwinnable.
        </ScrollFloat>
        <p className="band-lede">
          Every figure below came out of a live Gemini 3.5 Flash run against the policy gate.
          The third mission matters most: Relay rescues what it can prove and escalates the rest.
        </p>

        <div className="missions">
          {(scenarios.length ? scenarios : []).map((s, i) => {
            const o = OUTCOMES[s.mission_id];
            if (!o) return null;
            const warn = o.escalated > 0;
            return (
              <AnimatedContent key={s.mission_id} distance={80} duration={0.9} delay={i * 0.12} threshold={0.1} ease="power3.out">
                <SpotlightCard
                  className={`mission-card ${warn ? "warn" : ""}`}
                  spotlightColor={warn ? "rgba(232, 165, 74, 0.24)" : "rgba(23, 114, 70, 0.18)"}
                >
                  <header>
                    <b>{s.mission_id}</b>
                    <span>{warn ? <UserRound size={14} /> : <MapPin size={14} />}{o.headline}</span>
                  </header>

                  <p>{o.note}</p>

                  <ul className="mission-facts">
                    <li><span>At risk</span><b>{s.meals.toLocaleString()} meals</b></li>
                    <li><span>Window</span><b>{s.safe_minutes} min</b></li>
                    <li><span>Ceiling</span><b>${s.max_spend_usd}</b></li>
                  </ul>

                  <div className="mission-stat">
                    <strong>
                      {warn
                        ? <><CountUp to={o.escalated} duration={1.6} separator="," /></>
                        : <><CountUp to={o.recovered} duration={1.6} separator="," /></>}
                    </strong>
                    <small>{warn ? "meals escalated to a human" : "meals recovered"}</small>
                  </div>

                  <footer>
                    <span className="receipt-pill"><FileCheck2 size={13} /> <em>{o.receipt}</em></span>
                    <span className="mission-time">${o.spend} · {o.seconds}s</span>
                  </footer>
                </SpotlightCard>
              </AnimatedContent>
            );
          })}
          {!scenarios.length && <p className="missions-loading">Loading live missions from the agent…</p>}
        </div>
      </section>

      </div>

      {/* ---------------------------------------------------------------- */}
      <section className="band showcase">
        <span className="kicker">THE CONSOLE</span>
        <ScrollFloat
          containerClassName="float-head"
          textClassName="float-text"
          scrub={false}
          ease="power3.out"
          animationDuration={0.9}
          stagger={0.022}
          scrollStart="top bottom-=12%"
        >
          Watch it think in real time.
        </ScrollFloat>
        <p className="band-lede">
          Every row in the trace is a real Gemini tool call streamed over server-sent
          events as the model makes it. Blocked calls show up as blocked.
        </p>

        <div className="clips">
          {[
            {
              src: "rescue",
              label: "RLY-2048 · full recovery",
              caption: "Gemini reserves V-08, splits 1,240 meals across two food banks, dispatches. $186 of $250.",
            },
            {
              src: "escalate",
              label: "RLY-2090 · honest shortfall",
              caption: "Verified capacity covers 1,050. It dispatches those and escalates the other 450 to a human.",
            },
          ].map((clip, i) => (
            <AnimatedContent key={clip.src} distance={70} duration={0.9} delay={i * 0.12} threshold={0.1} ease="power3.out">
              <figure className="clip">
                <div className="clip-frame">
                  <video
                    poster={`/video/${clip.src}-poster.jpg`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={`Screen recording of Relay running mission ${clip.label}`}
                  >
                    <source src={`/video/${clip.src}.webm`} type="video/webm" />
                    <source src={`/video/${clip.src}.mp4`} type="video/mp4" />
                  </video>
                  <span className="clip-badge"><i />UNCUT SCREEN RECORDING</span>
                </div>
                <figcaption>
                  <b>{clip.label}</b>
                  <span>{clip.caption}</span>
                </figcaption>
              </figure>
            </AnimatedContent>
          ))}
        </div>

      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band stack">
        <span className="kicker">BUILT ON</span>
        <ScrollFloat
          containerClassName="float-head"
          textClassName="float-text"
          scrub={false}
          ease="power3.out"
          animationDuration={0.9}
          stagger={0.022}
          scrollStart="top bottom-=12%"
        >
          One Cloud Run service. One revision.
        </ScrollFloat>
        <div className="stack-strip">
          {STACK.map((s, i) => (
            <AnimatedContent key={s} distance={30} duration={0.6} delay={i * 0.05} threshold={0.2} ease="power2.out">
              <span>{s}</span>
            </AnimatedContent>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band closer">
        <AnimatedContent distance={50} duration={0.9} threshold={0.15} ease="power3.out">
          <div>
            <h2>Open the console and press <em>Run rescue</em>.</h2>
            <p><ShinyText text="Nothing here is pre-recorded." speed={4} color="#5a645c" shineColor="#177246" /></p>
            <Magnet padding={80} magnetStrength={5} wrapperClassName="hero-cta-magnet">
              <a className="hero-cta primary" href="/console" data-route>
                Launch mission control <ArrowRight size={17} />
              </a>
            </Magnet>
          </div>
        </AnimatedContent>
      </section>

      <footer className="landing-foot">
        <span>Relay — Autonomous Food Rescue OS</span>
        <span>Built for the All Things Agentic Hackathon · MIT licensed</span>
      </footer>

    </div>
  );
}
