import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Relay judge experience and social metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Relay — Autonomous Food Rescue OS<\/title>/i);
  assert.match(html, /Autonomous food rescue\. Every action leaves proof\./i);
  assert.match(html, /og\.png/i);
  assert.match(html, /Run rescue/i);
  assert.match(html, /Gemini 3\.5 Flash/i);
  assert.match(html, /Deterministic policy gate/i);
  assert.match(html, /RLY-2048/i);
  assert.doesNotMatch(html, /codex-preview|Building your site/i);
});

test("owns Anime.js motion and React Bits-style interaction primitives", async () => {
  const [page, bits, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/react-bits.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"animejs"/);
  assert.match(page, /from "animejs"/);
  assert.match(bits, /SpotlightCard/);
  assert.match(bits, /MagnetButton/);
  assert.match(bits, /CountUp/);
  assert.match(bits, /ShinyText/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(page, /aria-live="polite"/);
});
