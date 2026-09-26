import type { Player } from '../engine/types'
export function Leaderboard({players}:{players:Player[]}){return <aside className="leaderboard" aria-label="Leaderboard">{[...players].sort((a,b)=>b.lives-a.lives).map(p=><div className={p.eliminated?'eliminated':''} key={p.id}><i style={{background:p.color}}/><span>{p.name}</span><strong>{p.lives}</strong></div>)}</aside>}
