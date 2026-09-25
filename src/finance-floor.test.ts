// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/finance-floor.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/finance-floor.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/finance-floor.ts
// DAG Node:    finance.floor.state.test
// Intent:      Prove real-state projection, validation, champion binding, and quiet-floor expiry.
// ───────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { FinanceFloorState, quietFinanceRealm } from './finance-floor.js';

describe('FinanceFloorState', () => {
  it('starts with a quiet public realm and Sterling bound as guildmaster', () => {
    const state = new FinanceFloorState();

    expect(state.snapshot()).toEqual(quietFinanceRealm());
    expect(state.party()).toEqual({
      party: [{ guild: 'finance', champion: 'Sterling', role: 'guildmaster', state: 'idle' }],
    });
  });

  it('uses observed activity and returns to quiet after the source becomes stale', () => {
    let now = new Date('2026-09-25T12:00:00.000Z');
    const state = new FinanceFloorState(() => now);

    expect(state.recordActivity(0.75)).toEqual({
      guild: 'finance',
      activity_level: 0.75,
      observed_at: now.toISOString(),
    });
    expect(state.snapshot().activity_level).toBe(0.75);

    now = new Date('2026-09-25T12:01:00.001Z');
    expect(state.snapshot().activity_level).toBe(0);
  });

  it.each([-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid observed activity level %s',
    (activityLevel) => {
      expect(() => new FinanceFloorState().recordActivity(activityLevel)).toThrow(RangeError);
    },
  );

  it('records cleansed quest state changes and suppresses duplicate events', () => {
    const state = new FinanceFloorState(() => new Date('2026-09-25T12:00:00.000Z'));

    expect(state.recordQuest({ id: ' q-1 ', title: ' Reconcile public totals ', state: 'open' })).toEqual({
      guild: 'finance',
      observed_at: '2026-09-25T12:00:00.000Z',
      quest: { id: 'q-1', title: 'Reconcile public totals', state: 'open' },
    });
    expect(state.recordQuest({ id: 'q-1', title: 'Reconcile public totals', state: 'open' })).toBeNull();
    expect(state.recordQuest({ id: 'q-1', title: 'Reconcile public totals', state: 'closed' })).not.toBeNull();
    expect(state.snapshot().quests).toEqual([
      { id: 'q-1', title: 'Reconcile public totals', state: 'closed' },
    ]);
  });

  it('rejects empty and oversized quest fields', () => {
    const state = new FinanceFloorState();

    expect(() => state.recordQuest({ id: '', title: 'Title', state: 'open' })).toThrow(RangeError);
    expect(() => state.recordQuest({ id: 'q-1', title: ' ', state: 'open' })).toThrow(RangeError);
    expect(() => state.recordQuest({ id: 'x'.repeat(81), title: 'Title', state: 'open' })).toThrow(
      RangeError,
    );
    expect(() => state.recordQuest({ id: 'q-1', title: 'x'.repeat(121), state: 'open' })).toThrow(
      RangeError,
    );
  });

  it('retains only the newest one hundred public quests', () => {
    const state = new FinanceFloorState();
    for (let index = 0; index <= 100; index += 1) {
      state.recordQuest({ id: `q-${index}`, title: `Quest ${index}`, state: 'open' });
    }

    expect(state.snapshot().quests).toHaveLength(100);
    expect(state.snapshot().quests[0]?.id).toBe('q-1');
  });

  it('emits champion transitions only when Sterling changes state', () => {
    const state = new FinanceFloorState(() => new Date('2026-09-25T12:00:00.000Z'));

    expect(state.transitionChampion('idle')).toBeNull();
    expect(state.transitionChampion('working')).toEqual({
      champion: 'Sterling',
      guild: 'finance',
      observed_at: '2026-09-25T12:00:00.000Z',
      previous_state: 'idle',
      state: 'working',
    });
    expect(state.party().party[0].state).toBe('working');
  });
});
