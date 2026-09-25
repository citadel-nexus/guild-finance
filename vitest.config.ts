// ─── CGRF Header ───────────────────────────────────────────────
// File:        vitest.config.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     package.json, src/**/*.test.ts
// EnumType:    ConfigDoc
// EnumEdges:   VALIDATES SRS-CN-FINANCE-LIVINGWORLD-001
// DAG Node:    finance.test.config
// Intent:      Enforce focused tests and an eighty-percent coverage floor on living-world code.
// ───────────────────────────────────────────────────────────────

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/finance-floor.ts',
        'src/automation/livingworld-emitter.ts',
        'src/automation/guild-comms.ts',
        'src/progression.ts',
        'src/integrations/contracts.ts',
        'src/integrations/customer-io.ts',
        'src/integrations/gitlab.ts',
        'src/integrations/n8n-webhook.ts',
        'src/integrations/posthog.ts',
        'src/integrations/supabase.ts',
        'src/routes/realm.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
