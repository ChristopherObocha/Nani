import type { PublicSnapshot } from '../engine/types'
const KEY='floor-game-public-state'
const containsPrivate=(value:unknown)=>/"(?:answer|acceptedAnswers)"\s*:/.test(JSON.stringify(value))
type ChannelLike=Pick<BroadcastChannel,'postMessage'|'close'> & Partial<Pick<BroadcastChannel,'addEventListener'|'removeEventListener'>>
export function createGameChannel(injected?:ChannelLike){
  const bc=injected??(typeof BroadcastChannel!=='undefined'?new BroadcastChannel('floor-game'):undefined)
  return{publish(value:PublicSnapshot){if(containsPrivate(value))throw new Error('Private answer data cannot be broadcast');bc?.postMessage(value);try{localStorage.setItem(KEY,JSON.stringify(value))}catch{/* unavailable */}},subscribe(fn:(v:PublicSnapshot)=>void){const b=(e:MessageEvent)=>fn(e.data),s=(e:StorageEvent)=>{if(e.key===KEY&&e.newValue)fn(JSON.parse(e.newValue))};if(bc)bc.addEventListener?.('message',b);window.addEventListener('storage',s);const saved=localStorage.getItem(KEY);if(saved)fn(JSON.parse(saved));return()=>{bc?.removeEventListener?.('message',b);window.removeEventListener('storage',s)}},close(){bc?.close()}}
}
