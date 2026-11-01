"""Scratch: extract visible text, headings, links from rendered HTML in render-home.json."""
import json
import re
from html.parser import HTMLParser

SRC = "d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/render-home.json"

d = json.load(open(SRC, encoding="utf-8"))

print("=== META FROM CRAWL ===")
print("url:", d["url"])
print("status_code:", d["status_code"])
print("is_spa:", d["is_spa"])
print("publication_date:", repr(d["publication_date"]))
print("redirect_chain:", d["redirect_chain"])
print("structured_data:", d["structured_data"])
print("render_engine:", d["render_engine"], "render_ms:", d["render_ms"])
print()
print("=== EXTRACTED_TEXT (trafilatura) ===")
print(d["extracted_text"])
print()
print("=== CONSOLE ERRORS (first 5) ===")
for e in d.get("console_errors", [])[:5]:
    print("-", str(e)[:200])
print()


class DomText(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.headings = []       # (tag, text)
        self.links = []          # (href, text)
        self.paragraphs = []     # block-ish text chunks
        self._cur_heading = None
        self._cur_href = None
        self._cur_link_text = []
        self._blocks = []        # accumulating text per block element
        self.block_tags = {"p", "li", "div", "section", "article", "h1", "h2",
                           "h3", "h4", "h5", "h6", "button", "span", "td", "th",
                           "footer", "header", "nav", "main", "a", "label", "summary",
                           "figcaption", "blockquote", "pre", "code"}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.SKIP:
            self.skip_depth += 1
            return
        if re.match(r"^h[1-6]$", tag):
            self._cur_heading = (tag, [])
        if tag == "a":
            self._cur_href = a.get("href")
            self._cur_link_text = []
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "button"):
            self._blocks.append([])

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if re.match(r"^h[1-6]$", tag) and self._cur_heading:
            t = " ".join("".join(self._cur_heading[1]).split())
            if t:
                self.headings.append((self._cur_heading[0], t))
            self._cur_heading = None
        if tag == "a" and self._cur_href is not None:
            t = " ".join("".join(self._cur_link_text).split())
            self.links.append((self._cur_href, t))
            self._cur_href = None
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "button"):
            if self._blocks:
                t = " ".join("".join(self._blocks.pop()).split())
                if t:
                    self.paragraphs.append((tag, t))

    def handle_data(self, data):
        if self.skip_depth:
            return
        if self._cur_heading is not None:
            self._cur_heading[1].append(data)
        if self._cur_href is not None:
            self._cur_link_text.append(data)
        if self._blocks:
            self._blocks[-1].append(data)


p = DomText()
p.feed(d["content"])

print("=== HEADINGS (rendered DOM) ===")
for tag, t in p.headings:
    print(f"{tag}: {t!r}")
print()
print("=== LINKS (rendered DOM: href | text) ===")
for href, t in p.links:
    print(f"{href} | {t!r}")
print()
print("=== BLOCK TEXT CHUNKS (p/li/h*/button, in order) ===")
for tag, t in p.paragraphs:
    print(f"[{tag}] {t}")
print()

# Full visible text (everything not in skip tags), for word count + readability
class AllText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.out = []
        self.SKIP = set(DomText.SKIP)

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.out.append(data.strip())


at = AllText()
at.feed(d["content"])
full_text = "\n".join(at.out)
open("d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/visible-text.txt", "w",
     encoding="utf-8").write(full_text)
words = re.findall(r"[A-Za-zÀ-ɏ']+", full_text)
print("=== FULL VISIBLE TEXT STATS ===")
print("chars:", len(full_text), "| word tokens (alpha):", len(words))
print("---- FULL VISIBLE TEXT ----")
print(full_text)
