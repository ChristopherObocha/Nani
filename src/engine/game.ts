import { neighbors } from "./board";
import type {
  DuelState,
  GameSnapshot,
  HostAction,
  PublicSnapshot,
} from "./types";
const cleanSnapshot = (s: GameSnapshot): GameSnapshot =>
  structuredClone({ ...s, undo: undefined });
const withUndo = (next: GameSnapshot, prior: GameSnapshot): GameSnapshot => ({
  ...next,
  undo: cleanSnapshot(prior),
  updatedAt: Date.now(),
});
export function eligibleTerritories(s: GameSnapshot): string[] {
  return Object.values(s.blocks)
    .filter((b) =>
      b.cellIds.some((id) =>
        neighbors(id, s.board).some(
          (n) => s.board.find((c) => c.id === n)?.ownerId !== b.ownerId,
        ),
      ),
    )
    .map((b) => b.id);
}
export function eligibleDefenders(s: GameSnapshot, blockId: string) {
  const b = s.blocks[blockId];
  if (!b) return [];
  const ids = new Set(b.cellIds.flatMap((id) => neighbors(id, s.board)));
  return s.board.filter((c) => ids.has(c.id) && c.ownerId !== b.ownerId);
}
function settleClock(s: GameSnapshot, now: number) {
  if (!s.duel?.running || s.duel.startedAt === undefined) return s;
  const startedAt = s.duel.startedAt,
    d = structuredClone(s.duel);
  const elapsed = Math.max(0, now - startedAt);
  d.clocks[d.activePlayerId] = Math.max(
    0,
    d.clocks[d.activePlayerId] - elapsed,
  );
  d.startedAt = now;
  return { ...s, duel: d };
}
function finish(s: GameSnapshot, loserId: string): GameSnapshot {
  const d = s.duel!;
  const winnerId = d.players.find((p) => p !== loserId)!;
  const defenderCell = s.board.find((c) => c.id === d.defenderCellId)!;
  const challenger = s.blocks[d.challengerBlockId];
  const defender = s.blocks[defenderCell.blockId!]!;
  const challengerLost = loserId === challenger.ownerId;
  const losingCell = challengerLost
    ? s.board.find(
        (c) =>
          challenger.cellIds.includes(c.id) &&
          neighbors(defenderCell.id, s.board).includes(c.id),
      )!
    : defenderCell;
  const losingBlock = challengerLost ? challenger : defender;
  const winnerBlock = challengerLost ? defender : challenger;
  const blocks = { ...s.blocks };
  delete blocks[losingBlock.id];
  delete blocks[winnerBlock.id];
  let board = s.board.map((c) => ({ ...c }));
  const remainder = new Set(
    losingBlock.cellIds.filter((id) => id !== losingCell.id),
  );
  let split = 0;
  while (remainder.size) {
    const first = remainder.values().next().value as string,
      component: string[] = [first],
      queue = [first];
    remainder.delete(first);
    while (queue.length) {
      for (const n of neighbors(queue.shift()!, board))
        if (remainder.has(n)) {
          remainder.delete(n);
          component.push(n);
          queue.push(n);
        }
    }
    const id =
      split++ === 0 ? losingBlock.id : `${losingBlock.id}-split-${split}`;
    blocks[id] = { ...losingBlock, id, cellIds: component };
    board = board.map((c) =>
      component.includes(c.id) ? { ...c, blockId: id } : c,
    );
  }
  const winningBlock = {
    ...winnerBlock,
    ownerId: winnerId,
    categoryId: challenger.categoryId,
    cellIds: [...new Set([...winnerBlock.cellIds, losingCell.id])],
  };
  blocks[winnerBlock.id] = winningBlock;
  board = board.map((c) =>
    winningBlock.cellIds.includes(c.id)
      ? {
          ...c,
          ownerId: winnerId,
          categoryId: challenger.categoryId,
          blockId: winnerBlock.id,
          captured: c.captured || c.id === losingCell.id,
        }
      : c,
  );
  const players = s.players.map((p) => {
    const lives = board.filter((c) => c.playable && c.ownerId === p.id).length;
    return {
      ...p,
      lives,
      eliminated: lives === 0,
      streak:
        p.id === winnerId ? p.streak + 1 : p.id === loserId ? 0 : p.streak,
    };
  });
  const won = players.find(
    (p) => p.lives === board.filter((c) => c.playable).length,
  );
  return {
    ...s,
    board,
    blocks,
    players,
    activeBlockId: winnerBlock.id,
    phase: won ? "game-over" : "duel-result",
    winnerId: won?.id,
    duel: { ...d, running: false, winnerId, loserId },
  };
}
export function reduceHostAction(
  state: GameSnapshot,
  action: HostAction,
): GameSnapshot {
  if (action.type === "UNDO") {
    if (!state.undo) return state;
    const restored = structuredClone(state.undo);
    return {
      ...restored,
      randomiser: undefined,
      phase: restored.phase === "countdown" ? "duel-ready" : restored.phase,
      duel:
        restored.phase === "countdown" && restored.duel
          ? { ...restored.duel, countdownEndsAt: undefined }
          : restored.duel?.running
            ? { ...restored.duel, startedAt: action.now }
            : restored.duel,
      undo: undefined,
    };
  }
  let s = state;
  switch (action.type) {
    case "LOCK_BOARD":
      return withUndo({ ...s, locked: true, phase: "ready" }, state);
    case "START_GAME":
      return withUndo({ ...s, phase: "selecting" }, state);
    case "START_DUEL": {
      if (s.randomiser || !["selecting", "ready"].includes(s.phase)) return s;
      const cb = s.blocks[action.challengerBlockId],
        dc = s.board.find((c) => c.id === action.defenderCellId);
      if (
        !cb ||
        !dc ||
        !dc.categoryId ||
        !eligibleDefenders(s, cb.id).some((c) => c.id === dc.id)
      )
        throw new Error("Defender must touch the challenger");
      const d: DuelState = {
        challengerBlockId: cb.id,
        defenderCellId: dc.id,
        categoryId: dc.categoryId,
        players: [cb.ownerId, dc.ownerId!],
        activePlayerId: cb.ownerId,
        clocks: {
          [cb.ownerId]: s.config.duelDurationMs,
          [dc.ownerId!]: s.config.duelDurationMs,
        },
        questionIndex: 0,
        running: false,
      };
      return withUndo(
        { ...s, phase: "duel-ready", activeBlockId: cb.id, duel: d },
        state,
      );
    }
    case "RANDOMISE": {
      if (s.phase !== "selecting" || s.randomiser || s.activeBlockId) return s;
      const ids = eligibleTerritories(s);
      if (!ids.length) return s;
      const cellIds = s.board
        .filter((c) => c.playable && ids.includes(c.blockId!))
        .map((c) => c.id);
      for (let i = cellIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellIds[i], cellIds[j]] = [cellIds[j], cellIds[i]];
      }
      return withUndo(
        {
          ...s,
          randomiser: {
            startedAt: action.now,
            endsAt: action.now + 4000,
            cellIds,
            winnerBlockId: ids[Math.floor(Math.random() * ids.length)],
          },
        },
        state,
      );
    }
    case "SELECT_CHALLENGER":
      return s.phase === "selecting" &&
        !s.randomiser &&
        !s.activeBlockId &&
        eligibleTerritories(s).includes(action.blockId)
        ? withUndo({ ...s, activeBlockId: action.blockId }, state)
        : s;
    case "BEGIN_DUEL":
      return s.phase === "duel-ready" && s.duel
        ? withUndo(
            {
              ...s,
              phase: "countdown",
              duel: { ...s.duel, countdownEndsAt: action.now + 5000 },
            },
            state,
          )
        : s;
    case "PASS": {
      if (s.phase !== "duel" || !s.duel?.running) return s;
      s = settleClock(s, action.now);
      if (!s.duel) return s;
      const d = {
        ...s.duel,
        questionIndex: s.duel.questionIndex + 1,
        clocks: {
          ...s.duel.clocks,
          [s.duel.activePlayerId]: Math.max(
            0,
            s.duel.clocks[s.duel.activePlayerId] - s.config.passPenaltyMs,
          ),
        },
        startedAt: action.now,
      };
      return withUndo(
        d.clocks[d.activePlayerId] <= 0
          ? finish({ ...s, duel: d }, d.activePlayerId)
          : { ...s, duel: d },
        state,
      );
    }
    case "CORRECT": {
      if (s.phase !== "duel" || !s.duel?.running) return s;
      s = settleClock(s, action.now);
      if (s.duel!.clocks[s.duel!.activePlayerId] <= 0)
        return withUndo(finish(s, s.duel!.activePlayerId), state);
      if (!s.duel) return s;
      const active = s.duel.players.find((p) => p !== s.duel!.activePlayerId)!;
      return withUndo(
        {
          ...s,
          duel: {
            ...s.duel,
            activePlayerId: active,
            questionIndex: s.duel.questionIndex + 1,
            startedAt: action.now,
          },
        },
        state,
      );
    }
    case "PAUSE": {
      if (s.phase !== "duel" || !s.duel?.running) return s;
      s = settleClock(s, action.now);
      if (s.duel!.clocks[s.duel!.activePlayerId] <= 0)
        return withUndo(finish(s, s.duel!.activePlayerId), state);
      return s.duel
        ? withUndo(
            { ...s, duel: { ...s.duel, running: false, startedAt: undefined } },
            state,
          )
        : s;
    }
    case "RESUME":
      return s.phase === "duel" && s.duel && !s.duel.running
        ? withUndo(
            { ...s, duel: { ...s.duel, running: true, startedAt: action.now } },
            state,
          )
        : s;
    case "TICK": {
      if (s.randomiser) {
        if (action.now < s.randomiser.endsAt) return s;
        return {
          ...s,
          activeBlockId: s.randomiser.winnerBlockId,
          randomiser: undefined,
          updatedAt: action.now,
        };
      }
      if (s.phase === "countdown" && s.duel?.countdownEndsAt !== undefined) {
        if (action.now < s.duel.countdownEndsAt) return s;
        // Both displays start at the same deadline, including when a host tick is delayed.
        s = {
          ...s,
          phase: "duel",
          duel: {
            ...s.duel,
            running: true,
            startedAt: s.duel.countdownEndsAt,
            countdownEndsAt: undefined,
          },
        };
      }
      if (s.phase !== "duel" || !s.duel?.running) return s;
      s = settleClock(s, action.now);
      const loser = s.duel?.players.find((p) => s.duel!.clocks[p] <= 0);
      return loser ? withUndo(finish(s, loser), state) : s;
    }
    case "FORCE_EXPIRE":
      if (s.phase !== "duel" || !s.duel?.players.includes(action.loserId))
        return s;
      return withUndo(
        finish(settleClock(s, action.now), action.loserId),
        state,
      );
    case "CONTINUE":
      if (s.phase !== "duel-result") return s;
      return withUndo({ ...s, phase: "selecting", duel: undefined }, state);
    case "STEP_DOWN":
      if (s.phase !== "duel-result") return s;
      return withUndo(
        { ...s, phase: "selecting", duel: undefined, activeBlockId: undefined },
        state,
      );
  }
}
export function publicSnapshot(s: GameSnapshot): PublicSnapshot {
  let question, currentCategory;
  if (s.duel) {
    const category = s.categories.find((c) => c.id === s.duel!.categoryId);
    const q =
      category?.questions[
        s.duel.questionIndex % Math.max(category.questions.length, 1)
      ];
    if (q && !["duel-ready", "countdown"].includes(s.phase))
      question = { text: q.text, imageId: q.imageId };
    currentCategory = category?.name;
  }
  return {
    phase: s.phase,
    board: s.board,
    blocks: s.blocks,
    players: s.players,
    categoryNames: Object.fromEntries(s.categories.map((c) => [c.id, c.name])),
    currentCategory,
    config: {
      duelDurationMs: s.config.duelDurationMs,
      passPenaltyMs: s.config.passPenaltyMs,
    },
    activeBlockId: s.activeBlockId,
    randomiser: s.randomiser,
    duel: s.duel,
    question,
    winnerId: s.winnerId,
    updatedAt: s.updatedAt,
  };
}
