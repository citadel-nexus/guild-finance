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
covers provenance.yml. Existing CI and release workflows are outside this change.

## Coordination

SRS-CN-FINANCE-AUTOMATION-001 already owns the existing CODEOWNERS baseline.
Extend that single file, retain Finance team ownership and SDK-specific ownership,
and document Sterling's guildmaster role. Do not create a competing CODEOWNERS.
A GitLab username or Datadog team handle does not establish a GitHub identity.
Until confirmed, individual GitHub ownership is an explicit admin prerequisite.

## Acceptance

1. Document billing, spend, budgets, cost guards and the Finance Floor remit;
   guildmaster authority, approvals and escalation to the guildmasters group.
2. Preserve existing review owners and name Sterling's role in CODEOWNERS.
   Document the required GitHub identity/access mapping if unavailable.
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
