"""Whitelisted command runner for the reviewer agent.

Only three commands are ever executed, and never through a shell:
npm run type-check, npm run lint and npx vitest run <paths>.
Everything else — git, installers, file deletion, flag injection — is
refused before spawn, so an agent can never commit, push, or turn the
test command into watch mode.
"""

import re
import subprocess
import sys
from typing import Any, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

REPO_ROOT = r"D:\code\mermaidstudio"
TIMEOUT_SECONDS = 900
OUTPUT_LIMIT = 6000

# On Windows, subprocess with shell=False cannot resolve npm.ps1/npm.cmd —
# CreateProcess only finds executables, so the .cmd shims must be named
# explicitly or every spawn fails with WinError 2 "file not found".
_NPM = "npm.cmd" if sys.platform == "win32" else "npm"
_NPX = "npx.cmd" if sys.platform == "win32" else "npx"

# command name -> argv prefix. `test` is the only one accepting extra
# arguments (test file paths); flags are refused so `vitest run` cannot
# become `vitest watch` and no CLI option can be smuggled in.
COMMANDS: dict[str, list[str]] = {
    "type-check": [_NPM, "run", "type-check"],
    "lint": [_NPM, "run", "lint"],
    "test": [_NPX, "vitest", "run"],
}

# Repo-relative paths only: no flags, no quotes, no shell metacharacters.
_ARG_RE = re.compile(r"^[\w@][\w@./\\-]*$")


class RepoShellInput(BaseModel):
    """Input schema for RepoShellTool."""

    command: str = Field(
        ...,
        description=(
            "One of: type-check, lint, test. 'test' may be followed by "
            "repo-relative test file paths, e.g. "
            "'test src/lib/mermaid/__tests__/core.test.ts'."
        ),
    )


class RepoShellTool(BaseTool):
    name: str = "repo_shell"
    description: str = (
        "Run a whitelisted verification command inside the MermaidStudio "
        "repository. Allowed: 'type-check', 'lint', 'test [paths...]'. "
        "Nothing else runs — no git, no package installs, no watch mode."
    )
    args_schema: Type[BaseModel] = RepoShellInput

    def _run(self, command: str, **kwargs: Any) -> str:
        parts = command.split()
        if not parts:
            return "REFUSED: empty command."
        if parts[0] not in COMMANDS:
            allowed = ", ".join(COMMANDS)
            return f"REFUSED: '{parts[0]}' is not whitelisted. Allowed: {allowed}."
        if parts[0] != "test" and len(parts) > 1:
            return "REFUSED: only 'test' accepts extra arguments (file paths)."
        for extra in parts[1:]:
            if extra.startswith("-") or not _ARG_RE.match(extra):
                return (
                    f"REFUSED: invalid argument '{extra}' — repo-relative "
                    "file paths only, no flags."
                )

        argv = COMMANDS[parts[0]] + parts[1:]
        try:
            proc = subprocess.run(
                argv,
                cwd=REPO_ROOT,
                shell=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return f"TIMEOUT after {TIMEOUT_SECONDS}s: {' '.join(argv)}"
        except OSError as exc:
            return f"ERROR: {' '.join(argv)} failed to start: {exc}"

        out = ((proc.stdout or "") + (proc.stderr or "")).strip()
        if len(out) > OUTPUT_LIMIT:
            out = out[:OUTPUT_LIMIT] + f"\n... [truncated, exit={proc.returncode}]"
        return f"$ {' '.join(argv)}\nexit={proc.returncode}\n{out}"
