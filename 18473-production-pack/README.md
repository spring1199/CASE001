# 18473

**18473** is a psychological digital-detective thriller set in **Arvantai**, a fictional present-day Mongolian capital.

The player is **Maral Enkhtuvshin**, a 25-year-old Ministry of Foreign Affairs specialist who receives the phone of missing software engineer **Tenuun Batzorig**. The investigation begins as an attempt to understand a stranger and becomes a reconstruction of a relationship, a city-scale identity graph, and a missing period in Maral's own memory.

## Core promise
The player must never feel that a twist was hidden by the author. The truth was always present; its meaning changes as context accumulates.

## Repository map
- `docs/` — canonical story, design, architecture, QA
- `content/cases/case-001/` — data-driven Case #001 seed content
- `src/game/` — reusable case engine
- `src/phone/` — fake phone OS applications
- `src/components/` — shared UI
- `tests/` — engine and story-gate tests

## Setup target
The starter is written for Next.js 16.3.3 + React 19.2.x. Install dependencies, then:

```bash
npm install
npm run dev
```

## Codex
Start with `CODEX_BOOTSTRAP_PROMPT.md`. Codex should read `AGENTS.md` and the phase file before changing code.
