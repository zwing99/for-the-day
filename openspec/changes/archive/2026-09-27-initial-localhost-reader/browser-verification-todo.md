# Browser verification checkpoint

## Current status: task 4.6 complete

On 2026-09-26 the user added the standalone Playwright MCP to Codex CLI. It works, unlike the earlier in-app Browser plugin. The dev server was restarted with `direnv exec . mise run dev` and browser checks passed:

- 390×844 phone, 820×1180 tablet, and 320×568 narrow phone: no horizontal overflow.
- Intro: no Scripture cards or FUMS tracker loaded before Begin.
- Begin: six complete CSB Psalm 23 cards, exact ordered text and attribution, preserved poetry/inline semantics, and no console errors.
- Phone/tablet full-page screenshots visually reviewed; saved only under ignored `.local/provider-samples/`.
- Exactly one live FUMS view request, with HTTP 200. Its token matched cached chapter metadata. Resizing and attribution expansion caused no duplicate views.
- Copyright disclosure is focusable, expands, and exposes the exact full notice.

Task 1.2's remaining page gate is also complete. OpenSpec progress is **16/53**; all 4.x tasks are complete. The user requested stopping here for context compaction. Resume with apply instructions and task 5.1 when authorized. All changes remain uncommitted; preserve them.

See [chapter-api-cache.md](../../../../docs/chapter-api-cache.md) for API/cache verification, native DynamoDB TTL, unit/integration/live checks, and current limitations. `.playwright-mcp/` is Git-ignored because automatic snapshots can contain provider text or tracking tokens.

## Historical in-app Browser failure

The in-app Browser plugin still fails before JavaScript execution:

```text
Mcp error: -32602: js: codex/sandbox-state-meta: missing field sandboxPolicy
```

This session runs in Codex CLI, not desktop. Do not patch plugin internals or disable sandbox protections. Use the now-working standalone Playwright MCP for subsequent browser verification. Physical iPhone/iPad Safari, later native-scroll/gesture/history behavior, accessibility refinement, and PWA gates are not established by this milestone.
