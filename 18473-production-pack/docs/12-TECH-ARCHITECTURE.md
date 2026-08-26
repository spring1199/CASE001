# Technical Architecture

## Target stack
- Next.js 16.3.3 (Active LTS target at pack creation)
- React 19.2.x
- TypeScript strict
- App Router
- Zustand client state
- Zod content validation
- local persistence first, Supabase adapter later
- Vitest unit tests
- Playwright E2E

## Architecture boundaries
### `src/game/engine`
Pure game logic. No React.

### `src/game/schema`
Zod schemas and inferred TypeScript types.

### `src/game/state`
Player-state store and persistence integration.

### `src/phone`
Fake phone applications. These consume player-visible projections from the engine.

### `content/cases`
Authored JSON only. No executable application code.

## Rendering strategy
The game is interaction-heavy and client-state-heavy. Use Server Components for shell/static loading where useful, but gameplay views can be client components. Avoid unnecessary server round-trips for every evidence interaction.

## Offline/PWA direction
Case #001 should be playable after initial asset download in a later phase. Architect content loading so case data/assets can be cached.

## Security/privacy
All game identities are fictional. Do not ship real secrets/credentials. `.env.example` only.

## Dependency policy
Use stable releases. Do not use canary dependencies in production. When Codex installs packages, it should re-check compatibility and security advisories rather than trusting this pack's versions indefinitely.
