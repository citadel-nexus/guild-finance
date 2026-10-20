# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md
# Stage:       04_HYPOTHESIZE
# SRS:         SRS-CN-FINANCE-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs_registry.yml; GATES .bits/queue/DISP-GOVERNANCE-finance.md
# DAG Node:    none
# Intent:      Bound Finance ownership and provenance work to an operator-authorized staging change.
# ───────────────────────────────────────────────────────────────

# Finance Guild ownership governance and signed build provenance

- SRS: SRS-CN-FINANCE-GOVERNANCE-001
- Status: in_progress
- Owner: Sterling, Finance Guild guildmaster (GitLab user `sterling`)
- Dispatch: DISP-GOVERNANCE-finance
- CKS gate: B+/75; CKS, CAPS and CK: pending

## Objective and scope

Make ownership, approval and escalation rules reviewable and give consumers
cryptographically verifiable build provenance for the Finance Guild artifact.
Scope: .github/CODEOWNERS, GOVERNANCE.md (including default-branch protections
and verification), .github/workflows/provenance.yml, this SRS, the additive
registry entry, the dispatch, and its report/memory governance artifacts.

The authenticated operator explicitly authorized creating these governance
records on 2026-10-20 through Bits AI, invoking the CLAUDE.md bootstrap exception.
The existing LIVINGWORLD and AUTOMATION registry entries remain unchanged.
The LIVINGWORLD workflow restriction belongs to that dispatch; this SRS explicitly
covers provenance.yml. The operator follow-up below additionally covers the
existing CI login repair; the release workflow remains outside this change.

## Coordination

SRS-CN-FINANCE-AUTOMATION-001 already owns the existing CODEOWNERS baseline.
Extend that single file using the operator-confirmed `@citadel-nexus/guild-finance`
guildmaster team and retain SDK-specific ownership. Do not create a competing
CODEOWNERS. The operator confirmed GitHub App `sterling-finance-guildmaster` as
Sterling's automation identity through the Datadog `guild-finance` team links.
Record that app as the expected ruleset automation actor, without granting bypass.
GitHub Apps cannot be code owners; the team provides code-owner review.

## Acceptance

1. Document billing, spend, budgets, cost guards and the Finance Floor remit;
   guildmaster authority, approvals and escalation to the guildmasters group.
2. Assign Finance ownership to `@citadel-nexus/guild-finance` while preserving
   the SDK rule. Document `sterling-finance-guildmaster` as Sterling's automation
   identity and expected ruleset actor; keep the app out of CODEOWNERS rules.
3. Document default-branch code-owner approval, signed commits, required checks,
   bypass controls and admin enablement. Do not change live GitHub settings.
4. Build the existing server/mobile distribution and upload an immutable archive.
   Produce a Sigstore keyless signed SLSA provenance attestation for its digest
   only on trusted default-branch runs, with OIDC permissions isolated from build.
5. Document artifact download and verification bound to repository, workflow,
   source ref and caller-selected full commit SHA; distinguish existing releases.
6. npm run lint, npm test, npm run build and workflow policy checks pass locally.
   Remote OIDC/attestation execution is deferred to GitHub Actions.

## Bounds

Staging only. No deployment, publication of packages/containers, production access,
financial-data changes, secrets, GitHub settings writes or pushes to main.
One SRS, branch and PR. No new application modules; SAKE module stubs do not apply.

## Operator-authorized closeout follow-up

After PR #23 merged, the operator requested review of the repository and other
PRs/MRs, closure of stale work, and consolidation of missing pieces into a new PR.
This extends the same SRS to .github/workflows/ci.yml (existing GHCR login repair),
.github/workflows/close-scaffold-prs.yml (manual, reviewed-head-only cleanup), and
closeout evidence/tests in .bits/out/DISP-GOVERNANCE-finance/. No scaffold runtime
code is imported. No new deployment destination, package release or direct GitHub
settings change is authorized. The cleanup workflow must default to dry-run,
reject changed PR heads/identity, and leave all unreviewed PRs and branches alone.
