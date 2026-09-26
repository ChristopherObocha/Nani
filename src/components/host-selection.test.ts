import { describe, expect, it } from 'vitest'
import { createConfiguredGame } from '../engine/setup'
import { resolveChallenger } from './host-selection'

describe('host challenger selection', () => {
  it('prefers the active winning territory over a stale manual challenger after continue', () => {
    const game=createConfiguredGame(['Ada','Bo','Cy'],1);game.phase='selecting';game.activeBlockId=Object.keys(game.blocks)[2]
    expect(resolveChallenger(game,Object.keys(game.blocks)[0])).toBe(game.activeBlockId)
  })
  it('has no challenger after step-down clears both active and manual selection', () => {
    const game=createConfiguredGame(['Ada','Bo','Cy'],1);game.phase='selecting';game.activeBlockId=undefined
    expect(resolveChallenger(game,undefined)).toBeUndefined()
  })
})
