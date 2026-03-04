# Bamwerks OpenClaw Hooks

Open source automation hooks for the [OpenClaw](https://github.com/openclaw/openclaw) agent platform, built by [Bamwerks](https://bamwerks.info).

> "Any capability we create, we share." — Bamwerks

## Hooks

### 🔔 subagent-ping

Detects when a subagent completes and nudges the main session to act on the result — prevents completed work from sitting unnoticed in a recovering or mid-workflow session.

**Install:**
```bash
openclaw hooks install @bamwerks/openclaw-hooks
```

Or drop it directly into your workspace:
```
workspace/hooks/subagent-ping/
├── HOOK.md
└── handler.ts
```

Then enable:
```bash
openclaw hooks enable subagent-ping
```

## Philosophy

Bamwerks operates on the principle that governance-first AI infrastructure should be accessible to everyone. We build for our own needs, then open-source what works.

Built with [FORGE methodology](https://bamwerks.info/forge).

## License

MIT
