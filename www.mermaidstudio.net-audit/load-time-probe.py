"""Real-Chromium load-timeline probe for https://www.mermaidstudio.net/.

Instrument: Playwright (local Chromium, UNTHROTTLED CPU/network).
Produces: navigation timings, paint entries, LCP element + time, CLS + sources,
long tasks, event-timing interaction probe, per-resource transfer sizes,
stylesheet/font request census, cold + SW-warm repeat load.

Run: claude-seo run load-time-probe.py
"""

import json
import sys
from playwright.sync_api import sync_playwright

URL = "https://www.mermaidstudio.net/"

OBSERVERS = """
window.__lt = { longtasks: [], events: [], shifts: [], shiftSources: [] };
new PerformanceObserver(l => { for (const e of l.getEntries())
  window.__lt.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }); })
  .observe({ type: 'longtask', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries())
  window.__lt.events.push({ name: e.name, start: Math.round(e.startTime), procEnd: Math.round(e.processingEnd) }); })
  .observe({ type: 'event', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) {
  if (!e.hadRecentInput) {
    window.__lt.shifts.push({ t: Math.round(e.startTime), v: e.value });
    for (const s of (e.sources || [])) {
      try {
        window.__lt.shiftSources.push({ t: Math.round(e.startTime),
          node: s.node ? (s.node.nodeName + (s.node.id ? '#' + s.node.id : '') + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '')) : '?',
          prev: s.previousRect ? [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height] : null,
          curr: s.currentRect ? [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height] : null });
      } catch (err) {}
    }
  }
} }).observe({ type: 'layout-shift', buffered: true });
"""

COLLECT = """
() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paints = performance.getEntriesByType('paint');
  const lcpAll = performance.getEntriesByType('largest-contentful-paint') || [];
  const lcp = lcpAll.length ? lcpAll[lcpAll.length - 1] : null;
  let lcpEl = null;
  if (lcp && lcp.element) {
    lcpEl = {
      tag: lcp.element.tagName,
      id: lcp.element.id || undefined,
      cls: typeof lcp.element.className === 'string' ? lcp.element.className.slice(0, 80) : undefined,
      text: (lcp.element.textContent || '').trim().slice(0, 80),
      size: lcp.size,
      loadTime: lcp.loadTime, renderTime: lcp.renderTime, startTime: lcp.startTime, url: lcp.url || undefined,
    };
  }
  const fcp = paints.find(p => p.name === 'first-contentful-paint');
  const res = performance.getEntriesByType('resource').map(e => ({
    name: e.name, type: e.initiatorType,
    start: Math.round(e.startTime), end: Math.round(e.responseEnd),
    transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize,
  }));
  const asset = res.filter(r => r.name.includes('/assets/'));
  const gcss = res.filter(r => r.name.includes('fonts.googleapis.com'));
  const gfont = res.filter(r => r.name.includes('fonts.gstatic.com'));
  const domNodes = document.getElementsByTagName('*').length;
  return {
    nav: {
      type: nav.type, redirectCount: nav.redirectCount,
      ttfb: Math.round(nav.responseStart),
      dcl: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      docTransfer: nav.transferSize, docEncoded: nav.encodedBodySize,
      proto: nav.nextHopProtocol,
    },
    fcp: fcp ? Math.round(fcp.startTime) : null,
    lcp: lcpEl,
    lcpCount: lcpAll.length,
    clsTotal: Math.round((window.__lt.shifts.reduce((a, s) => a + s.v, 0)) * 10000) / 10000,
    shifts: window.__lt.shifts.slice(0, 10),
    shiftSources: window.__lt.shiftSources.slice(0, 10),
    longtasks: window.__lt.longtasks,
    longtaskTotal: Math.round(window.__lt.longtasks.reduce((a, t) => a + t.dur, 0)),
    eventsCount: window.__lt.events.length,
    resources: { asset, googleCss: gcss, googleFontFiles: gfont, total: res.length },
    totals: {
      jsTransfer: res.filter(r => r.name.endsWith('.js')).reduce((a, r) => a + r.transfer, 0),
      cssTransfer: res.filter(r => r.name.endsWith('.css')).reduce((a, r) => a + r.transfer, 0),
      fontTransfer: gfont.reduce((a, r) => a + r.transfer, 0),
    },
    dom: {
      nodes: domNodes,
      stylesheets: document.styleSheets.length,
      linkStylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      googleFontLinks: [...document.querySelectorAll('link[href*="fonts.googleapis"]')].map(l => l.href),
      modulePreloads: document.querySelectorAll('link[rel="modulepreload"]').length,
    },
  };
}
"""


def click_probe(page, data):
    """Directional interaction latency: real click, event-start -> next paint."""
    try:
        sel = page.query_selector(".cm-content") or page.query_selector("body")
        before = page.evaluate("() => performance.getEntriesByType('event').length")
        sel.click(timeout=5000)
        page.evaluate(
            "() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))"
        )
        ev = page.evaluate(
            """
            (before) => {
              const all = performance.getEntriesByType('event');
              const newOnes = all.slice(before).map(e => ({
                name: e.name, start: Math.round(e.startTime),
                processingDur: Math.round(e.processingEnd - e.startTime),
              }));
              return { newOnes, now: Math.round(performance.now()) };
            }""",
            before,
        )
        if ev["newOnes"]:
            last = ev["newOnes"][-1]
            data["interaction_probe"] = {
                "note": "lab approximation, unthrottled; INP-like = event start -> next paint after handlers",
                "event": last["name"],
                "inp_like_ms": ev["now"] - last["start"],
                "handler_ms": last["processingDur"],
            }
    except Exception as exc:
        data["interaction_probe"] = {"error": str(exc)[:200]}


def run_pass(page, label, wait_ms):
    rows = []
    page.on("response", lambda r: rows.append({"url": r.url, "status": r.status}))
    page.goto(URL, wait_until="load", timeout=45000)
    page.wait_for_timeout(wait_ms)
    data = page.evaluate(COLLECT)
    data["pass"] = label
    data["http_requests"] = len(rows)
    data["http_non200"] = [r for r in rows if r["status"] >= 400]
    return data


def main():
    out = {"target": URL, "instrument": "Playwright local Chromium (unthrottled)", "date": "2026-10-29"}
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Pass 1: desktop cold
        ctx = browser.new_context(viewport={"width": 1350, "height": 900})
        page = ctx.new_page()
        page.add_init_script(OBSERVERS)
        d = run_pass(page, "desktop-cold-load1", 9000)
        click_probe(page, d)
        out["desktop_cold"] = d
        # Pass 2: SW-warm reload in the SAME context (SW registered during load 1)
        d2 = run_pass(page, "desktop-warm-reload-sw", 6000)
        click_probe(page, d2)
        out["desktop_warm"] = d2
        ctx.close()

        # Pass 3: mobile-emulated viewport/UA (still unthrottled — structure only)
        mctx = browser.new_context(
            viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
            user_agent=("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"),
        )
        mpage = mctx.new_page()
        mpage.add_init_script(OBSERVERS)
        dm = run_pass(mpage, "mobile-emulated-unthrottled", 9000)
        click_probe(mpage, dm)
        out["mobile_emulated"] = dm
        mctx.close()
        browser.close()

    with open("load-time-probe-result.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    for key in ("desktop_cold", "desktop_warm", "mobile_emulated"):
        d = out[key]
        lt = d.get("lcp") or {}
        print(f"== {key} ==")
        print(f"  nav: redirects={d['nav']['redirectCount']} ttfb={d['nav']['ttfb']}ms "
              f"DCL={d['nav']['dcl']}ms load={d['nav']['load']}ms proto={d['nav']['proto']}")
        print(f"  FCP={d['fcp']}ms  LCP={round(lt.get('startTime', 0))}ms  el={lt.get('tag')}.{str(lt.get('cls', ''))[:40]!r} "
              f"text={str(lt.get('text', ''))[:40]!r}")
        print(f"  CLS={d['clsTotal']} longtasks={len(d['longtasks'])} (sum {d['longtaskTotal']}ms) "
              f"reqs={d['http_requests']} DOMnodes={d['dom']['nodes']}")
        print(f"  linkStylesheets={d['dom']['linkStylesheets']} googleFontLinks={len(d['dom']['googleFontLinks'])} "
              f"modulePreloads={d['dom']['modulePreloads']}")
        js_mb = d["totals"]["jsTransfer"] / 1048576
        print(f"  JS transfer={js_mb:.2f}MiB cssTransfer={d['totals']['cssTransfer'] / 1024:.0f}KiB "
              f"fontTransfer={d['totals']['fontTransfer'] / 1024:.0f}KiB assetEntries={len(d['resources']['asset'])}")
        print(f"  interaction={d.get('interaction_probe')}")
    print("WROTE load-time-probe-result.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
