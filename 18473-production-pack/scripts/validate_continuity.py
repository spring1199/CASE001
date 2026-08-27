from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "AGENTS.md",
    "PROJECT_STATE.md",
    "HANDOFF.md",
    "NEW_AGENT_PROMPT.md",
)

REQUIRED_STATE_SECTIONS = (
    "Project name",
    "Current phase",
    "Last completed and approved phase",
    "Current active branch",
    "Latest approved commit hash",
    "Current task implementation commit",
    "Current implementation status",
    "Completed milestones",
    "Current task status",
    "Validation and test results",
    "Open tasks",
    "Known limitations",
    "Known technical risks",
    "Known narrative risks",
    "Unresolved decisions",
    "Current spoiler/reveal gates",
    "Deferred work",
    "Next expected task",
    "Exact continuation point",
    "Source-of-truth documents",
    "Things that must NOT be changed without explicit approval",
)

REQUIRED_SOURCE_REFERENCES = (
    "AGENTS.md",
    "HANDOFF.md",
    "docs/",
    "docs/exec-plans/",
    "tasks/",
)

PLACEHOLDERS = {"tbd", "todo", "unknown", "n/a"}


def parse_sections(markdown: str) -> tuple[dict[str, str], list[str]]:
    sections: dict[str, list[str]] = {}
    duplicates: list[str] = []
    active_heading: str | None = None

    for line in markdown.splitlines():
        match = re.fullmatch(r"##\s+(.+?)\s*", line)
        if match:
            active_heading = match.group(1)
            if active_heading in sections:
                duplicates.append(active_heading)
            sections.setdefault(active_heading, [])
            continue
        if active_heading is not None:
            sections[active_heading].append(line)

    return (
        {heading: "\n".join(lines).strip() for heading, lines in sections.items()},
        duplicates,
    )


def validate_continuity(root: Path) -> list[str]:
    errors: list[str] = []

    for filename in REQUIRED_FILES:
        if not (root / filename).is_file():
            errors.append(f"Missing required continuity file: {filename}")

    state_path = root / "PROJECT_STATE.md"
    if not state_path.is_file():
        return errors

    sections, duplicates = parse_sections(state_path.read_text(encoding="utf-8"))
    for heading in duplicates:
        errors.append(f"Duplicate PROJECT_STATE.md section: {heading}")

    for heading in REQUIRED_STATE_SECTIONS:
        if heading not in sections:
            errors.append(f"Missing PROJECT_STATE.md section: {heading}")
        elif not sections[heading]:
            errors.append(f"Empty PROJECT_STATE.md section: {heading}")

    current_phase = sections.get("Current phase", "").strip().lower()
    if current_phase in PLACEHOLDERS:
        errors.append("Current phase must be explicitly declared")

    next_task = sections.get("Next expected task", "").strip().lower()
    if next_task in PLACEHOLDERS:
        errors.append("Next expected task must be explicitly declared")

    source_section = sections.get("Source-of-truth documents", "")
    for reference in REQUIRED_SOURCE_REFERENCES:
        if reference not in source_section:
            errors.append(
                f"Missing source-of-truth reference in PROJECT_STATE.md: {reference}"
            )

    return errors


def main() -> int:
    errors = validate_continuity(ROOT)
    if errors:
        print("CONTINUITY VALIDATION FAILED")
        for error in errors:
            print("-", error)
        return 1

    print(
        "CONTINUITY VALIDATION OK — "
        f"{len(REQUIRED_FILES)} files and {len(REQUIRED_STATE_SECTIONS)} state fields checked"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
