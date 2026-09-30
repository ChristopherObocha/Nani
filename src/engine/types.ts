export type GamePhase =
  | "setup"
  | "board"
  | "ready"
  | "selecting"
  | "duel-ready"
  | "countdown"
  | "duel"
  | "duel-result"
  | "game-over";
export interface GameConfig {
  activeCategoriesPerPlayer: number;
  duelDurationMs: number;
  passPenaltyMs: number;
}
export interface Player {
  id: string;
  name: string;
  color: string;
  lives: number;
  eliminated: boolean;
  streak: number;
}
export interface Question {
  id: string;
  text?: string;
  imageId?: string;
  answer: string;
  acceptedAnswers: string[];
}
export interface Category {
  id: string;
  ownerId: string;
  name: string;
  active: boolean;
  questions: Question[];
}
export interface BoardCell {
  id: string;
  row: number;
  col: number;
  playable: boolean;
  ownerId?: string;
  categoryId?: string;
  blockId?: string;
  captured?: boolean;
}
export interface TerritoryBlock {
  id: string;
  ownerId: string;
  categoryId: string;
  cellIds: string[];
}
export interface DuelState {
  challengerBlockId: string;
  defenderCellId: string;
  categoryId: string;
  players: [string, string];
  activePlayerId: string;
  clocks: Record<string, number>;
  questionIndex: number;
  running: boolean;
  startedAt?: number;
  countdownEndsAt?: number;
  winnerId?: string;
  loserId?: string;
}
export interface RandomiserState {
  startedAt: number;
  endsAt: number;
  cellIds: string[];
  winnerBlockId: string;
}
export interface GameSnapshot {
  id: string;
  name: string;
  config: GameConfig;
  players: Player[];
  categories: Category[];
  board: BoardCell[];
  rows: number;
  cols: number;
  blocks: Record<string, TerritoryBlock>;
  phase: GamePhase;
  locked: boolean;
  activeBlockId?: string;
  randomiser?: RandomiserState;
  duel?: DuelState;
  winnerId?: string;
  updatedAt: number;
  undo?: GameSnapshot;
}
export type HostAction =
  | { type: "RANDOMISE"; now: number }
  | { type: "SELECT_CHALLENGER"; blockId: string }
  | { type: "BEGIN_DUEL"; now: number }
  | { type: "LOCK_BOARD" }
  | { type: "START_GAME"; now: number }
  | {
      type: "START_DUEL";
      challengerBlockId: string;
      defenderCellId: string;
      now: number;
    }
  | { type: "CORRECT"; now: number }
  | { type: "PASS"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "TICK"; now: number }
  | { type: "FORCE_EXPIRE"; loserId: string; now: number }
  | { type: "CONTINUE" }
  | { type: "STEP_DOWN" }
  | { type: "UNDO"; now: number };
export interface PublicQuestion {
  text?: string;
  imageId?: string;
}
export interface PublicSnapshot {
  phase: GamePhase;
  board: BoardCell[];
  blocks: Record<string, TerritoryBlock>;
  players: Player[];
  categoryNames: Record<string, string>;
  currentCategory?: string;
  config: Pick<GameConfig, "duelDurationMs" | "passPenaltyMs">;
  activeBlockId?: string;
  randomiser?: RandomiserState;
  duel?: DuelState;
  question?: PublicQuestion;
  winnerId?: string;
  updatedAt: number;
}
