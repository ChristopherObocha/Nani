import type { GameSnapshot } from '../engine/types'

export function resolveChallenger(game:GameSnapshot,manual?:string){
  return game.phase==='selecting' ? game.activeBlockId ?? manual : undefined
}
