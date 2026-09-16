"""Surgical file editor for the developer agent.

Applies one exact old->new replacement per call, like a search-and-replace:
the old text must exist in exactly one copy or the call is refused, so the
agent can never silently corrupt a file by over- or under-matching. Only
files under src/ are editable — configs, manifests and everything outside
the source tree are out of reach. Line endings are preserved regardless of
the line-ending style of the supplied text.
"""

from pathlib import Path
from typing import Any, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from crew.tools.repo_shell_tool import REPO_ROOT

EDIT_ROOT = Path(REPO_ROOT) / "src"
MAX_FILE_BYTES = 1_000_000


class RepoEditInput(BaseModel):
    """Input schema for RepoEditTool."""

    path: str = Field(
        ...,
        description="Repo-relative file path under src/, e.g. "
        "'src/components/preview/PreviewPanel.tsx'.",
    )
    old_text: str = Field(..., description="Exact existing text to replace (unique).")
    new_text: str = Field(..., description="Replacement text (must differ from old_text).")


class RepoEditTool(BaseTool):
    name: str = "repo_edit"
    description: str = (
        "Apply one exact, unique search-and-replace to a file under src/. "
        "old_text must appear exactly once in the file, otherwise the edit is "
        "refused. Use this for every change to an existing file — never "
        "regenerate whole files."
    )
    args_schema: Type[BaseModel] = RepoEditInput

    def _run(self, path: str, old_text: str, new_text: str, **kwargs: Any) -> str:
        if new_text == old_text:
            return "REFUSED: new_text is identical to old_text."
        if not old_text.strip():
            return "REFUSED: old_text is empty."

        target = (Path(REPO_ROOT) / path).resolve()
        try:
            target.relative_to(EDIT_ROOT.resolve())
        except ValueError:
            return f"REFUSED: '{path}' is outside src/ — only src/ files are editable."
        if not target.is_file():
            return f"REFUSED: '{path}' does not exist (create new files with file_writer)."
        if target.stat().st_size > MAX_FILE_BYTES:
            return f"REFUSED: '{path}' is larger than the {MAX_FILE_BYTES} byte limit."

        raw = target.read_bytes()
        text = raw.decode("utf-8")
        eol = "\r\n" if "\r\n" in text else "\n"
        normalized = text.replace("\r\n", "\n")
        old_norm = old_text.replace("\r\n", "\n")
        new_norm = new_text.replace("\r\n", "\n")

        count = normalized.count(old_norm)
        if count == 0:
            return (
                f"REFUSED: old_text not found in '{path}' — re-read the file and "
                "copy the exact text (including indentation)."
            )
        if count > 1:
            return f"REFUSED: old_text appears {count} times in '{path}' — add context to make it unique."

        updated = normalized.replace(old_norm, new_norm, 1)
        target.write_bytes(updated.replace("\n", eol).encode("utf-8"))
        lines = updated.count("\n") + 1
        return f"OK: 1 replacement applied to '{path}' (file now {lines} lines, eol preserved)."
