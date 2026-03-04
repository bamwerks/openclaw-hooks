/**
 * session-cost-alert — Bamwerks OpenClaw Hook
 *
 * Tracks cumulative token usage per session and alerts the user when they
 * approach their configured budget ceiling.
 *
 * Built by Bamwerks. MIT License.
 * https://github.com/bamwerks/openclaw-hooks
 */

import fs from "fs";
import path from "path";
import os from "os";

interface SessionCostState {
  sessionKey: string;
  totalTokens: number;
  warned: boolean;
  lastUpdated: string;
}

interface HookEvent {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  config?: {
    warningThreshold?: number;
    sessionBudgetTokens?: number;
  };
  context?: {
    body?: string;
    role?: string;
    source?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

const stateFilePath = (sessionKey: string): string => {
  // Sanitize sessionKey for use as a filename component
  const safe = sessionKey.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
  return path.join(os.tmpdir(), `openclaw-session-cost-${safe}.json`);
};

const readState = (filePath: string, sessionKey: string): SessionCostState => {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as SessionCostState;
    // Guard against stale state from a different session
    if (parsed.sessionKey !== sessionKey) {
      return { sessionKey, totalTokens: 0, warned: false, lastUpdated: new Date().toISOString() };
    }
    return parsed;
  } catch {
    return { sessionKey, totalTokens: 0, warned: false, lastUpdated: new Date().toISOString() };
  }
};

const writeState = (filePath: string, state: SessionCostState): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Non-fatal — temp write failures shouldn't break the session
  }
};

const handler = async (event: HookEvent): Promise<void> => {
  // Only handle outbound messages
  if (event.type !== "message" || event.action !== "sent") return;

  // Extract token usage from context — no usage data, nothing to track
  const usage = event.context?.usage;
  if (!usage) return;

  const tokensThisMessage =
    usage.total_tokens ??
    (usage.input_tokens ?? 0) +
      (usage.output_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);

  if (tokensThisMessage <= 0) return;

  // Read config with defaults
  const warningThreshold = event.config?.warningThreshold ?? 0.8;
  const sessionBudgetTokens = event.config?.sessionBudgetTokens ?? 50000;

  const filePath = stateFilePath(event.sessionKey);
  const state = readState(filePath, event.sessionKey);

  state.totalTokens += tokensThisMessage;
  state.lastUpdated = new Date().toISOString();

  const usedFraction = state.totalTokens / sessionBudgetTokens;

  // Alert once when threshold is first crossed
  if (usedFraction >= warningThreshold && !state.warned) {
    state.warned = true;

    const pct = Math.round(usedFraction * 100);
    const remaining = Math.max(0, sessionBudgetTokens - state.totalTokens);

    event.messages.push(
      `💸 **Token budget warning:** ${pct}% of session budget used ` +
        `(${state.totalTokens.toLocaleString()} / ${sessionBudgetTokens.toLocaleString()} tokens). ` +
        `~${remaining.toLocaleString()} tokens remaining. Consider wrapping up or starting a fresh session.`
    );
  }

  writeState(filePath, state);
};

export default handler;
