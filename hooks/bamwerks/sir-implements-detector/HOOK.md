---
name: sir-implements-detector
description: "Detects when Sir (main session orchestrator) directly implements instead of orchestrating. Logs FORGE violations and injects corrective nudges."
homepage: https://github.com/bamwerks/openclaw-hooks
metadata:
  {
    "openclaw": {
      "emoji": "🚨",
      "events": ["message:sent"],
      "requires": { "bins": ["node"] }
    }
  }
---

# Sir Implements Detector Hook

Enforces the FORGE principle: **Sir orchestrates, NEVER implements.**

## What It Does

- Listens for outbound messages from the main session
- Scans for signals that Sir directly wrote code, edited files, or ran implementation scripts
- Logs violations to `memory/forge-violations.log`
- Injects a graduated corrective nudge (soft warning → hard warning on repeat violations)

## Detection Signals

**Violation patterns in outbound messages:**
- "I've written / I created / I edited" + reference to a non-workspace file path
- Mention of using `write` or `edit` tool on source code files
- Large inline code blocks (>20 lines) without a prior sub-agent dispatch in context

**Workspace exception paths (Sir may write these — NOT violations):**
- `workspace/MEMORY.md`, `workspace/SOUL.md`, `workspace/AGENTS.md`
- `workspace/memory/` — daily logs
- `workspace/agents/notes/` — design docs
- `workspace/agents/workflows/` — process docs

## Graduated Enforcement

| Violation Count (session) | Response |
|---|---|
| 1st | ⚠️ Soft nudge logged and appended |
| 2nd+ | 🚨 Hard warning with retrospective requirement |

## Violation Log

`/opt/openclaw/.openclaw/workspace/memory/forge-violations.log`

Format: `TIMESTAMP | SESSION | TYPE | DETAIL`

## Configuration

No configuration required. Auto-detects main session vs. subagents by session key pattern.

## Open Source

Part of the [Bamwerks OpenClaw Hooks](https://github.com/bamwerks/openclaw-hooks) collection.
