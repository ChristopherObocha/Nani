import { describe, expect, it } from 'vitest'
import type { GameSnapshot } from './types'
import { createConfiguredGame } from './setup'
import { eligibleTerritories, publicSnapshot, reduceHostAction } from './game'

const ready = () => { const s = createConfiguredGame(['Roman', 'Briton'], 2); s.locked = true; s.phase = 'ready'; return s }

const begin = (s:GameSnapshot, now:number) => reduceHostAction(reduceHostAction(s,{type:'BEGIN_DUEL',now:now-5000}),{type:'TICK',now})

describe('game engine', () => {
  it('runs correct/pass/pause/resume and expiry with timestamp clocks', () => {
    let s = reduceHostAction(ready(), { type: 'START_GAME', now: 0 })
    const a = eligibleTerritories(s)[0]; const d = s.board.find(c => c.playable && c.ownerId !== s.blocks[a].ownerId && Math.abs(c.row-s.board.find(x=>x.id===s.blocks[a].cellIds[0])!.row)+Math.abs(c.col-s.board.find(x=>x.id===s.blocks[a].cellIds[0])!.col)===1)!
    s = reduceHostAction(s, { type: 'START_DUEL', challengerBlockId: a, defenderCellId: d.id, now: 1000 }); s=begin(s,1000)
    const first = s.duel!.activePlayerId
    s = reduceHostAction(s, { type: 'PASS', now: 2000 })
    expect(s.duel!.activePlayerId).toBe(first); expect(s.duel!.clocks[first]).toBe(41000)
    s = reduceHostAction(s, { type: 'CORRECT', now: 3000 })
    expect(s.duel!.activePlayerId).not.toBe(first)
    s = reduceHostAction(s, { type: 'PAUSE', now: 4000 }); expect(s.duel!.running).toBe(false)
    s = reduceHostAction(s, { type: 'RESUME', now: 9000 }); expect(s.duel!.running).toBe(true)
    s = reduceHostAction(s, { type: 'TICK', now: 60000 }); expect(s.phase).toBe('duel-result')
  })
  it('transfers exactly one tile, consumes defender category, preserves Roman challenger category, and undo restores all', () => {
    let s = reduceHostAction(ready(), { type: 'START_GAME', now: 0 }); const before = structuredClone(s)
    const a = eligibleTerritories(s)[0]; const challengerBlock = s.blocks[a]
    const defender = s.board.find(c => c.playable && c.ownerId !== challengerBlock.ownerId && Math.abs(c.row-s.board.find(x=>x.id===challengerBlock.cellIds[0])!.row)+Math.abs(c.col-s.board.find(x=>x.id===challengerBlock.cellIds[0])!.col)===1)!
    const losingOwner = defender.ownerId; const otherCells = s.board.filter(c => c.ownerId === losingOwner && c.id !== defender.id).map(c=>c.id)
    s = reduceHostAction(s, { type: 'START_DUEL', challengerBlockId: a, defenderCellId: defender.id, now: 1 }); s=begin(s,1)
    s = reduceHostAction(s, { type: 'FORCE_EXPIRE', loserId: losingOwner!, now: 2 })
    expect(s.board.find(c=>c.id===defender.id)?.ownerId).toBe(challengerBlock.ownerId)
    expect(otherCells.every(id => s.board.find(c=>c.id===id)?.ownerId===losingOwner)).toBe(true)
    expect(s.blocks[s.activeBlockId!].categoryId).toBe(challengerBlock.categoryId)
    const won = s; s = reduceHostAction(s, { type: 'UNDO', now: 3 }); expect(s.board).toEqual(before.board); expect(won.undo).toBeTruthy()
  })
  it('supports continue/step-down, elimination/win, and answer-free public projection', () => {
    let s = ready(); expect(eligibleTerritories(s).length).toBeGreaterThan(0)
    s = { ...s, activeBlockId: Object.keys(s.blocks)[0], phase: 'duel-result' }
    expect(reduceHostAction(s, { type: 'STEP_DOWN' }).activeBlockId).toBeUndefined()
    const projection=publicSnapshot(s),wire=JSON.stringify(projection); expect(wire).not.toMatch(/answer|acceptedAnswers/i); expect(Object.keys(projection.categoryNames)).toHaveLength(s.categories.length)
  })
  it('when the challenger loses, only its touching tile transfers and the defender block inherits the challenger category', () => {
    let s=ready(); const a=eligibleTerritories(s)[0]; const block=s.blocks[a]; const extra=s.board.find(c=>c.playable&&c.ownerId===block.ownerId&&c.blockId!==a)!; delete s.blocks[extra.blockId!]; block.cellIds.push(extra.id); extra.blockId=a; extra.categoryId=block.categoryId
    const defender=s.board.find(c=>c.playable&&c.ownerId!==block.ownerId&&block.cellIds.some(id=>Math.abs(c.row-s.board.find(x=>x.id===id)!.row)+Math.abs(c.col-s.board.find(x=>x.id===id)!.col)===1))!
    s=reduceHostAction(s,{type:'START_DUEL',challengerBlockId:a,defenderCellId:defender.id,now:1}); s=begin(s,1)
    const originalOwners=Object.fromEntries(s.board.filter(c=>c.playable).map(c=>[c.id,c.ownerId])); const category=block.categoryId
    s=reduceHostAction(s,{type:'FORCE_EXPIRE',loserId:block.ownerId,now:2})
    const changed=s.board.filter(c=>c.playable&&c.ownerId!==originalOwners[c.id]); expect(changed).toHaveLength(1)
    expect(changed[0].ownerId).toBe(defender.ownerId); expect(s.blocks[changed[0].blockId!].categoryId).toBe(category)
  })
  it('eliminates a player at zero cells and declares the whole-grid winner', () => {
    let s=createConfiguredGame(['Ada','Bo'],1);s.locked=true;s.phase='ready';s=reduceHostAction(s,{type:'START_GAME',now:0});const a=eligibleTerritories(s)[0],block=s.blocks[a],defender=s.board.find(c=>c.playable&&c.ownerId!==block.ownerId)!
    s=reduceHostAction(s,{type:'START_DUEL',challengerBlockId:a,defenderCellId:defender.id,now:1}); s=begin(s,1);s=reduceHostAction(s,{type:'FORCE_EXPIRE',loserId:defender.ownerId!,now:2})
    expect(s.phase).toBe('game-over');expect(s.winnerId).toBe(block.ownerId);expect(s.players.find(p=>p.id===defender.ownerId)?.eliminated).toBe(true);expect(s.players.find(p=>p.id===block.ownerId)?.lives).toBe(2)
  })
  it('rebases a restored running clock so time on the result screen is not charged after undo', () => {
    let s=reduceHostAction(ready(),{type:'START_GAME',now:0});const a=eligibleTerritories(s)[0],block=s.blocks[a],defender=s.board.find(c=>c.playable&&c.ownerId!==block.ownerId&&Math.abs(c.row-s.board.find(x=>x.id===block.cellIds[0])!.row)+Math.abs(c.col-s.board.find(x=>x.id===block.cellIds[0])!.col)===1)!
    s=reduceHostAction(s,{type:'START_DUEL',challengerBlockId:a,defenderCellId:defender.id,now:1000}); s=begin(s,1000);s=reduceHostAction(s,{type:'TICK',now:2000});const remaining=s.duel!.clocks[block.ownerId]
    s=reduceHostAction(s,{type:'FORCE_EXPIRE',loserId:block.ownerId,now:46000});s=reduceHostAction(s,{type:'UNDO',now:100000});expect(s.duel?.clocks[block.ownerId]).toBe(remaining);expect(s.duel?.startedAt).toBe(100000)
    s=reduceHostAction(s,{type:'TICK',now:101000});expect(s.duel?.clocks[block.ownerId]).toBe(remaining-1000)
  })
  it('keeps the defender category and question stable on the duel result after the board cell changes category', () => {
    let s=reduceHostAction(ready(),{type:'START_GAME',now:0});const a=eligibleTerritories(s)[0],block=s.blocks[a],defender=s.board.find(c=>c.playable&&c.ownerId!==block.ownerId&&Math.abs(c.row-s.board.find(x=>x.id===block.cellIds[0])!.row)+Math.abs(c.col-s.board.find(x=>x.id===block.cellIds[0])!.col)===1)!,defenderCategoryId=defender.categoryId!,defenderCategory=s.categories.find(c=>c.id===defenderCategoryId)!
    defenderCategory.name='UK History';defenderCategory.questions[0].text='Which city?';s=reduceHostAction(s,{type:'START_DUEL',challengerBlockId:a,defenderCellId:defender.id,now:1}); s=begin(s,1);s=reduceHostAction(s,{type:'FORCE_EXPIRE',loserId:defender.ownerId!,now:2})
    const projection=publicSnapshot(s);expect(s.duel?.categoryId).toBe(defenderCategoryId);expect(projection.currentCategory).toBe('UK History');expect(projection.question?.text).toBe('Which city?')
  })
})
