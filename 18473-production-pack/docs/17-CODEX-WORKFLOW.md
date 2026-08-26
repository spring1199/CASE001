# Codex Workflow

## Why phases
Do not ask Codex to build the whole game in one task. OpenAI recommends issue-like prompts and persistent repository context in `AGENTS.md`. This repo is designed around small, reviewable phases.

## Recommended cycle
1. Put this folder in Git and commit the production pack unchanged.
2. Give Codex the prompt in `CODEX_BOOTSTRAP_PROMPT.md`.
3. Review Phase 01 diff and test output.
4. Merge only when Phase 01 exit criteria pass.
5. Start the next task from `tasks/`.
6. For narrative batches in Phase 04, review content separately from engine code.

## Prompt discipline
Each Codex task should say:
- exact phase;
- exact files to read;
- exact deliverables;
- explicit out-of-scope work;
- exact validation commands.

## Canon changes
If a new production insight requires story changes, edit the relevant `docs/` canon first, then ask Codex to implement the changed source of truth. Never let implementation silently redefine canon.
