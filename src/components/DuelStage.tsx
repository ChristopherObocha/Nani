import type {
  DuelState,
  GamePhase,
  Player,
  PublicQuestion,
} from "../engine/types";
import { useGameTime } from "../hooks/useGameTime";
import { Clock } from "./Clock";
import { ImageView } from "./ImageView";

export function DuelStage({
  duel,
  phase,
  players,
  category,
  question,
}: {
  duel: DuelState;
  phase: GamePhase;
  players: Player[];
  category?: string;
  question?: PublicQuestion;
}) {
  const now = useGameTime(phase === "countdown" || duel.running);
  const countdown = Math.max(
    0,
    Math.ceil(((duel.countdownEndsAt ?? now) - now) / 1000),
  );
  const waiting = phase === "duel-ready" || phase === "countdown";
  const result = phase === "duel-result" || phase === "game-over";
  return (
    <section
      className={`duel-stage ${waiting ? "duel-waiting" : ""}`}
      aria-label="Current duel"
    >
      <div className="duel-heading">
        <span className="kicker">
          {result
            ? "Duel complete"
            : waiting
              ? "The next duel"
              : "On the floor"}
        </span>
        <span className={`status-badge ${duel.running ? "live" : ""}`}>
          {phase === "countdown"
            ? "Starting soon"
            : phase === "duel-ready"
              ? "Awaiting host"
              : result
                ? "Result"
                : duel.running
                  ? "Live duel"
                  : "Paused"}
        </span>
      </div>
      <h2 className="duel-category">{category}</h2>
      <div className="duel-matchup">
        {duel.players.map((id, index) => {
          const player = players.find((p) => p.id === id);
          const ms =
            duel.clocks[id] -
            (duel.running &&
            duel.activePlayerId === id &&
            duel.startedAt !== undefined
              ? Math.max(0, now - duel.startedAt)
              : 0);
          return (
            <div
              className={`duel-player ${duel.activePlayerId === id && !waiting && !result ? "on-turn" : ""}`}
              key={id}
            >
              <span className="player-role">
                {index === 0 ? "Challenger" : "Defender"}
              </span>
              <strong>{player?.name}</strong>
              <Clock
                ms={ms}
                active={duel.activePlayerId === id && duel.running}
              />
            </div>
          );
        })}
        <span className="versus" aria-hidden="true">
          VS
        </span>
      </div>
      {phase === "countdown" ? (
        <div
          className="countdown"
          role="status"
          aria-label={`Duel starts in ${countdown} seconds`}
        >
          <span key={countdown} className="countdown-number">
            {countdown || "Go"}
          </span>
          <p>Get ready</p>
        </div>
      ) : phase === "duel-ready" ? (
        <div className="duel-message">
          <span className="ready-line" />
          <p>Contestants, take your positions.</p>
          <small>The host will begin the countdown.</small>
        </div>
      ) : result ? (
        <div className="duel-result">
          <span>Tile claimed</span>
          <h3>{players.find((p) => p.id === duel.winnerId)?.name}</h3>
        </div>
      ) : (
        <div className="duel-question">
          <span className="question-label">
            Question {duel.questionIndex + 1}
          </span>
          <h3>
            {question?.text ||
              (question?.imageId
                ? "Name what you see"
                : "No question available")}
          </h3>
          <ImageView id={question?.imageId} />
        </div>
      )}
    </section>
  );
}
