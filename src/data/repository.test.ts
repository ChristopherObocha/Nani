import { beforeEach, describe, expect, it } from 'vitest'
import { createConfiguredGame } from '../engine/setup'
import { loadImage, loadSession, recoverSession, saveImage, saveSession } from './repository'

describe('IndexedDB repository', () => {
  beforeEach(() => indexedDB.deleteDatabase('floor-game-host'))
  it('round-trips game, undo snapshot, and image blobs', async () => {
    const s = createConfiguredGame(['A','B'], 1); s.undo = structuredClone({ ...s, undo: undefined })
    await saveSession(s); expect((await loadSession(s.id))?.undo).toBeTruthy()
    const blob = new Blob(['pixels'], { type: 'text/plain' }); await saveImage('x', blob)
    const loaded = await loadImage('x'); expect(loaded).toBeInstanceOf(Blob); expect(loaded?.size).toBe(6); expect(loaded?.type).toBe('text/plain')
  })
  it('recovers an active duel paused without changing stored clocks', () => {
    const s = createConfiguredGame(['A','B'], 1); s.phase='duel'; s.duel={challengerBlockId:'b',defenderCellId:'x',categoryId:'cat-p2-0',players:['p1','p2'],activePlayerId:'p1',clocks:{p1:1234,p2:5678},questionIndex:0,running:true,startedAt:99}
    const recovered = recoverSession(s); expect(recovered.duel?.running).toBe(false); expect(recovered.duel?.clocks).toEqual({p1:1234,p2:5678})
  })
  it('hydrates the defender category for sessions saved before duel category snapshots were introduced', () => {
    const s=createConfiguredGame(['A','B'],1),defender=s.board.find(c=>c.playable)!;s.phase='duel';s.duel={challengerBlockId:'b',defenderCellId:defender.id,players:['p1','p2'],activePlayerId:'p1',clocks:{p1:1234,p2:5678},questionIndex:0,running:true,startedAt:99} as any
    expect(recoverSession(s).duel?.categoryId).toBe(defender.categoryId)
  })
})
