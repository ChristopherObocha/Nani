import { describe, expect, it } from "vitest";
import { createConfiguredGame } from "./setup";
import {
  eligibleDefenders,
  eligibleTerritories,
  publicSnapshot,
  reduceHostAction,
} from "./game";
import { recoverSession } from "../data/repository";

function staged() {
  let game = createConfiguredGame(["Ada", "Bo", "Cy"], 2);
  game.phase = "selecting";
  const challenger = eligibleTerritories(game)[0];
  game = reduceHostAction(game, {
    type: "START_DUEL",
    challengerBlockId: challenger,
    defenderCellId: eligibleDefenders(game, challenger)[0].id,
    now: 0,
  });
  return game;
}

describe("synchronised duel and randomiser timing", () => {
  it("holds a staged duel indefinitely, then counts down five seconds without spending clock time or revealing the question", () => {
    let game = staged();
    const clocks = game.duel!.clocks;
    expect(game.phase).toBe("duel-ready");
    expect(game.duel!.running).toBe(false);
    expect(reduceHostAction(game, { type: "TICK", now: 50000 })).toBe(game);
    expect(publicSnapshot(game).question).toBeUndefined();
    for (const type of ["CORRECT", "PASS", "RESUME"] as const)
      expect(reduceHostAction(game, { type, now: 50000 })).toBe(game);
    game = reduceHostAction(game, { type: "BEGIN_DUEL", now: 50000 });
    expect(game.phase).toBe("countdown");
    expect(publicSnapshot(game).duel?.countdownEndsAt).toBe(55000);
    expect(publicSnapshot(game).question).toBeUndefined();
    expect(
      reduceHostAction(game, { type: "TICK", now: 54999 }).duel?.clocks,
    ).toEqual(clocks);
    game = reduceHostAction(game, { type: "TICK", now: 55000 });
    expect(game.phase).toBe("duel");
    expect(game.duel?.running).toBe(true);
    expect(game.duel?.clocks).toEqual(clocks);
    expect(publicSnapshot(game).question?.text).toBe("Sample question");
    expect(JSON.stringify(publicSnapshot(game))).not.toMatch(
      /answer|acceptedAnswers/i,
    );
    game = reduceHostAction(game, { type: "TICK", now: 56250 });
    expect(game.duel!.clocks[game.duel!.activePlayerId]).toBe(43750);
  });
  it("charges delayed ticks from the countdown deadline and recovers countdowns safely", () => {
    const game = reduceHostAction(staged(), { type: "BEGIN_DUEL", now: 0 });
    const late = reduceHostAction(game, { type: "TICK", now: 7000 });
    expect(late.duel!.clocks[late.duel!.activePlayerId]).toBe(43000);
    expect(recoverSession(game).phase).toBe("duel-ready");
    expect(recoverSession(game).duel?.countdownEndsAt).toBeUndefined();
    const undone = reduceHostAction(game, { type: "UNDO", now: 100000 });
    expect(undone.phase).toBe("duel-ready");
  });
  it("visits every eligible tile in the sweep, locks input, and settles at four seconds", () => {
    let game = createConfiguredGame(["Ada", "Bo", "Cy"], 3);
    game.phase = "selecting";
    game = reduceHostAction(game, { type: "RANDOMISE", now: 1000 });
    const randomiser = game.randomiser!;
    expect(new Set(randomiser.cellIds).size).toBe(
      game.board.filter(
        (c) => c.playable && eligibleTerritories(game).includes(c.blockId!),
      ).length,
    );
    expect(publicSnapshot(game).randomiser).toEqual(randomiser);
    expect(reduceHostAction(game, { type: "TICK", now: 4999 })).toBe(game);
    expect(reduceHostAction(game, { type: "RANDOMISE", now: 1100 })).toBe(game);
    expect(
      reduceHostAction(game, {
        type: "SELECT_CHALLENGER",
        blockId: randomiser.winnerBlockId,
      }),
    ).toBe(game);
    game = reduceHostAction(game, { type: "TICK", now: 5000 });
    expect(game.randomiser).toBeUndefined();
    expect(game.activeBlockId).toBe(randomiser.winnerBlockId);
    expect(eligibleTerritories(game)).toContain(game.activeBlockId);
  });
  it("cannot score while paused or resume after a result and marks captured tiles", () => {
    let game = reduceHostAction(staged(), { type: "BEGIN_DUEL", now: 0 });
    game = reduceHostAction(game, { type: "TICK", now: 5000 });
    game = reduceHostAction(game, { type: "PAUSE", now: 5500 });
    expect(reduceHostAction(game, { type: "PASS", now: 8000 })).toBe(game);
    game = reduceHostAction(game, {
      type: "FORCE_EXPIRE",
      loserId: game.duel!.players[1],
      now: 9000,
    });
    expect(game.board.filter((c) => c.captured)).toHaveLength(1);
    expect(reduceHostAction(game, { type: "RESUME", now: 10000 })).toBe(game);
  });
});
