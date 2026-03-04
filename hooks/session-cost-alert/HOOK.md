---
name: session-cost-alert
description: "Tracks cumulative token usage per session and alerts the user when they approach their configured budget ceiling."
homepage: https://github.com/bamwerks/openclaw-hooks
metadata:
  {
    "openclaw": {
      "emoji": "💸",
      "events": ["message:sent"],
      "requires": { "bins": ["node"] },
      "config": {
        "warningThreshold": 0.8,
        "sessionBudgetTokens": 50000
      }
    }
  }
---

# Session Cost Alert Hook

Keeps token spend visible in long-running sessions. Watches every outbound message for token usage metadata, accumulates a running total per session, and fires a warning when the budget threshold is crossed.

## What It Does

- Listens for outbound (`message:sent`) events that carry token usage in `event.context.usage`
- Accumulates totals in `/tmp/openclaw-session-cost-<sessionKey>.json`
- Alerts the user once per threshold crossing (80% by default) — not on every message
- Resets automatically when a new session key is detected (fresh file)

## Configuration

Set in your hook config (e.g. `openclaw.json` or hook metadata):

| Key | Default | Description |
|-----|---------|-------------|
| `warningThreshold` | `0.8` | Fraction of budget that triggers the alert (0.0–1.0) |
| `sessionBudgetTokens` | `50000` | Total token budget for the session |

## State File

Persisted at: `/tmp/openclaw-session-cost-<sessionKey>.json`

```json
{
  "sessionKey": "agent:main:discord:...",
  "totalTokens": 41234,
  "warned": false,
  "lastUpdated": "2026-03-04T17:00:00.000Z"
}
```

The file is ephemeral — lives in `/tmp`, cleared on reboot.

## Open Source

Part of the [Bamwerks OpenClaw Hooks](https://github.com/bamwerks/openclaw-hooks) collection.
