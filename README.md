# Bamwerks OpenClaw Hooks

Open source automation hooks for the [OpenClaw](https://github.com/openclaw/openclaw) agent platform, built by [Bamwerks](https://bamwerks.info).

> "Any capability we create, we share." — Bamwerks

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

Silently logs [FORGE workflow](https://bamwerks.info/forge) phase transitions to a persistent audit trail. Watches inbound messages for phase keywords (Phase 0–4) and appends structured entries to `workspace/memory/forge-activity.log`. No user-facing output.

**Events:** `message:received`  
**Config:** None required  
**Log format:**
```
[2026-03-04T17:00:00.000Z] session=agent:main:discord:... phase=2 (Build) snippet="dispatching builder with GOAL/CONSTRAINTS..."
```

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

Built with [FORGE methodology](https://bamwerks.info/forge).

## License

MIT
