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
- github_codeowner_team: "@citadel-nexus/guild-finance"
- github_automation_app: sterling-finance-guildmaster
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

## Operator identity confirmation

In the same Bits AI session, the authenticated operator confirmed the Datadog
`guild-finance` team's GitHub links: code-owner team `@citadel-nexus/guild-finance`
and GitHub App `sterling-finance-guildmaster`. The directive assigns the team as
guildmaster owner, preserves the SDK rule, and records the app as Sterling's
automation identity and expected ruleset actor. GitHub Apps cannot be code owners.
This resolves the identity follow-up under the same SRS and dispatch; it does not
authorize any GitHub settings change or ruleset bypass.

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

## Post-merge operator follow-up

Authorization source: the same authenticated operator's Bits AI instruction to
"check the repo and other mr and prs" and "close our the stale ones and bring the
missing parts into a new mr", after PR #23 merged. Continue this in_progress
SRS/dispatch on bits/SRS-CN-FINANCE-GOVERNANCE-001-closeout, based on the current
main merge 2f630f6beda81752c56711d0a33043b2d3e13726.

Phase D: compare all six open scaffold PRs with current main, record dispositions,
repair the observed existing CI login expression bug, and provide a manual cleanup
workflow restricted to the reviewed heads. GitHub API writes remain unavailable
in this session; no PR closure is claimed. The operator can run the merged workflow
with close_reviewed=true after reviewing its default dry-run summary.

Gate: Node closeout policy tests and YAML/credential validation must pass. Existing
application lint/test/build evidence comes from successful PR #23 and main builds;
record local dependency limitations and do not claim the login repair has run live.
