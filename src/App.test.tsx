import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('host workflow', () => {
  it('creates a practice game, edits private content, locks the board, and starts a duel', async () => {
    const user=userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button',{name:/new game/i}))
    await user.clear(screen.getByLabelText('Contestant 1')); await user.type(screen.getByLabelText('Contestant 1'),'Ada')
    await user.clear(screen.getByLabelText('Contestant 2')); await user.type(screen.getByLabelText('Contestant 2'),'Bo')
    await user.clear(screen.getByLabelText('Category 1 for Ada')); await user.type(screen.getByLabelText('Category 1 for Ada'),'Roman History')
    await user.clear(screen.getByLabelText('Answer for Roman History question 1')); await user.type(screen.getByLabelText('Answer for Roman History question 1'),'Caesar')
    await user.click(screen.getByRole('button',{name:/build board/i}))
    expect(screen.getAllByRole('button',{name:/tile/i})).toHaveLength(2)
    await user.click(screen.getByRole('button',{name:/lock board/i})); await user.click(screen.getByRole('button',{name:/start game/i}))
    await user.click(screen.getByRole('button',{name:/random challenger/i})); await user.click(screen.getByRole('button',{name:/^challenge /i}))
    expect(screen.getByText('Private answer')).toBeInTheDocument()
  })
})
