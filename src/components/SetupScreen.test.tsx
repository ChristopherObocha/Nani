import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createTestRound } from '../engine/setup'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('renders bulk import controls for every category', () => {
    const game = createTestRound()
    game.categories = game.categories.map(category => ({ ...category, questions: category.questions.slice(0, 1) }))
    render(<SetupScreen game={game} onChange={vi.fn()} onBuild={vi.fn()} />)
    expect(screen.getAllByLabelText('Bulk add images')).toHaveLength(12)
    expect(screen.getAllByLabelText('Import trivia CSV')).toHaveLength(12)
  })
})
