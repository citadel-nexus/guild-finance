# ─── CGRF Header ──────────────────────────────
# File:        .bits/queue/DISP-AUTOMATION-finance.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-AUTOMATION-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-AUTOMATION-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   GATES SRS-CN-FINANCE-AUTOMATION-001; DEPENDS_ON .bits/srs_registry.yml
# DAG Node:    finance.automation.dispatch
# Intent:      Authorize public-safe Finance Guild CI, catalog, analytics, and review automation changes.
# ──────────────────────────────────────────────

# DISP-AUTOMATION-finance

- srs: SRS-CN-FINANCE-AUTOMATION-001
- guild: finance
- champion: Sterling
- branch: main
- status: ready
- brief: Authorize CI/automation infrastructure changes for the finance guild.

Improve service catalog, add PostHog env documentation, enable Datadog CI Visibility, and add CODEOWNERS. Self-gate `npm run lint` + `npm test`. Open a PR titled after the SRS.
