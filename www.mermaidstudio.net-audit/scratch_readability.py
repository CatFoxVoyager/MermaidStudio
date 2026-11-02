"""Scratch: readability metrics (Flesch) on site copy candidates."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee", "ye")):
        n -= 1
    return max(1, n)


def metrics(name: str, text: str):
    # strip markdown emphasis, split sentences on . ! ? (em dash treated as clause, not sentence)
    clean = re.sub(r"[*_#`]", "", text)
    sentences = [s for s in re.split(r"[.!?]+(?:\s|$)", clean) if len(s.split()) > 2]
    words = re.findall(r"[A-Za-zÀ-ɏ']+", clean)
    if not words:
        print(name, "no words")
        return
    syl = sum(syllables(w) for w in words)
    asl = len(words) / max(1, len(sentences))
    asw = syl / len(words)
    fre = 206.835 - 1.015 * asl - 84.6 * asw
    fkgl = 0.39 * asl + 11.8 * asw - 15.59
    poly = sum(1 for w in words if syllables(w) >= 3)
    print(f"--- {name} ---")
    print(f"words={len(words)} sentences={len(sentences)}")
    print(f"avg sentence len={asl:.1f} avg syllables/word={asw:.2f}")
    print(f"Flesch Reading Ease={fre:.1f}  Flesch-Kincaid grade={fkgl:.1f}  polysyllables={poly}")


# (a) Rendered visible text (app UI)
rendered = open("d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/visible-text.txt", encoding="utf-8").read()
metrics("A. RENDERED visible text (app UI labels)", rendered)

# (b) Deleted crawlable shell prose (git d169dbf^) - prose only
shell = """MermaidStudio — Free & Open-Source Mermaid Diagram Editor
Draw flowcharts, sequence diagrams, class diagrams, Gantt charts and mind maps directly in your browser — with a drag-and-drop visual editor, folders and version history, and an AI assistant that runs locally on your GPU. No account, no server: everything stays on your device.
A free online Mermaid diagram editor — an open-source alternative to the Mermaid Live Editor
Unlike cloud editors, MermaidStudio runs entirely on your machine: the editor works online in any modern browser with zero signup, keeps your diagrams private by default, and adds local version checkpoints you can diff and restore.
In-browser AI (WebGPU) — generate and fix diagrams with a local LLM; your code never leaves the machine.
Visual editor — drag-and-drop nodes and edges over the live Mermaid preview.
Organize — multi-tab workspace with folders, tags and full version history.
Export & themes — SVG/PNG export with custom styling.
Private by design — open source (MIT), no account, no telemetry, works offline (PWA), English and French.
Free & open source (MIT) · Runs entirely in your browser — even the AI · GitHub · Ko-Fi · Liberapay"""
metrics("B. DELETED shell prose (git d169dbf^)", shell)

# (c) Modal-trapped prose (welcome + about)
modal = """Welcome to MermaidStudio
A fast, fully client-side editor for Mermaid diagrams. Your diagrams, settings, and AI models stay in your browser — nothing is sent to a server.
In-browser AI — generate and fix diagrams with a local LLM running on your GPU. Your code never leaves your machine.
Visual editor — drag and drop nodes over the live preview, with folders, tags and version history.
Free & private — open source (MIT), no account, no telemetry, works offline.
About MermaidStudio
MermaidStudio was born out of frustration with online diagram editors: drawing a diagram shouldn't require an account, a subscription, or sending your work to someone else's server.
The app runs entirely in your browser — diagrams and settings stay on your device (local storage), and even the AI assistant runs locally via WebGPU. Free, open source, no tracking.
MIT License — © 2026 MermaidStudio"""
metrics("C. MODAL-trapped prose (welcome+about, en.json)", modal)

# (d) noscript - the ONLY prose non-JS crawlers see
noscript = "MermaidStudio is a browser-based Mermaid diagram editor and needs JavaScript to run. Source code and documentation live on GitHub."
metrics("D. NOSCRIPT (only prose visible to non-JS crawlers)", noscript)
