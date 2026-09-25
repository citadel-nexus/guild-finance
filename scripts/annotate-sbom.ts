// ─── CGRF Header ───────────────────────────────────────────────
// File:        scripts/annotate-sbom.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     package-lock.json, sbom.json
// EnumType:    Service
// EnumEdges:   CONSUMES package-lock.json; PRODUCES sbom.json
// DAG Node:    finance.sbom.annotation
// Intent:      Preserve audited vulnerability findings in the reproducible CycloneDX dependency inventory.
// ───────────────────────────────────────────────────────────────

import { readFile, writeFile } from 'node:fs/promises';

interface BomComponent {
  readonly 'bom-ref': string;
  readonly group?: string;
  readonly name: string;
  readonly version?: string;
}

interface CycloneDxDocument {
  readonly components?: readonly BomComponent[];
  vulnerabilities?: readonly object[];
}

const sbomUrl = new URL('../sbom.json', import.meta.url);
const document = JSON.parse(await readFile(sbomUrl, 'utf8')) as CycloneDxDocument;
const affected = (document.components ?? [])
  .filter(isAffectedVitestComponent)
  .map((component) => ({
    ref: component['bom-ref'],
    versions: [{ version: component.version, status: 'affected' }],
  }));

document.vulnerabilities = affected.length === 0
  ? []
  : [
      {
        id: 'GHSA-82fw-gwwq-j7x9',
        source: {
          name: 'GitHub Advisory Database',
          url: 'https://github.com/advisories/GHSA-82fw-gwwq-j7x9',
        },
        ratings: [
          {
            source: {
              name: 'GitHub Advisory Database',
              url: 'https://github.com/advisories/GHSA-82fw-gwwq-j7x9',
            },
            score: 5.9,
            severity: 'medium',
            method: 'CVSSv31',
            vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
          },
        ],
        cwes: [22],
        description: 'Vitest redirect mocks can permit path traversal and arbitrary file reads.',
        recommendation: 'Upgrade Vitest and its coverage package to a release outside the affected range.',
        advisories: [{ url: 'https://github.com/advisories/GHSA-82fw-gwwq-j7x9' }],
        affects: affected,
      },
    ];

await writeFile(sbomUrl, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

function isAffectedVitestComponent(component: BomComponent): boolean {
  const isTarget =
    (component.group === '@vitest' && (component.name === 'coverage-v8' || component.name === 'mocker')) ||
    (component.group === undefined && component.name === 'vitest');
  return isTarget && component.version !== undefined && inAffectedRange(component.version);
}

function inAffectedRange(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (match === null) return false;
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  const atLeastTwoOne = major > 2 || (major === 2 && (minor > 1 || (minor === 1 && patch >= 0)));
  const belowFourOneEleven = major < 4 || (major === 4 && (minor < 1 || (minor === 1 && patch < 11)));
  return atLeastTwoOne && belowFourOneEleven;
}
