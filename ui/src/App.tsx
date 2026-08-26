import { lazy, Suspense, useEffect, useState } from "react";

// The two routes have almost no code in common — the landing page pulls in GSAP
// and Motion, the console pulls in Anime.js — so each is fetched on demand.
const Landing = lazy(() => import("./Landing"));
const Console = lazy(() => import("./Console"));

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keep in-app navigation client-side.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement)?.closest?.("a[data-route]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      window.history.pushState({}, "", href);
      setPath(currentPath());
      window.scrollTo(0, 0);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <Suspense fallback={<div className="route-loading" aria-live="polite">Loading Relay…</div>}>
      {path === "/console" ? <Console /> : <Landing />}
    </Suspense>
  );
}
