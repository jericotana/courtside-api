import { EventType } from '../db/schema';

export type GameSummary = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
};
export type GamePlayer = { id: string; name: string };
export type GameEvent = {
  id: string;
  playerId: string | null;
  type: EventType;
  targetEventId: string | null;
  at: Date;
};
export type GameDetail = GameSummary & {
  players: GamePlayer[];
  events: GameEvent[];
};

export type RecordEventsResult = {
  inserted: number;
  received: number;
};

export type GameListItem = GameSummary & {
  playerCount: number;
  points: number;
};
