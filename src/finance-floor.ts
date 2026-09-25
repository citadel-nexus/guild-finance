// ─── CGRF Header ───────────────────────────────────────────────
// File:        src/finance-floor.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-FINANCE-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-finance
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/config.ts, src/progression.ts
// EnumType:    Service
// EnumEdges:   DEPENDS_ON src/config.ts; DEPENDS_ON src/progression.ts; PRODUCES src/routes/realm.ts; PRODUCES citadel.finance.activity; PRODUCES citadel.finance.quest; PRODUCES citadel.finance.champion
// DAG Node:    finance.floor.state
// Intent:      Maintain a deterministic public floor projection sourced only from observed guild operations.
// ───────────────────────────────────────────────────────────────

import { CHAMPION, GUILD } from './config.js';
import {
  addProgress,
  EMPTY_PROGRESSION,
  structureLevel,
  validateTotals,
  type ProgressionMetric,
  type ProgressionTotals,
  type StructureLevel,
} from './progression.js';

export type ChampionState = 'blocked' | 'idle' | 'working';
export type QuestState = 'closed' | 'open';

export interface FloorQuest {
  readonly id: string;
  readonly state: QuestState;
  readonly title: string;
}

export interface FinanceRealm {
  readonly activity_level: number;
  readonly champion: typeof CHAMPION;
  readonly guild: typeof GUILD;
  readonly quests: readonly FloorQuest[];
  readonly structures: readonly [{ readonly kind: 'hall'; readonly level: StructureLevel }];
}

export interface PartyFeed {
  readonly party: readonly [
    {
      readonly champion: typeof CHAMPION;
      readonly guild: typeof GUILD;
      readonly role: 'guildmaster';
      readonly state: ChampionState;
    },
  ];
}

export interface ActivityEvent {
  readonly activity_level: number;
  readonly guild: typeof GUILD;
  readonly observed_at: string;
}

export interface QuestEvent {
  readonly guild: typeof GUILD;
  readonly observed_at: string;
  readonly quest: FloorQuest;
}

export interface ChampionEvent {
  readonly champion: typeof CHAMPION;
  readonly guild: typeof GUILD;
  readonly observed_at: string;
  readonly previous_state: ChampionState;
  readonly state: ChampionState;
}

export type Clock = () => Date;

const ACTIVITY_TTL_MS = 60_000;
const MAX_QUESTS = 100;

export class FinanceFloorState {
  private activityLevel = 0;
  private activityObservedAt: Date | null = null;
  private championState: ChampionState = 'idle';
  private readonly quests = new Map<string, FloorQuest>();
  private progression: ProgressionTotals = { ...EMPTY_PROGRESSION };

  public constructor(private readonly clock: Clock = () => new Date()) {}

  public recordActivity(activityLevel: number): ActivityEvent {
    if (!Number.isFinite(activityLevel) || activityLevel < 0 || activityLevel > 1) {
      throw new RangeError('activity_level must be a finite number between 0 and 1');
    }

    const observedAt = this.clock();
    this.activityLevel = activityLevel;
    this.activityObservedAt = observedAt;
    return {
      guild: GUILD,
      activity_level: activityLevel,
      observed_at: observedAt.toISOString(),
    };
  }

  public recordQuest(quest: FloorQuest): QuestEvent | null {
    const sanitized = sanitizeQuest(quest);
    const current = this.quests.get(sanitized.id);
    if (current?.state === sanitized.state && current.title === sanitized.title) {
      return null;
    }

    this.quests.delete(sanitized.id);
    this.quests.set(sanitized.id, sanitized);
    while (this.quests.size > MAX_QUESTS) {
      const oldest = this.quests.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.quests.delete(oldest);
    }

    return {
      guild: GUILD,
      observed_at: this.clock().toISOString(),
      quest: sanitized,
    };
  }

  public transitionChampion(state: ChampionState): ChampionEvent | null {
    if (state === this.championState) return null;
    const previousState = this.championState;
    this.championState = state;
    return {
      champion: CHAMPION,
      guild: GUILD,
      observed_at: this.clock().toISOString(),
      previous_state: previousState,
      state,
    };
  }

  public recordProgress(metric: ProgressionMetric, units: number): void {
    this.progression = addProgress(this.progression, metric, units);
  }

  public setProgression(totals: ProgressionTotals): void {
    validateTotals(totals);
    this.progression = { ...totals };
  }

  public snapshot(): FinanceRealm {
    const activityLevel = this.isActivityFresh() ? this.activityLevel : 0;
    return {
      guild: GUILD,
      champion: CHAMPION,
      activity_level: activityLevel,
      quests: [...this.quests.values()].map((quest) => ({ ...quest })),
      structures: [{ kind: 'hall', level: structureLevel(this.progression) }],
    };
  }

  public party(): PartyFeed {
    return {
      party: [
        {
          guild: GUILD,
          champion: CHAMPION,
          role: 'guildmaster',
          state: this.championState,
        },
      ],
    };
  }

  private isActivityFresh(): boolean {
    if (this.activityObservedAt === null) return false;
    return this.clock().getTime() - this.activityObservedAt.getTime() <= ACTIVITY_TTL_MS;
  }
}

export function quietFinanceRealm(): FinanceRealm {
  return {
    guild: GUILD,
    champion: CHAMPION,
    activity_level: 0,
    quests: [],
    structures: [{ kind: 'hall', level: 1 }],
  };
}

function sanitizeQuest(quest: FloorQuest): FloorQuest {
  const id = quest.id.trim();
  const title = quest.title.trim();
  if (id.length === 0 || id.length > 80) {
    throw new RangeError('quest id must contain between 1 and 80 characters');
  }
  if (title.length === 0 || title.length > 120) {
    throw new RangeError('quest title must contain between 1 and 120 characters');
  }
  return { id, title, state: quest.state };
}
