# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 05 — Audio / Visual / Emotional Polish, plus an authorized UI/UX redesign pass on top of it. Both live on `codex/phase-05-polish`, which remains unmerged. Phase 06 has not started.

## Last completed and approved phase

Phase 04 — Case #001 Content, approved and merged into `main` through PR #5 at merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6`, followed by state-only refresh `95891ee`.

## Current active branch

`codex/phase-05-polish`

## Latest approved commit hash

`caf1acdddea1a2e545256a9ec5fc439cc1b238a6` on `main` (Phase 04 merge). Phase 05 and the redesign pass are not approved.

## Stacked branch boundary

- Phase 04 base branch: `codex/phase-04-case001-content`.
- Immutable Phase 04 base commit: `455c79882f61ca06ed14d1d2ffe31688e2aca772`.
- Phase 05 commits are strictly after that base; Phase 04 history was not amended, squashed, merged, or rebased.
- Phase 04 is now merged into `main`. Phase 05 may therefore be retargeted/rebased onto the merged `main` state before its own PR review, but only with explicit authorization. That rebase has not been performed.
- The redesign pass was committed on top of the existing Phase 05 history; no Phase 05 commit was rewritten.

## Current task implementation commit

`3c130a06e12a30f9a17b64c67ee3ada44dc90f1a` is the UI/UX redesign implementation commit. It sits directly on top of the Phase 05 completion state `49f6b3c2916a89eac5d4456d1fa240b50939040f`. The final branch HEAD is the subsequent state-only refresh commit, because a commit cannot contain its own hash.

## Current implementation status

Phase 05 technical and presentation implementation is complete: server-projected investigation workbench, deterministic and durable reveal presentation, persisted audio mixing, restrained non-dialogue sound, transcript-safe authored audio, performance bounds, accessible modal pacing, and a persistable ending sequence.

The redesign pass then rebuilt the interface layer on top of that behaviour. Human playtest feedback was that the interface still looked like a dark prototype rather than a believable premium handset. The phone is a core gameplay environment, so it was treated as a first-class product redesign. No narrative canon, progression logic, reveal order, engine truth, or spoiler gate was changed.

Both gates that blocked Phase 05 acceptance on the previous host are now unblocked here: Chromium launches, so all 22 Playwright cases executed; and Google Fonts is reachable, so the standard `npm run build` passes with the approved Onest / IBM Plex Mono stack. Those 22 browser cases had never actually executed before this pass, and 13 of them failed on first run. Every failure is now resolved — see "Defects found by first real browser execution".

## Completed milestones

- Completed Phase 05: server-projected investigation workspace, deterministic durable reveal queue, persisted audio mixer, restrained cues, ending stages, and the strict runtime action boundary.
- Completed the authorized UI/UX redesign pass across the device shell, navigation primitives, typography, dark-surface hierarchy, all eight phone apps, the investigation workbench, and the reveal/ending presentation.
- Executed the browser-backed acceptance suite for the first time on this branch and resolved every defect it exposed.
- Executed the standard production build with the approved Google-hosted typography.
- Added a repeatable visual QA harness covering 26 screens across six viewports, including the final choice and every ending stage.
- Verified WCAG AA contrast from computed styles on every audited surface.
- Preserved Phase 04 canon, all required visual assets, `progressionComplete = true`, and progression debt = 0.

## Current task status

The UI/UX redesign pass is implemented and fully validated on `codex/phase-05-polish`. The branch is intentionally unmerged and un-rebased. Human visual review and the full human playthrough are both still pending. Phase 06 has not started.

## Redesign — phone shell

- Desktop presents a framed 393 × 852 logical device: bezel, sensor island, ambient halo, device shadow, correct display radius, and a home indicator. Below 48rem the device becomes the viewport with no fake chrome.
- Safe areas are driven by `--safe-top/-bottom/-left/-right` custom properties that resolve to `env(safe-area-inset-*)` on hardware and to simulated frame insets inside the desktop frame.
- The screen clips its own content, scrollbars are hidden inside the device, and there is no nested scroll trap: the single scroll region is `[data-phone-scroll-region]`.

## Redesign — navigation primitives

- Translucent, blurred status bar with inline SVG signal / wi-fi / battery glyphs and the audio-mixer control.
- Navigation bar with a back affordance, home action, device label, and a compact title that crossfades in once content scrolls under the chrome; detail screens show the compact title immediately.
- Large title lives in the scroll flow like a native root screen and remains the programmatic focus target.
- The Phone / Investigation surfaces moved from an inline pill row to a bottom tab bar with glyphs, keeping the same roving-tabindex keyboard contract.
- Reusable row primitives (`contact`, `record`, `gallery`) and two list styles (full-bleed `plain`, inset `grouped`) mean every app shares one navigation language.

## Redesign — typography and colour

- Native mobile type ramp: large title, title, title-sm, headline, body, callout, subhead, footnote, caption, caption-sm, plus a lock-screen clock size. Line-height and tracking tokens replace ad-hoc values.
- The approved Onest / IBM Plex Mono stack is unchanged. Mono is now reserved for time, identifiers, status tags, and confidence values.
- Dark surfaces are layered (void → canvas → shell → surface → raised → pressed → fill) with near-invisible separators. Borders were removed almost everywhere; hierarchy now comes from surface, spacing, and separators.
- Amber remains the brand accent but no longer dominates: it is used for the single lock-screen action, active states, links, focus, and unread markers. Reveal and ending acknowledgements are neutral.
- Eight muted app tints differentiate the home grid without neon.

## Redesign — app by app

- **Lock screen** — believable clock, device line, a notification-style case card, a single primary action, and a soft wallpaper light.
- **Home screen** — 4-column grid, rounded icon tiles with raised edges, generic inline-SVG glyphs, 11px labels, and a lock badge on gated apps.
- **Messages** — full-bleed rows with avatar monograms, two-line previews, timestamps, unread dots, and text-inset separators. The 18473 conversation is now real chat bubbles with sender runs, tailed corners, in-bubble timestamps, and visually hidden direction labels that screen readers still announce.
- **Gallery** — tighter responsive tile grid (2 → 3 → 4 columns) with square thumbnails, quiet captions, timeline sections, and unchanged lazy loading. No clue photo is visually marked.
- **Calls / audio** — contact rows with monograms and durations; the audio figure is a grouped card with a production-status caption and a disclosure transcript. Scripted audio still emits no media element.
- **Mail** — sender/subject hierarchy with previews and timestamps, no bordered cards.
- **Browser** — collection rail plus a native search field with a magnifier glyph, placeholder, and a visually hidden label.
- **Notes / Files / Settings** — inset grouped rows with disclosure chevrons.
- **Evidence / deductions / timeline / GRAPH** — grouped lists, state tags, a progress meter for deduction thresholds, native timeline selects, and GRAPH edges rendered as readable rows with a confidence meter. No HUD styling; the exact-location gate is untouched.
- **Audio preferences** — a grouped settings sheet with per-slider labels, value outputs, and label-left/control-right toggle rows.

## Redesign — reveal and ending presentation

- Ordinary discoveries arrive as a compact bottom sheet with a grab handle and a neutral acknowledgement.
- Authored reveals (Hope #1/#2/#3, F17, Winter 47, decoy) and the ending take the whole screen with generous space and quiet typography.
- The deterministic version-2 FIFO reveal queue, its persistence, its acknowledgement requirement, and the ordering of decision → aftermath → closure → post-credit are unchanged.
- The TRACE/SEVER decision gets a dedicated spacious section with two equally weighted cards; neither option is colour-coded, labelled GOOD/BAD, or visually preferred.
- Reduced motion still collapses every beat to at most 150 ms while retaining full text and state.

## Defects found by first real browser execution

The 22 Playwright cases had never run. Executing them exposed real application defects, all fixed in the redesign commit:

- A reveal restored focus to its own control, and the background was still `inert` when the cleanup ran, so acknowledging a reveal left focus on `document.body`.
- A remount disposed the `AudioDirector` permanently, so audio silently never started under React Strict Mode.
- Each mixer slider shared a wrapping label with an `<output>`, so the accessible name resolved to the output rather than the slider.
- Global back/home keys still fired while a blocking reveal was open.
- The ending aftermath had no way to name the recovered call; it now uses an ending-gated `presentationLabel` projected beside the existing `presentationRole`.
- `content-visibility` on gallery tiles shortened the scroll height on remount, so restored route scroll landed short.
- The Next dev overlay button was injected inside the phone screen and failed the 44px touch-target sweep; `devIndicators` is now off.

Two player-flow specs were corrected rather than weakened: they now acknowledge the modal reveal the way a player must, and message chronology is asserted against authored order instead of a lexicographic sort of labels that legitimately wrap past midnight (`… · 23:58` precedes `… · 00:01`).

## Audio status

Unchanged from Phase 05. Lazy Web Audio director, gesture-gated context, visibility suspend, versioned persisted master/ambience/interface/reveal gains, mute and ambience toggles, duck/release around real native playback, and scripted audio that never requests media while always exposing its approved transcript.

## Voice-master status

Unchanged. Production-quality voice masters remain unavailable and were not fabricated. All nine approved scripts/transcripts remain canon-faithful, including the Maral laugh motif, Tenuun humming motif, raspberry callback, and romantic ambiguity. Ready-audio replacement wiring and ducking remain production-ready.

## Accessibility status

- Keyboard-operable navigation, tabs, workbench actions, timeline selects, mixer, transcripts, and ending sequence.
- Visible focus everywhere; the surface tabs use a `:focus` ring because their roving tabindex moves focus programmatically.
- Reveal focus containment and restoration now work in the browser, verified end to end.
- 44px minimum targets verified at 320/375/414/768 by the acceptance suite.
- WCAG AA contrast verified from computed styles (canvas-resolved colours, accumulated opacity, blended backdrops) across lock, home, messages, thread, gallery, browser, investigation, audio settings, and reveal surfaces: no failures. Disabled chrome controls no longer double-dim below the readable threshold.
- Semantic headings, landmarks, lists, live regions, safe areas, and text equivalents for every audio and visual beat are preserved.

## Performance status

- No dependency was added; the icon set is inline SVG.
- Message threads still render the newest 60 and expand in 60-message chunks; `content-visibility` remains on message and list rows and was removed only from gallery tiles, where it broke scroll restoration and bought little.
- Gallery thumbnails keep intrinsic dimensions, responsive `sizes`, and lazy loading.
- Motion is restricted to opacity and transform; the only animations are the reveal scrim and card.
- Audio remains lazy, opt-in for ambience, and fully released on stop/dispose.

## Validation and test results

Full matrix run on 2026-08-28 from redesign commit `3c130a06e12a30f9a17b64c67ee3ada44dc90f1a`:

- Asset rebuild: passed; 81/81 Case #001 runtime assets reproduced with no ledger content drift.
- Pack validation: passed; 154 unique authored IDs checked.
- Continuity validation: passed; 4 files and 21 state fields checked.
- Continuity tests: 8/8 passed.
- Lint: passed with zero warnings.
- Strict TypeScript: passed.
- Unit/content/component tests: 381/381 passed across 32 files, including the Hallmark CSS contract (root-only colour/font tokens, opacity/transform-only motion, complete reduced-motion mappings, tokenized 44px targets, single-line clickable labels).
- Playwright: 22/22 passed, executed in a real Chromium. This is the first green browser-backed run on this branch.
- Visual QA: 26 screens captured at 320, 375, 393, 430, 768, and 1440 px through `npm run qa:visual`, including the final TRACE/SEVER choice and all four ending stages.
- Production build: `npm run build` passed end to end with the approved Google-hosted fonts; `/` static, both case APIs dynamic.
- Security audit: 0 vulnerabilities. `package-lock.json` is unchanged; `package.json` gained only the `qa:visual` script.
- Spoiler/asset protection: initial-delivery scanning, gated-record rejection, S3/S4 public-path checks, and ending-role delivery all pass. The new `presentationLabel` is covered by explicit pre-ending absence assertions in both the route test and the phone-projection test.

## Human playtest status

Pending. This redesign responds to human *visual* feedback only. It is not story, pacing, or final playtest approval. A further human playtest is required after this pass.

## Known limitations

- The authored `call_18473_03` record carries its production script as player-visible body and transcript text, so the player currently sees editorial notes ("Purpose: post-final-choice grief/recontextualization…", "Length target: …"). Several browser and message records similarly expose authoring identifiers such as `INC-18473 clue extract`. This is a content-layer issue; it was deliberately not fixed here because it would mean editing authored canon. It should be raised as an explicit content decision.
- The Settings app contains a single authored record, so its grouped layout is necessarily sparse.
- Message timestamp labels are long authored strings (`Day 191 — 02:03 · 02:27`) and occupy noticeable width inside bubbles.
- Physical notched-device testing remains useful beyond Chromium safe-area emulation.
- Screenshots are written to the gitignored `.qa/shots`; they are a review aid, not a committed baseline, and there is no automatic pixel-diff regression gate.
- Human art-direction review of the generated imagery is still appropriate.

## Known technical risks

- Local-first save state and gated cookies prevent accidental/static/network preloading but are not an anti-tamper entitlement system.
- Presentation checkpoints remain separate from narrative progression and migrate v1 metadata to strict v2.
- Google-hosted build-time fonts remain an external build dependency until an approved self-hosting change is made. They resolved on this host.
- `next-env.d.ts` flips between the dev and build variants depending on which command ran last; it is restored to the committed dev variant before every commit.

## Known narrative risks

- F17 remains inferable from multiple clue families; polish must not make a single clue conclusive.
- The final recovered call implies intimacy but does not prove romantic love.
- Winter 47 and Tenuun retain moral ambiguity, and Hope #2 remains visibly false rather than another survival confirmation.

## Unresolved decisions

- Whether the authored production notes inside player-visible call, browser, and message records should be rewritten as in-fiction text. This is a canon/content decision and needs explicit approval.
- Whether production keeps Google-hosted build-time fonts or approves self-hosted Onest / IBM Plex Mono assets.
- Final voice casting, recording, mastering, and replacement asset IDs.
- Whether production hosting requires signed server sessions beyond the current local-first spoiler-delivery boundary.

No narrative canon, progression, reveal-order, or ending-truth decision is unresolved.

## Current spoiler/reveal gates

- F17 = Maral remains a separate, earlier reveal from Maral = unauthorized Winter 47 operator.
- Hope #1 remains ambiguous, Hope #2 resolves to Bilguun's false-positive device activity, and only Hope #3 proves Tenuun is alive.
- Winter 47 and Tenuun retain moral ambiguity; no presentation label assigns GOOD/BAD morality.
- TRACE may reveal exact location only at the final authored gate; SEVER keeps exact location UNKNOWN.
- CALL_18473_03 and the raspberry aftermath are ending-gated; NODE: 0 is post-credit only.
- Initial browser delivery and public assets exclude hidden authored records, ending roles, ending labels, and S3/S4 filenames.

## Open tasks

- Run a human visual review of the redesign, then the full human 2–3 hour playthrough.
- Retarget/rebase `codex/phase-05-polish` onto the merged `main` state only with explicit authorization.
- Decide whether authored production notes should stay in player-visible records.
- Keep Phase 05 unmerged pending explicit approval.

## Deferred work

- FULL HUMAN PLAYTEST.
- Phase 06 QA / release readiness: human-playtest feedback, regression QA, and release-readiness work, only after explicit authorization.
- Optional human art-direction pass, physical-device QA, and production anti-tamper/session hardening.

## Next expected task

Human visual/playtest review of the redesigned interface. Do not merge Phase 05, do not rebase it without authorization, and do not start Phase 06.

## Exact continuation point

Continue from clean branch `codex/phase-05-polish` at the state-only commit that follows redesign commit `3c130a06e12a30f9a17b64c67ee3ada44dc90f1a`. Confirm that `main` still contains Phase 04 merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6`, that the Phase 04 base `455c79882f61ca06ed14d1d2ffe31688e2aca772` is still an ancestor of this branch, and that Phase 05 completion commit `49f6b3c2916a89eac5d4456d1fa240b50939040f` is its immediate parent lineage. Await human visual/playtest review before any further UI change, rebase, merge, or Phase 06 work. Reproduce screenshots with `npm run qa:visual`.

## Source-of-truth documents

- Workflow and continuity: `AGENTS.md`, `PROJECT_STATE.md`, `HANDOFF.md`.
- Phase execution plans: `docs/exec-plans/`, including `docs/exec-plans/PHASE-05-AUDIO-POLISH.md`.
- Executable task briefs: `tasks/`, including `tasks/05-audio-polish.md`.
- UI and audiovisual direction: `docs/10-UI-UX.md` and `docs/11-AUDIO-VISUAL-DIRECTION.md`.
- Phase 05 design and plan: `docs/superpowers/specs/2026-08-27-phase05-audio-visual-emotional-polish-design.md` and `docs/superpowers/plans/2026-08-27-phase05-audio-visual-emotional-polish.md`.
- Narrative and acceptance canon: the relevant canonical `docs/` files listed in `AGENTS.md`, especially `docs/14-TESTING-ACCEPTANCE.md`.
- Runtime boundary: `docs/decisions/0005-phase04-server-projections.md`, `/api/case-runtime`, and `/api/case-assets/[assetId]`.
- Interface contract: `tokens.css`, `src/app/globals.css`, `src/phone/phone.module.css`, and `tests/phone/presentation-quality.test.ts`.
- Visual QA harness: `playwright.visual.config.ts` and `tests/visual/screens.spec.ts`.

## Things that must NOT be changed without explicit approval

- Narrative canon, reveal truth/order, ending canon, romantic ambiguity, or autonomy theme.
- Phase 04 history, `main`, or the stacked base.
- Spoiler-safe server projection and S3/S4 delivery boundaries.
- Approved typography by substituting unapproved fonts merely to bypass a network-limited build.
- The Hallmark CSS contract in `tests/phone/presentation-quality.test.ts` or any other existing test, by weakening rather than correcting it.
- Phase 05 merge, rebase, or Phase 06 work without explicit authorization.
