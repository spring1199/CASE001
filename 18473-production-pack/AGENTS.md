# 18473 Agent Guide

## Project
18473 is a 2–3 hour psychological digital-detective thriller set in the fictional modern Mongolian capital of Arvantai.

Primary language for player-facing content: Mongolian.
Working language for code and schemas: English identifiers, Mongolian narrative content.

## Non-negotiable rules
1. `docs/` is the narrative and product source of truth.
2. Never rewrite canon story facts unless the user explicitly asks for a canon change.
3. Never expose secret Case #001 facts before their reveal gates.
4. Case content must be data-driven. Do not hardcode Case #001 story logic inside reusable UI or engine modules.
5. Preserve fair-play detective design: every major reveal must have prior discoverable clues.
6. Red herrings must reveal a different truth; do not create meaningless fake evidence.
7. Never label choices GOOD/BAD or morality +/-; choices represent value saved vs value sacrificed.
8. The game should feel realistic, restrained, and psychologically tense—not supernatural or cyberpunk.
9. Arvantai is fictional but culturally recognizable as a contemporary Mongolian capital.
10. Do not use real Mongolian company/product brands in final fictional content unless explicitly approved.
11. Do not make Tenuun a perfect martyr. His core flaw is protecting people by deciding for them.
12. Do not confirm whether Tenuun romantically loved Maral. Evidence may strongly support it; explicit confirmation is forbidden.
13. Canon ending path for Case #001 is `SEVER`; `TRACE` remains an alternate player branch.
14. Tenuun is alive when Case #001 begins.
15. The player must be able to infer `F17 = Maral` before the formal reveal if they notice all clues.

## Read order by task
### Narrative/content tasks
Read:
- `docs/00-PROJECT-VISION.md`
- `docs/01-MASTER-STORY-BIBLE.md`
- `docs/02-CHARACTERS.md`
- `docs/03-TRUE-TIMELINE.md`
- `docs/04-PLAYER-EXPERIENCE-TIMELINE.md`
- `docs/05-SUSPECT-MATRIX.md`
- `docs/06-CLUE-EVIDENCE-MATRIX.md`
- `docs/15-CONTENT-AUTHORING-GUIDE.md`

### Engine tasks
Read:
- `docs/07-GAME-DESIGN.md`
- `docs/09-CASE-ENGINE.md`
- `docs/12-TECH-ARCHITECTURE.md`
- `docs/13-DATA-SCHEMA.md`

### UI tasks
Read:
- `docs/07-GAME-DESIGN.md`
- `docs/10-UI-UX.md`
- `docs/11-AUDIO-VISUAL-DIRECTION.md`

### QA tasks
Read:
- `docs/06-CLUE-EVIDENCE-MATRIX.md`
- `docs/14-TESTING-ACCEPTANCE.md`

## Technical defaults
- Next.js 16.3.3 Active LTS
- React 19.2.x
- TypeScript strict mode
- Zod schemas for authored content
- Zustand for client gameplay state
- Supabase-compatible persistence boundary (local storage adapter first)
- Vitest for unit tests
- Playwright for end-to-end tests

## Required validation before completing implementation work
Run, when dependencies are available:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e` for player-flow or UI changes

Do not silently skip failures. Explain failures and fix them unless they are caused by an unavailable external dependency.

## Change discipline
- Prefer small, reviewable phases.
- Follow `docs/exec-plans/`.
- Do not begin a later phase unless the requested task explicitly includes it.
- Record important architectural decisions in `docs/decisions/`.
