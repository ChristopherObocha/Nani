import type { Question } from '../engine/types'

export type ImportKind = 'image' | 'trivia'

export interface ImportCandidate {
  key: string
  kind: ImportKind
  file?: File
  text?: string
  answer: string
  acceptedAnswers: string[]
  error?: string
}

export interface ImportValidation {
  accepted: ImportCandidate[]
  rejected: ImportCandidate[]
  remaining: number
}

export type ExistingQuestion = Pick<Question, 'answer'>
