import fs from 'node:fs'
import path from 'node:path'

export const CATEGORY_DIRS = ['nollywood-stars', 'fruits', 'hollywood-celebrities', 'afrobeats-musicians', 'groceries', 'household-appliances', 'nba-logos', 'car-brands', 'bible-characters', 'the-office-us', 'nba-stars', 'premier-league-logos']

function parseCsv(input) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1 }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field.length === 0) quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n' || char === '\r') { if (char === '\r' && input[i + 1] === '\n') i += 1; row.push(field); rows.push(row); row = []; field = '' }
    else field += char
  }
  if (quoted) throw new Error('unterminated quoted field')
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

function normalize(value) { return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase() }
function readRows(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  if (!rows.length) throw new Error(`${file} is empty`)
  const headers = rows.shift()
  return rows.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])))
}
function allFiles(root) {
  if (!root || !fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(root, entry.name)
    return entry.isDirectory() ? allFiles(file) : [file]
  })
}

export function verifyRound(root, externalRoot = '') {
  const errors = []
  const manifestFile = path.join(root, 'manifest.csv')
  if (!fs.existsSync(manifestFile)) errors.push('manifest.csv is missing')
  const manifest = fs.existsSync(manifestFile) ? readRows(manifestFile) : []
  const externalFiles = allFiles(externalRoot).map(file => path.basename(file))
  const total = new Set()

  for (const directory of CATEGORY_DIRS) {
    const file = path.join(root, directory, 'questions.csv')
    if (!fs.existsSync(file)) { errors.push(`${directory}/questions.csv is missing`); continue }
    let rows
    try { rows = readRows(file) } catch (error) { errors.push(`${directory}: ${error.message}`); continue }
    if (rows.length !== 50) errors.push(`${directory} has ${rows.length} questions; expected 50`)
    const answers = new Set()
    for (const row of rows) {
      if (!row.question?.trim() || !row.answer?.trim()) errors.push(`${directory} contains a blank question or answer`)
      const key = normalize(row.answer ?? '')
      if (answers.has(key)) errors.push(`${directory} contains duplicate answer: ${row.answer}`)
      answers.add(key); total.add(`${directory}:${key}`)
      if (!row.sourceUrl?.trim()) errors.push(`${directory} contains an item without a sourceUrl`)
      if (row.kind === 'image' && (!row.filename?.trim() || !externalFiles.includes(path.basename(row.filename)))) errors.push(`${directory} is missing image file ${row.filename}`)
    }
  }
  if (manifest.length !== 600) errors.push(`manifest has ${manifest.length} rows; expected 600`)
  if (total.size !== 600) errors.push(`question set has ${total.size} unique category/answer pairs; expected 600`)
  return errors
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.resolve(process.argv[2] ?? 'content/test-round')
  const external = process.argv[3] ? path.resolve(process.argv[3]) : ''
  const errors = verifyRound(root, external)
  if (errors.length) { console.error(errors.map(error => `✗ ${error}`).join('\n')); process.exitCode = 1 }
  else console.log('✓ 12 categories, 600 questions, unique answers, and required sources verified')
}
