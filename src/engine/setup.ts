import { createFootprint, boardDimensions, shuffleBoard } from './board'
import type { BoardCell, GameSnapshot, Question, TerritoryBlock } from './types'
const COLORS=['#29d4c7','#ff6b6b','#ffd166','#78a7ff','#bf8cff','#7ed957','#ff9f43','#f368e0','#54a0ff','#00d2d3','#c8d6e5','#ff7f50','#a3cb38']
const uid=()=>globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
export function validateQuestion(q:Partial<Question>){return !!q.answer?.trim()&&!!(q.text?.trim()||q.imageId)}
export function createConfiguredGame(names:string[],active=1):GameSnapshot{
  const players=names.map((name,i)=>({id:`p${i+1}`,name,color:COLORS[i%COLORS.length],lives:active,eliminated:false,streak:0}))
  const categories=players.flatMap(p=>Array.from({length:active},(_,i)=>({id:`cat-${p.id}-${i}`,ownerId:p.id,name:`${p.name} topic ${i+1}`,active:true,questions:[{id:uid(),text:'Sample question',answer:'Sample answer',acceptedAnswers:[]}]})))
  const raw=createFootprint(categories.length);let index=0
  const board=shuffleBoard(raw.map(c=>c.playable?{...c,ownerId:categories[index].ownerId,categoryId:categories[index].id,blockId:`block-${categories[index++].id}`}:{...c}))
  const blocks=Object.fromEntries(board.filter(c=>c.playable).map(c=>[c.blockId!,{id:c.blockId!,ownerId:c.ownerId!,categoryId:c.categoryId!,cellIds:[c.id]}]))
  const {rows,cols}=boardDimensions(categories.length)
  return{id:uid(),name:'Floor game',config:{activeCategoriesPerPlayer:active,duelDurationMs:45000,passPenaltyMs:3000},players,categories,board,rows,cols,blocks,phase:'setup',locked:false,updatedAt:Date.now()}
}
export function prepareBoard(game:GameSnapshot):GameSnapshot{
  const categories=game.categories.filter(c=>c.active),raw=createFootprint(categories.length);let index=0
  const board=shuffleBoard(raw.map(c=>c.playable?{...c,ownerId:categories[index].ownerId,categoryId:categories[index].id,blockId:`block-${categories[index++].id}`}:{...c}))
  const blocks=Object.fromEntries(board.filter(c=>c.playable).map(c=>[c.blockId!,{id:c.blockId!,ownerId:c.ownerId!,categoryId:c.categoryId!,cellIds:[c.id]}]));const{rows,cols}=boardDimensions(categories.length)
  return{...game,board,blocks,rows,cols,phase:'board',locked:false,updatedAt:Date.now()}
}
export function rebuildBlocks(board:BoardCell[]):Record<string,TerritoryBlock>{
  const blocks:Record<string,TerritoryBlock>={}
  for(const cell of board.filter(c=>c.playable)){if(!cell.blockId||!cell.ownerId||!cell.categoryId)continue;const prior=blocks[cell.blockId];blocks[cell.blockId]=prior?{...prior,cellIds:[...prior.cellIds,cell.id]}:{id:cell.blockId,ownerId:cell.ownerId,categoryId:cell.categoryId,cellIds:[cell.id]}}
  return blocks
}
export function validateSetup(s:GameSnapshot):string[]{
  const issues:string[]=[]
  if(s.players.length<2)issues.push('Add at least two contestants')
  for(const p of s.players){const active=s.categories.filter(c=>c.ownerId===p.id&&c.active);if(active.length!==s.config.activeCategoriesPerPlayer)issues.push(`${p.name} needs ${s.config.activeCategoriesPerPlayer} active categories`)}
  for(const c of s.categories){if(!c.name.trim())issues.push('Every category needs a name');if(c.questions.length>50)issues.push(`${c.name} exceeds the 50 question cap`);if(c.questions.some(q=>!validateQuestion(q)))issues.push(`${c.name} has an incomplete question`)}
  return issues
}
