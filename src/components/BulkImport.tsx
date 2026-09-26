import { useEffect, useMemo, useState } from 'react'
import type { Category, Question } from '../engine/types'
import { normalizeFilenameAnswer, parseTriviaCsv, validateImport } from '../import/import-utils'
import type { ImportCandidate } from '../import/import-types'

export interface BulkImportProps {
  category: Category
  onCommit: (questions: Question[], blobs: Array<{ id: string; blob: Blob }>) => Promise<void>
}

function candidateFromImage(file: File, index: number): ImportCandidate {
  return { key: `image-${index}-${file.name}`, kind: 'image', file, answer: normalizeFilenameAnswer(file.name), acceptedAnswers: [] }
}

export function BulkImport({ category, onCommit }: BulkImportProps) {
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const previews = useMemo(() => new Map(candidates.filter(item => item.file).map(item => [item.key, URL.createObjectURL(item.file!)])), [candidates])
  const validation = useMemo(() => validateImport(candidates, category.questions, Math.max(0, 50 - category.questions.length)), [candidates, category.questions])

  useEffect(() => () => { previews.forEach(url => URL.revokeObjectURL(url)) }, [previews])

  const addImages = (files: FileList | null) => {
    if (!files) return
    setError('')
    setCandidates(previous => [...previous, ...Array.from(files).map((file, index) => candidateFromImage(file, previous.length + index))])
  }

  const addTrivia = async (file: File | undefined) => {
    if (!file) return
    setError('')
    const text = await file.text()
    setCandidates(previous => [...previous, ...parseTriviaCsv(text).map((candidate, index) => ({ ...candidate, key: `${candidate.key}-${previous.length + index}` }))])
  }

  const updateAnswer = (key: string, answer: string) => setCandidates(previous => previous.map(candidate => candidate.key === key ? { ...candidate, answer } : candidate))
  const remove = (key: string) => setCandidates(previous => previous.filter(candidate => candidate.key !== key))

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const blobs: Array<{ id: string; blob: Blob }> = []
      const questions = validation.accepted.map(candidate => {
        const imageId = candidate.kind === 'image' ? crypto.randomUUID() : undefined
        if (imageId && candidate.file) blobs.push({ id: imageId, blob: candidate.file })
        return { id: crypto.randomUUID(), text: candidate.text, imageId, answer: candidate.answer.trim(), acceptedAnswers: candidate.acceptedAnswers }
      })
      await onCommit(questions, blobs)
      setCandidates([])
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'Unable to save this import')
    } finally {
      setBusy(false)
    }
  }

  return <section className="bulk-import panel">
    <div className="bulk-import-actions">
      <label className="secondary file-button">Bulk add images<input type="file" accept="image/*" multiple onChange={event => { addImages(event.target.files); event.currentTarget.value = '' }} /></label>
      <label className="secondary file-button">Import trivia CSV<input type="file" accept=".csv,text/csv" onChange={event => { void addTrivia(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
    </div>
    {candidates.length > 0 && <div className="bulk-review">
      <div className="bulk-review-head"><strong>Review import</strong><span role="status">{validation.accepted.length} ready · {validation.rejected.length} rejected · {validation.remaining} spaces left</span></div>
      {candidates.map((candidate, index) => {
        const rejected = validation.rejected.find(item => item.key === candidate.key)
        return <div className={`bulk-row${rejected ? ' invalid' : ''}`} key={candidate.key}>
          {candidate.file && <img src={previews.get(candidate.key)} alt={`Preview for ${candidate.answer || `item ${index + 1}`}`} />}
          <label>Answer for {candidate.answer || `item ${index + 1}`}<input value={candidate.answer} onChange={event => updateAnswer(candidate.key, event.target.value)} /></label>
          {rejected?.error && <span className="bulk-error">{rejected.error}</span>}
          <button type="button" className="danger" onClick={() => remove(candidate.key)}>Remove</button>
        </div>
      })}
      <div className="bulk-review-actions">
        <button type="button" className="secondary" onClick={() => { setCandidates([]); setError('') }}>Cancel import</button>
        <button type="button" disabled={busy || validation.accepted.length === 0} onClick={() => { void confirm() }}>{busy ? 'Saving…' : 'Confirm import'}</button>
      </div>
    </div>}
    {error && <p role="alert" className="errors">{error}</p>}
  </section>
}
