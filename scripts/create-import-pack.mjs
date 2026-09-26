import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = '/Users/christopherobocha/Downloads/Nani Test Run'
const targetRoot = path.join(sourceRoot, 'Nani Import Pack')
const categoryFolders = fs.readdirSync(sourceRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name !== 'Nani Import Pack')
  .map(entry => entry.name)

function csv(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false
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
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

fs.rmSync(targetRoot, { recursive: true, force: true })
fs.mkdirSync(targetRoot, { recursive: true })
for (const folder of categoryFolders) {
  const sourceFolder = path.join(sourceRoot, folder)
  const csvFile = path.join(sourceFolder, 'questions.csv')
  if (!fs.existsSync(csvFile)) continue
  const rows = parseCsv(fs.readFileSync(csvFile, 'utf8'))
  const headers = rows.shift()
  const filenameIndex = headers.indexOf('filename')
  const kindIndex = headers.indexOf('kind')
  const cleaned = rows.map(row => {
    const filename = filenameIndex >= 0 ? row[filenameIndex] : ''
    const imageExists = Boolean(filename && fs.existsSync(path.join(sourceFolder, path.basename(filename))))
    if (!imageExists && filenameIndex >= 0) row[filenameIndex] = ''
    if (!imageExists && kindIndex >= 0) row[kindIndex] = 'trivia'
    return row
  })
  const targetFolder = path.join(targetRoot, folder)
  fs.mkdirSync(targetFolder, { recursive: true })
  fs.writeFileSync(path.join(targetFolder, 'questions.csv'), [headers, ...cleaned].map(row => row.map(csv).join(',')).join('\n') + '\n')
  for (const row of cleaned) {
    const filename = filenameIndex >= 0 ? row[filenameIndex] : ''
    if (filename) fs.copyFileSync(path.join(sourceFolder, path.basename(filename)), path.join(targetFolder, path.basename(filename)))
  }
}
fs.writeFileSync(path.join(targetRoot, 'README.md'), `# Nani Import Pack\n\nEach category folder is a self-contained import folder. Select one category folder in Nani using **Import question folder**.\n\nThe CSV is authoritative:\n- \`kind=image\` only when the referenced \`filename\` exists beside the CSV.\n- \`kind=trivia\` rows have no image filename and should use their question text.\n- Missing image references were removed rather than leaving broken image rows.\n\nThis layout avoids ambiguous multi-CSV folder selection while keeping each category portable.\n`)
console.log(`Created ${categoryFolders.length} category import folders at ${targetRoot}`)
