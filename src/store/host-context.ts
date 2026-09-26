import { createContext, useContext } from 'react'
import type { GameSnapshot } from '../engine/types'

export interface HostStore { game?:GameSnapshot; setGame:(game:GameSnapshot|undefined)=>void }
export const HostContext=createContext<HostStore>({setGame:()=>{}})
export const useHost=()=>useContext(HostContext)
