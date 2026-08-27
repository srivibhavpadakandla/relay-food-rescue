/** Client for the live agent event stream.
 *
 * The mission run is a POST that returns `text/event-stream`, so this parses
 * SSE off the fetch body rather than using EventSource (which is GET-only).
 */

export type ToolCall = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  elapsed_ms: number;
};

export type ToolResult = {
  id: string;
  tool: string;
  status: "confirmed" | "blocked" | "ok" | "open" | string;
  result: Record<string, any>;
  elapsed_ms: number;
};

export type MissionStart = {
  mission_id: string;
  label: string;
  meals: number;
  temperature_c: number;
  safe_minutes: number;
  max_spend_usd: number;
  model: string;
};

export type MissionComplete = {
  mission_id: string;
  spend_usd: number;
  meals_dispatched: number;
  meals_escalated: number;
  meals_at_risk: number;
  spend_ceiling_usd: number;
  receipts: number;
  duration_ms: number;
  checkpoint_backend: string;
  receipt_log: Record<string, any>[];
  final_text: string;
};

export type Scenario = {
  mission_id: string;
  label: string;
  summary: string;
  meals: number;
  temperature_c: number;
  safe_minutes: number;
  max_spend_usd: number;
  expectation: string;
};

export type AgentEvent =
  | { type: "mission_start"; data: MissionStart }
  | { type: "tool_call"; data: ToolCall }
  | { type: "tool_result"; data: ToolResult }
  | { type: "agent_text"; data: { text: string } }
  | { type: "mission_complete"; data: MissionComplete }
  | { type: "error"; data: { message: string } };

/** Where the agent lives.
 *
 * Empty by default: the Cloud Run container serves the console and the agent
 * from one origin. Set VITE_AGENT_API at build time to point a separately
 * hosted front end (Cloudflare Pages, a preview deploy) at the agent service.
 */
export const AGENT_API = (import.meta.env.VITE_AGENT_API ?? "").replace(/\/+$/, "");

/** True when this build has no agent to talk to, so the UI can say so plainly. */
export const AGENT_CONFIGURED = AGENT_API !== "" || !import.meta.env.VITE_STATIC_ONLY;

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${AGENT_API}/api/scenarios`);
  if (!res.ok) throw new Error(`Scenario load failed (${res.status})`);
  return (await res.json()).scenarios;
}

/** Run one mission, yielding each agent event as it happens. */
export async function* runMission(
  missionId: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const res = await fetch(`${AGENT_API}/api/missions/${missionId}/run`, {
    method: "POST",
    headers: { Accept: "text/event-stream" },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Mission failed to start (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);

      let event = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      }
      if (!dataLines.length) continue;

      try {
        yield { type: event, data: JSON.parse(dataLines.join("\n")) } as AgentEvent;
      } catch {
        // A malformed frame must not kill the run; skip it and keep reading.
      }
    }
  }
}

/** Human-readable label for each tool, used in the trace panel. */
export const TOOL_LABELS: Record<string, string> = {
  assess_incident: "Assess incident",
  list_fleet_options: "Search fleet",
  find_partner_capacity: "Find partner capacity",
  reserve_vehicle: "Reserve vehicle",
  claim_partner_capacity: "Claim partner capacity",
  dispatch_rescue: "Dispatch route",
  escalate_to_human: "Escalate to operator",
};

export const READ_ONLY_TOOLS = new Set([
  "assess_incident",
  "list_fleet_options",
  "find_partner_capacity",
]);


/** The published mission definitions, mirroring services/relay_agent/world.py.
 *
 * Used when no agent is reachable, so a statically hosted front end still shows
 * the real missions instead of an empty shell. Running one still requires the
 * agent; these are the incident definitions, not results.
 */
export const FALLBACK_SCENARIOS: Scenario[] = [
  { mission_id: "RLY-2048", label: "Refrigeration failure \u00b7 Truck R-14",
    summary: "1,240 meals at 9.8 \u00b0C with 71 minutes of safe window.",
    meals: 1240, temperature_c: 9.8, safe_minutes: 71, max_spend_usd: 250, expectation: "" },
  { mission_id: "RLY-2071", label: "Budget squeeze \u00b7 Truck R-22",
    summary: "900 meals, a tight 40-minute window and a $150 spend ceiling.",
    meals: 900, temperature_c: 8.4, safe_minutes: 40, max_spend_usd: 150, expectation: "" },
  { mission_id: "RLY-2090", label: "Capacity shortfall \u00b7 Truck R-31",
    summary: "1,500 meals against a partner network that can only take 1,050.",
    meals: 1500, temperature_c: 10.6, safe_minutes: 35, max_spend_usd: 250, expectation: "" },
];
