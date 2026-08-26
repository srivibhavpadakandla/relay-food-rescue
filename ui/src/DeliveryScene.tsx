import { animate, onScroll, stagger, svg, utils } from "animejs";
import { useEffect, useRef } from "react";

/**
 * The food-delivery layer that runs behind the page.
 *
 * Scroll drives the delivery literally: the refrigerated van is bound to the
 * route with `createMotionPath`, and the whole timeline is scrubbed by
 * `onScroll({ sync })`, so scrolling forward drives the van toward the food
 * banks and scrolling back reverses it. Crates lift off the van and settle at
 * each partner as the route completes.
 *
 * It is decorative, so it is aria-hidden and disabled entirely under
 * prefers-reduced-motion.
 */
export default function DeliveryScene() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The scene itself is sticky, so its own rect never moves and would report
    // no scroll progress. Scrub against the wrapper, which actually scrolls.
    const track = (scope.closest(".delivery-wrap") as HTMLElement) ?? scope;

    const cleanups: Array<() => void> = [];
    const route = scope.querySelector<SVGPathElement>("#delivery-route");
    const van = scope.querySelector<SVGGElement>(".van");
    if (!route || !van) return;

    // The van rides the real path data, so it always sits on the road.
    const ride = animate(van, {
      ...svg.createMotionPath(route),
      ease: "linear",
      autoplay: onScroll({
        target: track,
        enter: "top top",
        leave: "bottom bottom",
        sync: 0.55, // smoothing, so the van eases rather than snapping to scroll
      }),
    });
    cleanups.push(() => ride.revert?.());

    // The road draws itself in as the section is scrubbed.
    const road = animate(svg.createDrawable(route), {
      draw: ["0 0.02", "0 1"],
      ease: "linear",
      autoplay: onScroll({ target: track, enter: "top top", leave: "bottom bottom", sync: 0.55 }),
    });
    cleanups.push(() => road.revert?.());

    // Crates rise off the van and land at the partners, later in the scrub.
    const crates = scope.querySelectorAll<SVGGElement>(".crate");
    if (crates.length) {
      const drop = animate(crates, {
        opacity: [0, 1],
        scale: [0.4, 1],
        y: [-26, 0],
        delay: stagger(120),
        ease: "outBack",
        autoplay: onScroll({ target: track, enter: "center top", leave: "bottom bottom", sync: 0.5 }),
      });
      cleanups.push(() => drop.revert?.());
    }

    // Partner markers pulse once their crates arrive.
    const pins = scope.querySelectorAll<SVGGElement>(".pin");
    if (pins.length) {
      const pop = animate(pins, {
        scale: [0.6, 1],
        opacity: [0.25, 1],
        delay: stagger(160),
        ease: "outBack",
        autoplay: onScroll({ target: track, enter: "center top", leave: "bottom bottom", sync: 0.5 }),
      });
      cleanups.push(() => pop.revert?.());
    }

    // Cold-chain vapour drifting off the load, independent of scroll.
    const vapour = scope.querySelectorAll<SVGCircleElement>(".vapour");
    if (vapour.length) {
      const drift = animate(vapour, {
        translateY: [0, -26],
        opacity: [{ to: 0.5, duration: 700 }, { to: 0, duration: 1500 }],
        scale: [0.7, 1.5],
        delay: stagger(600),
        duration: 2200,
        loop: true,
        ease: "outSine",
      });
      cleanups.push(() => drift.revert?.());
    }

    return () => cleanups.forEach((fn) => { try { fn(); } catch { utils.set(scope, {}); } });
  }, []);

  return (
    <div className="delivery-scene" ref={root} aria-hidden="true">
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="road-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#177246" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#177246" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#d8f34b" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* the delivery route the van follows */}
        <path
          id="delivery-route"
          d="M-40 700 C 190 700 250 604 420 566 C 600 524 660 700 860 640 C 1030 588 1080 300 1300 250"
          fill="none"
          stroke="url(#road-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="14 12"
        />

        {/* partner drop-offs */}
        <g className="pin" transform="translate(860 640)">
          <circle r="26" fill="#177246" opacity="0.08" />
          <circle r="9" fill="#fffefa" stroke="#177246" strokeWidth="2.5" />
        </g>
        <g className="pin" transform="translate(1300 250)">
          <circle r="26" fill="#177246" opacity="0.08" />
          <circle r="9" fill="#fffefa" stroke="#177246" strokeWidth="2.5" />
        </g>

        {/* crates delivered to each partner */}
        <g className="crate" transform="translate(846 676)">
          <rect width="28" height="21" rx="4" fill="#fffefa" stroke="#177246" strokeWidth="2" />
          <path d="M0 8 H28" stroke="#177246" strokeWidth="1.6" opacity="0.55" />
        </g>
        <g className="crate" transform="translate(882 676)">
          <rect width="28" height="21" rx="4" fill="#fffefa" stroke="#177246" strokeWidth="2" />
          <path d="M0 8 H28" stroke="#177246" strokeWidth="1.6" opacity="0.55" />
        </g>
        <g className="crate" transform="translate(1286 286)">
          <rect width="28" height="21" rx="4" fill="#fffefa" stroke="#177246" strokeWidth="2" />
          <path d="M0 8 H28" stroke="#177246" strokeWidth="1.6" opacity="0.55" />
        </g>

        {/* the refrigerated van, bound to the route */}
        <g className="van">
          <g transform="translate(-27 -19)">
            <rect x="0" y="4" width="40" height="22" rx="5" fill="#103c2a" />
            <rect x="38" y="10" width="16" height="16" rx="4" fill="#103c2a" />
            <rect x="42" y="13" width="9" height="7" rx="2" fill="#d8f34b" opacity="0.9" />
            <rect x="6" y="9" width="26" height="5" rx="2" fill="#d8f34b" opacity="0.55" />
            <circle cx="13" cy="29" r="5" fill="#142018" />
            <circle cx="44" cy="29" r="5" fill="#142018" />
            <circle className="vapour" cx="4" cy="10" r="4" fill="#9fc4ad" opacity="0" />
            <circle className="vapour" cx="10" cy="6" r="3" fill="#9fc4ad" opacity="0" />
            <circle className="vapour" cx="16" cy="9" r="3.5" fill="#9fc4ad" opacity="0" />
          </g>
        </g>
      </svg>
    </div>
  );
}
