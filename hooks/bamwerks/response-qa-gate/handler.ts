/**
 * Response QA Gate Hook
 *
 * Intercepts agent responses via response_before_deliver and runs a lightweight
 * QA check to verify the response achieves the user's actual goal — not just
 * addresses the surface question.
 *
 * Fails open: any error or timeout allows the original response through.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const QA_TIMEOUT_MS = 45_000;
const QA_MODEL = "claude-haiku-3-5-20241022";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

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
 * Read the Anthropic API key from keychain or config.
 * Returns null if not found — hook will fail open.
 */
function getAnthropicApiKey(): string | null {
  try {
    const fromKeychain = execSync(
      "security find-generic-password -s 'openclaw-secrets' -a 'anthropic-token' -w 2>/dev/null",
      { encoding: "utf8", timeout: 5000 }
    ).trim();
    if (fromKeychain && fromKeychain.startsWith("sk-")) {
      return fromKeychain;
    }
  } catch {
    // keychain read failed — try config
  }

  try {
    const configPath = path.join(
      process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw"),
      "openclaw.json"
    );
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const apiKey =
      config?.models?.providers?.anthropic?.apiKey ||
      config?.providers?.anthropic?.apiKey;
    if (apiKey && apiKey.startsWith("sk-")) {
      return apiKey;
    }
  } catch {
    // config read failed
  }

  return null;
}

/**
 * Call the Anthropic Messages API directly with a timeout.
 * Returns the raw text content of the first message block.
 */
async function callAnthropicHaiku(
  prompt: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QA_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: QA_MODEL,
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

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    console.error("[response-qa-gate] No Anthropic API key found — failing open");
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

    const result = await callAnthropicHaiku(qaPrompt, apiKey);
    console.log(`[response-qa-gate] QA result: ${result.slice(0, 100)}`);

    if (result.toUpperCase().startsWith("FAIL")) {
      const reason = result.replace(/^FAIL:\s*/i, "").trim();
      console.warn(`[response-qa-gate] QA FAILED — cancelling response. Reason: ${reason}`);
      // Cancel and let the agent retry
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
