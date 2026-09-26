import fs from 'node:fs'
import path from 'node:path'

const root = '/Users/christopherobocha/Downloads/Nani Test Run'
const folders = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
function parseCsv(input) { const rows=[]; let row=[]; let field=''; let quoted=false; for(let i=0;i<input.length;i+=1){const c=input[i]; if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i+=1}else if(c==='"')quoted=false;else field+=c}else if(c==='"'&&field.length===0)quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i+=1;row.push(field);rows.push(row);row=[];field=''}else field+=c}if(field||row.length){row.push(field);rows.push(row)}return rows }
function csv(value) { const text=String(value??''); return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text }
function title(value) { return encodeURIComponent(value.replace(/[’']/g, '').replace(/&/g, 'and').replace(/\s+/g, '_')) }
async function summary(answer) { try { const response=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title(answer)}`); if(!response.ok)return ''; const data=await response.json(); return String(data.extract??'').replace(/\s+/g,' ').trim() } catch { return '' } }
for (const folder of folders) {
  const file=path.join(root,folder,'questions.csv'); if(!fs.existsSync(file))continue
  const rows=parseCsv(fs.readFileSync(file,'utf8')); const headers=rows.shift(); const questionIndex=headers.indexOf('question'); const kindIndex=headers.indexOf('kind'); const answerIndex=headers.indexOf('answer'); const sourceIndex=headers.indexOf('sourceUrl')
  for (const row of rows) {
    if(row[kindIndex] !== 'trivia') continue
    const extract=await summary(row[answerIndex])
    row[questionIndex]=extract ? `According to the reference summary, which ${folder.replaceAll('-', ' ')} entry is described as: “${extract}”` : `What is ${row[answerIndex]} known for in ${folder.replaceAll('-', ' ')}?`
    row[sourceIndex]=`https://en.wikipedia.org/wiki/${title(row[answerIndex])}`
  }
  fs.writeFileSync(file,[headers,...rows].map(row=>row.map(csv).join(',')).join('\n')+'\n')
  console.log(`${folder}: ${rows.length} questions`)
}
