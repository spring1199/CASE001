# 18473 Project State

## Project name

18473 — a 2–3 hour psychological digital-detective thriller set in fictional modern Arvantai.

## Current phase

Phase 05 — Audio / Visual / Emotional Polish, plus an authorized UI/UX redesign pass and a player-facing content sanitation pass on top of it. All of it lives on `codex/phase-05-polish`, which is correctly based on approved `main` and remains unmerged. Phase 06 has not started.

## Last completed and approved phase

Phase 04 — Case #001 Content, approved and merged into `main` through PR #5 at merge commit `caf1acdddea1a2e545256a9ec5fc439cc1b238a6`, followed by state-only refresh `95891eed0214258568b2a919b24912d1c2c1085b`.

## Current active branch

`codex/phase-05-polish`

## Latest approved commit hash

`95891eed0214258568b2a919b24912d1c2c1085b` on `main`. Phase 05, the redesign pass and the sanitation pass are not approved.

## Verified branch ancestry

Checked directly against Git on 2026-08-28:

- `git merge-base main codex/phase-05-polish` → `95891eed0214258568b2a919b24912d1c2c1085b`, identical to `main`'s head. Phase 05 is based exactly on the approved Phase 04 merged main state.
- `git merge-base --is-ancestor main codex/phase-05-polish` → true. `main` is fully contained.
- `git log main..codex/phase-05-polish` → 29 commits, all Phase 05 / redesign / sanitation. No Phase 04 commit is replayed; Phase 04 reaches this branch only through the merged `main` ancestry, so it exists exactly once.
- `git diff main...codex/phase-05-polish -- content assets private-assets public` was empty before the sanitation pass, confirming the restack reverted no narrative or asset history.

### Discrepancy that was resolved

Two earlier continuation reports disagreed. The remote branch had already been restacked onto approved `main`, producing head `9791e5cce25bba888ee76691db49d083753d1d40`. The redesign session's clone still held a stale `origin/codex/phase-05-polish` at the pre-restack head `49f6b3c2916a89eac5d4456d1fa240b50939040f`, never fetched the update, and therefore built the redesign on the superseded lineage. Both reports were locally accurate and globally inconsistent.

Resolution: fetched the remote, confirmed the restacked lineage was content-faithful (the pre-restack head `49f6b3c` and its replayed twin `2a7f7ba` differ only in `PROJECT_STATE.md`), then replayed the four redesign commits onto `9791e5c` with `git rebase --onto`. Recovery refs `backup/phase05-redesign-preRestack` (`543dc22`) and `backup/phase05-preRedesign-remote` (`9791e5c`) were created before any history change. The push was a fast-forward (`9791e5c..3ece7fc`) issued with `--force-with-lease`; no blind force-push was used and no remote history was rewritten.

### Work recovered from the restacked lineage

The restack also carried two commits the redesign session had never seen: `3834505` (browser-regression fixes) and `f1c0eda` (technical acceptance record). Both are preserved. `3834505` and the redesign had independently fixed the same four defects (reveal focus restoration, audio-director disposal on remount, mixer slider labelling, gallery `content-visibility` versus scroll restoration); the merge keeps one mechanism per defect, preferring the accepted Phase 05 implementation. Its pacing decision — `isBlockingPresentationChange`, which makes ordinary discoveries non-modal — is retained, and the redesign's reveal-acknowledgement scaffolding was removed from the player-flow specs because it swallowed the real Hope #1 reveal.

## Current task implementation commit

`3ece7fcd2e255898861fcee6486c61f882b0bde4` is the content sanitation commit and the final implementation commit of this pass. The preceding commits of this pass are `324021c` (redesign, replayed onto the restacked base) and `6f30b16` (reconciliation with the restacked reveal pacing). The final branch HEAD is the subsequent state-only refresh commit, because a commit cannot contain its own hash.

## Current implementation status

Phase 05 technical and presentation implementation is complete: server-projected investigation workbench, deterministic and durable reveal presentation, persisted audio mixing, restrained non-dialogue sound, transcript-safe authored audio, performance bounds, accessible modal pacing, and a persistable ending sequence.

The redesign pass rebuilt the interface layer as a believable modern handset — device shell, navigation primitives, typography, dark-surface hierarchy, all eight phone apps, the investigation workbench, and the reveal/ending presentation.

The sanitation pass then removed internal authoring language from player-facing projections. Five records leaked; all five are fixed and the leak class is now covered by an automated regression test that inspects the real player-visible payloads.

## Player-facing content sanitation

Every authored collection was swept twice: once for production-note wording, once for the structural shape of a metadata header line, across Messages, the 18473 archive, Calls/audio, Browser, Mail, Notes, Files, Gallery metadata, evidence, deductions, timeline, GRAPH, and the reveal/ending presentation. Each hit was classified before any edit.

Leaked records found and fixed: **5**. False positives left untouched: **1**.

- `call_18473_03` — its `body` and its `audio.transcript` both opened with the writers'-room brief ("Purpose: post-final-choice grief/recontextualization. Must never provide explicit love confirmation." and "Length target: 2m 10s–3m 00s."), followed by a trailing markdown rule from the same paste. The brief moved to server-only `authoringNote`. The performance script is untouched: opening stage direction, both speakers, the humming motif, the raspberry callback, and the closing direction all survive verbatim.
- `msg_18473_food`, `msg_18473_habit`, `msg_18473_style`, `msg_18473_work_hint` — each carried the designer label "INC-18473 clue extract" as the player-visible thread subtitle and as the first message's `timestampLabel`. The label moved to `authoringNote`. The replacement values are reused verbatim from canon rather than invented: `Сэргээгдсэн` (already `call_18473_03.subtitle`) and `Архив` (already `msg_delivery_01.timestampLabel` and browser record 0).
- `emails.json` "Устгасан draft" matched the word "draft" but is in-world text for a deleted email draft. Deliberately left unchanged.

`authoringNote` is a new optional field on authored records and message entries. The phone projection builds its output field by field and never copies it, so the notes stay available to the writers and can never reach a player. No dialogue, clue truth, evidence dependency, reveal order, progression-relevant timestamp, or transcript was altered.

## Completed milestones

- Completed Phase 05: server-projected investigation workspace, deterministic durable reveal queue, persisted audio mixer, restrained cues, ending stages, and the strict runtime action boundary.
- Completed the authorized UI/UX redesign pass across the device shell, navigation primitives, typography, dark-surface hierarchy, all eight phone apps, the investigation workbench, and the reveal/ending presentation.
- Resolved the branch-ancestry discrepancy, restacked the redesign onto the approved base without losing either lineage's work, and pushed as a lease-protected fast-forward.
- Completed the player-facing authoring-note sanitation and added executable regression protection for it.
- Executed the full validation matrix in a real browser and with the standard production build.
- Preserved Phase 04 canon, all required visual assets, `progressionComplete = true`, and progression debt = 0.

## Current task status

Ancestry is verified correct, sanitation is complete, and the entire validation matrix passes on `codex/phase-05-polish`. The branch is intentionally unmerged. Human visual review and the full human playthrough are both still pending. Phase 06 has not started.

## Redesign — phone shell

- Desktop presents a framed 393 × 852 logical device: bezel, sensor island, ambient halo, device shadow, correct display radius, and a home indicator. Below 48rem the device becomes the viewport with no fake chrome.
- Safe areas are driven by `--safe-top/-bottom/-left/-right` custom properties that resolve to `env(safe-area-inset-*)` on hardware and to simulated frame insets inside the desktop frame.
- The screen clips its own content, scrollbars are hidden inside the device, and the single scroll region is `[data-phone-scroll-region]`, so there is no nested scroll trap.

## Redesign — navigation primitives

- Translucent, blurred status bar with inline SVG signal / wi-fi / battery glyphs and the audio-mixer control.
- Navigation bar with a back affordance, home action, device label, and a compact title that crossfades in once content scrolls under the chrome; detail screens show the compact title immediately.
- Large title lives in the scroll flow like a native root screen and remains the programmatic focus target.
- The Phone / Investigation surfaces sit in a bottom tab bar with glyphs, keeping the same roving-tabindex keyboard contract.
- Reusable row primitives (`contact`, `record`, `gallery`) and two list styles (full-bleed `plain`, inset `grouped`) give every app one navigation language.

## Redesign — typography and colour

- Native mobile type ramp: large title, title, title-sm, headline, body, callout, subhead, footnote, caption, caption-sm, plus a lock-screen clock size. Line-height and tracking tokens replace ad-hoc values.
- The approved Onest / IBM Plex Mono stack is unchanged. Mono is reserved for time, identifiers, status tags, and confidence values.
- Dark surfaces are layered (void → canvas → shell → surface → raised → pressed → fill) with near-invisible separators. Borders were removed almost everywhere; hierarchy comes from surface, spacing, and separators.
- Amber remains the brand accent but no longer dominates: it marks the single lock-screen action, active states, links, focus, and unread markers. Reveal and ending acknowledgements are neutral in both rest and hover states.
- Eight muted app tints differentiate the home grid without neon.

## Redesign — app by app

- **Lock screen** — believable clock, device line, a notification-style case card, a single primary action, and a soft wallpaper light.
- **Home screen** — 4-column grid, rounded icon tiles with raised edges, generic inline-SVG glyphs, 11px labels, and a lock badge on gated apps.
- **Messages** — full-bleed rows with avatar monograms, two-line previews, timestamps, unread dots, and text-inset separators. The 18473 conversation is real chat bubbles with sender runs, tailed corners, in-bubble timestamps, and visually hidden direction labels that screen readers still announce.
- **Gallery** — responsive tile grid (2 → 3 → 4 columns) with square thumbnails, quiet captions, timeline sections, and unchanged lazy loading. No clue photo is visually marked.
- **Calls / audio** — contact rows with monograms and durations; the audio figure is a grouped card with a production-status caption and a disclosure transcript. Scripted audio still emits no media element.
- **Mail** — sender/subject hierarchy with previews and timestamps, no bordered cards.
- **Browser** — collection rail plus a native search field with a magnifier glyph, placeholder, and a visually hidden label.
- **Notes / Files / Settings** — inset grouped rows with disclosure chevrons.
- **Evidence / deductions / timeline / GRAPH** — grouped lists, state tags, a progress meter for deduction thresholds, native timeline selects, and GRAPH edges rendered as readable rows with a confidence meter. No HUD styling; the exact-location gate is untouched.
- **Audio preferences** — a grouped settings sheet with per-slider labels, value outputs, and label-left/control-right toggle rows.

## Redesign — reveal and ending presentation

- Ordinary discoveries are non-modal (`isBlockingPresentationChange`); when a change does surface as a sheet it is compact, with a grab handle and a neutral acknowledgement.
- Authored reveals (Hope #1/#2/#3, F17, Winter 47, decoy) and the ending take the whole screen with generous space and quiet typography.
- The deterministic version-2 FIFO reveal queue, its persistence, its acknowledgement requirement, and the decision → aftermath → closure → post-credit ordering are unchanged.
- The TRACE/SEVER decision has a dedicated spacious section with two equally weighted cards; neither option is colour-coded, labelled GOOD/BAD, or visually preferred.
- Reduced motion still collapses every beat to at most 150 ms while retaining full text and state.

## Defects found by real browser execution

The 22 Playwright cases had never executed before this line of work. Running them exposed application defects, all fixed:

- A reveal could restore focus to its own control, and the background was still `inert` when the cleanup ran, so acknowledging a reveal left focus on `document.body`.
- A remount disposed the `AudioDirector` permanently, so audio silently never started under React Strict Mode.
- Each mixer slider shared a wrapping label with an `<output>`, so the accessible name resolved to the output rather than the slider.
- Global back/home keys still fired while a blocking reveal was open.
- The ending aftermath had no stable identifier or label for the recovered call.
- `content-visibility` on gallery tiles shortened the scroll height on remount, so restored route scroll landed short.
- The Next dev overlay button was injected inside the phone screen and failed the 44px touch-target sweep; the sweep is now scoped to `[data-phone-screen]` and `devIndicators` is off.

Player-flow specs were corrected rather than weakened: message chronology is asserted against authored record order by message identity, because authored labels legitimately wrap past midnight (`… · 23:58` precedes `… · 00:01`).

## Audio status

Unchanged from Phase 05. Lazy Web Audio director, gesture-gated context, visibility suspend, versioned persisted master/ambience/interface/reveal gains, mute and ambience toggles, duck/release around real native playback, and scripted audio that never requests media while always exposing its approved transcript.

## Voice-master status

Unchanged. Production-quality voice masters remain unavailable and were not fabricated. All nine approved scripts/transcripts remain canon-faithful, including the Maral laugh motif, Tenuun humming motif, raspberry callback, and romantic ambiguity. Removing the writers'-room brief from `call_18473_03` did not touch its performance script. Ready-audio replacement wiring and ducking remain production-ready.

## Accessibility status

- Keyboard-operable navigation, tabs, workbench actions, timeline selects, mixer, transcripts, and ending sequence.
- Visible focus everywhere; the surface tabs use a `:focus` ring because their roving tabindex moves focus programmatically.
- Reveal focus containment and restoration verified end to end in a browser.
- 44px minimum targets verified at 320/375/414/768 by the acceptance suite.
- WCAG AA contrast verified from computed styles across lock, home, messages, thread, gallery, browser, investigation, audio settings, and reveal surfaces: no failures.
- Semantic headings, landmarks, lists, live regions, safe areas, and text equivalents for every audio and visual beat are preserved.

## Performance status

- No dependency was added; the icon set is inline SVG.
- Message threads still render the newest 60 and expand in 60-message chunks; `content-visibility` remains on message and list rows and was removed only from gallery tiles, where it broke scroll restoration.
- Gallery thumbnails keep intrinsic dimensions, responsive `sizes`, and lazy loading.
- Motion is restricted to opacity and transform; the only animations are the reveal scrim and card.
- Audio remains lazy, opt-in for ambience, and fully released on stop/dispose.

## Validation and test results

Full matrix run on 2026-08-28 from implementation commit `3ece7fcd2e255898861fcee6486c61f882b0bde4`:

- Asset validation/rebuild: passed; 81/81 Case #001 runtime assets reproduced with no ledger content drift.
- Pack validation: passed; 154 unique authored IDs checked.
- Continuity validation: passed; 4 files and 21 state fields checked.
- Continuity tests: 8/8 passed.
- Lint: passed with zero warnings.
- Strict TypeScript: passed.
- Unit/content/component tests: 391/391 passed across 33 files.
- Progression/reachability: the Case #001 progression and gate suites pass; `progressionComplete = true`, canon ending `ending_sever`, progression debt 0, `exactLocationRevealed` false under SEVER.
- Playwright: 22/22 passed in a real Chromium.
- Production build: `npm run build` passed end to end with the approved Google-hosted fonts; `/` static, both case APIs dynamic.
- Security audit: 0 vulnerabilities. `package-lock.json` is unchanged across the whole branch.
- Spoiler/protected-name scan and asset-leak scan: passed, including initial-delivery scanning, gated-record rejection, S3/S4 public-path checks, ending-role delivery, and explicit pre-ending absence assertions for `presentationRole`, `presentationLabel` and `authoringNote`.
- Player-facing authoring-note leak scan: new suite, 9/9 passed. Verified to fail when a leak is reintroduced.
- Hallmark presentation contract: passed; P5 H5 E5 S5 R5 V4.
- Visual QA: 26 screens captured at 320, 375, 393, 430, 768, and 1440 px through `npm run qa:visual`, including the final TRACE/SEVER choice and all four ending stages, and re-captured after sanitation.

## Human playtest status

PENDING. No human playthrough has occurred. This pass responds to a visual review and to an ancestry/content-integrity audit; it is not story, pacing, or final playtest approval. A full human 2–3 hour playthrough is required before any Phase 06 authorization.

## Known limitations

- Screenshots are written to the gitignored `.qa/shots`; they are a human review aid, not a committed pixel-diff baseline.
- The Settings app contains a single authored record, so its grouped layout is necessarily sparse.
- Message timestamp labels are long authored strings (`Day 191 — 02:03 · 02:27`) and occupy noticeable width inside bubbles.
- Physical notched-device testing remains useful beyond Chromium safe-area emulation.
- Human art-direction review of the generated imagery is still appropriate.
- Recovery refs `backup/phase05-redesign-preRestack` and `backup/phase05-preRedesign-remote` are local-only and may be deleted once this pass is approved. A detached worktree at `C:/Users/cloc1/.config/superpowers/worktrees/CASE001/phase-04-case001-content` still holds a superseded pre-redesign intermediate in `git stash@{0}`; nothing depends on it.

## Known technical risks

- Local-first save state and gated cookies prevent accidental/static/network preloading but are not an anti-tamper entitlement system.
- Presentation checkpoints remain separate from narrative progression and migrate v1 metadata to strict v2.
- Google-hosted build-time fonts remain an external build dependency until an approved self-hosting change is made. They resolved on this host.
- `next-env.d.ts` flips between its dev and build variants depending on which command ran last; it is restored to the committed variant before every commit.
- Clones can go stale against a restacked remote branch, which is exactly what produced the ancestry discrepancy. Fetch and verify `git merge-base main codex/phase-05-polish` before building on this branch.

## Known narrative risks

- F17 remains inferable from multiple clue families; polish must not make a single clue conclusive.
- The final recovered call implies intimacy but does not prove romantic love. Removing its authoring brief did not change that balance.
- Winter 47 and Tenuun retain moral ambiguity, and Hope #2 remains visibly false rather than another survival confirmation.

## Unresolved decisions

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
- Initial browser delivery and public assets exclude hidden authored records, ending roles, ending labels, server-only authoring notes, and S3/S4 filenames.

## Open tasks

- Run a human visual review of the redesign, then the full human 2–3 hour playthrough.
- Keep Phase 05 unmerged pending explicit approval.
- Delete the local recovery refs and the stale worktree stash once this pass is approved.

## Deferred work

- FULL HUMAN PLAYTEST.
- Phase 06 QA / release readiness: human-playtest feedback, regression QA, and release-readiness work, only after explicit authorization.
- Optional human art-direction pass, physical-device QA, and production anti-tamper/session hardening.

## Next expected task

Human visual and playtest review of the redesigned, sanitized interface. Do not merge Phase 05 and do not start Phase 06.

## Exact continuation point

Continue from clean branch `codex/phase-05-polish` at the state-only commit that follows sanitation commit `3ece7fcd2e255898861fcee6486c61f882b0bde4`. Before any work, run `git fetch origin` and confirm `git merge-base main codex/phase-05-polish` equals `95891eed0214258568b2a919b24912d1c2c1085b`; a different value means the clone is stale. `origin/codex/phase-05-polish` and the local branch are in sync. Await human visual/playtest review before any further change, merge, or Phase 06 work. Reproduce screenshots with `npm run qa:visual`.

## Source-of-truth documents

- Workflow and continuity: `AGENTS.md`, `PROJECT_STATE.md`, `HANDOFF.md`.
- Phase execution plans: `docs/exec-plans/`, including `docs/exec-plans/PHASE-05-AUDIO-POLISH.md`.
- Executable task briefs: `tasks/`, including `tasks/05-audio-polish.md`.
- UI and audiovisual direction: `docs/10-UI-UX.md` and `docs/11-AUDIO-VISUAL-DIRECTION.md`.
- Phase 05 design and plan: `docs/superpowers/specs/2026-08-27-phase05-audio-visual-emotional-polish-design.md` and `docs/superpowers/plans/2026-08-27-phase05-audio-visual-emotional-polish.md`.
- Narrative and acceptance canon: the relevant canonical `docs/` files listed in `AGENTS.md`, especially `docs/14-TESTING-ACCEPTANCE.md`.
- Runtime boundary: `docs/decisions/0005-phase04-server-projections.md`, `/api/case-runtime`, and `/api/case-assets/[assetId]`.
- Interface contract: `tokens.css`, `src/app/globals.css`, `src/phone/phone.module.css`, and `tests/phone/presentation-quality.test.ts`.
- Player-facing content contract: `tests/content/authoring-note-leakage.test.ts` and the server-only `authoringNote` field in `src/game/schema/authored-artifact.ts`.
- Visual QA harness: `playwright.visual.config.ts` and `tests/visual/screens.spec.ts`.

## Things that must NOT be changed without explicit approval

- Narrative canon, reveal truth/order, ending canon, romantic ambiguity, or autonomy theme.
- Phase 04 history, `main`, or the verified branch base.
- Spoiler-safe server projection and S3/S4 delivery boundaries.
- Approved typography by substituting unapproved fonts merely to bypass a network-limited build.
- The Hallmark CSS contract, the authoring-note leakage contract, or any other existing test, by weakening rather than correcting it.
- The separation between player-facing fields and server-only `authoringNote` metadata.
- Phase 05 merge or Phase 06 work without explicit authorization.
