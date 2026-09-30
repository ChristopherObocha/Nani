import type { CSSProperties } from "react";
import type {
  BoardCell,
  Category,
  Player,
  RandomiserState,
  TerritoryBlock,
} from "../engine/types";
import { useGameTime } from "../hooks/useGameTime";

export function Board({
  cells,
  players,
  categories = [],
  categoryNames = {},
  blocks,
  rows,
  cols,
  selected,
  onSelect,
  defenders = [],
  activeBlockId,
  randomiser,
  duelCellIds = [],
}: {
  cells: BoardCell[];
  players: Player[];
  categories?: Category[];
  categoryNames?: Record<string, string>;
  blocks: Record<string, TerritoryBlock>;
  rows: number;
  cols: number;
  selected?: string;
  onSelect?: (c: BoardCell) => void;
  defenders?: string[];
  activeBlockId?: string;
  randomiser?: RandomiserState;
  duelCellIds?: string[];
}) {
  const now = useGameTime(!!randomiser);
  const highlighted = randomiser
    ? now >= randomiser.endsAt
      ? blocks[randomiser.winnerBlockId]?.cellIds[0]
      : randomiser.cellIds[
          Math.floor(Math.max(0, now - randomiser.startedAt) / 55) %
            randomiser.cellIds.length
        ]
    : undefined;
  const tile = (c: BoardCell) => (
    <>
      <span className="tile-coordinate" aria-hidden="true">
        {String(c.row * cols + c.col + 1).padStart(2, "0")}
        {c.captured && <span className="captured-label">Captured</span>}
      </span>
      <span className="tile-category">
        {categories.find((cat) => cat.id === blocks[c.blockId!]?.categoryId)
          ?.name ?? categoryNames[blocks[c.blockId!]?.categoryId]}
      </span>
      <strong>{players.find((p) => p.id === c.ownerId)?.name}</strong>
    </>
  );
  return (
    <div
      className={`board ${randomiser ? "is-randomising" : ""}`}
      aria-label="The floor"
      style={
        {
          "--board-ratio": `${cols} / ${rows}`,
          "--board-width": `${(cols / rows) * 62}vh`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {cells.map((c) => {
        const className = [
          "tile",
          c.captured && "captured",
          selected === c.id && "selected",
          defenders.includes(c.id) && "defender",
          activeBlockId === c.blockId && "challenger",
          highlighted === c.id && "random-highlight",
          duelCellIds.includes(c.id) && "duelling",
        ]
          .filter(Boolean)
          .join(" ");
        return !c.playable ? (
          <div key={c.id} className="void" aria-hidden="true" />
        ) : onSelect ? (
          <button
            type="button"
            key={c.id}
            aria-label={`Tile ${c.row + 1}, ${c.col + 1}`}
            disabled={!!randomiser}
            className={className}
            onClick={() => onSelect(c)}
          >
            {tile(c)}
          </button>
        ) : (
          <div
            key={c.id}
            aria-label={`Tile ${c.row + 1}, ${c.col + 1}`}
            className={className}
          >
            {tile(c)}
          </div>
        );
      })}
    </div>
  );
}
