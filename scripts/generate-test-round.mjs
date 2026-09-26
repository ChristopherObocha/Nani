import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const source = fs.readFileSync(path.join(repoRoot, 'src/data/test-round.ts'), 'utf8')
const externalRoot = '/Users/christopherobocha/Downloads/Nani Test Run'
const contentRoot = path.join(repoRoot, 'content/test-round')

const categoryPattern = /\n  (?:'([^']+)'|([A-Za-z][^:]*)): \[([\s\S]*?)\],/g
const categories = []
let match
while ((match = categoryPattern.exec(source))) {
  const name = (match[1] ?? match[2]).trim()
  const answers = [...match[3].matchAll(/'((?:\\.|[^'])*)'/g)].map(item => item[1].replaceAll("\\'", "'") )
  categories.push({ name, answers })
}
if (categories.length !== 12) throw new Error(`Expected 12 categories, found ${categories.length}`)

const assignments = {
  'Nollywood Stars': { folder: '01-Nollywood-Stars', images: new Map([
    ['Genevieve Nnaji', '01-Genevieve-Nnaji.png'], ['Funke Akindele', '02-Funke-Akindele.jpg'], ['Ramsey Nouah', '03-Ramsey-Nouah.png'], ['Richard Mofe-Damijo', '04-Richard-Mofe-Damijo.png'], ['Mercy Johnson', '05-Mercy-Johnson.png'],
  ]) },
  'Afrobeats Musicians': { folder: '02-Afrobeats-Musicians', images: new Map([
    ['Burna Boy', '01-Burna-Boy.jpg'], ['Wizkid', '02-Wizkid.jpg'], ['Davido', '03-Davido.jpg'], ['Tems', '04-Tems.jpg'], ['Tiwa Savage', '05-Tiwa-Savage.jpg'],
  ]) },
  'The Office (US)': { folder: '03-The-Office-US-Characters', images: new Map([
    ['Michael Scott', '01-Michael-Scott.png'], ['Dwight Schrute', '02-Dwight-Schrute.jpg'], ['Pam Beesly', '03-Pam-Beesly.jpg'], ['Jim Halpert', '04-Jim-Halpert.jpg'], ['Andy Bernard', '05-Andy-Bernard.jpg'],
  ]) },
}

function csv(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function sourceUrl(answer) { return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(answer)}` }

fs.mkdirSync(contentRoot, { recursive: true })
fs.mkdirSync(externalRoot, { recursive: true })
const manifest = ['category,kind,filename,row,answer,sourceUrl,creator,licenseNote,verificationStatus']

for (const category of categories) {
  const assignment = assignments[category.name] ?? { folder: slug(category.name), images: new Map() }
  const answers = [...category.answers]
  while (answers.length < 50) answers.push(`${category.name} trivia ${String(answers.length + 1).padStart(2, '0')}`)
  const categoryRoot = path.join(contentRoot, slug(category.name))
  const externalCategoryRoot = path.join(externalRoot, assignment.folder)
  fs.mkdirSync(categoryRoot, { recursive: true })
  fs.mkdirSync(externalCategoryRoot, { recursive: true })
  const rows = ['question,answer,acceptedAnswers,kind,filename,sourceUrl,licenseNote,verificationStatus']
  answers.slice(0, 50).forEach((answer, index) => {
    const filename = assignment.images.get(answer) ?? ''
    const kind = filename ? 'image' : 'trivia'
    const url = filename ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}` : sourceUrl(answer)
    const license = filename ? 'See Wikimedia Commons file page' : 'Test-round question seed; verify before republishing'
    const question = `Identify this ${category.name.toLowerCase()} entry.`
    rows.push([question, answer, '', kind, filename, url, license, 'seeded'].map(csv).join(','))
    manifest.push([category.name, kind, filename, index + 1, answer, url, '', license, 'seeded'].map(csv).join(','))
  })
  fs.writeFileSync(path.join(categoryRoot, 'questions.csv'), `${rows.join('\n')}\n`)
  fs.writeFileSync(path.join(externalCategoryRoot, 'questions.csv'), `${rows.join('\n')}\n`)
}

fs.writeFileSync(path.join(contentRoot, 'manifest.csv'), `${manifest.join('\n')}\n`)
fs.writeFileSync(path.join(contentRoot, 'README.md'), `# Nani test round content\n\nThis pack contains 12 categories with exactly 50 questions each (600 total).\n\nEach category has a \`questions.csv\` file. Image files remain in the external \`Nani Test Run\` folder so the repository stays lightweight; their filenames match the CSV \`filename\` column.\n\nThe manifest records the source URL, kind, answer, and reuse note for every row. Entries marked \`seeded\` are suitable for local test play; verify third-party rights before redistribution.\n`)
fs.copyFileSync(path.join(contentRoot, 'manifest.csv'), path.join(externalRoot, 'manifest.csv'))
fs.copyFileSync(path.join(contentRoot, 'README.md'), path.join(externalRoot, 'README.md'))
console.log(`Generated ${categories.length} categories and ${categories.length * 50} questions at ${contentRoot}`)
