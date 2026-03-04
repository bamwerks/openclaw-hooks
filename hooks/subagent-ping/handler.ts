/**
 * subagent-ping — Bamwerks OpenClaw Hook
 *
 * Detects subagent completion events delivered as inbound messages
 * and nudges the main session agent to process the result.
 *
 * Built by Bamwerks. MIT License.
 * https://github.com/bamwerks/openclaw-hooks
 */

const handler = async (event: {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context?: {
    body?: string;
    role?: string;
    source?: string;
  };
}) => {
  // Only handle inbound messages
  if (event.type !== "message" || event.action !== "received") return;

  const body = event.context?.body ?? "";
  const source = event.context?.source ?? "";

  // Detect subagent completion signals
  const isSubagentResult =
    source === "subagent" ||
    body.includes("subagent task") ||
    body.includes("Exec completed") ||
    /\[Internal task completion event\]/i.test(body);

  if (!isSubagentResult) return;

  // Nudge the agent to process the result
  event.messages.push(
    "🔔 Subagent result received — review and take next action per FORGE workflow."
  );
};

export default handler;
