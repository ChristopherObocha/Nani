import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { verifyRound } from './verify-test-round.mjs'

const temporary = []
afterEach(() => { for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true }) })

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nani-round-')); temporary.push(root)
  const row = 'question,answer,acceptedAnswers,kind,filename,sourceUrl,creator,licenseNote,verificationStatus'
  const rows = ['manifest.csv']
  for (const category of ['nollywood-stars', 'fruits', 'hollywood-celebrities', 'afrobeats-musicians', 'groceries', 'household-appliances', 'nba-logos', 'car-brands', 'bible-characters', 'the-office-us', 'nba-stars', 'premier-league-logos']) {
    fs.mkdirSync(path.join(root, category), { recursive: true })
    const content = [row]
    for (let i = 1; i <= 50; i += 1) content.push(`Question ${i},${category} ${i},,,,https://example.com/${i},,seed,seeded`)
    fs.writeFileSync(path.join(root, category, 'questions.csv'), `${content.join('\n')}\n`)
    rows.push(...content.slice(1).map((line, i) => `${category},trivia,,${i + 1},${category} ${i + 1},https://example.com/${i + 1},,seed,seeded`))
  }
  fs.writeFileSync(path.join(root, 'manifest.csv'), `${rows.join('\n')}\n`)
  return root
}

describe('verify-test-round', () => {
  it('accepts a complete 12-category 600-question pack', () => assert.deepEqual(verifyRound(fixture()), []))
  it('reports a missing category file and wrong manifest count', () => {
    const root = fixture(); fs.rmSync(path.join(root, 'fruits', 'questions.csv'))
    assert.ok(verifyRound(root).some(error => error.includes('fruits/questions.csv')))
  })
})
