import type { BoardCell } from './types'

export function boardDimensions(count:number) {
  const rows = Math.floor(Math.sqrt(count)) || 1
  return { rows, cols: Math.ceil(count / rows) }
}
export function createFootprint(count:number):BoardCell[] {
  const { rows, cols } = boardDimensions(count); const holes = rows*cols-count; const holeSet = new Set<string>()
  const perimeter: string[]=[]
  for(let c=0;c<cols;c++) perimeter.push(`0-${c}`)
  for(let r=1;r<rows-1;r++) perimeter.push(`${r}-${cols-1}`)
  for(let c=cols-1;c>=0;c--) perimeter.push(`${rows-1}-${c}`)
  for(let r=rows-2;r>0;r--) perimeter.push(`${r}-0`)
  for(let i=0;i<holes;i++) holeSet.add(perimeter[Math.floor(i*perimeter.length/Math.max(holes,1))])
  return Array.from({length:rows*cols},(_,i)=>{const row=Math.floor(i/cols),col=i%cols,id=`${row}-${col}`;return{id,row,col,playable:!holeSet.has(id)}})
}
export function neighbors(id:string,cells:BoardCell[]):string[]{
  const cell=cells.find(c=>c.id===id); if(!cell||!cell.playable)return[]
  return cells.filter(c=>c.playable&&Math.abs(c.row-cell.row)+Math.abs(c.col-cell.col)===1).map(c=>c.id)
}
export function shuffleBoard(cells:BoardCell[], random=Math.random):BoardCell[]{
  const payload=cells.filter(c=>c.playable).map(c=>({categoryId:c.categoryId,ownerId:c.ownerId,blockId:c.blockId}))
  for(let i=payload.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[payload[i],payload[j]]=[payload[j],payload[i]]}
  let p=0;return cells.map(c=>c.playable?{...c,...payload[p++]}:{...c})
}
export function swapCells(cells:BoardCell[],a:string,b:string,locked:boolean):BoardCell[]{
  if(locked)throw new Error('Board is locked')
  const one=cells.find(c=>c.id===a),two=cells.find(c=>c.id===b);if(!one?.playable||!two?.playable)throw new Error('Select two playable cells')
  return cells.map(c=>c.id===a?{...c,categoryId:two.categoryId,ownerId:two.ownerId,blockId:two.blockId}:c.id===b?{...c,categoryId:one.categoryId,ownerId:one.ownerId,blockId:one.blockId}:{...c})
}
