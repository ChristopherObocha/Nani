import { describe, expect, it } from 'vitest'
import { createConfiguredGame, createTestRound, prepareBoard, rebuildBlocks, validateQuestion, validateSetup } from './setup'
import { swapCells } from './board'

describe('setup validation', () => {
  it('creates the four-contestant 12-category test round with 50 questions each', () => {
    const game = createTestRound()
    expect(game.players.map(player => player.name)).toEqual(['Contestant 1', 'Contestant 2', 'Contestant 3', 'Contestant 4'])
    expect(game.categories).toHaveLength(12)
    expect(game.categories.map(category => category.name)).toEqual([
      'Nollywood Stars', 'Fruits', 'Hollywood Celebrities', 'Afrobeats Musicians',
      'Groceries', 'Household Appliances', 'NBA Logos', 'Car Brands',
      'Bible Characters', 'The Office (US)', 'NBA Stars', 'Premier League Logos',
    ])
    expect(game.categories.every(category => category.active && category.questions.length === 50)).toBe(true)
    expect(game.players.every(player => game.categories.filter(category => category.ownerId === player.id).length === 3)).toBe(true)
  })

  it('supports a three-player rehearsal and 13 players with three active categories each', () => {
    expect(createConfiguredGame(['Ada', 'Bo', 'Cy'], 2).players).toHaveLength(3)
    const large = createConfiguredGame(Array.from({ length: 13 }, (_, i) => `Player ${i + 1}`), 3)
    expect(large.board.filter(cell => cell.playable)).toHaveLength(39)
    expect(large.players.every(p => p.lives === 3)).toBe(true)
  })
  it.each([
    [{ text: 'Who?', answer: 'Ada' }, true],
    [{ imageId: 'img', answer: 'Ada' }, true],
    [{ text: 'Who?', imageId: 'img', answer: 'Ada' }, true],
    [{ text: 'Who?', answer: '' }, false],
    [{ answer: 'Ada' }, false],
  ])('validates text, image, combined, and private answers', (question, valid) => expect(validateQuestion(question as any)).toBe(valid))
  it('caps categories at 50 questions and requires equal active counts', () => {
    const state = createConfiguredGame(['Ada', 'Bo'], 1)
    state.categories[0].questions = Array.from({ length: 51 }, (_, i) => ({ id: `${i}`, text: 'Q', answer: 'A', acceptedAnswers: [] }))
    expect(validateSetup(state).some(issue => issue.includes('50'))).toBe(true)
  })
  it('builds tiles from the chosen candidates rather than stale defaults', () => {
    const state=createConfiguredGame(['Ada','Bo'],1); state.categories[0].active=false; state.categories.push({id:'candidate',ownerId:'p1',name:'Chosen',active:true,questions:[{id:'q',text:'Q',answer:'A',acceptedAnswers:[]}]})
    const built=prepareBoard(state); expect(built.board.some(c=>c.categoryId==='candidate')).toBe(true); expect(built.board.some(c=>c.categoryId===state.categories[0].id)).toBe(false)
  })
  it('reconciles territory cell membership after a manual tile swap', () => {
    const state=createConfiguredGame(['Ada','Bo'],1); const swapped=swapCells(state.board,state.board[0].id,state.board[1].id,false); const blocks=rebuildBlocks(swapped)
    expect(Object.values(blocks).every(b=>b.cellIds.every(id=>swapped.find(c=>c.id===id)?.blockId===b.id))).toBe(true)
  })
})
