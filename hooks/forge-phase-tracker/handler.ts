/**
 * forge-phase-tracker — Bamwerks OpenClaw Hook
 *
 * Silently logs FORGE workflow phase transitions to a persistent audit trail.
 * No user-facing messages — pure audit log only.
 *
 * Built by Bamwerks. MIT License.
 * https://github.com/bamwerks/openclaw-hooks
 */

import fs from "fs";
import path from "path";
import os from "os";

interface HookEvent {
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
}

interface PhaseDefinition {
  phase: number;
  label: string;
  patterns: RegExp[];
}

const PHASES: PhaseDefinition[] = [
  {
    phase: 0,
    label: "Listen/Classify",
    patterns: [
      /phase\s*0/i,
      /\blisten\s+fully\b/i,
      /\bclassify\b/i,
      /verify\s+understanding/i,
    ],
  },
  {
    phase: 1,
    label: "Plan",
    patterns: [
      /phase\s*1/i,
      /\binception\b/i,
      /\bsize\s+it\b/i,
      /create\s+issue/i,
      /\bpresent\s+plan\b/i,
    ],
  },
  {
    phase: 2,
    label: "Build",
    patterns: [
      /phase\s*2/i,
      /\bdispatch\b.*\bbuilder\b/i,
      /\bbuilder\b.*\bGOAL\b/i,
      /\bGOAL\/CONSTRAINTS\/CONTEXT\/OUTPUT\b/i,
    ],
  },
  {
    phase: 3,
    label: "Gate",
    patterns: [
      /phase\s*3/i,
      /\bdispatch\b.*\bHawk\b/i,
      /\bdispatch\b.*\bSentinel\b/i,
      /\bgate\s+(pass|fail)\b/i,
      /\bQA\s+gate\b/i,
    ],
  },
  {
    phase: 4,
    label: "Deliver",
    patterns: [
      /phase\s*4/i,
      /\bmerge\b/i,
      /\breport\s+to\s+founder\b/i,
      /\bship\b/i,
      /\bupdate\s+board\b/i,
      /\bupdate\s+memory\b/i,
    ],
  },
];

const resolveLogPath = (): string => {
  const workspace =
    process.env.OPENCLAW_WORKSPACE ??
    path.join(os.homedir(), ".openclaw", "workspace");
  const memoryDir = path.join(workspace, "memory");

  // Ensure the memory directory exists — best-effort
  try {
    fs.mkdirSync(memoryDir, { recursive: true });
  } catch {
    // If we can't create it, we'll fail gracefully at write time
  }

  return path.join(memoryDir, "forge-activity.log");
};

const detectPhases = (body: string): PhaseDefinition[] => {
  return PHASES.filter((def) => def.patterns.some((re) => re.test(body)));
};

const truncate = (text: string, maxLen: number): string => {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > maxLen ? single.slice(0, maxLen) + "…" : single;
};

const appendLog = (logPath: string, line: string): void => {
  try {
    fs.appendFileSync(logPath, line + "\n", "utf8");
  } catch {
    // Non-fatal — audit log failures must not disrupt the session
  }
};

const handler = async (event: HookEvent): Promise<void> => {
  // Only handle inbound messages
  if (event.type !== "message" || event.action !== "received") return;

  const body = event.context?.body ?? "";
  if (!body) return;

  const matched = detectPhases(body);
  if (matched.length === 0) return;

  const logPath = resolveLogPath();
  const ts = new Date(event.timestamp ?? Date.now()).toISOString();
  const snippet = truncate(body, 120);

  for (const def of matched) {
    const line =
      `[${ts}] session=${event.sessionKey} ` +
      `phase=${def.phase} (${def.label}) ` +
      `snippet="${snippet}"`;
    appendLog(logPath, line);
  }

  // Intentionally no event.messages.push() — silent audit only
};

export default handler;
