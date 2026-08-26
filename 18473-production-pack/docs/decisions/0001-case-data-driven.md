# ADR 0001 — Case content is data-driven

## Decision
All case-specific narrative state and artifacts live under `content/cases/<case-id>/` and are validated by schemas. UI/engine modules do not contain Case #001 conditional branches.

The Phase 01 loader accounts for every authored JSON source. Sources with defined
core schemas are validated and represented in `coreIndex`; Phase-later sources are
validated by a named deferred-empty boundary and are exposed as explicitly
unindexed metadata. A deferred source must remain an empty array until its real
schema and indexing rules land, so adding records cannot silently bypass validation.

Cross-reference validation is complete only among the typed core collections.
`Evidence.sourceArtifactId`, deduction `unlocks`, and trigger effect `target` values
remain intentionally unchecked because their artifact/content target collections
are deferred. Their referential checks must be added with the corresponding later-
phase schemas rather than inferred from undocumented narrative shapes.

## Why
- future cases should be content additions, not rewrites;
- Codex can work on content and engine separately;
- spoiler gates can be tested mechanically;
- narrative changes are reviewable as data diffs.

## Consequences
- bundle source metadata distinguishes `core`/indexed data from `deferred-empty` data;
- the ID map is named `coreIndex` and does not imply that deferred collections were indexed;
- new authored JSON filenames fail the loader inventory test until explicitly classified;
- deferred records fail closed and cannot reach the client-leak smoke unnoticed;
- `projectVisibleArtifact` retains its docs-required name but currently accepts and
  returns a `VisibleEvidence` projection until the artifact schema is defined.
