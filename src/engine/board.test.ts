import { describe, expect, it } from 'vitest'
import { boardDimensions, createFootprint, neighbors, shuffleBoard, swapCells } from './board'

describe('board geometry', () => {
  it('makes 39 cells a connected 6x7 footprint with three perimeter holes', () => {
    expect(boardDimensions(39)).toEqual({ rows: 6, cols: 7 })
    const cells = createFootprint(39)
    expect(cells.filter(c => c.playable)).toHaveLength(39)
    expect(cells.filter(c => !c.playable)).toHaveLength(3)
    expect(cells.filter(c => !c.playable).every(c => c.row === 0 || c.row === 5 || c.col === 0 || c.col === 6)).toBe(true)
    const seen = new Set([cells.find(c => c.playable)!.id]); const queue = [...seen]
    while (queue.length) for (const id of neighbors(queue.shift()!, cells)) if (!seen.has(id)) { seen.add(id); queue.push(id) }
    expect(seen.size).toBe(39)
  })
  it('shuffles, swaps unlocked cells, and rejects swaps after lock', () => {
    const board = createFootprint(4).map((c, i) => ({ ...c, categoryId: `c${i}`, ownerId: `p${i}` }))
    expect(shuffleBoard(board, () => 0).map(c => c.categoryId)).not.toEqual(board.map(c => c.categoryId))
    expect(swapCells(board, board[0].id, board[1].id, false)[0].categoryId).toBe('c1')
    expect(() => swapCells(board, board[0].id, board[1].id, true)).toThrow(/locked/i)
  })
  it('does not bridge irregular inactive edges', () => {
    const cells = createFootprint(5)
    const corner = cells.find(c => c.row === 0 && c.col === 0)!
    expect(neighbors(corner.id, cells).every(id => cells.find(c => c.id === id)?.playable)).toBe(true)
  })
})
