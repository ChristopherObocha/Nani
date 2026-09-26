import { describe, expect, it } from 'vitest'
import type { Question } from '../engine/types'
import { normalizeFilenameAnswer, parseTriviaCsv, validateImport } from './import-utils'

describe('normalizeFilenameAnswer', () => {
  it('removes a numeric prefix and image extension', () => {
    expect(normalizeFilenameAnswer('01-Genevieve-Nnaji.png')).toBe('Genevieve Nnaji')
  })

  it('preserves apostrophes while normalizing separators', () => {
    expect(normalizeFilenameAnswer("01. Larry_O'Brien.jpg")).toBe("Larry O'Brien")
  })

  it('removes only the final extension and collapses whitespace', () => {
    expect(normalizeFilenameAnswer('two.dots.name.webp')).toBe('two dots name')
    expect(normalizeFilenameAnswer('  7___Household---Appliance  .jpeg  ')).toBe('Household Appliance')
  })

  it('returns an empty answer when the filename contains no label', () => {
    expect(normalizeFilenameAnswer('001---.png')).toBe('')
  })
})

describe('parseTriviaCsv', () => {
  it('parses quoted commas and newlines and splits accepted answers', () => {
    const rows = parseTriviaCsv('question,answer,acceptedAnswers\n"Who led, historically?","Moses","Moses|Moshe"\n"Which line?","A\nB",')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ text: 'Who led, historically?', answer: 'Moses', acceptedAnswers: ['Moses', 'Moshe'] })
    expect(rows[1]).toMatchObject({ text: 'Which line?', answer: 'A\nB', acceptedAnswers: [] })
  })

  it('returns a rejected candidate for missing headers or malformed quoting', () => {
    expect(parseTriviaCsv('prompt,answer\nWho?,Ada')[0].error).toMatch(/question/i)
    expect(parseTriviaCsv('question,answer\n"Who?,Ada')[0].error).toMatch(/quote|csv/i)
  })
})

describe('validateImport', () => {
  const existing: Question[] = [{ id: 'existing', text: 'Who?', answer: 'Ada Lovelace', acceptedAnswers: [] }]

  it('rejects normalized duplicates and empty answers while preserving order', () => {
    const result = validateImport([
      { key: 'a', kind: 'trivia', text: 'Q1', answer: '  ada   lovelace ', acceptedAnswers: [] },
      { key: 'b', kind: 'trivia', text: 'Q2', answer: 'Grace Hopper', acceptedAnswers: [] },
      { key: 'c', kind: 'trivia', text: 'Q3', answer: '', acceptedAnswers: [] },
    ], existing, 2)
    expect(result.accepted.map(item => item.answer)).toEqual(['Grace Hopper'])
    expect(result.rejected).toHaveLength(2)
    expect(result.remaining).toBe(1)
  })

  it('rejects items beyond the category capacity', () => {
    const result = validateImport([
      { key: 'a', kind: 'trivia', text: 'Q1', answer: 'One', acceptedAnswers: [] },
      { key: 'b', kind: 'trivia', text: 'Q2', answer: 'Two', acceptedAnswers: [] },
    ], [], 1)
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected[0].error).toMatch(/capacity|50|remaining/i)
    expect(result.remaining).toBe(0)
  })
})
