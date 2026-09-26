import { beforeEach, describe, expect, it } from 'vitest'
import { createConfiguredGame } from '../engine/setup'
import { loadImage, loadSession, recoverSession, saveImage, saveImagesBatch, saveSession } from './repository'

describe('IndexedDB repository', () => {
  beforeEach(() => indexedDB.deleteDatabase('floor-game-host'))
  it('round-trips game, undo snapshot, and image blobs', async () => {
    const s = createConfiguredGame(['A','B'], 1); s.undo = structuredClone({ ...s, undo: undefined })
    await saveSession(s); expect((await loadSession(s.id))?.undo).toBeTruthy()
    const blob = new Blob(['pixels'], { type: 'text/plain' }); await saveImage('x', blob)
    const loaded = await loadImage('x'); expect(loaded).toBeInstanceOf(Blob); expect(loaded?.size).toBe(6); expect(loaded?.type).toBe('text/plain')
  })
  it('round-trips a batch of image blobs', async () => {
    await saveImagesBatch([
      { id: 'batch-a', blob: new Blob(['a'], { type: 'image/png' }) },
      { id: 'batch-b', blob: new Blob(['bb'], { type: 'image/jpeg' }) },
    ])
    expect((await loadImage('batch-a'))?.type).toBe('image/png')
    expect((await loadImage('batch-b'))?.size).toBe(2)
  })
  it('rejects a batch item before creating dangling records', async () => {
    await expect(saveImagesBatch([{ id: 'invalid', blob: null as unknown as Blob }])).rejects.toThrow('invalid')
    expect(await loadImage('invalid')).toBeUndefined()
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
