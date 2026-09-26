import { describe, expect, it, vi } from 'vitest'
import { createGameChannel } from './channel'

describe('safe channel', () => {
  it('rejects private answer keys from wire messages', () => {
    const sent: string[]=[]; const channel=createGameChannel({postMessage:(v:unknown)=>sent.push(JSON.stringify(v)),close:vi.fn()} as any)
    expect(() => channel.publish({ answer: 'secret' } as any)).toThrow(/private/i)
    channel.publish({ phase:'setup', board:[], players:[], blocks:{}, categoryNames:{}, config:{duelDurationMs:1,passPenaltyMs:1}, updatedAt:1 } as any)
    expect(sent.join('')).not.toContain('secret')
  })
})
