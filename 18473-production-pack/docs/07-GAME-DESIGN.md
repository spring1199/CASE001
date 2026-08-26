# Game Design Document

## Core loop
**Observe → connect → hypothesize → verify → unlock → recontextualize**.

The player should not select arbitrary dialogue choices to advance the case. Progress should primarily come from evidence and deductions.

## Primary interfaces
1. Missing person's phone
2. Evidence board
3. Timeline reconstruction
4. GRAPH relationship viewer
5. Limited messaging/interview interface with living characters
6. System recovery/forensics tools

## Investigation verbs
- read
- inspect
- zoom
- compare metadata
- recover
- search
- filter
- correlate
- link evidence
- challenge contradiction
- unlock protected data
- sever/confirm relationship edge

## Reward cadence
Deliver a small useful discovery every 8–12 minutes. Avoid more than 15 minutes without either:
- new fact,
- emotional character insight,
- contradiction,
- unlock,
- theory revision.

## Evidence board
Player can pin evidence and create relationships. The engine should support authored valid deductions rather than unrestricted LLM interpretation.

A deduction has:
- required evidence set;
- optional evidence alternatives;
- prerequisites;
- result facts;
- new unlocks.

## Timeline
Player reconstructs key event windows. Do not require minute-perfect placement unless the evidence clearly provides it.

## GRAPH mechanic
GRAPH is both story subject and gameplay mirror.
- nodes: people / devices / locations / accounts
- edges: observed or inferred relationship
- confidence values
- sources supporting confidence

Late game explicitly reveals the player's own investigations are generating new correlations.

## Hope design
Only three large hope events:
1. bank/transaction ambiguity;
2. device activity later explained by Bilguun;
3. genuine live signal.

Do not repeatedly fake Tenuun's survival.

## Red herrings
A red herring must answer a different real question. Example: Munkh's suspicious call is not murder evidence; it reveals betrayal and Tenuun's hypocrisy around autonomy.

## Failure / soft-lock policy
No permanent soft locks. Wrong deductions can be rejected with subtle feedback, not punishment. Optional evidence can deepen understanding but cannot be necessary unless the game provides a recovery route.

## Choice design
No moral meter.
Final choice displays only action and concrete predicted consequence:
- TRACE: complete final edge; reveal location; GRAPH visibility increases.
- SEVER: destroy final edge; location remains unknown.

## Replay
Alternate TRACE ending may exist, but the first production goal is a fully polished SEVER canon route. Replay should reveal earlier foreshadowing rather than add contradictory canon.
