# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/out/DISP-GOVERNANCE-finance/report.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/queue/DISP-GOVERNANCE-finance.md, .bits/out/DISP-GOVERNANCE-finance/memory.json
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .bits/queue/DISP-GOVERNANCE-finance.md; VALIDATES .github/workflows/provenance.yml; DEPENDS_ON .bits/out/DISP-GOVERNANCE-finance/memory.json
# DAG Node:    none
# Intent:      Expose validation limits and remaining admin work for the Finance governance review.
# ───────────────────────────────────────────────────────────────

# §15 Report Template

Historical bootstrap evidence. The post-merge review and current check results
are in `closeout.md` beside this file. GitHub subsequently passed the build and
signing jobs; the earlier local dependency limitations and memory counts below describe the
bootstrap snapshot. Current cumulative memory counts are in memory.json.

## §1 SUMMARY

- Status: PARTIAL
- Dispatch: DISP-GOVERNANCE-finance
- Seat: BITS-CODEGEN
- SRS: SRS-CN-FINANCE-GOVERNANCE-001
- Branch: bits/SRS-CN-FINANCE-GOVERNANCE-001-provenance
- Tasks: 1/3 complete; implementation and evidence drafted, required execution gates blocked
- Smoke: 1/4 passing (whitespace only; lint, test and build unavailable)
- CKS Gate: B+/75; CKS: pending; CAPS: pending; CK: pending
- Commits: see final PR report; verify with `git log --oneline 313b35e2c0e901ef82be113d8e0bbed9239b9792..HEAD`

## §2 TASK RESULTS

- Task A — authorization bootstrap: PASS. Additive registry entry, registered SRS
  and in_progress local dispatch record the authenticated operator directive.
  Verify: static policy command below. Files: .bits/srs_registry.yml,
  .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md, .bits/queue/DISP-GOVERNANCE-finance.md.
  CKET: 04_HYPOTHESIZE and 11_COMMIT (logical stages, existing repo paths).
- Task B — ownership and provenance: PARTIAL. Governance and workflow implemented;
  Operator-confirmed guildmaster team assigned; SDK rule preserved. Sterling's
  app documented as automation identity and expected ruleset actor, with no bypass.
  Runtime build and OIDC signing are unverified.
  Verify: static policy command below; `npm run build`; live verification in
  GOVERNANCE.md. Files: .github/CODEOWNERS, GOVERNANCE.md,
  .github/workflows/provenance.yml. CKET: 06_PLAN and 11_COMMIT.
- Task C — evidence: PARTIAL. Report, memory and static validation supplied;
  mandatory lint/test pass gate remains blocked.
  Verify: smoke commands below and `python -m json.tool .bits/out/DISP-GOVERNANCE-finance/memory.json`.
  Files: this report, memory.json and memory.cgrf.yaml. CKET: 11_COMMIT.

## §3 SMOKE TEST RESULTS

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| `npm run lint` | Exit 0 using locked ESLint 8 | Global ESLint rejects --ext; local installation incomplete | FAIL |
| `npm test` | Exit 0, coverage reported | vitest not found | FAIL |
| `npm run build` | Exit 0, server/mobile outputs | tsc not found | FAIL |
| `git diff --check` | Exit 0 | Exit 0 | PASS |

Root cause: node_modules was absent and `npm ci --offline --ignore-scripts
--no-audit --no-fund` failed with ENOTCACHED for yocto-queue. The sandbox cannot
install uncached dependencies via internet shell commands. No source workaround
was applied and dependency versions/lockfile were not changed. Run `npm ci` in a
network-enabled CI environment, then rerun the commands above. These failures do
not establish application regressions or passing coverage. No tests were added
because no application module changed. Python/pytest and mypy are not applicable
to this TypeScript repository. No artifact or signing success is claimed.

After the operator identity update, lint and tests were rerun and produced the
same failures. Build was not rerun for this ownership/documentation-only change;
its earlier dependency failure remains unresolved.

Static validation PASS: YAML parsing; unchanged prior registry content; registered
SRS/dispatch; trusted-ref signing gate; build/sign permissions separation; same-run
artifact wiring; full action SHA pins; no code execution in signing job; packaging
shell syntax; confirmed Finance owner and preserved SDK rule; documented GitHub
CLI flags. Operator identity confirmation is recorded in the dispatch. Negative
controls reject unconditional signing and repository code execution in the signing
job. This is not GitHub's workflow validator; actionlint is not installed and action
revisions were not resolved remotely. Verify these checks with:

```bash
python - <<'PYVERIFY'
import copy, json, re, subprocess
from pathlib import Path
import yaml
base='313b35e2c0e901ef82be113d8e0bbed9239b9792'
srs='SRS-CN-FINANCE-GOVERNANCE-001'
original=subprocess.check_output(['git','show',base+':.bits/srs_registry.yml'],text=True)
current=Path('.bits/srs_registry.yml').read_text()
assert current.startswith(original), 'Existing registry contents changed'
registry=yaml.safe_load(current)
assert registry[srs]['status']=='in_progress'
assert registry[srs]['dispatch']=='DISP-GOVERNANCE-finance'
assert Path('.bits/srs/'+srs+'.md').is_file()
assert '- status: in_progress' in Path('.bits/queue/DISP-GOVERNANCE-finance.md').read_text()
print('PASS: Phase A: additive registry and authorized dispatch')
workflow=yaml.load(Path('.github/workflows/provenance.yml').read_text(),Loader=yaml.BaseLoader)
def policy(w):
 assert set(w['on'])=={'push','pull_request','workflow_dispatch'}
 assert w['on']['push']['branches']==['main']
 assert w['on']['pull_request']['branches']==['main']
 assert w['permissions']=={'contents':'read'}
 b,a=w['jobs']['build'],w['jobs']['attest']
 assert 'permissions' not in b
 assert a['needs']=='build'
 assert a['if'].strip()=="github.event_name != 'pull_request' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)"
 assert a['permissions']=={'contents':'read','id-token':'write','attestations':'write'}
 assert not any('run' in s or 'checkout' in s.get('uses','') for s in a['steps'])
 assert [s['run'] for s in b['steps'] if 'run' in s][:4]==['npm ci','npm run lint','npm test','npm run build']
 assert b['steps'][0]['with']['persist-credentials']=='false'
 assert a['steps'][0]['with']['name']==b['steps'][-1]['with']['name']
 assert 'run-id' not in a['steps'][0]['with']
 assert a['steps'][1]['with']['subject-path']==b['steps'][-1]['with']['path']
 for job in w['jobs'].values():
  assert job['runs-on']=='ubuntu-latest'
  for step in job['steps']:
   if 'uses' in step: assert re.fullmatch(r'actions/[\w-]+@[a-f0-9]{40}',step['uses'])
policy(workflow)
# Negative policy controls: reject PR signing and repository code in signing job.
for mutate in [lambda w:w['jobs']['attest'].update({'if':'always()'}),lambda w:w['jobs']['attest']['steps'].append({'run':'npm ci'})]:
 bad=copy.deepcopy(workflow);mutate(bad)
 try: policy(bad)
 except AssertionError: pass
 else: raise AssertionError('Unsafe policy mutation accepted')
# Parse packaging shell without executing a build or creating a fake archive.
subprocess.run(['bash','-n'],input=workflow['jobs']['build']['steps'][-2]['run'],text=True,check=True)
owners=Path('.github/CODEOWNERS').read_text()
rules=[l.split() for l in owners.splitlines() if l.strip() and not l.startswith('#')]
assert rules[0]==['*','@citadel-nexus/guild-finance']
assert all(r[1:]==['@citadel-nexus/guild-finance'] for r in rules if r[0]!='src/index.ts')
assert not any('sterling-finance-guildmaster' in token for r in rules for token in r)
assert '@citadel-nexus/finance-guild' not in owners
governance=Path('GOVERNANCE.md').read_text()
assert 'GitHub App `sterling-finance-guildmaster`' in governance
assert 'GitHub App **`sterling-finance-guildmaster`**' in governance
assert 'grants no ruleset bypass' in governance
assert 'src/index.ts @citadel-nexus/sdk-core' in owners
assert not any('@sterling' in l for l in owners.splitlines() if not l.startswith('#'))
help_text=subprocess.check_output(['gh','attestation','verify','--help'],text=True)
for flag in ['--source-digest','--source-ref','--signer-workflow','--predicate-type','--deny-self-hosted-runners','--bundle']:
 assert flag in help_text
subprocess.run(['git','diff','--check'],check=True)
print('PASS: workflow policy, negative controls, packaging syntax, owner preservation and verification CLI flags')
print('PARTIAL: Phase B: live build and GitHub attestation not validated')
PYVERIFY
```

Live genuine-artifact, tampered-artifact and wrong-source verification must be run
on GitHub after a successful trusted-branch build, following GOVERNANCE.md. Do not
label this PR verified:tests-pass until the required checks succeed.

## §4 MEMORY INGEST

- Type A: 9 file vectors; Type B: 17 relationship vectors; Type C: 3 recorded events.
- IOO compliance: true; DKG orphans: 0 (validated locally).
- Payload: .bits/out/DISP-GOVERNANCE-finance/memory.json; JSON envelope: memory.cgrf.yaml.
- No direct memory service write; CK/CAPS stay pending.
- Verify: `python -m json.tool .bits/out/DISP-GOVERNANCE-finance/memory.json` and compare the payload summary.

## §5 CKET FILING

Existing repo conventions use root/dot directories with logical CGRF stages;
this change does not relocate existing files into physical stage directories.

- 06_PLAN: GOVERNANCE.md; existing .github/CODEOWNERS updated in place.
- 04_HYPOTHESIZE: .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md.
- 11_COMMIT: additive registry update; dispatch; provenance workflow; report;
  memory payload and sibling envelope.
- 13_SAVE: none.
- CGRF headers: 7/7 new artifacts covered (JSON uses sibling envelope).
- REFLEX check: deferred to private post-merge pipeline; not run locally.

## §6 GOVERNANCE

- Entity: Citadel Nexus Inc. (Delaware C-Corp).
- License posture: unchanged; directive specifies BUSL-1.1 with Additional Use
  Grant and licensing@citadel-nexus.com; existing license was not audited here.
- Hard-NO scope: only operator-authorized governance paths changed; previously
  governed registry extended under the explicit bootstrap directive.
- Secret scan: changed/new artifacts checked for prohibited prefixes; none found.
- Stripe mode: not applicable; no checkout or Stripe code changed.
- Settings: no GitHub settings changed; branch protection and OIDC enablement
  remain admin actions documented in GOVERNANCE.md.

## §7 NEXT ACTIONS

- Blockers: install locked dependencies and obtain passing lint/test/build;
  validate first live signed archive.
- Admin: confirm owners' access, activate default-branch ruleset and required
  checks, require signed commits, allow pinned actions/OIDC/attestations, validate
  positive and negative artifact-verification cases. Additional Sterling approval
  is manual unless a separate approval-policy check is installed. The expected
  Sterling automation actor is sterling-finance-guildmaster; no bypass is granted.
- Handoffs requested: none; PR creation uses the coding-agent UI.
- Suggested next dispatch: none assigned; finish this dispatch's blocked checks.
- Bugs filed: none. No issue target was provided and repository CLI is read-only.
- Labels for PR creation: bits:codegen, srs:srs-cn-finance-governance-001,
  dispatch:disp-governance-finance, verified:static-only, verified:manual-review.

Rollback: reviewed revert; admin must first remove the new workflow's required
check if enabled. The confirmed guildmaster team, SDK ownership and prior registry entries must be preserved.
