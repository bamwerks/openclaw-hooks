---
name: forge-phase-tracker
description: "Silently logs FORGE workflow phase transitions to a persistent audit trail — no user-facing output."
homepage: https://github.com/bamwerks/openclaw-hooks
metadata:
  {
    "openclaw": {
      "emoji": "🔏",
      "events": ["message:received"],
      "requires": { "bins": ["node"] }
    }
  }
---

# FORGE Phase Tracker Hook

Silent audit hook for teams running the [FORGE workflow](https://bamwerks.info/forge). Watches inbound messages for phase transition keywords and appends structured log entries to a persistent activity log — no messages to the user, no disruption to the session.

## What It Does

- Listens for inbound (`message:received`) events
- Detects FORGE phase keywords: **Phase 0** (Listen/Classify), **Phase 1** (Plan), **Phase 2** (Build), **Phase 3** (Gate), **Phase 4** (Deliver)
- Appends a timestamped log entry to `workspace/memory/forge-activity.log`
- Completely silent — no `event.messages.push()` calls, no user notification

## Detected Patterns

| Phase | Keywords Matched |
|-------|-----------------|
| Phase 0 | `phase 0`, `listen`, `classify`, `verify understanding` |
| Phase 1 | `phase 1`, `plan`, `inception`, `size it`, `create issue` |
| Phase 2 | `phase 2`, `build`, `dispatch`, `builder` |
| Phase 3 | `phase 3`, `gate`, `hawk`, `sentinel`, `review` |
| Phase 4 | `phase 4`, `deliver`, `merge`, `ship`, `report to founder` |

## Log Format

Appended to `$WORKSPACE/memory/forge-activity.log`:

```
[2026-03-04T17:00:00.000Z] session=agent:main:discord:... phase=2 (Build) snippet="dispatching builder with GOAL/CONSTRAINTS..."
```

## Configuration

No configuration required. The workspace path is resolved from the `OPENCLAW_WORKSPACE` environment variable, falling back to `~/.openclaw/workspace`.

## Open Source

Part of the [Bamwerks OpenClaw Hooks](https://github.com/bamwerks/openclaw-hooks) collection.
