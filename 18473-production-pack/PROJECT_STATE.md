# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 05 — Audio / Visual / Emotional Polish: `TECHNICALLY COMPLETE — HUMAN PLAYTEST PENDING` on `codex/phase-05-polish`. The branch is restacked onto the approved merged Phase 04 `main` state and remains unmerged.

## Last completed and approved phase

Phase 04 — Case #001 Content is complete, validated, approved, and merged through PR #5. Its merge commit is `caf1acdddea1a2e545256a9ec5fc439cc1b238a6`; the post-merge continuity refresh brings approved `main` to `95891eed0214258568b2a919b24912d1c2c1085b`.

## Current active branch

`codex/phase-05-polish`

## Latest approved commit hash

`95891eed0214258568b2a919b24912d1c2c1085b` on `main`, containing approved Phase 04 merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6` and its state-only refresh.

## Restacked branch boundary

- Approved Phase 05 base: `main` at `95891eed0214258568b2a919b24912d1c2c1085b`.
- Former stacked boundary: approved Phase 04 branch head `455c79882f61ca06ed14d1d2ffe31688e2aca772`.
- The 20 Phase 05-specific commits after that former boundary were replayed onto approved `main`; Phase 04 history is present only through the merged main ancestry and is not duplicated.
- The original Phase 05 head is preserved locally as recovery ref `codex/phase-05-pre-restack-49f6b3c`; it is not part of the restacked branch.
- Phase 05 remains unmerged and must not be merged before the full human playtest and explicit approval.

## Current task implementation commit

`3834505cd44b43b1ac6f5605e9a6f9e683cec6c1` is the final restacked Phase 05 implementation/test commit before this state-only continuity refresh. The replayed pre-restack implementation/test commit `0c4085c64c4e32baae6d8da60798b29dce9580ed` became `1dbab6bba9ffe1b12acd0453567d6d2313097e92`, followed by browser-regression hardening at `3834505cd44b43b1ac6f5605e9a6f9e683cec6c1`. The final branch HEAD is the subsequent state-only commit because a commit cannot contain its own hash.

## Current implementation status

Phase 05 technical and presentation implementation is complete. The experience now includes the server-projected investigation workbench, deterministic and durable reveal presentation, persisted audio mixing, restrained non-dialogue sound, transcript-safe authored audio handling, responsive phone/app polish, performance bounds, accessible modal pacing, and a persistable ending sequence.

All repository-required technical gates now pass in the normal local environment, including 22/22 browser-backed Playwright tests and the unmocked Turbopack production build. Phase 05 technical acceptance does not imply human story/pacing approval.

## Completed milestones

- Completed the server-projected investigation workspace and strict runtime action boundary.
- Completed deterministic reveal selection, versioned durable FIFO pacing, modal focus management, and ending-stage presentation.
- Completed the lazy audio director, persisted mixer, ambience/ducking lifecycle, and scripted transcript fallback.
- Completed phone/app/gallery/message/GRAPH/timeline/ending visual polish, responsive performance bounds, and accessibility hardening.
- Completed all Phase 05 unit, content, continuity, progression, spoiler, and Hallmark source gates.
- Preserved Phase 04 canon, all required visual assets, `progressionComplete = true`, and progression debt = 0.

## Current task status

`TECHNICALLY COMPLETE — HUMAN PLAYTEST PENDING`. Phase 05 is restacked on approved `main`, the full technical validation matrix is green, Phase 05 is not merged, and Phase 06 has not started.

## Polish systems implemented

- Added Phone / Investigation top-level surfaces with objectives, discovered evidence, deductions, timeline, accessible DOM GRAPH, final choice, and ending aftermath.
- Added a strict `/api/case-runtime` action allowlist with fail-closed, player-visible `CaseView` projection; reusable client code still imports no authored Case #001 seed.
- Added serialized transactional runtime mutations, pre-save durability, operation-scoped retries, focus handoff, and save/load-safe ending presentation checkpoints.
- Added deterministic semantic reveal selection for Hope #1/#2/#3, F17, Winter 47, Tenuun decoy, GRAPH changes, ending, and post-credit beats without hardcoded Case #001 answer IDs or narrative text in reusable UI.
- Added a strict version-2 persistent FIFO reveal queue containing only immutable already-projected visible records. Historical GRAPH confidence/status beats survive acknowledgement and reload without collapsing to the latest value.
- Added focused modal reveal presentation with inert background, tab containment, focus restoration, explicit continuation, reduced-motion crossfade, and mutation blocking while a reveal is active.
- Added explicit ending stages: decision result → final-call/raspberry aftermath → closure → post-credit NODE: 0.

## Audio status

- Implemented a lazy Web Audio director for restrained interface, discovery, GRAPH, reveal, and ending cues plus opt-in generated ambience.
- AudioContext is created/resumed only from a user gesture; hidden documents suspend audio and unmount disposes the graph.
- Added versioned persisted master, ambience, interface, and reveal volume categories; mute and ambience toggles; gain clamping; duck/release rules for real native audio playback.
- Scripted authored audio never emits or requests a media element, but always exposes its approved transcript and production status.
- Final CALL_18473_03 and the raspberry aftermath are delivered only from ending-gated server projections using narrow allowlisted presentation roles.

## Voice-master status

Production-quality voice masters remain unavailable and were not fabricated. All nine approved scripts/transcripts remain canon-faithful, including the Maral laugh motif, Tenuun humming/singing motif, raspberry callback, and romantic ambiguity. Ready-audio replacement wiring and ducking are production-ready.

## Visual polish status

- Preserved the established Hallmark Workbench / Halo language, dark amber-anchored palette, typography intent, spacing scale, and restrained utility tone.
- Polished lock/home, all eight phone apps, gallery, zoom/dialogs, metadata, messages, mail, browser, notes/files, calls/audio, evidence/deductions, timeline, GRAPH, reveal layers, and endings.
- Added responsive safe-area handling, stable intrinsic gallery sizing, lazy responsive thumbnails, consistent hierarchy, 44 px controls, visible focus, and non-wrapping action labels.
- All Phase 04 required visual assets remain integrated; no narrative image or canon truth was replaced.

## Emotional pacing status

- Presentation timing is deterministic and state-driven, never a long real-world wait.
- Major reveals use explicit player acknowledgement and persisted checkpoints.
- Reduced motion collapses every beat to at most 150 ms while retaining full text and state feedback.
- F17 remains before the Winter 47 operator reveal; Hope #2 remains a false positive; Hope #3 remains genuine; Tenuun and Winter 47 remain morally ambiguous.
- TRACE and SEVER remain a value conflict without GOOD/BAD labels; SEVER keeps exact location UNKNOWN; NODE: 0 remains post-credit only.

## Performance status

- Gallery thumbnails use intrinsic dimensions, responsive sizes, and lazy loading while private/data assets keep direct spoiler-safe delivery.
- Message threads initially render the newest 60 messages, expand earlier content in 60-message chunks, and preserve chronological DOM order.
- Long records use `content-visibility` where safe; GRAPH remains a small accessible DOM representation; no canvas, WebGL, animation dependency, or production dependency was added.
- Audio and ambience are lazy, generated only after opt-in, and fully released on stop/dispose.

## Accessibility status

- Keyboard-operable Phone / Investigation tabs, workbench actions, native timeline controls, audio mixer, transcripts, and ending sequence.
- Visible focus, 44 px minimum targets, modal reveal focus containment/restoration, semantic lists/regions/status, safe areas, contrast tokens, and text equivalents for every audio/visual beat.
- Audio-disabled and reduced-motion play preserve the complete investigation and emotional information.

## Validation and test results

Fresh post-restack validation performed on 2026-08-28 from implementation commit `3834505cd44b43b1ac6f5605e9a6f9e683cec6c1`:

- Asset rebuild: passed; 81 Case #001 runtime assets reproduced.
- Pack validation: passed; 154 unique authored IDs checked.
- Continuity validation before this state refresh: passed; 4 files and 21 fields checked.
- Continuity tests: 8/8 passed.
- Lint: passed with zero warnings.
- Strict TypeScript: passed.
- Unit/content/component tests: 382/382 passed across 32 files using the normal Vitest runner.
- Progression: restored a deep F17 checkpoint, completed all 17 deductions from the restored state, exposed both endings, selected SEVER, retained `exactLocationRevealed = false`, `progressionComplete = true`, and progression debt = 0.
- Hallmark source contract: passed; P5 H5 E5 S5 R5 V4. Balanced CSS parsing enforces root-only color/font tokens, opacity/transform-only authored motion, complete reduced-motion mappings, 44 px targets, and single-line clickable labels.
- Playwright: 22/22 browser-backed tests passed using the normal development server and installed Chromium.
- Production build: normal unmocked `npm run build` passed with Turbopack, strict TypeScript, static page generation, and dynamic case routes. The approved Onest and IBM Plex Mono typography was unchanged.
- Security audit: `npm audit --audit-level=high` passed with 0 vulnerabilities; dependency manifests remain unchanged.
- Spoiler/asset protection: unit/route/source scans passed for initial authored/workbench semantics, ending roles, S3/S4 filenames, public assets, final-call delivery, and strict projected-record storage.

## Known limitations

- Full human 2–3 hour story/pacing playthrough is pending. No human story/pacing approval is claimed.
- Physical notched-device testing and final production voice casting/mixing remain future release work.

## Open tasks

- Update the already-pushed Phase 05 branch with the verified lease-protected restacked history.
- Complete the full 2–3 hour human playthrough and record story, pacing, accessibility, and physical-device feedback.
- Keep Phase 05 unmerged and Phase 06 unstarted until explicit post-playtest authorization.

## Known technical risks

- Local-first save state and gated cookies prevent accidental/static/network preloading but are not an anti-tamper account/session entitlement system.
- Presentation checkpoints are separate from narrative progression and migrate v1 metadata to strict v2. Unreconstructable legacy ID-only pending beats are safely dropped rather than replayed incorrectly.
- Google-hosted build-time fonts remain an external build dependency until an approved self-hosting change is made.

## Known narrative risks

- F17 remains inferable from multiple clue families; polish must not make a single clue conclusive.
- The final recovered call implies intimacy but does not prove romantic love.
- Winter 47 and Tenuun must retain moral ambiguity, and Hope #2 must remain visibly false rather than becoming another survival confirmation.

## Unresolved decisions

- Whether production will keep Google-hosted build-time fonts or explicitly approve self-hosted Onest/IBM Plex Mono assets.
- Final voice casting, recording, mastering, and replacement asset IDs.
- Whether production hosting requires signed server sessions beyond the current local-first spoiler-delivery boundary.

No narrative canon, progression, reveal-order, or ending-truth decision is unresolved.

## Current spoiler/reveal gates

- F17 = Maral remains a separate, earlier reveal from Maral = unauthorized Winter 47 operator.
- Hope #1 remains ambiguous, Hope #2 resolves to Bilguun's false-positive device activity, and only Hope #3 proves Tenuun is alive.
- Winter 47 and Tenuun retain moral ambiguity; no presentation label assigns GOOD/BAD morality.
- TRACE may reveal exact location only at the final authored gate; SEVER keeps exact location UNKNOWN.
- CALL_18473_03 and the raspberry aftermath are ending-gated; NODE: 0 is post-credit only.
- Initial browser delivery and public assets exclude hidden authored records, ending roles, and S3/S4 filenames.

## Human playtest status

Pending. A full human 2–3 hour playthrough has not occurred. Phase 05 is technically complete, but this does not imply final human playtest approval.

## Deferred work

- FULL HUMAN PLAYTEST.
- Phase 06 QA / release readiness: full human-playtest feedback, regression QA, and release-readiness work. Phase 06 has not started.

## Next expected task

Run the full local 2–3 hour human playthrough from the verified `codex/phase-05-polish` production build. Record feedback before any Phase 05 merge decision. Phase 06 follows only after the playtest and explicit authorization.

## Exact continuation point

Continue from clean branch `codex/phase-05-polish` at the state-only commit following final implementation commit `3834505cd44b43b1ac6f5605e9a6f9e683cec6c1`, based on approved `main` commit `95891eed0214258568b2a919b24912d1c2c1085b`. Perform the full human playtest using the production build, record feedback, and wait for explicit approval. Do not merge Phase 05 or start Phase 06.

## Source-of-truth documents

- Workflow and continuity: `AGENTS.md`, `PROJECT_STATE.md`, `HANDOFF.md`.
- Phase execution plans: `docs/exec-plans/`, including `docs/exec-plans/PHASE-05-AUDIO-POLISH.md`.
- Executable task briefs: `tasks/`, including `tasks/05-audio-polish.md`.
- Phase 05 design and plan: `docs/superpowers/specs/2026-08-27-phase05-audio-visual-emotional-polish-design.md` and `docs/superpowers/plans/2026-08-27-phase05-audio-visual-emotional-polish.md`.
- Narrative and acceptance canon: the relevant canonical `docs/` files listed in `AGENTS.md`, especially `docs/14-TESTING-ACCEPTANCE.md`.
- Runtime boundary: `docs/decisions/0005-phase04-server-projections.md`, `/api/case-runtime`, and `/api/case-assets/[assetId]`.

## Things that must NOT be changed without explicit approval

- Narrative canon, reveal truth/order, ending canon, romantic ambiguity, or autonomy theme.
- Approved Phase 04 history or `main` while validating Phase 05.
- Spoiler-safe server projection and S3/S4 delivery boundaries.
- Approved typography by substituting unapproved fonts merely to bypass a network-limited build.
- Phase 05 merge or Phase 06 work without explicit authorization.
