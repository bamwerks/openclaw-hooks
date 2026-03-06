# Bamwerks OpenClaw Hooks

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![OpenClaw Compatible](https://img.shields.io/badge/OpenClaw-compatible-blue.svg)](https://github.com/openclaw/openclaw)

Open source automation hooks for the [OpenClaw](https://github.com/openclaw/openclaw) agent platform, built by [Bamwerks](https://bamwerks.info).

> "Build in public. Govern seriously." — Bamwerks

## Hooks

### 🔔 subagent-ping

Detects when a subagent completes and nudges the main session to act on the result — prevents completed work from sitting unnoticed in a recovering or mid-workflow session.

**Events:** `message:received`  
**Config:** None required

---

### 💸 session-cost-alert

Tracks cumulative token usage per session and alerts the user when they approach their configured budget ceiling. Fires once at threshold (default: 80%) — not on every message.

**Events:** `message:sent`  
**Config:**

| Key | Default | Description |
|-----|---------|-------------|
| `warningThreshold` | `0.8` | Fraction of budget that triggers the alert |
| `sessionBudgetTokens` | `50000` | Total token budget for the session |

State is persisted to `/tmp/openclaw-session-cost-<sessionKey>.json` (ephemeral, cleared on reboot).

---

### 🔏 forge-phase-tracker

Silently logs [FORGE workflow](https://bamwerks.info/docs/forge-methodology) phase transitions to a persistent audit trail. Watches inbound messages for phase keywords (Phase 0–4) and appends structured entries to `workspace/memory/forge-activity.log`. No user-facing output.

**Events:** `message:received`  
**Config:** None required  
**Log format:**
```
[2026-03-04T17:00:00.000Z] session=agent:main:discord:... phase=2 (Build) snippet="dispatching builder with GOAL/CONSTRAINTS..."
```

---

---

## Bamwerks-Specific Hooks

The following hooks are tailored to Bamwerks' internal FORGE enforcement workflow. They are included here for reference and inspiration — you'll likely want to adapt them to your own team's conventions.

Located in `hooks/bamwerks/`.

### 🚨 sir-implements-detector

Detects when the primary orchestrator agent directly implements code or performs builder-role tasks instead of dispatching to sub-agents. Logs FORGE violations and injects corrective nudges to redirect behavior.

**Events:** `message:sent`  
**Config:** None required  
**Note:** Bamwerks-specific — references the orchestrator role and FORGE orchestration rules.

---

### ⚡ phase0-reminder

Injects a Phase 0 discipline reminder before every non-trivial message the orchestrator receives. Enforces the classify → verify understanding → check actual state workflow before any action is taken.

**Events:** `message:received`  
**Config:** None required  
**Note:** Bamwerks-specific — tuned to the orchestrator's FORGE Phase 0 checklist.

---

### 📐 mermaid-lint

Warns when staged `.md` files contain ASCII diagram art — encourages use of Mermaid diagrams instead of ASCII box art. Soft warn only — does not block commits.

**Events:** pre-commit (git hook)  
**Config:** None required  
**Note:** Detects 3+ consecutive lines with box-drawing characters outside existing mermaid/code blocks.

| Hook | Description |
|------|-------------|
| `mermaid-lint` | Warns when staged `.md` files contain ASCII diagram art — encourages Mermaid |

---

## Installation

```bash
openclaw hooks install @bamwerks/openclaw-hooks
```

Or drop any hook directly into your workspace:
```
workspace/hooks/<hook-name>/
├── HOOK.md
└── handler.ts
```

Then enable:
```bash
openclaw hooks enable <hook-name>
```

## Philosophy

Bamwerks operates on the principle that governance-first AI infrastructure should be accessible to everyone. We build for our own needs, then open-source what works.

Built with [FORGE methodology](https://bamwerks.info/docs/forge-methodology).

## See Also

[openclaw-starter](https://github.com/bamwerks/openclaw-starter) — production pipeline patterns that use these hooks, including memory architecture, swarm templates, and macOS service setup.

## License

MIT
