import { neighbors } from './board'
import type { DuelState, GameSnapshot, HostAction, PublicSnapshot } from './types'
const cleanSnapshot=(s:GameSnapshot):GameSnapshot=>structuredClone({...s,undo:undefined})
const withUndo=(next:GameSnapshot, prior:GameSnapshot):GameSnapshot=>({...next,undo:cleanSnapshot(prior),updatedAt:Date.now()})
export function eligibleTerritories(s:GameSnapshot):string[]{return Object.values(s.blocks).filter(b=>b.cellIds.some(id=>neighbors(id,s.board).some(n=>s.board.find(c=>c.id===n)?.ownerId!==b.ownerId))).map(b=>b.id)}
export function eligibleDefenders(s:GameSnapshot,blockId:string){const b=s.blocks[blockId];if(!b)return[];const ids=new Set(b.cellIds.flatMap(id=>neighbors(id,s.board)));return s.board.filter(c=>ids.has(c.id)&&c.ownerId!==b.ownerId)}
function settleClock(s:GameSnapshot,now:number){if(!s.duel?.running||s.duel.startedAt===undefined)return s;const startedAt=s.duel.startedAt,d=structuredClone(s.duel);const elapsed=Math.max(0,now-startedAt);d.clocks[d.activePlayerId]=Math.max(0,d.clocks[d.activePlayerId]-elapsed);d.startedAt=now;return{...s,duel:d}}
function finish(s:GameSnapshot,loserId:string):GameSnapshot{
  const d=s.duel!;const winnerId=d.players.find(p=>p!==loserId)!;const defenderCell=s.board.find(c=>c.id===d.defenderCellId)!;const challenger=s.blocks[d.challengerBlockId];const defender=s.blocks[defenderCell.blockId!]!
  const challengerLost=loserId===challenger.ownerId
  const losingCell=challengerLost?s.board.find(c=>challenger.cellIds.includes(c.id)&&neighbors(defenderCell.id,s.board).includes(c.id))!:defenderCell
  const losingBlock=challengerLost?challenger:defender;const winnerBlock=challengerLost?defender:challenger;const blocks={...s.blocks};delete blocks[losingBlock.id];delete blocks[winnerBlock.id]
  let board=s.board.map(c=>({...c}))
  const remainder=new Set(losingBlock.cellIds.filter(id=>id!==losingCell.id));let split=0
  while(remainder.size){const first=remainder.values().next().value as string, component:string[]=[first],queue=[first];remainder.delete(first);while(queue.length){for(const n of neighbors(queue.shift()!,board))if(remainder.has(n)){remainder.delete(n);component.push(n);queue.push(n)}}const id=split++===0?losingBlock.id:`${losingBlock.id}-split-${split}`;blocks[id]={...losingBlock,id,cellIds:component};board=board.map(c=>component.includes(c.id)?{...c,blockId:id}:c)}
  const winningBlock={...winnerBlock,ownerId:winnerId,categoryId:challenger.categoryId,cellIds:[...new Set([...winnerBlock.cellIds,losingCell.id])]};blocks[winnerBlock.id]=winningBlock
  board=board.map(c=>winningBlock.cellIds.includes(c.id)?{...c,ownerId:winnerId,categoryId:challenger.categoryId,blockId:winnerBlock.id}:c)
  const players=s.players.map(p=>{const lives=board.filter(c=>c.playable&&c.ownerId===p.id).length;return{...p,lives,eliminated:lives===0,streak:p.id===winnerId?p.streak+1:p.id===loserId?0:p.streak}})
  const won=players.find(p=>p.lives===board.filter(c=>c.playable).length)
  return{...s,board,blocks,players,activeBlockId:winnerBlock.id,phase:won?'game-over':'duel-result',winnerId:won?.id,duel:{...d,running:false,winnerId,loserId}}
}
export function reduceHostAction(state:GameSnapshot,action:HostAction):GameSnapshot{
  if(action.type==='UNDO'){
    if(!state.undo)return state
    const restored=structuredClone(state.undo)
    return{...restored,duel:restored.duel?.running?{...restored.duel,startedAt:action.now}:restored.duel,undo:undefined}
  }
  let s=state
  switch(action.type){
    case'LOCK_BOARD':return withUndo({...s,locked:true,phase:'ready'},state)
    case'START_GAME':return withUndo({...s,phase:'selecting'},state)
    case'START_DUEL':{const cb=s.blocks[action.challengerBlockId],dc=s.board.find(c=>c.id===action.defenderCellId);if(!cb||!dc||!dc.categoryId||!eligibleDefenders(s,cb.id).some(c=>c.id===dc.id))throw new Error('Defender must touch the challenger');const d:DuelState={challengerBlockId:cb.id,defenderCellId:dc.id,categoryId:dc.categoryId,players:[cb.ownerId,dc.ownerId!],activePlayerId:cb.ownerId,clocks:{[cb.ownerId]:s.config.duelDurationMs,[dc.ownerId!]:s.config.duelDurationMs},questionIndex:0,running:true,startedAt:action.now};return withUndo({...s,phase:'duel',activeBlockId:cb.id,duel:d},state)}
    case'PASS':{s=settleClock(s,action.now);if(!s.duel)return s;const d={...s.duel,questionIndex:s.duel.questionIndex+1,clocks:{...s.duel.clocks,[s.duel.activePlayerId]:Math.max(0,s.duel.clocks[s.duel.activePlayerId]-s.config.passPenaltyMs)},startedAt:action.now};return withUndo(d.clocks[d.activePlayerId]<=0?finish({...s,duel:d},d.activePlayerId):{...s,duel:d},state)}
    case'CORRECT':{s=settleClock(s,action.now);if(!s.duel)return s;const active=s.duel.players.find(p=>p!==s.duel!.activePlayerId)!;return withUndo({...s,duel:{...s.duel,activePlayerId:active,questionIndex:s.duel.questionIndex+1,startedAt:action.now}},state)}
    case'PAUSE':{s=settleClock(s,action.now);return s.duel?withUndo({...s,duel:{...s.duel,running:false,startedAt:undefined}},state):s}
    case'RESUME':return s.duel?withUndo({...s,duel:{...s.duel,running:true,startedAt:action.now}},state):s
    case'TICK':{s=settleClock(s,action.now);const loser=s.duel?.players.find(p=>s.duel!.clocks[p]<=0);return loser?withUndo(finish(s,loser),state):s}
    case'FORCE_EXPIRE':return withUndo(finish(settleClock(s,action.now),action.loserId),state)
    case'CONTINUE':return withUndo({...s,phase:'selecting',duel:undefined},state)
    case'STEP_DOWN':return withUndo({...s,phase:'selecting',duel:undefined,activeBlockId:undefined},state)
  }
}
export function publicSnapshot(s:GameSnapshot):PublicSnapshot{
  let question,currentCategory
  if(s.duel){const category=s.categories.find(c=>c.id===s.duel!.categoryId);const q=category?.questions[s.duel.questionIndex%Math.max(category.questions.length,1)];if(q)question={text:q.text,imageId:q.imageId};currentCategory=category?.name}
  return{phase:s.phase,board:s.board,blocks:s.blocks,players:s.players,categoryNames:Object.fromEntries(s.categories.map(c=>[c.id,c.name])),currentCategory,config:{duelDurationMs:s.config.duelDurationMs,passPenaltyMs:s.config.passPenaltyMs},activeBlockId:s.activeBlockId,duel:s.duel,question,winnerId:s.winnerId,updatedAt:s.updatedAt}
}
