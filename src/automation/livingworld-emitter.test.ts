// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/livingworld-emitter.test.ts
// Stage:       08_TEST
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/automation/livingworld-emitter.ts
// EnumType:    Test
// EnumEdges:   VALIDATES src/automation/livingworld-emitter.ts
// DAG Node:    finance.floor.emitter.test
// Intent:      Verify exact Finance NATS subjects, transition suppression, metrics, and fail-soft publishing.
// ───────────────────────────────────────────────────────────────

import { StringCodec, type NatsConnection } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import { FLOOR_SUBJECTS, type FloorSubject } from '../config.js';
import { FinanceFloorState } from '../finance-floor.js';
import type { FloorTelemetry } from '../telemetry.js';
import {
  createNatsFloorPublisher,
  FinanceLivingWorld,
  NatsFloorPublisher,
  NoopFloorPublisher,
  type FloorPublisher,
} from './livingworld-emitter.js';

class RecordingPublisher implements FloorPublisher {
  public readonly events: Array<{ payload: object; subject: FloorSubject }> = [];

  public async publish(
    subject: FloorSubject,
    payload: object,
  ): Promise<void> {
    this.events.push({ subject, payload });
  }
}

class RecordingTelemetry implements FloorTelemetry {
  public readonly activity: number[] = [];
  public readonly champions: string[] = [];
  public readonly quests: string[] = [];
  public readonly traces: string[] = [];

  public activityHeartbeat(level: number): void {
    this.activity.push(level);
  }

  public championTransition(previous: string, current: string): void {
    this.champions.push(`${previous}:${current}`);
  }

  public questThroughput(state: string): void {
    this.quests.push(state);
  }

  public async trace<T>(
    operation: string,
    _tags: Readonly<Record<string, string | number>>,
    work: () => Promise<T>,
  ): Promise<T> {
    this.traces.push(operation);
    return work();
  }
}

describe('FinanceLivingWorld', () => {
  it('publishes the three public events and records operation metrics', async () => {
    const publisher = new RecordingPublisher();
    const telemetry = new RecordingTelemetry();
    const floor = new FinanceLivingWorld(
      new FinanceFloorState(() => new Date('2026-09-25T12:00:00.000Z')),
      publisher,
      telemetry,
    );

    await floor.heartbeat(0.4);
    await expect(
      floor.updateQuest({ id: 'q-1', title: 'Publish verified totals', state: 'open' }),
    ).resolves.toBe(true);
    await expect(floor.transitionChampion('working')).resolves.toBe(true);

    expect(publisher.events.map(({ subject }) => subject)).toEqual([
      FLOOR_SUBJECTS.activity,
      FLOOR_SUBJECTS.quest,
      FLOOR_SUBJECTS.champion,
    ]);
    expect(telemetry.activity).toEqual([0.4]);
    expect(telemetry.quests).toEqual(['open']);
    expect(telemetry.champions).toEqual(['idle:working']);
    expect(telemetry.traces).toEqual([
      'finance.floor.activity',
      'finance.floor.quest',
      'finance.floor.champion',
    ]);
    expect(floor.realm().activity_level).toBe(0.4);
    expect(floor.party().party[0].state).toBe('working');
  });

  it('suppresses duplicate quest and champion state events', async () => {
    const publisher = new RecordingPublisher();
    const floor = new FinanceLivingWorld(new FinanceFloorState(), publisher);

    await floor.updateQuest({ id: 'q-1', title: 'Quest', state: 'open' });
    await expect(floor.updateQuest({ id: 'q-1', title: 'Quest', state: 'open' })).resolves.toBe(false);
    await expect(floor.transitionChampion('idle')).resolves.toBe(false);

    expect(publisher.events).toHaveLength(1);
  });

  it('keeps local observed state when event publishing fails', async () => {
    const publisher: FloorPublisher = {
      publish: vi.fn().mockRejectedValue(new Error('offline')),
    };
    const floor = new FinanceLivingWorld(new FinanceFloorState(), publisher);

    await expect(floor.heartbeat(0.2)).resolves.toBeUndefined();
    expect(floor.realm().activity_level).toBe(0.2);
  });

  it('uses a no-op publisher when no NATS endpoint is configured', async () => {
    await expect(createNatsFloorPublisher(undefined)).resolves.toBeInstanceOf(NoopFloorPublisher);
    await expect(new NoopFloorPublisher().publish(FLOOR_SUBJECTS.activity, {})).resolves.toBeUndefined();
  });

  it('encodes and flushes NATS events and drains on close', async () => {
    const publish = vi.fn();
    const flush = vi.fn().mockResolvedValue(undefined);
    const drain = vi.fn().mockResolvedValue(undefined);
    const connection = { publish, flush, drain } as unknown as NatsConnection;
    const publisher = new NatsFloorPublisher(connection);

    await publisher.publish(FLOOR_SUBJECTS.activity, { activity_level: 0.5 });
    await publisher.close();

    expect(publish).toHaveBeenCalledOnce();
    expect(publish.mock.calls[0]?.[0]).toBe(FLOOR_SUBJECTS.activity);
    expect(StringCodec().decode(publish.mock.calls[0]?.[1] as Uint8Array)).toBe(
      JSON.stringify({ activity_level: 0.5 }),
    );
    expect(flush).toHaveBeenCalledOnce();
    expect(drain).toHaveBeenCalledOnce();
  });
});
