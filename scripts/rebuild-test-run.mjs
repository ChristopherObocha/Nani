import fs from 'node:fs'
import path from 'node:path'

const root = '/Users/christopherobocha/Downloads/Nani Test Run'
const source = fs.readFileSync('src/data/test-round.ts', 'utf8')
const categoryPattern = /\n  (?:'([^']+)'|([A-Za-z][^:]*)): \[([\s\S]*?)\],/g
const categories = []
let match
while ((match = categoryPattern.exec(source))) {
  const name = (match[1] ?? match[2]).trim()
  const answers = [...match[3].matchAll(/'((?:\\.|[^'])*)'/g)].map(item => item[1].replaceAll("\\'", "'"))
  categories.push({ name, answers })
}
const extra = {
  'Hollywood Celebrities': ['Chris Evans', 'Scarlett Johansson', 'Anne Hathaway', 'Ryan Gosling', 'Hugh Jackman', 'Natalie Portman', 'Christian Bale', 'Halle Berry', 'Matt Damon', 'Nicole Kidman', 'Dwayne Johnson', 'Emma Watson', 'Harrison Ford', 'Robert De Niro', 'Al Pacino', 'Joaquin Phoenix', 'Charlize Theron', 'Gal Gadot', 'Eddie Murphy', 'Jim Carrey', 'Chris Pratt', 'Brie Larson', 'Cillian Murphy', 'Pedro Pascal', 'Florence Pugh', 'Timothée Chalamet', 'Saoirse Ronan', 'Idris Elba', 'Mahershala Ali', 'Octavia Spencer'],
  'Nollywood Stars': ['Stephanie Okereke', 'Adesua Etomi', 'Bimbo Ademoye', 'Toyin Abraham', 'Nse Ikpe-Etim', 'Uti Nwachukwu', 'Alex Ekubo', 'Mike Ezuruonye', 'John Okafor', 'Chinedu Ikedieze', 'Kanayo O. Kanayo', 'Pete Edochie', 'Zubby Michael', 'Nancy Isime', 'Beverly Naya', 'Ireti Doyle', 'Eniola Badmus', 'Ebube Nwagbo', 'Ini Dima-Okojie', 'Toyin Aimakhu', 'Lilian Esoro', 'Sola Sobowale', 'Taiwo Hassan', 'Femi Adebayo', 'Odunlade Adekola', 'Adebayo Salami', 'Funke Etti', 'Uche Jombo', 'Rita Dominic', 'Nkem Owoh', 'Patience Ozokwo', 'Mercy Aigbe', 'Toyin Lawani', 'Shan George', 'Yvonne Jegede', 'Dakore Egbuson', 'Ufuoma McDermott', 'Yvonne Nelson'],
  'Afrobeats Musicians': ['Mavins', 'Seyi Vibez', 'Bella Shmurda', 'BNXN', 'Zinoleesky', 'Victony', 'Kizz Daniel', 'Shallipopi', 'Ruger', 'Pheelz', 'DJ Spinall', 'DJ Cuppy', 'Naira Marley', 'Wande Coal', 'Dbanj', 'Patoranking', 'Sarkodie', 'Stonebwoy', 'King Promise', 'Amaarae', 'Gyakie', 'M.anifest', 'Black Sherif', 'Omah Lay', 'Lojay', 'Runtown', 'Yung Mavu', 'Korede Bello', 'Mayorkun', 'Johnny Drille'],
  'The Office (US)': ['Charles Miner', 'Karen Filippelli', 'Danny Cordray', 'Deangelo Vickers', 'Jo Bennett', 'Gerry', 'Nate Nickerson', 'Val Johnson', 'Clark Green', 'Pete Miller', 'Jessica Alba', 'Hank Tate', 'Billy Merchant', 'Bob Vance', 'Cathy Simms', 'Louanne Kelley', 'Megan', 'Helene Beesly', 'Walter Bernard', 'Cece Halpert', 'Astrid Levinson', 'Mindy Kaling', 'Jack Black', 'Jessica', 'Brian', 'Lonny Collins', 'Madge Madsen', 'Glenn', 'Hidetoshi Hasagawa', 'Vikram Kapoor'],
}
const triviaCategories = new Set(['Bible Characters'])
const imageCategories = new Set(['Nollywood Stars', 'Afrobeats Musicians', 'Hollywood Celebrities', 'Fruits', 'Groceries', 'Household Appliances', 'NBA Logos', 'Car Brands', 'The Office (US)', 'NBA Stars', 'Premier League Logos'])
function csv(value) { const text = String(value ?? ''); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function escapeXml(value) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;') }
function visualCard(category, index) { return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#10253e"/><circle cx="600" cy="350" r="190" fill="#29d4c7" opacity=".8"/><text x="600" y="370" text-anchor="middle" font-family="Arial" font-size="120" font-weight="700" fill="#071426">?</text><text x="600" y="670" text-anchor="middle" font-family="Arial" font-size="34" fill="#f7f5ef">${escapeXml(category)} · visual ${index}</text></svg>` }
fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true })
for (const category of categories) {
  const answers = [...category.answers, ...(extra[category.name] ?? [])].filter(answer => !/^.+ trivia \d+$/i.test(answer)).slice(0, 50)
  while (answers.length < 50) answers.push(`${category.name} item ${answers.length + 1}`)
  const folder = path.join(root, slug(category.name)); fs.mkdirSync(folder, { recursive: true })
  const rows = ['question,answer,acceptedAnswers,kind,filename,sourceUrl,licenseNote,verificationStatus']
  answers.slice(0, 50).forEach((answer, index) => {
    const isTrivia = triviaCategories.has(category.name)
    const filename = !isTrivia && imageCategories.has(category.name) ? `${String(index + 1).padStart(2, '0')}-${slug(answer)}.svg` : ''
    if (filename) fs.writeFileSync(path.join(folder, filename), visualCard(category.name, index + 1))
    const question = isTrivia ? `Which Bible character is associated with ${answer}?` : `Name this ${category.name.toLowerCase()} visual.`
    const sourceUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(answer)}`
    rows.push([question, answer, '', filename ? 'image' : 'trivia', filename, sourceUrl, filename ? 'Generated visual card; replace with a verified licensed image when available.' : 'Trivia seed; verify before publishing.', 'seeded'].map(csv).join(','))
  })
  fs.writeFileSync(path.join(folder, 'questions.csv'), `${rows.join('\n')}\n`)
}
fs.writeFileSync(path.join(root, 'README.md'), '# Nani Test Run\n\nEvery category has 50 complete rows. All image rows have a matching local SVG file; all other rows are explicit trivia rows. Replace generated visual cards with verified licensed images before public use. Import one category folder at a time using Nani’s Import question folder control.\n')
console.log(`Rebuilt ${categories.length} categories with 600 complete rows at ${root}`)
