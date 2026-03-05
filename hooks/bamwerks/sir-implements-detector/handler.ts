/**
 * sir-implements-detector — Bamwerks OpenClaw Hook
 *
 * Enforces the FORGE rule: "Orchestrator coordinates, never implements."
 * Detects when the main session agent directly writes code, edits files,
 * or runs implementation scripts instead of dispatching to a builder.
 *
 * Built by Bamwerks (Ada, Architecture Lead). MIT License.
 * https://github.com/bamwerks/openclaw-hooks
 */

import * as fs from "fs";
import * as path from "path";

// ── Configuration ────────────────────────────────────────────────────────────

const WORKSPACE = "/opt/openclaw/.openclaw/workspace";
const VIOLATION_LOG = path.join(WORKSPACE, "memory", "forge-violations.log");

/**
 * Workspace paths the orchestrator is allowed to write/edit (orchestrator maintenance).
 * Anything else = violation.
 */
const WORKSPACE_WRITE_ALLOWLIST = [
  path.join(WORKSPACE, "MEMORY.md"),
  path.join(WORKSPACE, "SOUL.md"),
  path.join(WORKSPACE, "AGENTS.md"),
  path.join(WORKSPACE, "USER.md"),
  path.join(WORKSPACE, "IDENTITY.md"),
  path.join(WORKSPACE, "HEARTBEAT.md"),
  path.join(WORKSPACE, "TOOLS.md"),
  path.join(WORKSPACE, "memory"),       // daily logs
  path.join(WORKSPACE, "agents"),       // design docs, workflows
  path.join(WORKSPACE, "hooks"),        // hook development
  path.join(WORKSPACE, "scripts"),      // utility scripts the orchestrator may update
];

/**
 * Phrases in outbound messages that signal direct implementation.
 * Matched case-insensitively.
 */
const IMPLEMENTATION_PHRASES: RegExp[] = [
  /i['']ve\s+(written|created|edited|modified|updated|fixed|patched|added)\s+(?:the\s+)?(?:code|file|script|function|class|component|handler|module|config)/i,
  /i\s+(wrote|created|edited|modified|updated|fixed|patched|added)\s+(?:the\s+)?(?:code|file|script|function|class|component|handler|module)/i,
  /using\s+(?:the\s+)?(?:write|edit)\s+tool\s+(?:to\s+)?(?:create|modify|update|write|edit)/i,
  /called\s+(?:the\s+)?(?:write|edit)\s+tool/i,
  /ran\s+(?:the\s+)?(?:script|command)\s+(?:directly|to\s+fix|to\s+update|to\s+create)/i,
  /directly\s+(?:wrote|created|edited|modified|implemented|fixed)/i,
];

/**
 * File path patterns that, when combined with implementation phrases,
 * confirm a violation (non-workspace paths).
 */
const SOURCE_PATH_PATTERN = /(?:\/opt\/openclaw\/projects|~\/agentic|\.js|\.ts|\.py|\.sh|\.go|\.rb|\.java|\.css|\.html|\.jsx|\.tsx|\.vue|\.svelte)(?:\b|\/)/i;

/**
 * Large code block detection: fenced code blocks over N lines suggest
 * the orchestrator wrote implementation code inline.
 */
const CODE_BLOCK_MIN_LINES = 25;

// ── Session State ─────────────────────────────────────────────────────────────

/** Tracks violation count per session (resets when process restarts) */
const sessionViolations: Map<string, number> = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMainSession(sessionKey: string): boolean {
  // Main session keys match: agent:main:discord:... or agent:main:*
  // Subagent keys match: agent:main:subagent:*
  return /^agent:main:(?!subagent)/.test(sessionKey);
}

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fencedPattern = /```[\s\S]*?```/g;
  let match;
  while ((match = fencedPattern.exec(text)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function countLines(text: string): number {
  return text.split("\n").length;
}

function hasLargeCodeBlock(body: string): boolean {
  const blocks = extractCodeBlocks(body);
  return blocks.some((block) => countLines(block) >= CODE_BLOCK_MIN_LINES);
}

function detectViolation(body: string): { violated: boolean; reason: string } {
  // Check implementation phrases + source path
  for (const phrase of IMPLEMENTATION_PHRASES) {
    if (phrase.test(body) && SOURCE_PATH_PATTERN.test(body)) {
      return {
        violated: true,
        reason: `Direct implementation phrase detected: "${phrase.source.substring(0, 60)}..."`,
      };
    }
  }

  // Check large inline code blocks (orchestrator shouldn't produce raw implementations)
  if (hasLargeCodeBlock(body)) {
    // Large code block alone is suspicious but not definitive.
    // Only flag if combined with an implementation phrase (no source path required).
    for (const phrase of IMPLEMENTATION_PHRASES) {
      if (phrase.test(body)) {
        return {
          violated: true,
          reason: `Large code block (≥${CODE_BLOCK_MIN_LINES} lines) with implementation language detected`,
        };
      }
    }
  }

  return { violated: false, reason: "" };
}

function logViolation(
  sessionKey: string,
  violationCount: number,
  reason: string,
  snippet: string
): void {
  try {
    const timestamp = new Date().toISOString();
    const logLine = [
      timestamp,
      `session=${sessionKey}`,
      `violation=#${violationCount}`,
      `type=direct_implementation`,
      `reason=${reason}`,
      `snippet="${snippet.substring(0, 120).replace(/\n/g, " ")}..."`,
    ].join(" | ");

    fs.appendFileSync(VIOLATION_LOG, logLine + "\n", "utf8");
  } catch {
    // Log write failure is non-fatal — don't crash the hook
  }
}

function buildNudge(violationCount: number): string {
  if (violationCount === 1) {
    return (
      "\n\n---\n" +
      "⚠️ **FORGE REMINDER** — The orchestrator coordinates, never implements. " +
      "If you've directly written code or edited source files, that's a FORGE violation. " +
      "Dispatch the work to a builder sub-agent and let them implement. " +
      "Violation logged to `memory/forge-violations.log`."
    );
  } else {
    return (
      "\n\n---\n" +
      `🚨 **FORGE VIOLATION #${violationCount} THIS SESSION** — ` +
      "Direct implementation detected again. This requires a retrospective entry in today's memory file: " +
      "what happened, root cause, prevention. " +
      "The orchestrator's role is coordination only. Dispatch a builder. " +
      `Violation #${violationCount} logged to \`memory/forge-violations.log\`.`
    );
  }
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
    role?: string;
    source?: string;
  };
}) => {
  // Only handle outbound messages
  if (event.type !== "message" || event.action !== "sent") return;

  // Only enforce on the main session (orchestrator), not on sub-agents
  if (!isMainSession(event.sessionKey)) return;

  const body = event.context?.body ?? "";
  if (!body.trim()) return;

  // Detect violation
  const { violated, reason } = detectViolation(body);
  if (!violated) return;

  // Increment violation count for this session
  const current = sessionViolations.get(event.sessionKey) ?? 0;
  const newCount = current + 1;
  sessionViolations.set(event.sessionKey, newCount);

  // Log to forge-violations.log
  logViolation(event.sessionKey, newCount, reason, body);

  // Inject corrective nudge into the outbound message
  event.messages.push(buildNudge(newCount));
};

export default handler;
