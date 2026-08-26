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

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch("/api/scenarios");
  if (!res.ok) throw new Error(`Scenario load failed (${res.status})`);
  return (await res.json()).scenarios;
}

/** Run one mission, yielding each agent event as it happens. */
export async function* runMission(
  missionId: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const res = await fetch(`/api/missions/${missionId}/run`, {
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
