# ─── CGRF Header ───────────────────────────────────────────────
# File:        GOVERNANCE.md
# Stage:       06_PLAN
# SRS:         SRS-CN-FINANCE-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .github/CODEOWNERS, .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md
# EnumType:    Doc
# EnumEdges:   DEPENDS_ON .github/CODEOWNERS; DEPENDS_ON .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md; VALIDATES .github/workflows/provenance.yml
# DAG Node:    none
# Intent:      Make Finance authority, merge safeguards and artifact trust independently reviewable.
# ───────────────────────────────────────────────────────────────

# Finance Guild governance

## Charter and ownership

The Finance Guild owns billing, spend, budgets, cost guards and the Finance Floor.
Its guildmaster is **Sterling** (GitLab user `sterling`). The Datadog team handle
is `guild-finance`. The operator confirmed the following GitHub identities through
that Datadog team's links:

- Guildmaster code-owner team: `@citadel-nexus/guild-finance`
  (https://github.com/orgs/citadel-nexus/teams/guild-finance).
- Sterling's automation identity: GitHub App `sterling-finance-guildmaster`
  (https://github.com/apps/sterling-finance-guildmaster).

Sterling is accountable for scope, priorities, financial-control requirements,
and technical acceptance. Contributors implement an approved SRS and dispatch.
This public repository contains public-safe code and documentation; production
financial records, credentials and private-stack operations are outside its remit.

The guildmaster review owner is `@citadel-nexus/guild-finance`; the SDK public
interface keeps `@citadel-nexus/sdk-core` ownership. This SRS updates the Finance
team in the single CODEOWNERS file established by SRS-CN-FINANCE-AUTOMATION-001,
without changing that SRS or introducing another ownership source.

GitHub Apps cannot be CODEOWNERS. Sterling's app records automation activity;
the confirmed team supplies code-owner review through eligible human members.
**Admin prerequisite:** ensure both code-owner teams are visible and have explicit
write access to this repository. Identity confirmation is complete.

## Decisions, approvals and escalation

- Routine changes need an approved dispatch, passing checks and at least one
  independent approval from the matching code owners. Authors cannot approve
  their own change. SDK interface changes retain SDK team review.
- Ownership, charter, signing policy, branch rules and changes to financial-control
  semantics additionally need Sterling's explicit approval recorded on the PR.
  A delegated guild reviewer must have Sterling's delegation recorded on the PR.
- Disputed priorities, cross-guild contracts, unavailable approvers and exceptions
  escalate to the **guildmasters group**, through the operator's established
  dispatch channel. Record the decision and its approver on the PR before merge;
  do not treat missing feedback as approval or invent a GitHub group handle.
- Emergency work uses an expedited reviewed PR and a documented rollback plan.
  This charter does not authorize disabling checks or bypassing branch protection.

CODEOWNERS permits approval by an eligible member of the matching team; it cannot
require approval from Sterling's GitHub App. Record Sterling's decision or delegated
human approval on the PR. This additional governance gate is manual unless an admin
installs a dedicated approval-policy check; app activity does not replace the
required independent code-owner approval.

## Default-branch protection: admin enablement

No repository settings controller or supported settings configuration was found.
This document is the configuration specification; committing it does not enable
GitHub protection. An organization/repository admin must configure an **active
branch ruleset targeting the default branch** (currently `main`):

1. Require pull requests with at least one approval, **Require review from Code
   Owners**, dismiss stale approvals on new commits, require approval of the most
   recent reviewable push and require all review conversations to be resolved.
2. Require signed commits. Ensure each contributor/bot uses a GitHub-verified
   signature and choose a merge method that preserves compliance. Artifact
   signing does not sign Git commits or satisfy this rule.
3. Require status checks, require the branch to be up to date, and select these
   check contexts from successful GitHub Actions runs (source: GitHub Actions):
   `build` from `CI — guild-finance` and `Finance provenance build` from
   `Finance build provenance`. Confirm the exact displayed contexts before
   saving; do not create ambiguous duplicate job names in other workflows.
4. Block force pushes and branch deletion. Leave the bypass list empty, including
   administrators and automation, unless the guildmasters group approves a
   separately recorded exception. Preserve any stronger organization policies.
5. Confirm GitHub recognizes CODEOWNERS and its owners, then use a trial PR to
   verify review requests, stale-approval dismissal and blocked merge behavior.
   Check unsigned commits are rejected on the protected branch.

The expected Sterling automation actor in ruleset actor selection and audit records
is GitHub App **`sterling-finance-guildmaster`**. When an admin needs
to identify this actor in GitHub's settings, select its repository installation; do not
substitute the code-owner team or an inferred user account. This identity record
grants no ruleset bypass: the app must follow the same pull-request, signed-commit
and required-check rules. Required build checks continue to use **GitHub Actions**
as their source app, not the Sterling app.

Do **not** require `Finance provenance attestation` as a PR check: PR builds
intentionally do not sign. That job runs after a trusted default-branch build.
The existing Docker and tag-release jobs are not changed by this policy.
If the default branch changes, update the CI/provenance branch trigger filters
and verification ref together with the ruleset.

Admins must also permit the pinned GitHub-maintained actions used by the workflow,
OIDC token issuance (`id-token: write`) and `attestations: write`. Public repository
attestations use GitHub's Sigstore service and transparency log; no persistent
signing secret is needed. Confirm repository visibility/plan supports artifact
attestations and apply any organization restrictions. No live settings are changed
by this PR. Retain the 30-day Actions artifacts and signed bundles elsewhere under
an approved retention policy if longer-lived distribution is needed.

## Signed build provenance

`.github/workflows/provenance.yml` runs on PRs to `main`, pushes to `main`, and
manual dispatch. It installs the lockfile dependencies on Node 20, runs lint and
tests, builds the server and mobile bundle, and archives `dist/`, `package.json`
and `package-lock.json` into `finance-<full-commit-sha>.tar.gz`.

The archive is downloadable as `finance-build-<full-commit-sha>`. On a successful
push/manual run on the repository's default branch, a separate job downloads
that run's immutable artifact and uses `actions/attest-build-provenance` to create
a SLSA v1 provenance statement. GitHub OIDC supplies a short-lived Sigstore identity
that signs the statement containing the archive's digest. This signed digest binds
the exact archive bytes to the workflow/source identity; there is no separately
managed private signing key or detached archive signature.

Only the attestation job gets OIDC and attestation write permissions. It does not
check out or execute repository code or extract the build archive. PRs and manual
runs on other branches upload validation builds but never receive attestations.
The signed Sigstore bundle is also uploaded as `finance-provenance-<full-commit-sha>`.

Coverage is limited to this archive. Existing npm releases and container images
are **not** attested by this workflow. SLSA provenance is evidence of origin, not
proof of reproducibility, safety, review approval or a certified SLSA assurance level.

## Verify before consuming

Use a recent GitHub CLI supporting `gh attestation verify`, authenticated with
read access. Choose a **successful push or manual default-branch run**, and obtain
the expected full commit SHA independently from the reviewed merge. Do not trust
a filename or a digest supplied alongside an untrusted artifact as your policy.

```bash
# Set these to the chosen run ID and independently approved full commit SHA.
RUN_ID=REPLACE_WITH_RUN_ID
COMMIT=REPLACE_WITH_FULL_COMMIT_SHA
REPO=citadel-nexus/guild-finance

# Check conclusion, branch, workflow and headSha before downloading.
gh run view "$RUN_ID" --repo "$REPO" \
  --json conclusion,event,headBranch,headSha,workflowName

gh run download "$RUN_ID" --repo "$REPO" \
  --name "finance-build-$COMMIT" --dir finance-verification

# This must succeed before extracting or executing the archive.
gh attestation verify "finance-verification/finance-$COMMIT.tar.gz" \
  --repo "$REPO" \
  --signer-workflow "$REPO/.github/workflows/provenance.yml" \
  --source-ref refs/heads/main \
  --source-digest "$COMMIT" \
  --predicate-type https://slsa.dev/provenance/v1 \
  --deny-self-hosted-runners
```

The verifier checks the archive digest, signing certificate and signed statement;
the policy flags constrain the repository, workflow, source ref and source commit.
A missing attestation, changed archive, unexpected workflow/ref/commit or invalid
signature is a failure: stop consumption. A PR validation build will fail this
policy even if its tests passed. Do not downgrade to checksum-only validation.

For a retained bundle, download `finance-provenance-$COMMIT` from the **same run**,
then pass its downloaded JSONL file using `--bundle <path>` to the same verification
command, retaining every policy flag. Bundle use avoids reliance on attestation
lookup but is not a promise of fully offline trust-root availability.

After the first default-branch run, an admin/reviewer must verify the genuine
archive successfully, verify a copied archive with appended bytes is rejected,
and verify an incorrect `--source-digest` is rejected. These live checks require
GitHub OIDC and cannot be established by local YAML or build validation.

## Rollback

Revert this SRS's changes through a reviewed PR. Before removing the workflow,
an admin must adjust its required-check setting to avoid leaving PRs blocked on
a missing check. Keep the existing CI build check, code-owner review and signed
commit protections. Previously issued attestations remain historical evidence;
consumers must continue to enforce their approved commit/workflow policy.

Owner: Citadel Nexus Inc.

## Reviewed scaffold PR closeout

The Finance scaffold closeout workflow is a manual maintenance tool. Its frozen
PR #1–#6 dispositions and exact reviewed heads are documented in
`.bits/out/DISP-GOVERNANCE-finance/closeout.md`. It previews by default; selecting
`close_reviewed=true` closes only unchanged reviewed candidates on the default
branch. PR-triggered policy tests never close PRs. The workflow does not merge code,
post comments, delete branches, or select work by age. Changed candidates require
a fresh review. Do not require its path-filtered check on every PR.

Sterling's guildmaster team reviews changes to this maintenance policy. The GitHub
Actions token executes this workflow; Sterling's app remains the separately
identified guildmaster automation actor. Neither identity gains a ruleset bypass.
