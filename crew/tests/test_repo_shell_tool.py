"""Offline tests for the RepoShellTool whitelist.

subprocess.run is monkeypatched, so no command is actually executed here:
the tests assert the refusal rules and the argv that would be spawned.
"""

import subprocess

import pytest

from crew.tools.repo_shell_tool import COMMANDS, REPO_ROOT, RepoShellTool


@pytest.fixture()
def tool():
    return RepoShellTool()


def test_refuses_non_whitelisted_commands(tool):
    for bad in ("git push", "git commit -m x", "npm install", "rm -rf src", "dir"):
        result = tool._run(command=bad)
        assert result.startswith("REFUSED"), bad


def test_refuses_extra_args_outside_test(tool):
    result = tool._run(command="lint src/foo.ts")
    assert result.startswith("REFUSED")


def test_refuses_flag_injection(tool):
    for bad in ("test --watch", "test -w", "test --config foo.ts"):
        result = tool._run(command=bad)
        assert result.startswith("REFUSED"), bad


def test_refuses_shell_metacharacters(tool):
    for bad in ("test src/a;rm -rf /", "test 'quoted'", "test a|b"):
        result = tool._run(command=bad)
        assert result.startswith("REFUSED"), bad


def test_builds_expected_argv(monkeypatch, tool):
    recorded = {}

    def fake_run(argv, **kwargs):
        recorded["argv"] = argv
        recorded["kwargs"] = kwargs
        return subprocess.CompletedProcess(argv, 0, stdout="ok", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = tool._run(command="test src/lib/mermaid/__tests__/core.test.ts")

    # COMMANDS is the platform-aware source of truth (npm.cmd on win32).
    assert recorded["argv"] == [
        *COMMANDS["test"], "src/lib/mermaid/__tests__/core.test.ts",
    ]
    assert recorded["kwargs"]["cwd"] == REPO_ROOT
    assert recorded["kwargs"]["shell"] is False
    assert "exit=0" in result


def test_reports_nonzero_exit(monkeypatch, tool):
    def fake_run(argv, **kwargs):
        return subprocess.CompletedProcess(argv, 2, stdout="", stderr="boom")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = tool._run(command="type-check")
    assert "exit=2" in result
    assert "boom" in result
