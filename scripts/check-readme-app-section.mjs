#!/usr/bin/env node
/**
 * Phase 35 fs gate (GH-01/GH-02): the public README's `## 📱 Android App`
 * section must keep every invariant the phase pinned, or the build goes red
 * with a named dimension instead of drifting silently.
 *
 * Dimension map (35-VALIDATION.md / 35-RESEARCH.md § Validation Architecture):
 *   D1 — badge composite: official badge, linked to the listing, byte-pinned
 *        line (byte-equality on the whole line IS the natural-size assertion:
 *        the pinned line carries no width attribute, so any width insertion
 *        breaks the pin)
 *   D2 — badge asset integrity: docs/images copy is a real 646x250 PNG and
 *        sha256-identical to the committed phase-34 asset
 *   D3 — top block byte-pin: README lines 1-24 (title, shields, demo line,
 *        intro, screenshot embed) untouched
 *   D4 — trademark attribution byte-exact + banned copy absent file-wide
 *   D5 — screenshot strip: targets derived BY PARSING the strip markup out of
 *        the README (never a hardcoded list), each a real portrait PNG within
 *        size bounds; reports its own `awaiting captures` state so the
 *        pre-checkpoint red is diagnosable (Pitfall 7)
 *   D6 — parity honesty: the AI row is byte-pinned web-only, grounded in
 *        D:/code/mermaidstudio-app/PRODUCT.md:41
 *   D7 — placement: section sits between the intro screenshot embed and
 *        `## ✨ Features`
 *
 * Assertions run fail-fast in the order D3 → D7 → D1 → D2 → D4 → D6 → D5:
 * the strip assertion is LAST so that, before the user's Play Store captures
 * land (blocking-human checkpoint), the only possible failure is D5's
 * awaiting-captures message.
 *
 * EOL policy: this repo commits LF (`.gitattributes` `* text=auto`) but a
 * Windows checkout materializes README.md as CRLF. The gate normalizes
 * CRLF → LF at read time so the byte pins assert CONTENT on both a Windows
 * tree and the Linux CI checkout — an EOL flip is git-config noise, not
 * content drift.
 *
 * Failure contract: every failure path prints EXACTLY ONE line containing
 * `FAILED:` and exits 1 (fail-closed reads name process.cwd()). `fail()`
 * throws GateFailure; the --self-test mode catches those to prove every
 * assertion group can actually fire (a gate that cannot fail proves
 * nothing). Run as `check:readme-app-section`; wired as blocking ci.yml
 * build-job steps alongside the other check:* guards.
 */
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  copyFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHECK = 'check-readme-app-section';

class GateFailure extends Error {}

function fail(message) {
  throw new GateFailure(message);
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// [D3] Embedded pin: README lines 1-24 (EOL-normalized) as of the Task-1
// insertion edit. Captured from the live tree at gate-write time; a superset
// of the GH-01 shields-row floor (lines 3-10).
const EXPECTED_TOP =
  '# MermaidStudio ⚜️\n\n[![Version](https://img.shields.io/github/package-json/v/CatFoxVoyager/MermaidStudio?label=version&color=blue)](https://github.com/CatFoxVoyager/MermaidStudio/releases)\n[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)\n[![TypeScript](https://img.shields.io/badge/typescript-6.0.3-blue.svg)](https://www.typescriptlang.org/)\n[![Vite](https://img.shields.io/badge/vite-8.3.0-green.svg)](https://vitejs.dev/)\n[![Tailwind CSS](https://img.shields.io/badge/tailwind-4.3.3-cyan.svg)](https://tailwindcss.com/)\n[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)\n[![Ko-Fi](https://img.shields.io/badge/Ko--Fi-Support%20Me-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/jeremie93407)\n[![Liberapay](https://img.shields.io/badge/Liberapay-Donate-F6C915?logo=liberapay&logoColor=white)](https://liberapay.com/Jeremie/)\n\n**🚀 Try the demo: [https://www.mermaidstudio.net/](https://www.mermaidstudio.net/)**\n\n## 🎯 Open-Source Alternative to Mermaid Live Editor\n\nCreated by [Jérémie Dufault](https://jeremiedufault.ca)\n\nMermaidStudio is an open-source, self-hosted Mermaid diagram editor that runs entirely locally. Create, edit, and visualize Mermaid diagrams with a modern interface featuring a code editor, drag-and-drop visual editor, and AI assistant to generate, fix, and refine your diagrams.\n\n**Recommended as a free, self-contained alternative to the official Mermaid Live Editor.**\n\n---\n\n[![MermaidStudio Screenshot](./docs/images/screenshot.png)](./docs/images/screenshot.png)';

// [D1] Byte-pinned composite badge line: alt + repo-local path + href on ONE
// markdown element, no width attribute anywhere (natural size 646x250).
const EXPECTED_BADGE_LINE =
  '[![Get it on Google Play](./docs/images/google-play-badge-en.png)](https://play.google.com/store/apps/details?id=com.mermaidstudio.net)';

// [D4] Google brand rules: the attribution sentence is exact (no ™ symbol),
// availability phrasing is "on Google Play" — never the preposition-swapped
// form; "coming soon" is the retired false copy the promo milestone removed;
// the FR badge exists only for the site's language-switched card, never the
// EN README.
const ATTRIBUTION = 'Google Play and the Google Play logo are trademarks of Google LLC.';
const BANNED = [
  ['preposition-swapped phrasing ("from Google Play")', 'from Google Play'],
  ['retired false-copy phrase ("coming soon")', 'coming soon'],
  ['FR badge filename token ("google-play-badge-fr")', 'google-play-badge-fr'],
];

// [D6] Honesty anchor, grounded verbatim in the app repo: PRODUCT.md:41 —
// "The native Android build currently gates out AI entry points; AI is not
// part of the Android v1 product path."
const EXPECTED_AI_ROW =
  '| AI assistant (WebGPU, in-browser) | ❌ Web-only — not in the Android v1 build | ✅ |';
const PARITY_HEADER = '| Capability | Android app | Web |';

const ALT_PREFIX = 'MermaidStudio Android app — ';
const EXPECTED_STRIP_SRCS = [
  './docs/images/app-1.png',
  './docs/images/app-2.png',
  './docs/images/app-3.png',
];
// [D5] Targets are derived from the strip markup with THIS regex — the exact
// markup shape the README pins (attribute order and spacing included), so a
// renamed/moved/retargeted capture can never pass behind the gate's back.
const STRIP_RE = /<img src="(\.\/docs\/images\/app-[^"]+)" alt="([^"]*)" width="220" \/>/g;
const SIZE_FLOOR = 10_000;
const SIZE_CAP = 8_000_000;
const WIDTH_FLOOR = 320;

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function readBinary(p) {
  try {
    return readFileSync(p);
  } catch (err) {
    fail(`could not read ${p} from ${process.cwd()} (${err.message})`);
  }
}

function isPng(buf) {
  return buf.length >= 8 && PNG_SIG.equals(buf.subarray(0, 8));
}

function runBattery() {
  const readme = readBinary('README.md').toString('utf8').replace(/\r\n/g, '\n');
  const LINES = readme.split('\n');

  // [D3] top block byte-pin
  if (LINES.slice(0, 24).join('\n') !== EXPECTED_TOP) {
    fail('[D3] top block (README lines 1-24) drifted');
  }

  // [D7] placement: embed < heading < features
  const embedIdx = readme.indexOf('./docs/images/screenshot.png');
  const headingIdx = readme.indexOf('## 📱 Android App');
  const featuresIdx = readme.indexOf('## ✨ Features');
  if (
    embedIdx === -1 ||
    headingIdx === -1 ||
    featuresIdx === -1 ||
    !(embedIdx < headingIdx && headingIdx < featuresIdx)
  ) {
    fail('[D7] app section missing or misplaced');
  }

  // [D1] badge composite — inside the section, byte-pinned
  if (!readme.includes(EXPECTED_BADGE_LINE) || readme.indexOf(EXPECTED_BADGE_LINE) <= headingIdx) {
    fail('[D1] badge markup missing, unlinked, or outside the section');
  }

  // [D2] badge asset integrity: real PNG, 646x250, sha256-identical to the
  // committed phase-34 asset (never re-encoded, recolored, or resized).
  const docsBadge = readBinary('docs/images/google-play-badge-en.png');
  const srcBadge = readBinary('public/badges/google-play-badge-en.png');
  if (!isPng(docsBadge)) fail('[D2] badge asset integrity: docs/images copy is not a PNG');
  if (!isPng(srcBadge)) fail('[D2] badge asset integrity: public/badges original is not a PNG');
  const badgeW = docsBadge.readUInt32BE(16);
  const badgeH = docsBadge.readUInt32BE(20);
  if (badgeW !== 646 || badgeH !== 250) {
    fail(`[D2] badge asset integrity: IHDR ${badgeW}x${badgeH}, expected 646x250`);
  }
  if (sha256(docsBadge) !== sha256(srcBadge)) {
    fail(
      '[D2] badge asset integrity: sha256 mismatch — docs/images copy is not byte-identical to the committed phase-34 asset',
    );
  }

  // [D4] attribution byte-exact + banned copy absent file-wide
  if (!readme.includes(ATTRIBUTION)) fail('[D4] attribution line missing or altered');
  for (const [label, literal] of BANNED) {
    if (readme.includes(literal)) fail(`[D4] banned copy present: ${label}`);
  }

  // [D6] parity honesty: AI row byte-pinned web-only
  if (!LINES.some((l) => l === EXPECTED_AI_ROW)) fail('[D6] parity AI row drifted');
  if (!LINES.some((l) => l === PARITY_HEADER)) fail('[D6] parity table missing');

  // [D5] screenshot strip — LAST so the pre-checkpoint red is exactly the
  // awaiting-captures failure and nothing else.
  const stripMatches = [...readme.matchAll(STRIP_RE)];
  if (stripMatches.length !== 3) {
    fail(`[D5] strip must reference exactly 3 captures, found ${stripMatches.length}`);
  }
  const srcs = stripMatches.map((m) => m[1]);
  if (JSON.stringify(srcs) !== JSON.stringify(EXPECTED_STRIP_SRCS)) {
    fail(`[D5] strip src drift: ${srcs.join(', ') || '(none)'}`);
  }
  for (const m of stripMatches) {
    const alt = m[2];
    if (!alt.startsWith(ALT_PREFIX) || alt.slice(ALT_PREFIX.length).trim().length === 0) {
      fail(
        `[D5] alt text for ${m[1]} must carry the pinned prefix "${ALT_PREFIX}" and a non-empty remainder (got: "${alt}")`,
      );
    }
  }
  const targets = stripMatches.map((m) => m[1].replace(/^\.\//, ''));
  const present = targets.filter((p) => {
    try {
      readFileSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (present.length !== targets.length) {
    fail(
      `[D5] awaiting captures: ${targets.length} referenced in README, ${present.length} present under docs/images/ (blocking-human checkpoint pending)`,
    );
  }
  for (const p of targets) {
    const buf = readBinary(p);
    if (!isPng(buf) || buf.length < 24) fail(`[D5] ${p}: not a PNG`);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w < WIDTH_FLOOR || h <= w) {
      fail(`[D5] ${p}: dims ${w}x${h} below floor (need width >= ${WIDTH_FLOOR}, portrait)`);
    }
    if (buf.length < SIZE_FLOOR) {
      fail(`[D5] ${p}: trivially small (${buf.length} bytes, floor ${SIZE_FLOOR})`);
    }
    if (buf.length > SIZE_CAP) {
      fail(`[D5] ${p}: oversized (${buf.length} bytes, cap ${SIZE_CAP})`);
    }
  }
}

// --- --self-test: RED proofs ------------------------------------------------
// Builds a temp tree mirroring the gate's relative read layout, runs the
// battery once on the pristine copy (it MUST be green — otherwise every RED
// proof below would be vacuous), then applies ten mutations one at a time on
// fresh copies, expecting the battery to fire the NAMED dimension each time.

function syntheticPortraitPng() {
  // Signature + IHDR (width 400, height 800 at offsets 16-19/20-23), zero
  // padding to 12,000 bytes so the size floor passes — the probe reads
  // offsets 0-23 only.
  const buf = Buffer.alloc(12_000, 0);
  PNG_SIG.copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'latin1');
  buf.writeUInt32BE(400, 16);
  buf.writeUInt32BE(800, 20);
  return buf;
}

function buildTempTree() {
  const dir = mkdtempSync(path.join(tmpdir(), 'readme-app-gate-selftest-'));
  mkdirSync(path.join(dir, 'docs', 'images'), { recursive: true });
  mkdirSync(path.join(dir, 'public', 'badges'), { recursive: true });
  copyFileSync('README.md', path.join(dir, 'README.md'));
  copyFileSync(
    'docs/images/google-play-badge-en.png',
    path.join(dir, 'docs', 'images', 'google-play-badge-en.png'),
  );
  copyFileSync(
    'public/badges/google-play-badge-en.png',
    path.join(dir, 'public', 'badges', 'google-play-badge-en.png'),
  );
  for (const n of [1, 2, 3]) {
    writeFileSync(path.join(dir, 'docs', 'images', `app-${n}.png`), syntheticPortraitPng());
  }
  return dir;
}

function editReadme(dir, fn) {
  const p = path.join(dir, 'README.md');
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
}

const MUTATIONS = [
  {
    n: 'M1',
    dim: 'D3',
    apply: (d) =>
      editReadme(d, (t) => t.replace('License-MIT-yellow.svg', 'License-MIT-yellov.svg')),
  },
  {
    n: 'M2',
    dim: 'D7',
    apply: (d) => editReadme(d, (t) => t.replace(/## 📱 Android App\r?\n/, '')),
  },
  {
    n: 'M3',
    dim: 'D1',
    apply: (d) =>
      editReadme(d, (t) =>
        t.replace(
          EXPECTED_BADGE_LINE,
          '[![Get it on Google Play](./docs/images/google-play-badge-en.png)]',
        ),
      ),
  },
  {
    n: 'M4',
    dim: 'D4',
    apply: (d) =>
      editReadme(d, (t) =>
        t.replace(/\*Google Play and the Google Play logo are trademarks of Google LLC\.\*\r?\n/, ''),
      ),
  },
  {
    n: 'M5',
    dim: 'D2',
    apply: (d) =>
      appendFileSync(path.join(d, 'docs', 'images', 'google-play-badge-en.png'), Buffer.from([0x00])),
  },
  {
    n: 'M6',
    dim: 'D6',
    apply: (d) => editReadme(d, (t) => t.replace(EXPECTED_AI_ROW, EXPECTED_AI_ROW.replace('❌', '✅'))),
  },
  {
    n: 'M7',
    dim: 'D5',
    apply: (d) => {
      const p = path.join(d, 'docs', 'images', 'app-1.png');
      const buf = readFileSync(p);
      buf.write('JUNKJUNK', 0, 8, 'latin1');
      writeFileSync(p, buf);
    },
  },
  {
    n: 'M8',
    dim: 'D5',
    apply: (d) => {
      const p = path.join(d, 'docs', 'images', 'app-2.png');
      writeFileSync(p, readFileSync(p).subarray(0, 100));
    },
  },
  {
    n: 'M9',
    dim: 'D5',
    apply: (d) => {
      const p = path.join(d, 'docs', 'images', 'app-3.png');
      const buf = readFileSync(p);
      buf.writeUInt32BE(200, 16);
      writeFileSync(p, buf);
    },
  },
  {
    n: 'M10',
    dim: 'D4',
    apply: (d) =>
      editReadme(d, (t) => {
        // Banned-copy branch proof: swap the bold intro phrase's preposition.
        // The literal is assembled at runtime (five characters `from ` +
        // `Google Play`, same `**` markers) — anchored to the bold form so the
        // badge alt's "on Google Play" is never mutated first (that would fire
        // D1 and mislabel the proof) — and it never enters the committed
        // README bytes: this runs on the temp copy only.
        const swapped = '**' + ['from', 'Google Play'].join(' ') + '**';
        return t.replace('**on Google Play**', swapped);
      }),
  },
];

function runSelfTest() {
  const prevCwd = process.cwd();

  // Baseline sanity: the pristine temp tree must be green, else a "fired"
  // mutation proves nothing (a broken fixture would fire D5 for all ten).
  const base = buildTempTree();
  try {
    process.chdir(base);
    runBattery();
  } catch (err) {
    const why = err instanceof GateFailure ? err.message : err.message;
    console.error(`\n[${CHECK}] FAILED: self-test baseline tree is not green — RED proofs would be vacuous (${why})\n`);
    process.exit(1);
  } finally {
    process.chdir(prevCwd);
    rmSync(base, { recursive: true, force: true });
  }

  for (const mut of MUTATIONS) {
    const dir = buildTempTree();
    let fired = null;
    let crash = null;
    try {
      mut.apply(dir);
      process.chdir(dir);
      runBattery();
    } catch (err) {
      if (err instanceof GateFailure) fired = err.message;
      else crash = err;
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
    if (crash) {
      console.error(`\n[${CHECK}] FAILED: ${mut.n} crashed instead of firing a named dimension (${crash.message})\n`);
      process.exit(1);
    }
    if (fired === null) {
      console.error(`\n[${CHECK}] FAILED: VACUOUS RED PROOF — ${mut.n} did not fire (battery exited 0 on the mutated copy)\n`);
      process.exit(1);
    }
    if (!fired.startsWith(`[${mut.dim}]`)) {
      console.error(`\n[${CHECK}] FAILED: MISLABELED RED PROOF — ${mut.n} fired "${fired}" but expected [${mut.dim}]\n`);
      process.exit(1);
    }
    console.log(`RED proof ${mut.n} (${mut.dim}): fired`);
  }
  console.log(`SELF-TEST OK: 10/10 RED proofs fired`);
}

// --- entry ------------------------------------------------------------------
try {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
  } else {
    runBattery();
    console.log(`[${CHECK}] OK`);
  }
} catch (err) {
  const message =
    err instanceof GateFailure
      ? err.message
      : `unexpected error from ${process.cwd()} (${err && err.message})`;
  console.error(`\n[${CHECK}] FAILED: ${message}\n`);
  process.exit(1);
}
