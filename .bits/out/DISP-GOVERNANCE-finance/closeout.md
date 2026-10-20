# ─── CGRF Header ───────────────────────────────────────────────
# File:         .bits/out/DISP-GOVERNANCE-finance/closeout.md
# Stage:        11_COMMIT
# SRS:          SRS-CN-FINANCE-GOVERNANCE-001
# CAPS:         pending
# CK:           pending
# Dispatch:     DISP-GOVERNANCE-finance
# Seat:         BITS-CODEGEN
# Owner:        Citadel Nexus Inc.
# Created:      2026-10-20
# Depends:      .bits/queue/DISP-GOVERNANCE-finance.md, .bits/out/DISP-GOVERNANCE-finance/closeout.test.ts
# EnumType:     Doc
# EnumEdges:    DEPENDS_ON .bits/queue/DISP-GOVERNANCE-finance.md; VALIDATES .github/workflows/ci.yml; VALIDATES .github/workflows/close-scaffold-prs.yml; DEPENDS_ON .bits/out/DISP-GOVERNANCE-finance/closeout.test.ts
# DAG Node:     none
# Intent:       Record reviewed scaffold dispositions and consolidate verified governance follow-up gaps.
# ───────────────────────────────────────────────────────────────

# Finance repository closeout

## Review scope and disposition

Reviewed the Finance GitHub repository's 12 PR records, six open scaffold PRs,
current main at `2f630f6beda81752c56711d0a33043b2d3e13726`, recent main/PR checks,
and open issues (none returned). PR #23 is merged; #7–#10 are merged; probe #11 is
already closed. GitLab MRs were not inspected: this sandbox is scoped to the
Finance GitHub repository, not the private monorepo or other guild repositories.

| PR | Last update | Reviewed head | Recommendation |
| --- | --- | --- | --- |
| #1 | 2026-03-06 | 546585fd11505fd33105a2ee9c97f840664730eb | Close obsolete initial scaffold |
| #2 | 2026-03-06 | 595a7d7a2416fb38f3372325c238bb837649c43d | Close obsolete initial scaffold; tree identical to #3 |
| #3 | 2026-03-06 | 3abdade3bae531a115eeeb8bebb280c45cfcb27e | Close duplicate of #2 |
| #4 | 2026-03-06 | afd3c0bc57997131e48467b7b366b9001deb0d7f | Close intermediate scaffold superseded by current main |
| #5 | 2026-03-06 | 677f8a83b61a702f5bf0ad7d4c1beb9af266c192 | Close obsolete full scaffold; tree identical to #6 |
| #6 | 2026-03-06 | 034fbee2869c8d3d301950b033919a3403b53bfa | Close duplicate full scaffold; GitHub reports merge conflicts |

All paths added by these PRs exist on current main. #2/#3 share tree
`4b46e23189acb8b78ad12865e0749a5c70505ea9`; #5/#6 share tree
`9fa424ad29347a9c846cf16ac16ac66901f29229`. The full scaffold's LICENSE,
CODE_OF_CONDUCT.md, docker/Dockerfile and docker/docker-compose.yml are byte-identical
to current main. Current CONTRIBUTING.md extends the old guidance; current package
configuration has the server/mobile build, lockfile-based tooling and coverage.
The old runtime scaffold has malformed imports and placeholder success output;
current main has typed handlers, actual outputs, graceful degradation and tests.
No scaffold runtime code or missing file was identified for import.

This is a disposition review, not an exhaustive semantic equivalence claim.
README content was withheld by the restricted-prefix screen; environment file
contents were not reproduced. Their path/blob metadata was compared only. Preserve
branches so a maintainer can inspect those historical docs if needed. Closing an
obsolete PR does not merge or discard its branch. No PR has been closed here.

Verify against the reviewed snapshots:

```bash
gh pr list --state all --limit 60 --json number,state,title,headRefName,updatedAt
git rev-parse origin/pr-2^{tree} origin/pr-3^{tree}
git rev-parse origin/pr-5^{tree} origin/pr-6^{tree}
git diff --name-status origin/pr-6 2f630f6beda81752c56711d0a33043b2d3e13726
```

The origin/pr-N refs are local fetched snapshots. In another checkout, obtain
refs/pull/N/head as origin/pr-N using a read-only fetch before running these checks.

## Missing pieces consolidated

1. **CI registry credentials:** main CI run 39468477864 failed in docker login.
   Check 118786284867 reports GHCR access denied. The workflow supplied literal
   strings instead of GitHub expressions for both username and token. Correct the
   two expressions and explicitly retain contents: read for Docker checkout,
   alongside packages: write. No token value is read, stored or printed; no registry
   destination, publishing trigger or image tag changes. A new main run must confirm
   the repair; organization/package permissions may still require admin action.
2. **Reviewed PR cleanup:** add a manual workflow with dry-run by default, a frozen
   six-PR allowlist, exact head/branch/title/repository checks, all-candidate preflight,
   immediate pre-close revalidation and idempotent handling of closed/merged PRs.
   No comments, merges, branch deletion, age-based bulk closure or arbitrary PR
   input. A policy mismatch aborts the run. API writes are not transactional: a
   later failure can leave earlier eligible PRs closed; review the run and rerun
   safely after resolving the error.
3. **Evidence refresh:** PR #23's build checks passed. On main, run 39468477999
   completed both build and signed provenance successfully; run 39468477864's
   build also passed. Prior local dependency failures remain historical local
   limitations, not evidence that GitHub's build is failing. Consumer verification
   against genuine/tampered/wrong-source artifacts and admin ruleset enablement
   still need the procedure in GOVERNANCE.md.

Verify provider evidence without rerunning anything:

```bash
gh api repos/citadel-nexus/guild-finance/commits/2f630f6beda81752c56711d0a33043b2d3e13726/check-runs
gh api repos/citadel-nexus/guild-finance/check-runs/118786284867/annotations
```

The workflow jobs endpoint returned HTTP 502; commit check runs and annotations
were available. No raw logs, private GitLab data, secrets, deployments or settings
writes were required for this review.

## Operate the cleanup after merge

1. Open Actions → Finance scaffold closeout → Run workflow on the default branch.
2. Leave close_reviewed=false and inspect the six-PR preview. A changed candidate
   must be reviewed again and its frozen metadata updated through a PR.
3. Run again with close_reviewed=true to close the reviewed PRs. Alternatively,
   close #1–#6 manually using this disposition record.
4. Check that only the reviewed PRs closed. Leave their branches intact.

The operator explicitly requested stale-PR closure, but this session's repository
CLI is read-only. The workflow performs that authorized action only when invoked
on the default branch. It has pull-requests: write and contents: read; its policy
test job and PR triggers have read-only permissions. No automatic schedule is used.
Do not make this path-filtered workflow a globally required PR status check.

The scaffold generators named in the old PR descriptions are not in this repo.
Preventing them from opening future duplicates requires their owner to reuse/update
an existing scaffold PR instead of opening timestamped copies. This workflow
intentionally does not auto-close future or otherwise unreviewed work.

## §15 Report Template

### §1 SUMMARY

Status: PARTIAL (implementation verified locally; closure/publication/admin actions pending)
Dispatch: DISP-GOVERNANCE-finance
Seat: BITS-CODEGEN
SRS: SRS-CN-FINANCE-GOVERNANCE-001
Branch: bits/SRS-CN-FINANCE-GOVERNANCE-001-closeout
Tasks: 3/3 review and implementation tasks; live closeout pending
Smoke: 17/17 closeout policy tests; existing application checks passed on reviewed main
CKS Gate: B+/75; CKS: pending; CAPS: pending; CK: pending
Commits: inspect git log 2f630f6beda81752c56711d0a33043b2d3e13726..HEAD

### §2 TASK RESULTS

Task D1: PASS — six reviewed PR dispositions and bounded follow-up scope recorded.
Verify: PR list, tree comparisons and check-run commands above.
Task D2: PASS locally — closure safeguards and CI credential expressions implemented.
Verify: node --experimental-strip-types --test .bits/out/DISP-GOVERNANCE-finance/closeout.test.ts
Task D3: PARTIAL — remote build/provenance evidence refreshed; actual closures,
new CI login execution and admin settings remain outstanding.
Files: closeout workflow/test/report; CI workflow; SRS/dispatch/registry;
GOVERNANCE.md; report.md and memory.json. Stages: 04_HYPOTHESIZE, 06_PLAN, 11_COMMIT.

### §3 SMOKE TEST RESULTS

17/17 dependency-free Node policy tests PASS on Node 24. Tests exercise dry-run,
explicit closure, idempotence, closed/merged skips, head/ref/title/repository changes,
preflight read failure, final revalidation and wrong event/branch/repository scope. Two credential tests accept the corrected
expressions and reject the original literal forms.
YAML structure and GitHub credential-expression checks PASS. Application source,
package manifest and lockfile are unchanged. Earlier local npm commands remain
blocked by incomplete dependencies; current remote build success is recorded above.
The new workflow and corrected Docker login have not run on GitHub yet.

### §4 MEMORY INGEST

Payload: .bits/out/DISP-GOVERNANCE-finance/memory.json (cumulative session evidence).
Counts: see summary; IOO fields non-null; DKG orphans 0; no direct memory-service write.
Verify: python -m json.tool .bits/out/DISP-GOVERNANCE-finance/memory.json

### §5 CKET FILING

Three new files have CGRF envelopes: workflow, TypeScript policy test and this
report, all logical 11_COMMIT. Existing files stay at established repository paths.
REFLEX remains deferred to the private post-merge validator.

### §6 GOVERNANCE

Entity: Citadel Nexus Inc. Existing legal files, SDK ownership and signing rules
unchanged. The authenticated operator's follow-up is recorded in the active
SRS/dispatch. No production access, GitHub settings writes or secret values.
Stripe mode: not applicable; no checkout/financial-data code changed.

### §7 NEXT ACTIONS

Use the coding-agent UI to create a new PR from this follow-up, then run a dry-run
and confirmed closeout after merge (or close the six reviewed PRs manually).
Verify the next main Docker job and consumer attestation checks. Enable the
previously documented branch protections as an admin. GitLab review requires a
separately scoped repository/session; no private project was accessed.
Rollback: revert this follow-up through review; closed PRs can be reopened without
restoring branches because branches are never deleted. No new required check to remove.
