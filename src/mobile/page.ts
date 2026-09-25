// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/mobile/page.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts, src/mobile/index.ts, src/mobile/product-analytics.ts
// EnumType:    Widget
// EnumEdges:   DEPENDS_ON src/config.ts; DEPENDS_ON src/mobile/product-analytics.ts; CONSUMES GET /realm/finance.json
// DAG Node:    finance.mobile.page
// Intent:      Render an accessible mobile-first shell for the public Finance living-world feed.
// ───────────────────────────────────────────────────────────────

import { CHAMPION, CHAMPION_COLOR } from '../config.js';
import type { MobileAnalyticsConfig } from './product-analytics.js';

export function renderMobilePage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="${CHAMPION_COLOR}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%2300703C'/%3E%3Cpath d='M18 22h28M24 22l-8 18h16l-8-18zm16 0l-8 18h16l-8-18zM32 14v38M22 52h20' stroke='white' fill='none' stroke-width='3'/%3E%3C/svg%3E">
  <title>Finance Guild Floor</title>
  <style>
    :root { color-scheme: dark; --emerald: ${CHAMPION_COLOR}; --bg: #050505; --surface: #0D1117; --healthy: #00FF88; --warning: #FFB800; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: #f4f7f5; font: 16px/1.45 system-ui, sans-serif; }
    main { width: min(100%, 34rem); min-height: 100vh; margin: 0 auto; padding: max(1.5rem, env(safe-area-inset-top)) 1rem max(1.5rem, env(safe-area-inset-bottom)); display: grid; gap: 1rem; align-content: start; }
    header, section { border: 1px solid #263128; border-radius: 1rem; background: var(--surface); padding: 1rem; }
    header { border-top: 4px solid var(--emerald); }
    h1, h2, p { margin: 0; }
    h1 { font-size: 1.55rem; }
    h2 { font-size: .85rem; letter-spacing: .09em; text-transform: uppercase; color: #b9c6bd; }
    .champion { margin-top: .35rem; color: var(--healthy); }
    .meter { height: .75rem; margin-top: .8rem; overflow: hidden; border-radius: 999px; background: #1b2520; }
    .meter > span { display: block; width: 0; height: 100%; background: var(--emerald); transition: width 300ms ease; }
    .value { margin-top: .5rem; font-variant-numeric: tabular-nums; }
    ul { margin: .75rem 0 0; padding: 0; display: grid; gap: .5rem; list-style: none; }
    li { padding: .7rem; border-radius: .7rem; background: #151b18; }
    .state { color: var(--warning); text-transform: uppercase; font-size: .72rem; }
    footer { text-align: center; color: #93a098; font-size: .8rem; }
    a { color: #84e9ad; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Finance Guild</h1>
      <p class="champion">Guildmaster: ${CHAMPION}</p>
    </header>
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading">Live activity</h2>
      <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><span id="activity-meter"></span></div>
      <p id="activity-value" class="value">Quiet floor</p>
    </section>
    <section aria-labelledby="quests-heading">
      <h2 id="quests-heading">Quests</h2>
      <ul id="quests"><li>No active guild work reported.</li></ul>
    </section>
    <section aria-labelledby="structures-heading">
      <h2 id="structures-heading">Structures</h2>
      <ul id="structures"><li>Loading public floor…</li></ul>
    </section>
    <footer>Powered by Citadel Nexus Inc. · <a href="https://citadel-nexus.com/status">System status</a></footer>
  </main>
  <script src="/mobile/config.js"></script>
  <script type="module" src="/assets/finance-mobile.js"></script>
</body>
</html>`;
}

export function renderMobileConfig(config: MobileAnalyticsConfig | undefined): string {
  if (config === undefined) return 'window.__FINANCE_POSTHOG_CONFIG__ = undefined;\n';
  return `window.__FINANCE_POSTHOG_CONFIG__ = ${safeJson(config)};\n`;
}

function safeJson(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
