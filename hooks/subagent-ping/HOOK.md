---
name: subagent-ping
description: "Pings the user when a subagent completes and the main session appears idle — prevents lost results going unnoticed."
homepage: https://github.com/bamwerks/openclaw-hooks
metadata:
  {
    "openclaw": {
      "emoji": "🔔",
      "events": ["message:received"],
      "requires": { "bins": ["node"] }
    }
  }
---

# Subagent Ping Hook

When a subagent completes, OpenClaw delivers its result to the main session as an inbound message. If the session is mid-workflow or recovering from a restart, that result can arrive silently without triggering a response.

This hook detects subagent completion messages and sends a brief ping to remind the agent to act on the result.

## What It Does

- Listens for inbound messages containing subagent completion signals
- If the message is a subagent result (not a user message), nudges the agent to process it
- Silent no-op for all other message types

## Configuration

No configuration required.

## Open Source

Part of the [Bamwerks OpenClaw Hooks](https://github.com/bamwerks/openclaw-hooks) collection.
