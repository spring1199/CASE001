# Phase 04 Case #001 Content Design

## Authority and scope

Implement only Phase 04 from the corrected `18473-PHASE04-PRODUCTION-PACK-v1.0.1-FINAL`. Repository canon remains authoritative. The sole pack-authored narrative source is `content/authored/CASE001_AUTHORED_CONTENT_v1.0.md`. The original checkout's deleted bootstrap file and untracked production pack remain untouched; implementation occurs on `codex/phase-04-case001-content`.

## Architecture

Case #001 remains authored data under `content/cases/case-001`. The eight formerly deferred collections become strict Zod-validated records with referential validation against artifact, evidence, and content IDs. A case-specific phone-content adapter assembles those validated records into the existing generic Phone OS shape. `PhoneExperience` consumes that adapter and the Phase 03 runtime instead of the neutral seed, so artifact discovery, deductions, objectives, graph confidence, endings, and persistence share one deterministic state.

Visuals use opaque asset IDs. S0–S2 runtime derivatives may live in a public asset directory. S3/S4 binaries live outside public static delivery and are returned only by a gated server route after the required reveal facts. Phone projections expose neutral descriptions before unlock and never expose locked filenames, paths, metadata, preload hints, or distinct missing-file errors.

## Content and progression

The production pack is converted without rewriting narrative facts. The `INC-18473` spine, family/work/shelter messages, mail, browser, notes/files, calls/transcripts, gallery metadata, and supporting records are structured and searchable. Filler is limited to the approved mundane pools and adds no plot facts.

The engine data expands to the approved evidence, deduction/contradiction, objective, lock, trigger, timeline, and GRAPH records. F17 requires the protected edge plus four independent clue families and the opened archive. Winter 47 attribution stays gated behind the F17 deduction. Hope #2 is later attributed to Bilguun; Hope #3 alone grants the live truth. The final lock requires decoy, genuine survival, the autonomy message, and the earlier confidence tutorial. TRACE confirms the final edge and may reveal the exact location; SEVER severs it and cannot reveal location. NODE: 0 is gated by completed ending state.

All pacing is interaction/progression based. The repository's 120–180 minute target overrides the draft's inconsistent act timestamps.

## Visual production

Generate the 79 `GENERATE` assets in manifest order, beginning with nine character anchors. Canonical ages and roles override reference-image appearance; in particular Orgil is early 40s, Tuya is 21, and Bilguun is 18. Each approved source master gets an optimized runtime derivative with EXIF stripped, dimensions and SHA-256 recorded. The two `DERIVE` assets come only from approved masters; four `UI DATA` assets remain native UI.

## Validation

Tests cover schema/reference rejection, phone/runtime integration, full reachability, discovery-order independence, repeated events, F17 fair play, reveal ordering, Winter 47 dual truth, all three hope events, GRAPH confidence, save/load, TRACE/SEVER, post-credit gating, hidden-record non-oracles, and S3/S4 delivery leakage. Final validation runs pack and continuity validation, lint, strict typecheck, all unit tests, Playwright, production build, protected-name/asset-leak scans, and security audit if manifests change.

## Reconciliation decisions

- The corrected checksums, correction notice, and manifests resolve the old authored-source filename conflict.
- Stale v1.0 labels in the corrected README/master prompt are superseded by the user's instruction and `SOURCE_OF_TRUTH_CORRECTION.md`; they do not change canon.
- The younger-looking Orgil seed is identity reference only; generation follows the canonical early-40s age.
- Generated reference-board text is never canonical and is not copied.

