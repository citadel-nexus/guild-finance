# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/queue/DISP-GOVERNANCE-finance.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-GOVERNANCE-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-GOVERNANCE-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-10-20
# Depends:     .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON .bits/srs/SRS-CN-FINANCE-GOVERNANCE-001.md; GATES .github/workflows/provenance.yml; GATES GOVERNANCE.md
# DAG Node:    none
# Intent:      Record operator authority and verifiable tasks for the Finance governance bootstrap.
# ───────────────────────────────────────────────────────────────

# DISP-GOVERNANCE-finance

- status: in_progress
- srs: SRS-CN-FINANCE-GOVERNANCE-001
- seat: BITS-CODEGEN
- mode: staging
- guild: Finance Guild
- guildmaster: Sterling (GitLab `sterling`)
- datadog_team: guild-finance
- branch: bits/SRS-CN-FINANCE-GOVERNANCE-001-provenance
- authorization_source: Authenticated operator Dmitry Richard (mr.nobody@citadel-nexus.com), Bits AI session directive, 2026-10-20.

## Operator authorization

Directive: "create those". The operator explicitly authorized creating the local
SRS entry, SRS document and this in_progress dispatch under the CLAUDE.md bootstrap
exception, followed by implementation of ownership governance and signed build
provenance. This is a local authorization record, not a claim that a VCC database
row was created or independently verified.

Keep existing LIVINGWORLD and AUTOMATION registry entries unchanged. Coordinate
CODEOWNERS with AUTOMATION; this dispatch authorizes provenance.yml despite the
LIVINGWORLD dispatch's workflow restriction. No production, deploy, push to main,
GitHub settings changes, secrets or financial data. npm run lint and npm test
must pass. The coding-agent UI controls eventual PR creation.

## Task table

| Phase | Task | Gate |
| --- | --- | --- |
| A | Register this authorization and bounded SRS | Registry and dispatch parse and agree; prior entries unchanged |
| B | Document ownership, approvals, protections and verification; add provenance | Workflow policy validation and local build/archive verification pass |
| C | Verify and produce report plus three-type memory | Lint, tests and memory/header integrity checks pass |

## Smoke test

```bash
npm run lint && echo 'PASS: lint' || { echo 'FAIL: lint'; exit 1; }
npm test && echo 'PASS: tests' || { echo 'FAIL: tests'; exit 1; }
npm run build && echo 'PASS: build' || { echo 'FAIL: build'; exit 1; }
git diff --check && echo 'PASS: patch whitespace' || { echo 'FAIL: patch whitespace'; exit 1; }
```

## Memory Brief

Source conversation requested governance and provenance across guilds. Existing
repository automation owns Finance-team CODEOWNERS and SDK-specific review.
The package builds server TypeScript and an esbuild mobile bundle into dist/.
Existing CI and tag-release workflows remain independently managed; attestations
in this SRS cover only the new workflow's archived build outputs. No prior memory
was retrieved and no private Memory MCP or VCC database write was performed.
