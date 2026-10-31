import { afterAll, describe, expect, it } from 'vitest';
// Bare 'fs'/'path'/'os'/'child_process' + __dirname: the repo's ambient node
// shims convention (src/__tests__/crawlableShell.test.ts, src/types/
// node-builtin-shims.d.ts). scripts/ sits outside every tsconfig include, so
// this file is executed by vitest's transform, not type-checked by tsc.
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

/**
 * REL-03 guard contract (33-01): scripts/check-version-tag.mjs is spawned
 * (the real script, via process.execPath) against fixture git repos built
 * per test in os.tmpdir() — never inside this repo. The exit contract:
 *
 *   equality          -> exit 0, output names both the version and the tag
 *   drift             -> exit 1, output names BOTH versions (the REL-03
 *                        named-drift requirement)
 *   no tags           -> exit 1, output carries the seed instruction
 *                        including the "git tag -a" command shape (fail
 *                        closed — an empty strict tag list is never a pass)
 *   two-segment tags  -> legacy v1.3-class tags never win the latest-tag
 *                        comparison (strict three-segment filter)
 *   origin witness    -> local clone stale but origin carries the exact
 *                        v{pkg} tag -> exit 0 with a local-clone-stale hint
 *   witness exhausted -> no matching tag anywhere -> exit 1 naming the
 *                        local latest and the package version
 *   missing package.json -> exit 1 with a named message (fail-closed read)
 */
const SCRIPT = resolve(__dirname, '../check-version-tag.mjs');

// Fixture commits and annotated tags run with an isolated identity — the
// host's global git config is never read or mutated.
const IDENTITY_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const fixtureRoots: string[] = [];

function tmpRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-version-tag-'));
  fixtureRoots.push(dir);
  return dir;
}

function git(cwd: string, args: string[]): void {
  const res = spawnSync('git', args, { cwd, env: IDENTITY_ENV, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (${res.status}): ${res.stderr}`);
  }
}

function writePkg(dir: string, version: string): void {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version }));
}

/** Fixture repo: git init -b main, one empty commit, annotated tags, optional package.json. */
function fixtureRepo(tags: string[], pkgVersion?: string): string {
  const dir = tmpRoot();
  git(dir, ['init', '-b', 'main']);
  git(dir, ['commit', '--allow-empty', '-m', 'fixture release commit']);
  for (const tag of tags) {
    git(dir, ['tag', '-a', tag, '-m', `fixture tag ${tag}`]);
  }
  if (pkgVersion !== undefined) writePkg(dir, pkgVersion);
  return dir;
}

/**
 * The stale-clone family: a base repo carrying strict tags, cloned --bare to
 * an "origin" sibling, then a work clone whose LOCAL copy of the newest tag
 * is deleted (the local clone is stale; origin still carries the tag).
 */
function staleCloneFixture(): { work: string } {
  const base = fixtureRepo(['v1.0.0', 'v2.0.0']);
  const originPath = tmpRoot();
  git(base, ['clone', '--bare', base, originPath]);
  const work = tmpRoot();
  git(base, ['clone', originPath, work]);
  git(work, ['tag', '-d', 'v2.0.0']);
  return { work };
}

function runGuard(cwd: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [SCRIPT], { cwd, env: { ...process.env }, encoding: 'utf8' });
}

describe('check-version-tag guard (REL-03)', { timeout: 20_000 }, () => {
  afterAll(() => {
    for (const dir of fixtureRoots.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('equality: package.json version == latest strict tag -> exit 0 naming both', () => {
    const dir = fixtureRepo(['v1.2.3'], '1.2.3');
    const res = runGuard(dir);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(0);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('1.2.3');
    expect(out).toContain('v1.2.3');
  });

  it('drift: package.json version != latest strict tag -> exit 1 naming BOTH versions', () => {
    const dir = fixtureRepo(['v1.2.3'], '1.3.0');
    const res = runGuard(dir);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(1);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('1.3.0');
    expect(out).toContain('v1.2.3');
  });

  it('no tags: exit 1 with the seed instruction (git tag -a command shape)', () => {
    const dir = tmpRoot();
    git(dir, ['init', '-b', 'main']);
    git(dir, ['commit', '--allow-empty', '-m', 'fixture release commit']);
    writePkg(dir, '1.0.0');
    const res = runGuard(dir);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(1);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('git tag -a');
  });

  it('two-segment exclusion: v1.3 never wins — 0.6.0 green, 9.9.9 drift names v0.6.0 only', () => {
    // Equality side: with tags [v1.3, v0.6.0], pkg 0.6.0 is green — the
    // legacy two-segment v1.3 must NOT win the latest-tag sort.
    const green = runGuard(fixtureRepo(['v1.3', 'v0.6.0'], '0.6.0'));
    expect(green.status, `stdout: ${green.stdout}\nstderr: ${green.stderr}`).toBe(0);
    // Drift side: pkg 9.9.9 -> exit 1 naming v0.6.0 and never mentioning v1.3.
    const drift = runGuard(fixtureRepo(['v1.3', 'v0.6.0'], '9.9.9'));
    expect(drift.status, `stdout: ${drift.stdout}\nstderr: ${drift.stderr}`).toBe(1);
    const out = `${drift.stdout}${drift.stderr}`;
    expect(out).toContain('9.9.9');
    expect(out).toContain('v0.6.0');
    expect(out).not.toContain('v1.3');
  });

  it('origin witness: stale local clone, origin carries v{pkg} -> exit 0 with fetch hint', () => {
    const { work } = staleCloneFixture();
    writePkg(work, '2.0.0');
    const res = runGuard(work);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(0);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('git fetch --tags');
  });

  it('origin witness exhausted: no tag anywhere -> exit 1 naming local latest and pkg', () => {
    const { work } = staleCloneFixture();
    writePkg(work, '3.0.0');
    const res = runGuard(work);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(1);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('3.0.0');
    expect(out).toContain('v1.0.0');
  });

  it('missing package.json in cwd -> exit 1 with a named message', () => {
    const dir = tmpRoot();
    git(dir, ['init', '-b', 'main']);
    git(dir, ['commit', '--allow-empty', '-m', 'fixture release commit']);
    const res = runGuard(dir);
    expect(res.status, `stdout: ${res.stdout}\nstderr: ${res.stderr}`).toBe(1);
    const out = `${res.stdout}${res.stderr}`;
    expect(out).toContain('package.json');
  });
});
