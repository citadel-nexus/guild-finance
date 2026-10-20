// ─── CGRF Header ───────────────────────────────────────────────
// File:         .bits/out/DISP-GOVERNANCE-finance/closeout.test.ts
// Stage:        11_COMMIT
// SRS:          SRS-CN-FINANCE-GOVERNANCE-001
// CAPS:         pending
// CK:           pending
// Dispatch:     DISP-GOVERNANCE-finance
// Seat:         BITS-CODEGEN
// Owner:        Citadel Nexus Inc.
// Created:      2026-10-20
// Depends:      none
// EnumType:     Test
// EnumEdges:    VALIDATES .github/workflows/close-scaffold-prs.yml; VALIDATES .github/workflows/ci.yml
// DAG Node:     none
// Intent:       Prevent scaffold cleanup from closing unreviewed or changed pull requests.
// ───────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const yaml = readFileSync('.github/workflows/close-scaffold-prs.yml', 'utf8');
const marker = '          script: |\n';
assert.equal(yaml.split(marker).length, 2);
const script = yaml.split(marker)[1]!.split('\n').map(line => line.slice(12)).join('\n');
const execute = new (Object.getPrototypeOf(async () => {}).constructor)(
  'github', 'context', 'core', 'process', script,
) as (github: unknown, context: unknown, core: unknown, process: unknown) => Promise<void>;
const repository = 'citadel-nexus/guild-finance';
const heads = [
  '546585fd11505fd33105a2ee9c97f840664730eb',
  '595a7d7a2416fb38f3372325c238bb837649c43d',
  '3abdade3bae531a115eeeb8bebb280c45cfcb27e',
  'afd3c0bc57997131e48467b7b366b9001deb0d7f',
  '677f8a83b61a702f5bf0ad7d4c1beb9af266c192',
  '034fbee2869c8d3d301950b033919a3403b53bfa',
];
const branches = ['1772806151', '1772806216', '1772806932', '1772808426', '1772813962', '1772814192'];

function fixture(close: string = 'false') {
  const prs = heads.map((sha, i) => ({
    number: i + 1, state: 'open', merged: false,
    title: `chore: ${i < 4 ? 'initial' : 'full'} scaffold for guild-finance`,
    head: {sha, ref: `automated/scaffold/${branches[i]}`, repo: {full_name: repository}},
    base: {ref: 'main', repo: {full_name: repository}},
  }));
  const writes: Array<{pull_number: number; state: string}> = [];
  const reads: number[] = [];
  const summary = {addHeading: (_: string) => summary, addTable: (_: unknown) => summary, write: async () => {}};
  const context = {repo: {owner: 'citadel-nexus', repo: 'guild-finance'}, eventName: 'workflow_dispatch',
    ref: 'refs/heads/main', payload: {repository: {default_branch: 'main'}}};
  const api = {
    get: async ({pull_number}: {pull_number: number}) => {
      reads.push(pull_number);
      assert.ok(pull_number >= 1 && pull_number <= 6);
      return {data: structuredClone(prs[pull_number - 1]!)};
    },
    update: async (args: {pull_number: number; state: string}) => {
      assert.equal(args.state, 'closed');
      writes.push(args);
      prs[args.pull_number - 1]!.state = 'closed';
    },
  };
  return {prs, writes, reads, context, api,
    run: () => execute({rest: {pulls: api}}, context, {summary}, {env: {CLOSE_REVIEWED: close}})};
}

test('default and non-literal confirmation values never write', async () => {
  for (const value of ['false', '', 'TRUE', '1']) {
    const f = fixture(value); await f.run();
    assert.equal(f.writes.length, 0); assert.deepEqual(f.reads, [1, 2, 3, 4, 5, 6]);
  }
  assert.match(yaml, /close_reviewed:[\s\S]*?default: false/);
});

test('explicit close affects exactly six reviewed heads and is idempotent', async () => {
  const f = fixture('true'); await f.run();
  assert.deepEqual(f.writes.map(w => w.pull_number), [1, 2, 3, 4, 5, 6]);
  await f.run(); assert.equal(f.writes.length, 6);
});

test('closed and merged requests are skipped', async () => {
  const f = fixture('true'); f.prs[0]!.state = 'closed'; f.prs[1]!.merged = true;
  await f.run(); assert.deepEqual(f.writes.map(w => w.pull_number), [3, 4, 5, 6]);
});

for (const field of ['sha', 'branch', 'fork', 'base', 'baseRepo', 'title', 'number'] as const) {
  test(`changed ${field} on last candidate prevents every write`, async () => {
    const f = fixture('true'); const pr = f.prs[5]!;
    if (field === 'sha') pr.head.sha = 'f'.repeat(40);
    if (field === 'branch') pr.head.ref = 'new-work';
    if (field === 'fork') pr.head.repo.full_name = 'another/repo';
    if (field === 'base') pr.base.ref = 'release';
    if (field === 'baseRepo') pr.base.repo.full_name = 'another/repo';
    if (field === 'title') pr.title = 'Active implementation';
    if (field === 'number') pr.number = 99;
    await assert.rejects(f.run, /changed since review/); assert.equal(f.writes.length, 0);
  });
}

test('read failure during preflight prevents every write', async () => {
  const f = fixture('true'); const get = f.api.get;
  f.api.get = async args => { if (args.pull_number === 6) throw new Error('Unavailable'); return get(args); };
  await assert.rejects(f.run, /Unavailable/); assert.equal(f.writes.length, 0);
});

test('head is revalidated immediately before closing', async () => {
  const f = fixture('true'); const get = f.api.get;
  f.api.get = async args => {
    if (f.reads.length === 6) f.prs[0]!.head.sha = 'a'.repeat(40);
    return get(args);
  };
  await assert.rejects(f.run, /changed during closeout/); assert.equal(f.writes.length, 0);
});

for (const scope of ['branch', 'repository', 'event'] as const) {
  test(`wrong ${scope} cannot execute cleanup`, async () => {
    const f = fixture('true');
    if (scope === 'branch') f.context.ref = 'refs/heads/feature';
    if (scope === 'repository') f.context.repo.repo = 'another';
    if (scope === 'event') f.context.eventName = 'pull_request';
    await assert.rejects(f.run, /restricted/); assert.equal(f.reads.length, 0); assert.equal(f.writes.length, 0);
  });
}

function validateCredentials(source: string): void {
  assert.match(source, /^\s+username: \$\{\{ github\.actor \}\}$/m);
  assert.match(source, /^\s+password: \$\{\{ secrets\.GITHUB_TOKEN \}\}$/m);
}

test('Docker login uses evaluated GitHub credentials', () => {
  validateCredentials(readFileSync('.github/workflows/ci.yml', 'utf8'));
});

test('literal credential expressions are rejected', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.throws(() => validateCredentials(ci.replace('${{ github.actor }}', '${ github.actor }')));
  assert.throws(() => validateCredentials(ci.replace('${{ secrets.GITHUB_TOKEN }}', '${ secrets.GITHUB_TOKEN }')));
});
