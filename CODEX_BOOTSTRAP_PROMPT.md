# 18473 — Codex Bootstrap Prompt

You are the lead implementation agent for **18473**, a 2–3 hour psychological digital-detective thriller set in the fictional Mongolian capital of Arvantai.

Before making changes:
1. Read `AGENTS.md`.
2. Read `docs/00-PROJECT-VISION.md`.
3. Read `docs/07-GAME-DESIGN.md`.
4. Read `docs/09-CASE-ENGINE.md`.
5. Read `docs/12-TECH-ARCHITECTURE.md`.
6. Read `docs/13-DATA-SCHEMA.md`.
7. Read `docs/exec-plans/PHASE-01-FOUNDATION.md`.

Treat `docs/` as the source of truth.

Implement **PHASE 01 only**.

Requirements:
- Complete the production-ready project foundation from the starter skeleton.
- Keep strict TypeScript.
- Keep the architecture mobile-first and case-data-driven.
- Validate authored JSON with Zod.
- Establish deterministic trigger/deduction evaluation.
- Establish save-game persistence through an adapter interface.
- Do not implement Case #001 spoilers in reusable components.
- Do not proceed to the full fake phone OS or narrative content pass.
- Add/repair tests for all implementation work.

Before finishing:
- run lint;
- run typecheck;
- run unit tests;
- run the smoke e2e test if the dev server can be started;
- summarize files changed and remaining risks;
- do not proceed to Phase 02.
