import { useEffect, useState } from "react";
import Console from "./Console";
import Landing from "./Landing";

/** Two routes, no router dependency: the landing page and the live console. */
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

  // Intercept in-app links so navigation stays client-side.
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

  return path === "/console" ? <Console /> : <Landing />;
}
