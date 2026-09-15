#!/usr/bin/env python
"""Entry point for the MermaidStudio dev crew.

The default mission is a read-only audit (smoke test): it validates the
OpenAI wiring and the toolset end to end without touching any code.
Override it with the CREW_MISSION environment variable.
"""

import os
import sys
import warnings

from datetime import datetime

from crew.crew import MermaidStudioCrew, REPO_ROOT

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

DEFAULT_MISSION = (
    "AUDIT LECTURE SEULE — n'améliore rien et ne modifie aucun fichier hors du "
    "dossier crew/ : analyse le dépôt MermaidStudio et produis un rapport des 5 "
    "corrections ou améliorations prioritaires (bugs, dettes techniques, "
    "risques), chacune avec les chemins de fichiers réels concernés et une "
    "proposition de vérification."
)


def _inputs() -> dict:
    return {
        "mission": os.environ.get("CREW_MISSION", DEFAULT_MISSION),
        "repo_root": REPO_ROOT,
        "current_year": str(datetime.now().year),
    }


def run():
    """Run the crew."""
    try:
        result = MermaidStudioCrew().crew().kickoff(inputs=_inputs())
        print("\n=== CREW RESULT ===\n")
        print(result.raw if hasattr(result, "raw") else result)
        print("\nReport written to crew/reports/rapport.md")
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}") from e


def train():
    """Train the crew for a given number of iterations."""
    try:
        MermaidStudioCrew().crew().train(
            n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=_inputs()
        )
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}") from e


def replay():
    """Replay the crew execution from a specific task."""
    try:
        MermaidStudioCrew().crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}") from e


def test():
    """Test the crew execution and returns the results."""
    try:
        MermaidStudioCrew().crew().test(
            n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=_inputs()
        )
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}") from e
