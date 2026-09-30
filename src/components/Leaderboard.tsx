import type { Player } from "../engine/types";
export function Leaderboard({ players }: { players: Player[] }) {
  return (
    <section className="leaderboard" aria-label="Leaderboard">
      <div className="leaderboard-heading">
        <h2>Contestants</h2>
        <span>Tiles</span>
      </div>
      {[...players]
        .sort((a, b) => b.lives - a.lives)
        .map((p, index) => (
          <div
            className={`leaderboard-row ${p.eliminated ? "eliminated" : ""}`}
            key={p.id}
          >
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <span>
              {p.name}
              {p.eliminated && <small>Eliminated</small>}
            </span>
            <strong>{p.lives}</strong>
          </div>
        ))}
    </section>
  );
}
