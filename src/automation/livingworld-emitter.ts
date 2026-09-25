// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/automation/livingworld-emitter.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/finance-floor.ts, src/telemetry.ts, nats
// EnumType:    Service
// EnumEdges:   CONSUMES src/finance-floor.ts; PRODUCES citadel.finance.activity; PRODUCES citadel.finance.quest; PRODUCES citadel.finance.champion
// DAG Node:    finance.floor.emitter
// Intent:      Publish cleansed living-world state changes while degrading safely when NATS is unavailable.
// ───────────────────────────────────────────────────────────────

import { connect, StringCodec, type NatsConnection } from 'nats';

import { FLOOR_SUBJECTS, type FloorSubject } from '../config.js';
import type {
  FinanceFloorState,
  ChampionState,
  FinanceRealm,
  FloorQuest,
  PartyFeed,
} from '../finance-floor.js';
import { logInfo, logWarn } from '../logging.js';
import { NoopFloorTelemetry, type FloorTelemetry } from '../telemetry.js';

export interface FloorPublisher {
  close?(): Promise<void>;
  publish(subject: FloorSubject, payload: object): Promise<void>;
}

export class NoopFloorPublisher implements FloorPublisher {
  public async publish(): Promise<void> {
    return Promise.resolve();
  }
}

export class NatsFloorPublisher implements FloorPublisher {
  private readonly codec = StringCodec();

  public constructor(private readonly connection: NatsConnection) {}

  public async publish(
    subject: FloorSubject,
    payload: object,
  ): Promise<void> {
    this.connection.publish(subject, this.codec.encode(JSON.stringify(payload)));
    await this.connection.flush();
  }

  public async close(): Promise<void> {
    await this.connection.drain();
  }
}

export async function createNatsFloorPublisher(natsUrl: string | undefined): Promise<FloorPublisher> {
  if (natsUrl === undefined || natsUrl.trim().length === 0) {
    logWarn('floor_events_degraded', { reason: 'nats_url_missing' });
    return new NoopFloorPublisher();
  }

  try {
    const connection = await connect({ servers: natsUrl });
    logInfo('floor_events_connected', { transport: 'nats' });
    return new NatsFloorPublisher(connection);
  } catch (error) {
    logWarn('floor_events_degraded', {
      reason: 'nats_unavailable',
      error_type: error instanceof Error ? error.name : 'UnknownError',
    });
    return new NoopFloorPublisher();
  }
}

export class FinanceLivingWorld {
  public constructor(
    private readonly state: FinanceFloorState,
    private readonly publisher: FloorPublisher,
    private readonly telemetry: FloorTelemetry = new NoopFloorTelemetry(),
  ) {}

  public async heartbeat(activityLevel: number): Promise<void> {
    await this.telemetry.trace(
      'finance.floor.activity',
      { activity_level: activityLevel },
      async () => {
        const event = this.state.recordActivity(activityLevel);
        this.telemetry.activityHeartbeat(activityLevel);
        await this.publishSafely(FLOOR_SUBJECTS.activity, event);
      },
    );
  }

  public async updateQuest(quest: FloorQuest): Promise<boolean> {
    return this.telemetry.trace('finance.floor.quest', { quest_state: quest.state }, async () => {
      const event = this.state.recordQuest(quest);
      if (event === null) return false;
      this.telemetry.questThroughput(event.quest.state);
      await this.publishSafely(FLOOR_SUBJECTS.quest, event);
      return true;
    });
  }

  public async transitionChampion(state: ChampionState): Promise<boolean> {
    return this.telemetry.trace('finance.floor.champion', { champion_state: state }, async () => {
      const event = this.state.transitionChampion(state);
      if (event === null) return false;
      this.telemetry.championTransition(event.previous_state, event.state);
      await this.publishSafely(FLOOR_SUBJECTS.champion, event);
      return true;
    });
  }

  public realm(): FinanceRealm {
    return this.state.snapshot();
  }

  public party(): PartyFeed {
    return this.state.party();
  }

  private async publishSafely(
    subject: FloorSubject,
    event: object,
  ): Promise<void> {
    try {
      await this.publisher.publish(subject, event);
    } catch (error) {
      logWarn('floor_event_publish_failed', {
        subject,
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}
