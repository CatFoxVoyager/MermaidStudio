#!/usr/bin/env node
/**
 * Post-build guard (33-01, REL-03): package.json `version` must EQUAL the
 * latest strict-semver vX.Y.Z tag reachable in this checkout.
 *
 * Under the release-please Release-PR flow (phase 33's locked decision),
 * package.json only changes inside a Release PR, whose merge atomically
 * creates the matching tag — so equality holds at every main commit, and
 * ANY inequality is genuine drift: a manual bump, a deleted tag, or a
 * failed tagging run. This guard turns that drift into a red build with a
 * named message instead of a silent version lie.
 *
 * Ground truth is GIT TAGS only — never release bookkeeping manifest state,
 * which records the release tool's own bookkeeping, not what is actually
 * tagged. Legacy two-segment tags (v1.3, v0.2, ...) are filtered out so
 * they can never win the latest-tag comparison.
 *
 * A stale local clone (fresh mirrors, partial CI caches) is witnessed
 * against origin: when origin carries refs/tags/v{pkg} but the local tag
 * list does not, the local tag list is what lags — the guard passes with a
 * `git fetch --tags` hint instead of a false red. An empty strict-tag list
 * fails closed with the seed instruction (a silent pass would hide drift
 * end-to-end: build -> docker -> deploy).
 *
 * Every git invocation is the spawn-with-args form (execFileSync with an
 * args array) — never a shell-interpolated command string, so tag names can
 * never be reinterpreted as shell syntax.
 *
 * Run as npm script `check:version-tag`; wired as a blocking ci.yml
 * build-job step whose checkout carries fetch-depth: 0 so the tag universe
 * exists (default depth-1 clones carry no tags).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHECK = 'check-version-tag';

function fail(message) {
  console.error(`\n[${CHECK}] FAILED: ${message}`);
  console.error(`[${CHECK}] Fix: version bumps must land via the release-please Release PR —`);
  console.error(`[${CHECK}] merge it, or investigate a deleted/moved tag. A manual package.json`);
  console.error(`[${CHECK}] bump is exactly the drift class this guard exists to catch.\n`);
  process.exit(1);
}

// (1) Read package.json from the working directory — fail closed on a
// missing or malformed read, never a silent pass.
let pkgVersion;
try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkgVersion = pkg.version;
} catch (err) {
  console.error(
    `\n[${CHECK}] FAILED: could not read a package.json version from ${process.cwd()} (${err.message})`,
  );
  console.error(`[${CHECK}] Fix: run this guard from the repo root (npm script check:version-tag).\n`);
  process.exit(1);
}
if (typeof pkgVersion !== 'string' || pkgVersion.length === 0) {
  fail(`package.json has no usable "version" field (got: ${JSON.stringify(pkgVersion)})`);
}

// (2) List v* tags, newest-first by version sort. Args-array spawn only —
// never a shell command string.
let tagOutput;
try {
  tagOutput = execFileSync('git', ['tag', '-l', 'v*', '--sort=-v:refname'], { encoding: 'utf8' });
} catch (err) {
  fail(`git tag -l failed: ${err.message}`);
}
const tags = tagOutput
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);
// Strict three-segment filter: legacy two-segment tags (v1.3, v0.2, ...)
// must never win the "latest tag" comparison.
const semverTags = tags.filter((t) => /^v\d+\.\d+\.\d+$/.test(t));

// (3) No strict vX.Y.Z tag at all -> fail closed with the seed instruction.
if (semverTags.length === 0) {
  console.error(
    `\n[${CHECK}] FAILED: no vX.Y.Z tag found in this checkout (raw v* tags: ${tags.length > 0 ? tags.join(', ') : 'none'}).`,
  );
  console.error(`[${CHECK}] Fix: seed the bootstrap tag on the release commit, then push it:`);
  console.error(`[${CHECK}]   git tag -a v${pkgVersion} <release-commit> && git push origin v${pkgVersion}\n`);
  process.exit(1);
}

// (4) Equality — the REL-03 contract.
const latestTag = semverTags[0];
const latest = latestTag.slice(1);
if (pkgVersion === latest) {
  console.log(`[${CHECK}] OK: package.json ${pkgVersion} == latest tag ${latestTag}`);
  process.exit(0);
}

// (5) Drift -> origin-witness fallback: a local clone can legitimately lag
// origin. If origin carries the exact tag v{pkg}, the local tag list is
// what is stale — pass with a fetch hint, never a false red.
let witness = null;
try {
  const remote = execFileSync('git', ['ls-remote', 'origin', `refs/tags/v${pkgVersion}`], {
    encoding: 'utf8',
  });
  if (remote.trim().length > 0) witness = remote.trim();
} catch {
  // Missing origin or offline: no witness available — noted, never fatal;
  // fall through to the drift verdict.
}
if (witness) {
  const refCount = witness.split('\n').length;
  console.log(
    `[${CHECK}] OK (stale local clone): local tag list ends at ${latestTag} but origin carries refs/tags/v${pkgVersion} (${refCount} ref). Run: git fetch --tags`,
  );
  process.exit(0);
}

fail(`VERSION DRIFT: package.json "${pkgVersion}" != latest tag "${latestTag}".`);
