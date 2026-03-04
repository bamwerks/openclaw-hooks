---
name: phase0-reminder
description: "Injects a Phase 0 discipline reminder before every non-trivial message Sir receives. Enforces classify → verify → check-actual-state before acting."
metadata:
  {
    "openclaw": {
      "emoji": "⚡",
      "events": ["message:preprocessed"],
      "requires": { "config": ["workspace.dir"] }
    }
  }
---

# Phase 0 Reminder Hook

Enforces **Phase 0** discipline for Sir (Bamwerks main orchestrator):

> Before ANY action: (1) classify the request, (2) verify understanding, (3) check actual state.

## What It Does

- Fires on every inbound message **after** full media/link enrichment, **before** Sir generates a response
- Prepends a brief Phase 0 reminder to `context.bodyForAgent` so Sir sees it at the top of every request
- Skips injection on clearly conversational messages (greetings, acknowledgments, short non-task replies) to reduce noise
- Only applies to the **main session** (Sir) — subagents are excluded

## Noise Mitigation

The hook classifies messages before injecting. It skips:
- Short messages (≤ 12 words) with no action verbs or project keywords
- Greeting/acknowledgment patterns ("ok", "thanks", "got it", emoji-only, etc.)
- Heartbeat messages

## Session Scope

Main session only: `agent:main:*` (excluding `agent:main:subagent:*`).

## Fallback Behavior

If `context.bodyForAgent` is read-only in this hook context, the hook appends to `event.messages` as a visible pre-response notification. Same signal, slightly different delivery.

## Part of Bamwerks FORGE Enforcement Stack

| Layer | Hook | Covers |
|---|---|---|
| Session start | `bootstrap-extra-files` | First message context |
| Per-message | `phase0-reminder` (this) | Ongoing enforcement |
| Post-response | `sir-implements-detector` | FORGE violation detection |

## Configuration

No configuration required.
