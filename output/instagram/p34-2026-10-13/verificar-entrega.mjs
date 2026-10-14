import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const out=path.join(root,'producao/postagens/p34-a-ideia-veio-dele')
const slides=Array.from({length:6},(_,i)=>{
 const file=`0${i+1}-p34.png`,data=fs.readFileSync(path.join(out,file))
 return {file,png:data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),width:data.readUInt32BE(16),height:data.readUInt32BE(20)}
})
const localLinks=[]
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,e.name)
  if(e.isDirectory()){walk(file);continue}
  if(!e.name.endsWith('.md'))continue
  const text=fs.readFileSync(file,'utf8')
  for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
   const ref=match[1].split('#')[0]
   if(!ref||/^https?:/.test(ref))continue
   if(ref.includes('p34-a-ideia-veio-dele')||file.startsWith(out))localLinks.push({source:path.relative(root,file),target:ref,exists:fs.existsSync(path.resolve(path.dirname(file),ref))})
  }
 }
}
walk(root)
const original=JSON.parse(fs.readFileSync(path.join(out,'apoio/quebra-blocos-original.json'),'utf8'))
const slower=JSON.parse(fs.readFileSync(path.join(out,'apoio/quebra-blocos-mais-devagar.json'),'utf8'))
const changes=[]
function diff(a,b,key=''){if(a===b)return;if(typeof a!=='object'||a===null||b===null||typeof b!=='object'){changes.push({key,from:a,to:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],key?key+'.'+k:k)}
diff(original,slower)
const onlyVelocity=changes.length===2&&changes.every(c=>/behavior.start.\d+.v[xy].value/.test(c.key)&&c.to===c.from/2)
const layout=JSON.parse(fs.readFileSync(path.join(out,'apoio/verificacao-layout.json'),'utf8'))
const capture=JSON.parse(fs.readFileSync(path.join(out,'apoio/captura-real.json'),'utf8'))
const passed=slides.every(s=>s.png&&s.width===1080&&s.height===1350)&&localLinks.every(x=>x.exists)&&layout.length===6&&layout.every(x=>x.passed)&&capture.passed&&onlyVelocity
const report={passed,slides,localLinks,gameChanges:changes,onlyVelocity,layoutPassed:layout.every(x=>x.passed),capturePassed:capture.passed,publication:'Não agendado nem publicado',copyReview:'Light Copy: zero ocorrências; texto, fontes e composição conferidos.'}
fs.writeFileSync(path.join(out,'apoio/verificacao-entrega.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({passed,slides,onlyVelocity,linksChecked:localLinks.length,broken:localLinks.filter(x=>!x.exists)}))
if(!passed)process.exitCode=1
