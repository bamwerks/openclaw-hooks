/**
 * Response QA Gate Hook
 *
 * Intercepts agent responses via response_before_deliver and runs a lightweight
 * QA check to verify the response achieves the user's actual goal — not just
 * addresses the surface question.
 *
 * Fails open: any error or timeout allows the original response through.
 */

import fs from "fs";

const QA_TIMEOUT_MS = 45_000;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

interface ResponseBeforeDeliverEvent {
  type: "response";
  action: "before_deliver";
  sessionKey: string;
  payload: {
    to: string;
    content: string;
    metadata: {
      channel: string;
      agentId?: string;
      trigger?: string;
    };
  };
}

interface HookResult {
  content?: string;
  cancel?: boolean;
  cancelReason?: string;
}

/**
 * Read the Anthropic OAuth token from auth-profiles.json.
 * Returns null if not found or invalid.
 */
function getAnthropicToken(): string | null {
  try {
    const authPath = '/opt/openclaw/.openclaw/agents/main/agent/auth-profiles.json';
    const store = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    const token = store?.profiles?.['anthropic:default']?.token;
    if (token && token.startsWith('sk-ant-')) return token;
  } catch {}
  return null;
}

/**
 * Call the Anthropic Messages API with a timeout.
 * Returns the raw text content of the first content block.
 */
async function callAnthropicHaiku(prompt: string): Promise<string> {
  const token = getAnthropicToken();
  if (!token) {
    throw new Error("No Anthropic token available");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QA_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": token,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data?.content?.[0]?.text?.trim() ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

const handler = async (event: unknown): Promise<HookResult | void> => {
  const e = event as ResponseBeforeDeliverEvent;

  // Only handle events with content
  if (!e?.payload?.content) {
    return;
  }

  const responseText = e.payload.content;

  // Skip very short responses (greetings, acks, NO_REPLY, HEARTBEAT_OK)
  if (
    responseText.length < 50 ||
    responseText.trim() === "NO_REPLY" ||
    responseText.trim() === "HEARTBEAT_OK"
  ) {
    return;
  }

  // Skip cron/heartbeat triggers — only gate interactive responses
  const trigger = e.payload.metadata?.trigger;
  if (trigger === "cron" || trigger === "heartbeat") {
    return;
  }

  // Check token availability before proceeding
  const token = getAnthropicToken();
  if (!token) {
    console.error("[response-qa-gate] No Anthropic token found — failing open");
    return;
  }

  try {
    const qaPrompt = `You are a QA reviewer. An AI agent produced a response that is about to be delivered to a user.

Your job: Does the response actually achieve what the user needs, or does it answer the wrong question / have an obvious logical flaw?

PROPOSED RESPONSE:
${responseText}

Check for:
1. Does the response solve the user's ACTUAL goal (not just the surface question)?
2. Is there an obvious logical flaw (e.g. user needs X, response gives Y which doesn't produce X)?
3. Is the response factually plausible given what was asked?

Reply with ONLY one of:
- PASS — response is correct and achieves the goal
- FAIL: [brief reason] — response has a clear logic flaw or doesn't achieve the goal

Be conservative — only fail if there's a clear, obvious problem. When in doubt, PASS.`;

    const result = await callAnthropicHaiku(qaPrompt);
    console.log(`[response-qa-gate] QA result: ${result.slice(0, 100)}`);

    if (result.toUpperCase().startsWith("FAIL")) {
      const reason = result.replace(/^FAIL:\s*/i, "").trim();
      console.warn(`[response-qa-gate] QA FAILED — cancelling response. Reason: ${reason}`);
      return {
        cancel: true,
        cancelReason: `QA gate flagged a logic flaw: ${reason}. Please reconsider and correct your response.`,
      };
    }

    // PASS — let response through unchanged
    return;
  } catch (err) {
    console.error("[response-qa-gate] Error in QA check — failing open:", err);
    return;
  }
};

export default handler;
