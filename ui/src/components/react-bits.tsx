"use client";

import { animate } from "animejs";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function moveSpotlight(event: MouseEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return <div ref={ref} onMouseMove={moveSpotlight} className={`spotlight-card ${className}`}>{children}</div>;
}

export function ShinyText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`shiny-text ${className}`}>{children}</span>;
}

export function CountUp({ value, suffix = "", duration = 900 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = { value: 0 };
    const animation = animate(target, {
      value,
      duration,
      ease: "outExpo",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = `${Math.round(target.value).toLocaleString()}${suffix}`;
      },
    });
    return () => { animation.cancel(); };
  }, [duration, suffix, value]);

  return <span ref={ref}>0{suffix}</span>;
}

export function MagnetButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);

  function move(event: MouseEvent<HTMLButtonElement>) {
    const button = ref.current;
    if (!button || props.disabled) return;
    const rect = button.getBoundingClientRect();
    animate(button, {
      x: (event.clientX - rect.left - rect.width / 2) * 0.12,
      y: (event.clientY - rect.top - rect.height / 2) * 0.14,
      duration: 220,
      ease: "outQuad",
    });
  }

  function reset() {
    if (!ref.current) return;
    animate(ref.current, { x: 0, y: 0, duration: 520, ease: "outElastic(1, .45)" });
  }

  return <button ref={ref} onMouseMove={move} onMouseLeave={reset} className={className} {...props}>{children}</button>;
}
