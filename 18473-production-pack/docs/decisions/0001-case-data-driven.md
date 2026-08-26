# ADR 0001 — Case content is data-driven

## Decision
All case-specific narrative state and artifacts live under `content/cases/<case-id>/` and are validated by schemas. UI/engine modules do not contain Case #001 conditional branches.

## Why
- future cases should be content additions, not rewrites;
- Codex can work on content and engine separately;
- spoiler gates can be tested mechanically;
- narrative changes are reviewable as data diffs.
