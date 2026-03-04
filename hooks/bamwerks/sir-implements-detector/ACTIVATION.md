# Activation Instructions

To enable the `sir-implements-detector` hook, Sir must add the following to `openclaw.json` under `hooks.internal.entries`:

```json
"sir-implements-detector": {
  "enabled": true
}
```

**AGENTS.md addition** — Insert under the "FORGE Workflow — Hard Rule" section, before the "Every Request — Phase 0" heading:

```markdown
### Before Using write / edit / exec — Quick Check

Before calling write, edit, or exec (non-read operations):

1. **Is this a workspace file?** (MEMORY.md, memory/, agents/, SOUL.md, AGENTS.md, USER.md) → OK to proceed  
2. **Is this a read-only operation?** (cat, ls, grep, find, git log, git status) → OK to proceed  
3. **Is this creating or modifying source code / project files?** → STOP. Dispatch a builder sub-agent.

There is no "quick fix" exception. There is no "one-liner" exception. Dispatch the work.
```

Both changes require Sir's review before application. Do not auto-apply.
