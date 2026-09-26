import type { Question } from '../engine/types'
import type { ImportCandidate, ImportValidation } from './import-types'

export function normalizeFilenameAnswer(name: string): string {
  const withoutExtension = name.replace(/\.[^/.]+$/, '').trim()
  const withoutPrefix = withoutExtension.replace(/^\s*\d+[\s._-]+/, '')
  return withoutPrefix.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeComparison(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

function rejectedCandidate(key: string, error: string): ImportCandidate {
  return { key, kind: 'trivia', answer: '', acceptedAnswers: [], error }
}

function parseCsvRows(input: string): { rows: string[][]; error?: string } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < input.length; i += 1) {
    const character = input[i]
    if (quoted) {
      if (character === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += character
      }
      continue
    }
    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }
  if (quoted) return { rows, error: 'CSV contains an unterminated quoted field' }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return { rows }
}

export function parseTriviaCsv(csv: string): ImportCandidate[] {
  const parsed = parseCsvRows(csv.replace(/^\uFEFF/, ''))
  if (parsed.error) return [rejectedCandidate('row-1', parsed.error)]
  if (!parsed.rows.length) return [rejectedCandidate('row-1', 'CSV is empty')]

  const headers = parsed.rows[0].map(header => header.trim())
  const questionIndex = headers.indexOf('question')
  const answerIndex = headers.indexOf('answer')
  const acceptedIndex = headers.indexOf('acceptedAnswers')
  const filenameIndex = headers.indexOf('filename')
  if (questionIndex < 0 || answerIndex < 0) {
    return [rejectedCandidate('row-1', 'CSV must include question and answer headers')]
  }

  return parsed.rows.slice(1).map((values, index): ImportCandidate => {
    const answer = values[answerIndex]?.trim() ?? ''
    const acceptedAnswers = acceptedIndex < 0
      ? []
      : (values[acceptedIndex] ?? '').split('|').map(value => value.trim()).filter(Boolean)
    return {
      key: `row-${index + 2}`,
      kind: 'trivia' as const,
      text: values[questionIndex]?.trim() ?? '',
      answer,
      acceptedAnswers,
      filename: filenameIndex < 0 ? undefined : values[filenameIndex]?.trim() || undefined,
    }
  }).filter(candidate => candidate.text || candidate.answer || candidate.error)
}

export function validateImport(candidates: ImportCandidate[], existing: Question[], capacity: number): ImportValidation {
  const existingAnswers = new Set(existing.map(question => normalizeComparison(question.answer)).filter(Boolean))
  const incomingAnswers = new Set<string>()
  const accepted: ImportCandidate[] = []
  const rejected: ImportCandidate[] = []

  for (const candidate of candidates) {
    const normalized = normalizeComparison(candidate.answer)
    let error = candidate.error
    if (!error && !normalized) error = 'Answer cannot be empty'
    if (!error && incomingAnswers.has(normalized)) error = 'Duplicate answer in this import'
    const newAnswerCount = accepted.filter(item => !existingAnswers.has(normalizeComparison(item.answer))).length
    if (!error && !existingAnswers.has(normalized) && newAnswerCount >= Math.max(0, capacity)) error = 'Import exceeds remaining category capacity'

    if (error) rejected.push({ ...candidate, error })
    else {
      incomingAnswers.add(normalized)
      accepted.push(candidate)
    }
  }

  const newAnswerCount = accepted.filter(item => !existingAnswers.has(normalizeComparison(item.answer))).length
  return { accepted, rejected, remaining: Math.max(0, capacity - newAnswerCount) }
}
