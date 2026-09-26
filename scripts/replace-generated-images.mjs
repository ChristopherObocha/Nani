import fs from 'node:fs'
import path from 'node:path'

const root = '/Users/christopherobocha/Downloads/Nani Test Run'
const folders = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
function parseCsv(input) { const rows=[]; let row=[]; let field=''; let quoted=false; for(let i=0;i<input.length;i+=1){const c=input[i]; if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i+=1}else if(c==='"')quoted=false;else field+=c}else if(c==='"'&&field.length===0)quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i+=1;row.push(field);rows.push(row);row=[];field=''}else field+=c}if(field||row.length){row.push(field);rows.push(row)}return rows }
function csv(value) { const text=String(value??''); return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text }
function title(value) { return encodeURIComponent(value.replace(/[’']/g, '').replace(/&/g, 'and').replace(/\s+/g, '_')) }
async function fetchImage(answer) {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title(answer)}`, { headers: { accept: 'application/json' } })
  if (!response.ok) return undefined
  const data = await response.json()
  const url = data.thumbnail?.source ?? data.originalimage?.source
  if (!url) return undefined
  const image = await fetch(url)
  if (!image.ok) return undefined
  return { bytes: Buffer.from(await image.arrayBuffer()), type: image.headers.get('content-type') ?? 'image/jpeg' }
}
for (const folder of folders) {
  const csvFile = path.join(root, folder, 'questions.csv')
  if (!fs.existsSync(csvFile)) continue
  const rows = parseCsv(fs.readFileSync(csvFile, 'utf8')); const headers=rows.shift(); const kindIndex=headers.indexOf('kind'); const filenameIndex=headers.indexOf('filename'); const answerIndex=headers.indexOf('answer'); const sourceIndex=headers.indexOf('sourceUrl');
  let resolved=0; let failed=0
  for (const [index,row] of rows.entries()) {
    if (row[kindIndex] !== 'image') continue
    const existing = row[filenameIndex]
    if (existing && !existing.endsWith('.svg')) { resolved += 1; continue }
    try {
      const result = await fetchImage(row[answerIndex])
      if (!result) throw new Error('no thumbnail')
      const extension = result.type.includes('png') ? 'png' : result.type.includes('webp') ? 'webp' : 'jpg'
      const filename = `${String(index + 1).padStart(2, '0')}-${row[answerIndex].toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${extension}`
      fs.writeFileSync(path.join(root, folder, filename), result.bytes)
      if (existing) fs.rmSync(path.join(root, folder, existing), { force: true })
      row[filenameIndex]=filename; row[sourceIndex]=`https://en.wikipedia.org/wiki/${title(row[answerIndex])}`; resolved += 1
    } catch {
      if (existing) fs.rmSync(path.join(root, folder, existing), { force: true })
      row[kindIndex]='unresolved'; row[filenameIndex]=''; row[sourceIndex]=`https://en.wikipedia.org/wiki/${title(row[answerIndex])}`; failed += 1
    }
  }
  const retained = rows.filter((row, index) => row[kindIndex] !== 'unresolved' && (folder === 'bible-characters' || folder === 'nba-logos' || row[kindIndex] === 'image'))
  fs.writeFileSync(csvFile, [headers,...retained].map(row=>row.map(csv).join(',')).join('\n')+'\n')
  console.log(`${folder}: ${resolved} real images, ${failed} reclassified trivia`)
}
