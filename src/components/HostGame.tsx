import { useEffect, useMemo, useState } from "react";
import type { BoardCell, GameSnapshot } from "../engine/types";
import {
  eligibleDefenders,
  eligibleTerritories,
  reduceHostAction,
} from "../engine/game";
import { shuffleBoard, swapCells } from "../engine/board";
import { rebuildBlocks } from "../engine/setup";
import { Board } from "./Board";
import { Leaderboard } from "./Leaderboard";
import { DuelStage } from "./DuelStage";
import { ProfileReveal } from "./ProfileReveal";

export function HostGame({
  game,
  onChange,
  onBack,
  onReset,
}: {
  game: GameSnapshot;
  onChange: (g: GameSnapshot) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<string>();
  const challenger =
    game.phase === "selecting" ? game.activeBlockId : undefined;
  useEffect(() => {
    if (
      !game.randomiser &&
      game.phase !== "countdown" &&
      !(game.phase === "duel" && game.duel?.running)
    )
      return;
    const timer = window.setInterval(
      () => {
        const next = reduceHostAction(game, { type: "TICK", now: Date.now() });
        if (next !== game) onChange(next);
      },
      game.phase === "duel" ? 100 : 50,
    );
    return () => window.clearInterval(timer);
  }, [game, onChange]);
  const defenders = useMemo(
    () => (challenger ? eligibleDefenders(game, challenger) : []),
    [game, challenger],
  );
  const category = game.duel
    ? game.categories.find((c) => c.id === game.duel!.categoryId)
    : undefined;
  const q =
    category && game.duel
      ? category.questions[game.duel.questionIndex % category.questions.length]
      : undefined;
  const act = (a: Parameters<typeof reduceHostAction>[1]) =>
    onChange(reduceHostAction(game, a));
  const choose = (c: BoardCell) => {
    if (game.randomiser) return;
    if (game.phase === "board" && !game.locked) {
      if (!selected) setSelected(c.id);
      else {
        const board = swapCells(game.board, selected, c.id, false);
        onChange({ ...game, board, blocks: rebuildBlocks(board) });
        setSelected(undefined);
      }
    } else if (
      game.phase === "selecting" &&
      !challenger &&
      eligibleTerritories(game).includes(c.blockId!)
    )
      act({ type: "SELECT_CHALLENGER", blockId: c.blockId! });
    else if (
      game.phase === "selecting" &&
      challenger &&
      defenders.some((x) => x.id === c.id)
    )
      act({
        type: "START_DUEL",
        challengerBlockId: challenger,
        defenderCellId: c.id,
        now: Date.now(),
      });
  };
  const challengerPlayer = challenger
    ? game.players.find((p) => p.id === game.blocks[challenger]?.ownerId)
    : undefined;
  const title =
    game.phase === "board"
      ? "Arrange the floor"
      : game.phase === "game-over"
        ? "Floor claimed"
        : game.duel
          ? "The duel"
          : "Choose a challenger";
  return (
    <main className="host">
      <nav>
        <div>
          <span className="mark">F</span>
          <strong>The Floor</strong>
          <span className="nav-divider" />
          <small>Host console</small>
        </div>
        <div>
          <button
            className="secondary"
            onClick={() =>
              window.open(`${location.pathname}?public=1`, "floor-public")
            }
          >
            Open public display <span aria-hidden="true">↗</span>
          </button>
          <button
            className="danger"
            onClick={() => {
              if (confirm("Reset this game and remove its saved state?"))
                onReset();
            }}
          >
            New game
          </button>
        </div>
      </nav>
      <div className="game-layout">
        <section className={`stage ${game.duel ? "has-duel" : ""}`}>
          <div className="stage-head">
            <div>
              <p className="kicker">{game.name}</p>
              <h1>{title}</h1>
            </div>
            <span className="stage-meta">
              {game.players.filter((p) => !p.eliminated).length} contestants ·{" "}
              {game.board.filter((c) => c.playable).length} tiles
            </span>
          </div>
          {game.duel && (
            <DuelStage
              duel={game.duel}
              phase={game.phase}
              players={game.players}
              category={category?.name}
              question={q}
            />
          )}
          <div className="floor-heading">
            <h2>The floor</h2>
            <div className="board-legend">
              <span>Unclaimed</span>
              <span className="legend-captured">Captured</span>
            </div>
          </div>
          <Board
            cells={game.board}
            players={game.players}
            categories={game.categories}
            blocks={game.blocks}
            rows={game.rows}
            cols={game.cols}
            selected={selected}
            activeBlockId={game.activeBlockId}
            randomiser={game.randomiser}
            defenders={defenders.map((c) => c.id)}
            duelCellIds={
              game.duel
                ? [
                    ...(game.blocks[game.duel.challengerBlockId]?.cellIds ??
                      []),
                    game.duel.defenderCellId,
                  ]
                : []
            }
            onSelect={
              ["board", "selecting"].includes(game.phase) ? choose : undefined
            }
          />
          <p className="hint" role="status">
            {game.randomiser
              ? "Finding the next challenger…"
              : game.phase === "board"
                ? "Select two tiles to swap their positions."
                : game.phase === "selecting"
                  ? challenger
                    ? "Select an outlined opponent tile to set the duel."
                    : "Run the randomiser, or select a contestant on the floor."
                  : game.phase === "ready"
                    ? "The floor is locked. Start when the room is ready."
                    : "Every duel brings the floor closer."}
          </p>
        </section>
        <aside className="control">
          <section className="host-controls">
            <p className="kicker">Host controls</p>
            {game.phase === "board" && (
              <>
                <h2>Set the stage.</h2>
                <p>Arrange the contestants, then lock in the floor.</p>
                <button onClick={() => act({ type: "LOCK_BOARD" })}>
                  Lock board <span aria-hidden="true">→</span>
                </button>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      const board = shuffleBoard(game.board);
                      setSelected(undefined);
                      onChange({
                        ...game,
                        board,
                        blocks: rebuildBlocks(board),
                      });
                    }}
                  >
                    Reshuffle
                  </button>
                  <button className="secondary" onClick={onBack}>
                    Edit questions
                  </button>
                </div>
              </>
            )}
            {game.phase === "ready" && (
              <>
                <h2>Ready for the room.</h2>
                <p>Start the game to choose your first challenger.</p>
                <button
                  onClick={() => act({ type: "START_GAME", now: Date.now() })}
                >
                  Start game <span aria-hidden="true">→</span>
                </button>
              </>
            )}
            {game.phase === "selecting" && (
              <>
                <h2>{challenger ? "Pick an opponent." : "Who’s up next?"}</h2>
                {!challenger && (
                  <>
                    <p>
                      The spotlight moves across the floor for four seconds.
                    </p>
                    <button
                      disabled={!!game.randomiser}
                      onClick={() =>
                        act({ type: "RANDOMISE", now: Date.now() })
                      }
                    >
                      {game.randomiser
                        ? "Choosing challenger…"
                        : "Random challenger"}
                    </button>
                  </>
                )}
                {challengerPlayer && (
                  <ProfileReveal
                    key={challenger}
                    name={challengerPlayer.name}
                    metadata={`${challengerPlayer.lives} tiles · Challenger`}
                  />
                )}
                {challenger && (
                  <div className="opponent-list">
                    {defenders.map((d) => (
                      <button
                        className="secondary"
                        key={d.id}
                        onClick={() =>
                          act({
                            type: "START_DUEL",
                            challengerBlockId: challenger,
                            defenderCellId: d.id,
                            now: Date.now(),
                          })
                        }
                      >
                        Challenge{" "}
                        {game.players.find((p) => p.id === d.ownerId)?.name}
                        <small>
                          {
                            game.categories.find((c) => c.id === d.categoryId)
                              ?.name
                          }
                        </small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {game.phase === "duel-ready" && (
              <>
                <h2>Both sides are set.</h2>
                <p>
                  Begin a five-second countdown on this screen and the public
                  display.
                </p>
                <button
                  className="begin-duel"
                  onClick={() => act({ type: "BEGIN_DUEL", now: Date.now() })}
                >
                  Begin duel <span aria-hidden="true">→</span>
                </button>
              </>
            )}
            {game.phase === "countdown" && (
              <>
                <h2>Eyes on the floor.</h2>
                <p>
                  The countdown is live on both screens. Duel clocks begin at
                  zero.
                </p>
                <button disabled>Countdown in progress</button>
              </>
            )}
            {game.phase === "duel" && game.duel && (
              <>
                <h2>
                  {game.duel.running ? "You’re in control." : "Duel paused."}
                </h2>
                {q && (
                  <div className="answer">
                    <span>Private answer</span>
                    <strong>{q.answer}</strong>
                    {q.acceptedAnswers.length > 0 && (
                      <small>Also accept: {q.acceptedAnswers.join(", ")}</small>
                    )}
                  </div>
                )}
                <div className="actions duel-actions">
                  <button
                    disabled={!game.duel.running}
                    onClick={() => act({ type: "CORRECT", now: Date.now() })}
                  >
                    Correct
                  </button>
                  <button
                    className="secondary"
                    disabled={!game.duel.running}
                    onClick={() => act({ type: "PASS", now: Date.now() })}
                  >
                    Pass −{game.config.passPenaltyMs / 1000}s
                  </button>
                </div>
                <button
                  className="secondary full-width"
                  onClick={() =>
                    act({
                      type: game.duel!.running ? "PAUSE" : "RESUME",
                      now: Date.now(),
                    })
                  }
                >
                  {game.duel.running ? "Pause duel" : "Resume duel"}
                </button>
              </>
            )}
            {game.phase === "duel-result" && (
              <>
                <h2>
                  {game.players.find((p) => p.id === game.duel?.winnerId)?.name}{" "}
                  wins the tile
                </h2>
                <p>
                  Keep the challenge going, or step down for a new random
                  selection.
                </p>
                <button onClick={() => act({ type: "CONTINUE" })}>
                  Continue challenge
                </button>
                <button
                  className="secondary full-width"
                  onClick={() => act({ type: "STEP_DOWN" })}
                >
                  Step down
                </button>
              </>
            )}
            {game.phase === "game-over" && (
              <>
                <p>Game winner</p>
                <h2>
                  {game.players.find((p) => p.id === game.winnerId)?.name}
                </h2>
                <p>The whole floor belongs to you.</p>
              </>
            )}
          </section>
          <Leaderboard players={game.players} />
          <button
            className="secondary undo"
            disabled={!game.undo || !!game.randomiser}
            onClick={() => act({ type: "UNDO", now: Date.now() })}
          >
            ↶ Undo last action
          </button>
          <p className="host-note">Answers are only visible to the host.</p>
        </aside>
      </div>
    </main>
  );
}
