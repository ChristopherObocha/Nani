import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category } from '../engine/types'
import { BulkImport } from './BulkImport'

const category: Category = {
  id: 'cat', ownerId: 'p1', name: 'Nollywood Stars', active: true,
  questions: [{ id: 'existing', text: 'Who?', answer: 'Existing', acceptedAnswers: [] }],
}

describe('BulkImport', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
  })

  it('reviews multiple image answers and can cancel without committing', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn().mockResolvedValue(undefined)
    render(<BulkImport category={category} onCommit={onCommit} />)
    const input = screen.getByLabelText('Bulk add images')
    await user.upload(input, [
      new File(['a'], '01-Genevieve-Nnaji.png', { type: 'image/png' }),
      new File(['b'], '02-Funke-Akindele.jpg', { type: 'image/jpeg' }),
    ])
    expect(screen.getByDisplayValue('Genevieve Nnaji')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Funke Akindele')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /preview/i })).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Cancel import' }))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('commits edited image answers and trivia rows after review', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn().mockResolvedValue(undefined)
    render(<BulkImport category={category} onCommit={onCommit} />)
    await user.upload(screen.getByLabelText('Bulk add images'), new File(['a'], '01-Genevieve-Nnaji.png', { type: 'image/png' }))
    const answer = screen.getByDisplayValue('Genevieve Nnaji')
    await user.clear(answer)
    await user.type(answer, 'Genevieve Nnaji O')
    await user.click(screen.getByRole('button', { name: 'Confirm import' }))
    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1))
    expect(onCommit.mock.calls[0][0][0]).toMatchObject({ answer: 'Genevieve Nnaji O', imageId: expect.any(String) })
    expect(onCommit.mock.calls[0][1][0].blob).toBeInstanceOf(Blob)
  })

  it('shows a commit error while retaining the reviewed candidates', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn().mockRejectedValue(new Error('Storage unavailable'))
    render(<BulkImport category={category} onCommit={onCommit} />)
    await user.upload(screen.getByLabelText('Bulk add images'), new File(['a'], '01-Genevieve-Nnaji.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Confirm import' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
    expect(screen.getByDisplayValue('Genevieve Nnaji')).toBeInTheDocument()
  })
})
