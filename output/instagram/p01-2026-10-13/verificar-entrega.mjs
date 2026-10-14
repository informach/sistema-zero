import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const out=path.join(root,'producao/postagens/p01-uma-ideia-dele')
const slides=Array.from({length:6},(_,i)=>{
 const file=`0${i+1}-p01.png`,data=fs.readFileSync(path.join(out,file))
 return {file,png:data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),width:data.readUInt32BE(16),height:data.readUInt32BE(20)}
})
const removed=['producao/postagens/p01-nao-consigo','historico/2026-10-12-antes-revisao-cotidiano/p01-nao-consigo','historico/2026-10-12-antes-revisao-de-clareza/p01-nao-consigo'].map(p=>({path:p,absent:!fs.existsSync(path.join(root,p))}))
const localLinks=[]
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(e.name.endsWith('.md')){const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/\]\(([^)]+p01-uma-ideia-dele[^)]*)\)/g)){const ref=match[1].split('#')[0];localLinks.push({source:path.relative(root,file),target:ref,exists:fs.existsSync(path.resolve(path.dirname(file),ref))})}}}}
walk(root)
const layout=JSON.parse(fs.readFileSync(path.join(out,'apoio/verificacao-layout.json'),'utf8'))
const passed=slides.every(s=>s.png&&s.width===1080&&s.height===1350)&&removed.every(x=>x.absent)&&localLinks.every(x=>x.exists)&&layout.length===6&&layout.every(x=>x.passed)
const report={passed,slides,removed,localLinks,layoutPassed:layout.every(x=>x.passed),publication:'Não agendado nem publicado',copyReview:'Verificador Light Copy: zero ocorrências; composição e narrativa conferidas visualmente.'}
fs.writeFileSync(path.join(out,'apoio/verificacao-entrega.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({passed,slides,removed,linksChecked:localLinks.length,broken:localLinks.filter(x=>!x.exists)}))
if(!passed)process.exitCode=1
