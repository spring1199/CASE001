from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest


MODULE_PATH = Path(__file__).resolve().parents[2] / "scripts" / "validate_continuity.py"
SPEC = spec_from_file_location("validate_continuity", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load continuity validator from {MODULE_PATH}")
VALIDATOR = module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def complete_project_state() -> str:
    sections = {
        "Project name": "18473",
        "Current phase": "Post-Phase 02 continuity hardening; Phase 03 not started.",
        "Last completed and approved phase": "Phase 02 — Fake Phone OS.",
        "Current active branch": "`codex/continuity-handoff`",
        "Latest approved commit hash": "`1c2d8b75b632c855cde06052a517eeaa5a6757ee`",
        "Current task implementation commit": "`0123456789abcdef0123456789abcdef01234567`",
        "Current implementation status": "Phases 01 and 02 are merged into `main`.",
        "Completed milestones": "Phase 01 foundation; Phase 02 phone OS.",
        "Current task status": "Continuity infrastructure is being validated.",
        "Validation and test results": "Continuity validation and unit tests passed.",
        "Open tasks": "Review and merge the continuity branch.",
        "Known limitations": "Authored narrative collections remain deferred.",
        "Known technical risks": "Real-device safe-area QA remains useful.",
        "Known narrative risks": "Do not deliver gated facts to the client.",
        "Unresolved decisions": "None for the continuity task.",
        "Current spoiler/reveal gates": "Follow `docs/14-TESTING-ACCEPTANCE.md`.",
        "Deferred work": "Phase 03 and later phases.",
        "Next expected task": "Review and merge continuity; wait for Phase 03 approval.",
        "Exact continuation point": "Start from the clean continuity branch HEAD.",
        "Source-of-truth documents": (
            "- Workflow: `AGENTS.md`.\n"
            "- Handoff map: `HANDOFF.md`.\n"
            "- Canon and product authority: `docs/`.\n"
            "- Phase specifications: `docs/exec-plans/`.\n"
            "- Executable task briefs: `tasks/`."
        ),
        "Things that must NOT be changed without explicit approval": (
            "Canon, reveal gates, phase boundaries, and approved architecture."
        ),
    }
    return "# 18473 Project State\n\n" + "\n\n".join(
        f"## {heading}\n\n{body}" for heading, body in sections.items()
    ) + "\n"


class ContinuityValidationTests(unittest.TestCase):
    def make_repo(self, root: Path) -> None:
        (root / "AGENTS.md").write_text("# Agent rules\n", encoding="utf-8")
        (root / "HANDOFF.md").write_text("# Handoff\n", encoding="utf-8")
        (root / "NEW_AGENT_PROMPT.md").write_text("# New agent prompt\n", encoding="utf-8")
        (root / "PROJECT_STATE.md").write_text(complete_project_state(), encoding="utf-8")

    def test_accepts_complete_continuity_infrastructure(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)

            self.assertEqual(VALIDATOR.validate_continuity(root), [])

    def test_reports_every_missing_continuity_file(self) -> None:
        with TemporaryDirectory() as directory:
            errors = VALIDATOR.validate_continuity(Path(directory))

        for filename in VALIDATOR.REQUIRED_FILES:
            self.assertIn(f"Missing required continuity file: {filename}", errors)

    def test_rejects_missing_and_empty_state_sections(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state()
            state = state.replace("## Known limitations\n\nAuthored narrative collections remain deferred.\n\n", "")
            state = state.replace(
                "## Current task status\n\nContinuity infrastructure is being validated.",
                "## Current task status\n\n",
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        self.assertIn("Missing PROJECT_STATE.md section: Known limitations", errors)
        self.assertIn("Empty PROJECT_STATE.md section: Current task status", errors)

    def test_rejects_placeholder_phase_or_next_task(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state().replace(
                "Post-Phase 02 continuity hardening; Phase 03 not started.",
                "TBD",
            ).replace(
                "Review and merge continuity; wait for Phase 03 approval.",
                "TODO",
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        self.assertIn("Current phase must be explicitly declared", errors)
        self.assertIn("Next expected task must be explicitly declared", errors)

    def test_rejects_placeholder_led_phase_or_next_task(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state().replace(
                "Post-Phase 02 continuity hardening; Phase 03 not started.",
                "TBD — awaiting user direction.",
            ).replace(
                "Review and merge continuity; wait for Phase 03 approval.",
                "Unknown until the next agent investigates.",
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        self.assertIn("Current phase must be explicitly declared", errors)
        self.assertIn("Next expected task must be explicitly declared", errors)

    def test_requires_task_commit_and_validation_results(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state()
            state = state.replace(
                "## Current task implementation commit\n\n"
                "`0123456789abcdef0123456789abcdef01234567`\n\n",
                "",
            )
            state = state.replace(
                "## Validation and test results\n\n"
                "Continuity validation and unit tests passed.\n\n",
                "",
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        self.assertIn(
            "Missing PROJECT_STATE.md section: Current task implementation commit",
            errors,
        )
        self.assertIn(
            "Missing PROJECT_STATE.md section: Validation and test results",
            errors,
        )

    def test_requires_source_of_truth_references(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state().replace(
                (
                    "- Workflow: `AGENTS.md`.\n"
                    "- Handoff map: `HANDOFF.md`.\n"
                    "- Canon and product authority: `docs/`.\n"
                    "- Phase specifications: `docs/exec-plans/`.\n"
                    "- Executable task briefs: `tasks/`."
                ),
                "See the usual project files.",
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        self.assertTrue(any("source-of-truth reference" in error for error in errors))

    def test_rejects_negated_source_of_truth_references(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repo(root)
            state = complete_project_state().replace(
                (
                    "- Workflow: `AGENTS.md`.\n"
                    "- Handoff map: `HANDOFF.md`.\n"
                    "- Canon and product authority: `docs/`.\n"
                    "- Phase specifications: `docs/exec-plans/`.\n"
                    "- Executable task briefs: `tasks/`."
                ),
                (
                    "- Do not read `AGENTS.md`.\n"
                    "- Ignore `HANDOFF.md`.\n"
                    "- Never use `docs/`.\n"
                    "- Exclude `docs/exec-plans/`.\n"
                    "- Do not consult `tasks/`."
                ),
            )
            (root / "PROJECT_STATE.md").write_text(state, encoding="utf-8")

            errors = VALIDATOR.validate_continuity(root)

        for reference in VALIDATOR.REQUIRED_SOURCE_REFERENCES:
            self.assertIn(
                f"Missing source-of-truth reference in PROJECT_STATE.md: {reference}",
                errors,
            )


if __name__ == "__main__":
    unittest.main()
