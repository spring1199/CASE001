# Case Engine Specification

## Goal
Build a reusable engine where Case #001 is authored data, not application logic.

## Core entities
- CaseManifest
- Character
- Artifact
- Conversation
- Message
- Evidence
- Fact
- Deduction
- Objective
- Lock
- Trigger
- TimelineEvent
- GraphNode
- GraphEdge
- Ending
- PlayerState

## State model
Player state contains only runtime facts such as:
- discovered artifact IDs;
- discovered evidence IDs;
- unlocked app/content IDs;
- completed deductions;
- known facts;
- objective state;
- timeline placements;
- graph edges confirmed/severed;
- flags;
- ending branch;
- timestamps for analytics/pacing.

Never store narrative truth only in UI component state.

## Determinism
Given authored case data + player state, trigger evaluation must be deterministic.

## Trigger examples
- evidence discovered;
- N-of-M evidence threshold;
- deduction completed;
- objective completed;
- content viewed;
- time/pacing gate (use sparingly);
- graph confidence threshold;
- choice selected.

## Reveal protection
Each secret has a reveal gate. UI queries must request player-visible projection, not raw canon records.

Example:
- internal character may have `canonicalIdentity: maral`;
- player-facing graph node remains `F17` until fact `f17_is_maral` is known.

## Content loading
- validate JSON at load time with Zod;
- fail loudly in development with path + ID;
- build a case index for fast lookup;
- enforce unique IDs.

## Save system
Persistence adapter interface:
- local browser adapter for MVP;
- Supabase adapter later;
- versioned save schema + migrations.

## Testing hooks
Provide pure functions for:
- evaluateDeduction
- evaluateTrigger
- computeUnlocks
- computeGraphConfidence
- projectVisibleArtifact

These should be unit-testable without React.
