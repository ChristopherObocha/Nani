import { useState } from 'react'
import { createConfiguredGame, validateSetup } from '../engine/setup'
import type { Category, GameSnapshot, Question } from '../engine/types'
import { saveImagesBatch } from '../data/repository'
import { QuestionEditor } from './QuestionEditor'
import '../quality-of-life.css'

export function SetupScreen({ game, onChange, onBuild, onBack = () => undefined }: { game: GameSnapshot; onChange: (g: GameSnapshot) => void; onBuild: () => void; onBack?: () => void }) {
  const [issues, setIssues] = useState<string[]>([])
  const rebuild = (names: string[], active = game.config.activeCategoriesPerPlayer) => {
    const fresh = createConfiguredGame(names, active)
    onChange({ ...fresh, id: game.id, name: game.name, config: { ...fresh.config, duelDurationMs: game.config.duelDurationMs, passPenaltyMs: game.config.passPenaltyMs } })
  }
  const updateCategory = (changed: Category) => onChange({ ...game, categories: game.categories.map(category => category.id === changed.id ? changed : category) })
  const commitImport = async (category: Category, questions: Question[], blobs: Array<{ id: string; blob: Blob }>) => {
    await saveImagesBatch(blobs)
    updateCategory({ ...category, questions: [...category.questions, ...questions] })
  }

  return <main className="setup">
    <header className="setup-header"><div><p className="kicker">Host console</p><h1>Build tonight’s floor</h1><p>Answers stay in this window. Add contestants, choose equal active topics, then arrange the board.</p></div><button type="button" className="secondary" onClick={onBack}>Back to start</button></header>
    <section className="settings panel"><h2>Game settings</h2><label>Active categories per contestant<input type="number" min="1" value={game.config.activeCategoriesPerPlayer} onChange={event => rebuild(game.players.map(player => player.name), Math.max(1, +event.target.value))} /></label><label>Duel seconds<input type="number" min="5" value={game.config.duelDurationMs / 1000} onChange={event => onChange({ ...game, config: { ...game.config, duelDurationMs: +event.target.value * 1000 } })} /></label><label>Pass penalty seconds<input type="number" min="0" value={game.config.passPenaltyMs / 1000} onChange={event => onChange({ ...game, config: { ...game.config, passPenaltyMs: +event.target.value * 1000 } })} /></label></section>
    <section className="contestants">{game.players.map((player, playerIndex) => <details className="panel contestant-panel" open key={player.id}>
      <summary>Contestant {playerIndex + 1}<span>{player.name}</span></summary>
      <label>Contestant {playerIndex + 1}<input value={player.name} onChange={event => { const name = event.target.value; onChange({ ...game, players: game.players.map(item => item.id === player.id ? { ...item, name } : item) }) }} /></label>
      {game.categories.filter(category => category.ownerId === player.id).map((category, categoryIndex) => <details className="category" open key={category.id}>
        <summary>Category {categoryIndex + 1}<span>{category.name} · {category.questions.length}/50 questions</span></summary>
        <div className="category-head"><label>Category {categoryIndex + 1} for {player.name}<input value={category.name} onChange={event => updateCategory({ ...category, name: event.target.value })} /></label><label className="check"><input type="checkbox" checked={category.active} onChange={event => updateCategory({ ...category, active: event.target.checked })} /> Active tile</label></div>
        <QuestionEditor category={category} onChange={updateCategory} onBulkCommit={(questions, blobs) => commitImport(category, questions, blobs)} />
      </details>)}
      <button type="button" className="secondary" onClick={() => onChange({ ...game, categories: [...game.categories, { id: crypto.randomUUID(), ownerId: player.id, name: `${player.name} candidate`, active: false, questions: [{ id: crypto.randomUUID(), text: '', answer: '', acceptedAnswers: [] }] }] })}>Add candidate category</button>
    </details>)}</section>
    <div className="setup-actions"><button type="button" className="secondary" onClick={() => rebuild([...game.players.map(player => player.name), `Contestant ${game.players.length + 1}`])}>Add contestant</button><button type="button" onClick={() => { const found = validateSetup(game); setIssues(found); if (!found.length) onBuild() }}>Build board</button></div>
    {issues.length > 0 && <div role="alert" className="errors">{issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
  </main>
}
