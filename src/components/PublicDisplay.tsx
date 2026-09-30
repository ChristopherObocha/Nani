import { useEffect, useState } from "react";
import type { PublicSnapshot } from "../engine/types";
import { createGameChannel } from "../sync/channel";
import { Board } from "./Board";
import { Leaderboard } from "./Leaderboard";
import { DuelStage } from "./DuelStage";

export function PublicDisplay() {
  const [game, setGame] = useState<PublicSnapshot>();
  useEffect(() => {
    document.title = "The Floor · Public display";
    const c = createGameChannel(),
      off = c.subscribe(setGame);
    return () => {
      off();
      c.close();
    };
  }, []);
  if (!game)
    return (
      <main className="public waiting">
        <span className="mark">F</span>
        <p className="kicker">The Floor · Public display</p>
        <h1>The stage is set.</h1>
        <p>Waiting for the host to open the floor.</p>
      </main>
    );
  const floor = (
    <div className="public-floor">
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
        categoryNames={game.categoryNames}
        blocks={game.blocks}
        activeBlockId={game.activeBlockId}
        randomiser={game.randomiser}
        duelCellIds={
          game.duel
            ? [
                ...(game.blocks[game.duel.challengerBlockId]?.cellIds ?? []),
                game.duel.defenderCellId,
              ]
            : []
        }
        rows={Math.max(...game.board.map((c) => c.row)) + 1}
        cols={Math.max(...game.board.map((c) => c.col)) + 1}
      />
    </div>
  );
  return (
    <main className="public">
      <header>
        <div>
          <span className="mark">F</span>
          <strong>The Floor</strong>
        </div>
        <span className="status-badge">Public display</span>
      </header>
      <div className="public-layout">
        <section className={`stage ${game.duel ? "has-duel" : ""}`}>
          {game.duel ? (
            <DuelStage
              duel={game.duel}
              phase={game.phase}
              players={game.players}
              category={game.currentCategory}
              question={game.question}
            />
          ) : (
            <div className="stage-head">
              <div>
                <p className="kicker">One floor. Every tile counts.</p>
                <h1>
                  {game.randomiser
                    ? "Who’s up next?"
                    : game.activeBlockId
                      ? "Challenger selected"
                      : "The floor is yours."}
                </h1>
              </div>
            </div>
          )}
          {!game.duel && floor}
        </section>
        <aside className="public-sidebar">
          <p className="kicker">The standings</p>
          <h2>{game.winnerId ? "One winner." : "Own the floor."}</h2>
          {game.winnerId && (
            <p className="result-banner">
              {game.players.find((p) => p.id === game.winnerId)?.name} wins!
            </p>
          )}
          <Leaderboard players={game.players} />
          {game.duel && floor}
          <p className="host-note">Win the duel. Claim the tile.</p>
        </aside>
      </div>
    </main>
  );
}
