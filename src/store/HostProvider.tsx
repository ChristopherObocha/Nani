import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GameSnapshot } from '../engine/types'
import { publicSnapshot } from '../engine/game'
import { saveSession } from '../data/repository'
import { createGameChannel } from '../sync/channel'
import { HostContext } from './host-context'

export function HostProvider({children}:{children:ReactNode}){
  const [game,setGame]=useState<GameSnapshot>(); const channel=useMemo(()=>createGameChannel(),[])
  useEffect(()=>{if(game){void saveSession(game);channel.publish(publicSnapshot(game))}},[game,channel])
  return <HostContext.Provider value={{game,setGame}}>{children}</HostContext.Provider>
}
