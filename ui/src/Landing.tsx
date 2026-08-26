import {
  animate, createDrawable, createTimeline, splitText, stagger, svg, utils,
} from "animejs";
import {
  ArrowRight, Boxes, CircleDollarSign, Clock3, FileCheck2, Gauge, MapPin,
  Network, Route, ShieldCheck, Sparkles, Truck, UserRound, Zap,
} from "lucide-react";
import { useEffect, useRef } from "react";

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

const MISSIONS = [
  {
    id: "RLY-2048",
    title: "Split the load",
    detail: "1,240 meals, 71-minute window. No single partner can take it all.",
    stat: "1,240 / 1,240",
    statLabel: "meals recovered",
    receipt: "RES-2052",
    tone: "good" as const,
  },
  {
    id: "RLY-2071",
    title: "Beat the budget",
    detail: "The fastest van costs $240 against a $150 ceiling. The cheapest is not refrigerated.",
    stat: "$140",
    statLabel: "of a $150 ceiling",
    receipt: "RES-2055",
    tone: "good" as const,
  },
  {
    id: "RLY-2090",
    title: "Escalate honestly",
    detail: "1,500 meals against a network that can only absorb 1,050. It refuses to fake the rest.",
    stat: "450",
    statLabel: "meals escalated to a human",
    receipt: "ESC-2060",
    tone: "warn" as const,
  },
];

const STACK = [
  "Gemini 3.5 Flash",
  "Google Agent Development Kit",
  "Cloud Run",
  "Vertex AI",
  "Firestore",
  "Cloud Pub/Sub",
];

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);

  // A #hash deep link often lands at the top, because the browser resolves the
  // anchor before webfonts and the hero art have settled the layout.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const scope = root.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // With motion reduced, everything is simply shown in place.
    if (reduced) {
      utils.set(scope.querySelectorAll("[data-reveal], .hero-line, .hero-sub, .hero-cta, .hero-badge"), {
        opacity: 1, y: 0,
      });
      utils.set(scope.querySelectorAll(".chain path"), { opacity: 1 });
      return;
    }

    const cleanups: Array<() => void> = [];

    // -- hero ------------------------------------------------------------
    const headline = scope.querySelector<HTMLElement>(".hero-title");
    let chars: HTMLElement[] = [];
    if (headline) {
      const split = splitText(headline, { words: true, chars: true });
      chars = (split.chars ?? []) as HTMLElement[];
      chars.forEach((c) => c.classList.add("char"));
      (split.words ?? []).forEach((w: HTMLElement) => w.classList.add("word"));
      cleanups.push(() => split.revert?.());
    }

    const hero = createTimeline({ defaults: { ease: "outExpo" } });

    hero.add(".hero-badge", { opacity: [0, 1], y: [-10, 0], duration: 620 }, 0);

    if (chars.length) {
      hero.add(
        chars,
        { opacity: [0, 1], y: [26, 0], rotate: [6, 0], duration: 820, delay: stagger(16) },
        160,
      );
    } else {
      hero.add(".hero-title", { opacity: [0, 1], y: [20, 0], duration: 700 }, 160);
    }

    hero
      .add(".hero-sub", { opacity: [0, 1], y: [16, 0], duration: 720 }, 520)
      .add(".hero-cta", { opacity: [0, 1], y: [14, 0], duration: 680, delay: stagger(90) }, 640)
      .add(".hero-metric", { opacity: [0, 1], y: [14, 0], duration: 640, delay: stagger(80) }, 760);
    cleanups.push(() => hero.revert?.());

    // -- animated cold-chain diagram -------------------------------------
    const drawables = scope.querySelectorAll<SVGPathElement>(".chain .draw");
    if (drawables.length) {
      const chain = createTimeline({ defaults: { ease: "inOutSine" } });
      chain.add(
        createDrawable(drawables),
        { draw: ["0 0", "0 1"], duration: 1400, delay: stagger(220) },
        300,
      );
      chain.add(".chain-node", { opacity: [0, 1], scale: [0.7, 1], duration: 560, delay: stagger(180), ease: "outBack" }, 500);
      chain.add(".chain-alert", { opacity: [0, 1], scale: [0.4, 1], duration: 520, ease: "outBack" }, 420);
      cleanups.push(() => chain.revert?.());

      // The truck rides the route once the line is drawn.
      const path = scope.querySelector<SVGPathElement>("#chain-route");
      const truck = scope.querySelector<SVGGElement>(".chain-truck");
      if (path && truck) {
        const motion = svg.createMotionPath(path);
        const ride = animate(truck, {
          ...motion,
          duration: 4200,
          ease: "inOutQuad",
          loop: true,
          delay: 1500,
        });
        cleanups.push(() => ride.revert?.());
      }
    }

    // -- temperature climbs, clock falls ---------------------------------
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

    // -- scroll-triggered sections ---------------------------------------
    // anime.js drives the motion; an IntersectionObserver decides when to start
    // it, so jumping straight to an anchor (or pressing End) still reveals the
    // sections that were scrolled past rather than leaving them blank.
    const played = new WeakSet<Element>();

    const reveal = (section: HTMLElement) => {
      // Already scrolled past: show it immediately, there is nothing to watch.
      played.add(section);
      utils.set(section.querySelectorAll("[data-reveal-item]"), { opacity: 1, y: 0 });
      section.querySelectorAll<HTMLElement>("[data-receipt]").forEach((el) => {
        el.textContent = el.dataset.receipt ?? "";
      });
    };

    const play = (section: HTMLElement) => {
      if (played.has(section)) return;
      played.add(section);

      const group = section.querySelectorAll<HTMLElement>("[data-reveal-item]");
      const a = animate(group.length ? group : [section], {
        opacity: [0, 1], y: [26, 0], duration: 760, ease: "outExpo", delay: stagger(90),
      });
      cleanups.push(() => a.revert?.());

      section.querySelectorAll<HTMLElement>("[data-receipt]").forEach((el) => {
        const final = el.dataset.receipt ?? "";
        const r = animate(el, {
          duration: 1100, ease: "linear", delay: 420,
          onBegin: () => { el.textContent = final.replace(/[A-Z0-9]/g, "•"); },
          onUpdate: (self: { progress: number }) => {
            const shown = Math.round(self.progress * final.length);
            el.textContent = final.slice(0, shown) + final.slice(shown).replace(/[A-Z0-9]/g, "•");
          },
          onComplete: () => { el.textContent = final; },
        });
        cleanups.push(() => r.revert?.());
      });
    };

    // A scroll sweep rather than an IntersectionObserver: jumping straight from
    // the top to the bottom moves a section from below the viewport to above it
    // without the intersection ratio ever crossing a threshold, so an observer
    // would never fire for it and the section would stay blank.
    const sections = [...scope.querySelectorAll<HTMLElement>("[data-reveal]")];

    const sweep = () => {
      const h = window.innerHeight;
      for (const section of sections) {
        if (played.has(section)) continue;
        const rect = section.getBoundingClientRect();
        if (rect.bottom <= 0) reveal(section);
        else if (rect.top < h * 0.88) play(section);
      }
    };

    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; sweep(); });
    };

    sweep();
    // A #hash deep link scrolls after mount without necessarily firing a scroll
    // event, so re-sweep once the browser has settled on the anchor.
    const settleTimers = [80, 300, 700].map((ms) => window.setTimeout(sweep, ms));

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("hashchange", onScrollOrResize);
    cleanups.push(() => {
      settleTimers.forEach(window.clearTimeout);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("hashchange", onScrollOrResize);
    });

    return () => cleanups.forEach((fn) => { try { fn(); } catch { /* already torn down */ } });
  }, []);

  return (
    <div className="landing" ref={root}>
      <header className="landing-nav">
        <a className="relay-brand" href="/" data-route>
          <span className="relay-mark"><Zap size={18} strokeWidth={2.8} /></span>
          <span><b>RELAY</b><small>FOOD RESCUE OS</small></span>
        </a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#proof">Proof</a>
          <a
            href="https://github.com/srivibhavpadakandla/relay-food-rescue"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
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
            <a className="hero-cta primary" href="/console" data-route>
              Watch it run <ArrowRight size={17} />
            </a>
            <a
              className="hero-cta ghost"
              href="https://github.com/srivibhavpadakandla/relay-food-rescue"
              target="_blank"
              rel="noreferrer"
            >
              Read the source
            </a>
          </div>
          <dl className="hero-metrics">
            <div className="hero-metric">
              <dt>Meals recovered</dt><dd>1,240</dd><small>of 1,240 at risk</small>
            </div>
            <div className="hero-metric">
              <dt>Autonomous run</dt><dd>26s</dd><small>vs. 47m by hand</small>
            </div>
            <div className="hero-metric">
              <dt>Spend</dt><dd>$186</dd><small>under a $250 ceiling</small>
            </div>
          </dl>
        </div>

        <div className="hero-visual">
          <div className="hero-gauges">
            <span className="gauge danger">
              <Gauge size={14} /> LOAD TEMPERATURE <b data-temp>4.0°C</b>
            </span>
            <span className="gauge">
              <Clock3 size={14} /> SAFE WINDOW <b data-clock>71 min</b>
            </span>
          </div>

          <svg className="chain" viewBox="0 0 560 400" role="img" aria-label="A failed truck routed to two verified food banks">
            <defs>
              <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#177246" />
                <stop offset="100%" stopColor="#d8f34b" />
              </linearGradient>
            </defs>

            <path id="chain-route" className="draw" d="M80 200 C170 200 190 200 250 200 C320 200 360 96 470 96"
              fill="none" stroke="url(#lime)" strokeWidth="3" strokeLinecap="round" />
            <path className="draw" d="M250 200 C320 200 360 306 470 306"
              fill="none" stroke="url(#lime)" strokeWidth="3" strokeLinecap="round" />

            <g className="chain-truck">
              <circle r="15" fill="#103c2a" />
              <circle r="15" fill="none" stroke="#d8f34b" strokeWidth="2" opacity="0.9" />
            </g>

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

      {/* ---------------------------------------------------------------- */}
      <section className="band problem" data-reveal>
        <div className="band-head" data-reveal-item>
          <span className="kicker">THE FRICTION</span>
          <h2>Six systems. One warming truck.</h2>
          <p>
            Recovering a failed cold-chain load means an operator working across a fleet
            system, an inventory record, a partner directory, routing, spend policy and
            food-safety rules — by hand, while the clock runs down.
          </p>
        </div>
        <div className="scatter">
          {SCATTERED.map(({ icon: Icon, label }) => (
            <span className="scatter-chip" key={label} data-reveal-item>
              <Icon size={15} /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band how" id="how" data-reveal>
        <div className="band-head" data-reveal-item>
          <span className="kicker">HOW IT WORKS</span>
          <h2>The model proposes.<br /><em>Policy decides. Tools prove.</em></h2>
          <p>
            Relay keeps probabilistic planning and deterministic authorisation in separate
            layers, so an agent can move fast without being trusted with the chequebook.
          </p>
        </div>
        <div className="steps">
          {STEPS.map(({ n, title, body, icon: Icon }) => (
            <article className="step" key={n} data-reveal-item>
              <span className="step-n">{n}</span>
              <span className="step-icon"><Icon size={18} /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band proof" id="proof" data-reveal>
        <div className="band-head" data-reveal-item>
          <span className="kicker">VERIFIED RUNS</span>
          <h2>Three missions. One of them is unwinnable.</h2>
          <p>
            Every figure below came out of a live Gemini 3.5 Flash run against the policy
            gate. The third mission matters most: Relay rescues what it can prove and
            escalates the rest instead of reporting a clean sweep.
          </p>
        </div>
        <div className="missions">
          {MISSIONS.map((m) => (
            <article className={`mission-card ${m.tone}`} key={m.id} data-reveal-item>
              <header>
                <b>{m.id}</b>
                <span>{m.tone === "warn" ? <UserRound size={14} /> : <MapPin size={14} />}{m.title}</span>
              </header>
              <p>{m.detail}</p>
              <div className="mission-stat">
                <strong>{m.stat}</strong>
                <small>{m.statLabel}</small>
              </div>
              <footer>
                <span className="receipt-pill">
                  <FileCheck2 size={13} /> <em data-receipt={m.receipt}>{m.receipt}</em>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band stack" data-reveal>
        <div className="band-head" data-reveal-item>
          <span className="kicker">BUILT ON</span>
          <h2>One Cloud Run service. One revision.</h2>
        </div>
        <div className="stack-strip">
          {STACK.map((s) => <span key={s} data-reveal-item>{s}</span>)}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="band closer" data-reveal>
        <div data-reveal-item>
          <h2>Open the console and press <em>Run rescue</em>.</h2>
          <p>Every row you see is a real Gemini tool call. Nothing is pre-recorded.</p>
          <a className="hero-cta primary" href="/console" data-route>
            Launch mission control <ArrowRight size={17} />
          </a>
        </div>
      </section>

      <footer className="landing-foot">
        <span>Relay — Autonomous Food Rescue OS</span>
        <span>Built for the All Things Agentic Hackathon · MIT licensed</span>
      </footer>
    </div>
  );
}
