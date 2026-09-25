# ─── CGRF Header ───────────────────────────────────────────────
# File:        .bits/context.md
# Stage:       11_COMMIT
# SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
# CAPS:        pending
# CK:          pending
# Dispatch:    DISP-LIVINGWORLD-finance
# Seat:        BITS-CODEGEN
# Owner:       Citadel Nexus Inc.
# Created:     2026-09-25
# Depends:     AGENTS.md, CLAUDE.md, .bits/srs_registry.yml
# EnumType:    ConfigDoc
# EnumEdges:   DEPENDS_ON CLAUDE.md; GATES SRS-CN-FINANCE-LIVINGWORLD-001
# DAG Node:    finance.sprint.context
# Intent:      Bound the Living-World Floor sprint to its authorized public TypeScript surface.
# ───────────────────────────────────────────────────────────────

# Finance Guild sprint context

- Sprint: Living-World Floor
- Phase: BUILD
- Active SRS: `SRS-CN-FINANCE-LIVINGWORLD-001`
- Active dispatch: `DISP-LIVINGWORLD-finance`
- Champion: Sterling
- Service port: `8092`
- NATS namespace: `citadel.finance.*`

## Do

- Build the authorized TypeScript implementation in `src/`.
- Emit Finance Guild floor events through the approved NATS subjects.
- Expose the PUBLIC-SAFE Finance realm feed.
- Bind Sterling as the Finance Guild champion.
- Build the mobile app surface and its RUM vitals instrumentation.
- Add focused tests for new behavior and graceful degradation.
- Add repository-safe Datadog tracing, metrics, and service metadata.
- Add sanitized, fail-soft adapters that turn real provider events into the
  existing public floor contract.
- Accept only HMAC-authenticated n8n webhook events.
- Publish and consume only the operator-authorized count/status cross-guild
  communications subjects.

## Don't

- Do not modify `.github/workflows/`.
- Do not modify `docker/`.
- Do not access private CNWB paths, packages, endpoints, or tenant data.
- Do not fabricate financial values when sources are absent.
- Except for `citadel.guild.comms.finance.broadcast` and
  `citadel.guild.comms.*.finance`, do not publish or subscribe outside
  `citadel.finance.*`.
- Do not write without a ready or in-progress dispatch.

## Pre-flight order

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.bits/context.md`
4. `.bits/srs_registry.yml`
5. `.bits/srs/SRS-CN-FINANCE-LIVINGWORLD-001.md`
6. `.bits/queue/DISP-LIVINGWORLD-finance.md`
7. The dispatch Memory Brief

If any gate is absent, mismatched, or unauthorized, stop closed and escalate
to the dispatch owner.

## Conventions

- Branches normally use `bits/<SRS-CODE>-<slug>`; this dispatch explicitly
  selects `bits/livingworld`.
- Use conventional commits with an imperative subject.
- Every commit body includes `Phase`, `Files`, `Smoke`, `SRS`, `Dispatch`,
  and `CK: pending` footers.
- One branch and pull request may contain only one SRS.
- The pull request title names `SRS-CN-FINANCE-LIVINGWORLD-001`.
- Every new artifact carries a CGRF envelope or JSON sibling envelope.
- Completion requires `npm run lint` and `npm test`.
