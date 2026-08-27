# Phase 05 Audio, Visual, and Emotional Polish Design

## Status and branch boundary

Phase 05 is implemented on `codex/phase-05-polish`, a temporary stacked child of the pushed but unmerged Phase 04 commit `455c79882f61ca06ed14d1d2ffe31688e2aca772`. Phase 04 history is immutable. Phase 05 commits must remain strictly after that base and must not be merged or rebased until Phase 04 has merged into `main`.

## Goal

Turn the content-complete Case #001 build into a restrained, production-ready investigation experience through sound, presentation, deterministic emotional pacing, performance work, and accessibility improvements without changing narrative canon or progression architecture.

## Design constraints

- Repository canon, reveal order, ending truth, and Phase 04 authored scripts remain unchanged.
- Raw authored Case #001 data stays server-only. The browser receives only the current player-visible projection.
- F17 precedes the Winter 47 operator reveal; Hope #2 remains false and Hope #3 remains genuine.
- TRACE and SEVER remain a value conflict without morality labels. SEVER never exposes exact location.
- NODE: 0 remains post-ending only.
- Production voice masters are not available. Scripted records keep complete transcripts and never request fake or missing audio.
- Pacing is state-driven and user-advanceable. No mandatory arbitrary wait blocks investigation.
- Reduced-motion and audio-disabled play must preserve every informational and emotional beat.

## Experience architecture

### Server-projected investigation workspace

`/api/case-runtime` will continue to be the only Case #001 gameplay boundary. Its validated response will add `projectCaseView(case001Seed, state)`, while its request will accept a strict allowlist of player actions already supported by the Phase 03 engine: pin/unpin evidence, attempt deductions, place timeline events, confirm or sever graph edges, and select an ending.

The route applies one event, settles deterministic derived state, saves no server-side secret, and returns only the updated player-visible phone and case projections. Unknown, hidden, or ineligible records retain the engine's fail-closed rejection behavior. The client never imports `case001Seed` or authored JSON.

### Investigation workspace UI

The unlocked experience gains two top-level surfaces:

1. **Phone** — the existing eight applications and authored records.
2. **Investigation** — objectives, discovered evidence, deductions, timeline, GRAPH, and the final choice/aftermath.

The investigation workspace is a compact, keyboard-first workbench rather than another phone app. It consumes only `CaseView`, uses semantic lists and native controls, and dispatches strict engine events through the runtime client. Evidence pinning, deduction attempts, timeline placement, and ending choice are persisted through the existing player store transition path.

GRAPH renders as an accessible relationship list with node labels, edge confidence, source count, and player state. It does not require a canvas or color-only encoding. Timeline placement uses labeled native selects and explicit submit controls rather than inaccessible drag-only interaction.

### Deterministic presentation director

A pure presentation module derives beats from newly visible evidence tags, completed deductions, graph-confidence changes, and ending state. Priority is deterministic: ending, genuine live signal, decoy, Winter 47, F17, Hope #2, Hope #1, ordinary discovery.

The director never contains Case #001 fact IDs or answers. It uses already visible tags and projected record labels. Major beats receive restrained opacity/transform transitions and a persistent, user-advanceable aftermath sequence. Reduced motion collapses spatial movement to a short crossfade. Presentation checkpoints are stored separately from narrative player state so reloads do not replay acknowledged beats or alter progression.

The ending sequence has explicit, persistable stages: decision result, ordinary-call/raspberry aftermath, case closure, then NODE: 0. The player advances each stage; no long timer is required. This preserves post-credit ordering and works with keyboard, reduced motion, and audio disabled.

## Audio design

### Non-dialogue sound system

A small Web Audio director produces restrained non-verbal cues and ambience without adding a dependency or pretending to be a voice master. It supports:

- unlock and navigation tactility;
- notification/discovery feedback;
- subdued deduction and reveal tones;
- GRAPH confidence pulses;
- TRACE/SEVER ending ambience;
- low-level winter/city room tone.

Cues use short oscillator/noise envelopes, gain limits, and no melody that could force emotion. Ambient sound is opt-in after the unlock gesture, pauses when the document is hidden, and ducks while a real authored audio element plays. Unsupported Web Audio fails silently while visual/status feedback remains intact.

### Mixer and persistence

Preferences are versioned and validated before use. Categories are master, ambience, interface, and reveal. Mute and volume controls live in an accessible sound panel and persist locally. Invalid saved preferences fail closed to defaults. Audio start/resume occurs only from a user gesture.

### Authored voice records

The nine existing scripted records remain scripted. Their exact approved transcripts, Maral laugh motif, Tenuun humming motif, raspberry callback, and romantic ambiguity are unchanged. Scripted records show production status and transcript controls but issue no media request. Ready records keep native playback and participate in mixer ducking.

## Visual polish

The existing Hallmark Workbench/Halo tokens, amber anchor, dark canvas, typography, spacing scale, and restrained utility tone remain authoritative. Phase 05 refines hierarchy rather than replacing the visual language.

- Lock/home: clearer device state, tactile unlock transition, calmer launcher hierarchy.
- All apps: stronger collection context, denser but readable metadata, consistent list rhythm and states.
- Gallery: visible lazy-loaded thumbnails, stable intrinsic sizing, responsive grids, and contained zoom.
- Messages: progressive rendering for long threads with an explicit “load earlier” control and preserved reading order.
- Calls/audio: production-status treatment, mixer integration, always-available transcripts.
- Evidence/deductions: pinned state, prerequisite progress, restrained reveal cards.
- Timeline: chronological lanes with visible correct/incorrect state that is not color-only.
- GRAPH: confidence hierarchy and stateful edges without cyberpunk neon.
- Ending: concrete consequences, silence-first presentation, ordinary-call/raspberry aftermath, and post-credit NODE: 0.

Every interactive control retains default, hover, focus-visible, active, disabled, loading, error, and success treatment where applicable. Motion is limited to opacity and transform.

## Performance

- Images keep intrinsic dimensions, lazy loading, responsive `sizes`, and gated delivery.
- Gallery/list records use `content-visibility` where safe.
- Long message threads initially render a bounded recent window and expand in chunks.
- Audio ambience is generated lazily after opt-in and tears down on unmount.
- No new animation library or production dependency is introduced.
- GRAPH remains DOM-based and small; no canvas/WebGL memory cost is added.
- Runtime requests remain explicit and preserve current save responsiveness.

## Accessibility

- Every audio record retains a transcript; voice absence never blocks information.
- Sound settings use labeled native inputs and expose mute state.
- Investigation tabs, deduction actions, timeline controls, and ending sequence are keyboard operable.
- Focus remains visible and programmatic heading focus remains visually unobtrusive.
- All reveal information has text equivalents; color and sound are supplementary.
- Reduced motion preserves state feedback and removes long/spatial transitions.
- Existing 320/375/414/768 responsive and safe-area requirements remain acceptance gates.

## Error handling

- Invalid runtime requests return the existing uniform `invalid-request` response.
- Rejected engine actions return a valid projection plus non-oracular outcome; the UI reports a generic, useful status.
- Audio initialization failure leaves the experience silent and usable.
- Invalid audio or presentation preferences reset to versioned defaults.
- Failed runtime refresh leaves prior visible state intact and exposes a retryable status.

## Test strategy

- Unit tests cover preference validation, mixer gain, cue/beat selection, reduced-motion timing, and presentation checkpoint persistence.
- Runtime-route tests cover projected `CaseView`, allowed actions, rejected hidden/unknown IDs, and unchanged spoiler boundaries.
- Component tests cover workspace semantics, transcript fallback, long-thread progressive rendering, image loading attributes, and ending choice language.
- Playwright protects phone/workspace navigation, audio settings, reduced motion, responsive layouts, ending/post-credit ordering, save/reload behavior, and initial client/public spoiler scans.
- Existing Phase 04 progression, cycle, soft-lock, ending, and gated-asset tests remain unchanged and must stay green.

## Non-goals

- No narrative rewriting, new story events, or explicit romantic confirmation.
- No generated dialogue or fake production voice master.
- No Phase 06 human-playtest conclusions or release approval.
- No Phase 04 merge, history rewrite, squash, or current rebase.
- No anti-tamper server-session redesign.

## Acceptance

Phase 05 is complete when the technical and presentation polish is implemented, automated validation is green, the stacked branch is clean and pushed, and `PROJECT_STATE.md` records that full human 2–3 hour story/pacing validation remains pending until after Phase 05. Completion does not imply human playtest approval.
