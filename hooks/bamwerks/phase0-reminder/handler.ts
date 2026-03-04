/**
 * phase0-reminder — Bamwerks OpenClaw Hook
 *
 * Injects a Phase 0 discipline checklist before Sir sees each inbound message.
 * Enforces: classify → verify understanding → check actual state → then act.
 *
 * Built by Bamwerks (Ada, Architecture Lead). MIT License.
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Phase 0 reminder text prepended to bodyForAgent. Keep to one line. */
const PHASE0_REMINDER =
  "⚡ **PHASE 0** — Before acting: " +
  "(1) classify this as conversation/direction/task, " +
  "(2) verify What/Where/Why/Constraints — ask if unclear, " +
  "(3) check ACTUAL state, do NOT assume from memory. " +
  "Then proceed.\n\n---\n\n";

/** Max word count for a message to be considered "short" */
const SHORT_MESSAGE_WORD_THRESHOLD = 12;

/**
 * Patterns that indicate a clearly conversational/acknowledgment message.
 * Phase 0 injection is skipped for these — no need to remind Sir on "ok thanks".
 */
const CONVERSATIONAL_PATTERNS: RegExp[] = [
  /^(ok|okay|got it|sounds good|thanks|thank you|perfect|great|noted|understood|sure|yep|yes|no|nope|cool|nice|good|done|👍|✅|🙏|👌|💯)\s*[.!]*$/i,
  /^(heartbeat|ping|status)\s*$/i,
  /^(hi|hey|hello|good morning|good evening|good afternoon)\s*[!,.]?\s*$/i,
  /^HEARTBEAT_OK\s*$/,
];

/**
 * Keywords that flag a message as task-like regardless of word count.
 * These override the short-message skip.
 */
const TASK_KEYWORDS: RegExp[] = [
  /\b(create|update|fix|build|deploy|write|edit|review|check|run|execute|analyze|design|plan|implement|generate|fetch|get|find|list|add|remove|delete|move|rename|configure|install|setup|migrate|merge|pr|pull request|issue|task|ticket)\b/i,
  /\b(agents?|hook|script|workflow|memory|FORGE|phase|dispatch|subagent|sub-agent)\b/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMainSession(sessionKey: string): boolean {
  // Main session: agent:main:discord:... etc., but NOT subagents
  return /^agent:main:(?!subagent)/.test(sessionKey);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isConversational(body: string): boolean {
  const trimmed = body.trim();

  // Explicit conversational patterns (always skip)
  if (CONVERSATIONAL_PATTERNS.some((p) => p.test(trimmed))) {
    return true;
  }

  // Short message with no task keywords → conversational
  if (wordCount(trimmed) <= SHORT_MESSAGE_WORD_THRESHOLD) {
    const hasTaskKeyword = TASK_KEYWORDS.some((p) => p.test(trimmed));
    if (!hasTaskKeyword) {
      return true;
    }
  }

  return false;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

const handler = async (event: {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context?: {
    body?: string;
    bodyForAgent?: string;
    channelId?: string;
    conversationId?: string;
    messageId?: string;
    isGroup?: boolean;
    groupId?: string;
    transcript?: string;
  };
}) => {
  // Only handle preprocessed inbound messages
  if (event.type !== "message" || event.action !== "preprocessed") return;

  // Only for Sir's main session
  if (!isMainSession(event.sessionKey)) return;

  const body = event.context?.bodyForAgent ?? event.context?.body ?? "";
  if (!body.trim()) return;

  // Skip injection for conversational messages
  if (isConversational(body)) return;

  // Primary: prepend to bodyForAgent (agent sees it before the message content)
  if (event.context) {
    const target = event.context.bodyForAgent ?? event.context.body;
    if (target !== undefined) {
      // Attempt to mutate bodyForAgent — works if OpenClaw treats this as mutable
      try {
        event.context.bodyForAgent = PHASE0_REMINDER + (event.context.bodyForAgent ?? body);
      } catch {
        // If bodyForAgent is non-writable, fall through to event.messages fallback
      }
    }
  }
};

export default handler;
