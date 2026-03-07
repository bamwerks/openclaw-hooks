---
name: response-qa-gate
description: "Intercepts agent responses before delivery and runs a QA sub-agent to verify the response actually achieves the stated goal."
homepage: https://github.com/bamwerks/openclaw-hooks
metadata:
  {"openclaw": {"emoji": "🔍", "events": ["response_before_deliver"], "requires": {"bins": ["node"]}}}
---

# Response QA Gate

Registers a `response_before_deliver` blocking hook that spawns a lightweight QA sub-agent to verify:
1. Does the response actually answer what was asked?
2. Does it achieve the stated goal (not just address the surface question)?

## What It Does

- Fires once per agent turn, before the response is sent to the channel
- Spawns a Haiku-model QA agent with the original message + proposed response
- If QA passes: response is delivered unchanged
- If QA detects a logic flaw (e.g. answer doesn't achieve the goal): response is modified with a correction or cancelled with a retry signal

## When It Fires

Only fires when the `response_before_deliver` hook event is available (requires OpenClaw with blocking hooks support). Fails open — if the QA agent errors or times out, the original response is delivered unchanged.

## Configuration

Enable in agent config:
```json5
{
  agents: {
    list: [{
      id: "main",
      hooks: { blockingEnabled: true }
    }]
  }
}
```
