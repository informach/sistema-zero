import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const out=path.join(root,'producao/postagens/p07-primeira-dificuldade')
const slides=Array.from({length:7},(_,i)=>{
 const file=`0${i+1}-p07.png`,data=fs.readFileSync(path.join(out,file))
 return{file,png:data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),width:data.readUInt32BE(16),height:data.readUInt32BE(20)}
})
const localLinks=[]
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,e.name)
 if(e.isDirectory()){walk(file);continue}
 if(!e.name.endsWith('.md'))continue
 const text=fs.readFileSync(file,'utf8')
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const ref=match[1].split('#')[0]
  if(!ref||/^https?:/.test(ref))continue
  if(ref.includes('p07-primeira-dificuldade')||file.startsWith(out))localLinks.push({source:path.relative(root,file),target:ref,exists:ref==='verificacao-entrega.json'||fs.existsSync(path.resolve(path.dirname(file),ref))})
 }
}}
walk(root)
const before=JSON.parse(fs.readFileSync(path.join(out,'apoio/mini-plataforma-antes.json'),'utf8'))
const after=JSON.parse(fs.readFileSync(path.join(out,'apoio/mini-plataforma-depois.json'),'utf8'))
const changes=[]
function diff(a,b,key=''){if(a===b)return;if(typeof a!=='object'||a===null||b===null||typeof b!=='object'){changes.push({key,from:a,to:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],key?key+'.'+k:k)}
diff(before,after)
const destinationIndex=before.behavior.start.findIndex(node=>node.varName==='destino')
const onlyDistance=changes.length===1&&changes[0].key===`behavior.start.${destinationIndex}.x`&&changes[0].from===240&&changes[0].to===180
const layout=JSON.parse(fs.readFileSync(path.join(out,'apoio/verificacao-layout.json'),'utf8'))
const capture=JSON.parse(fs.readFileSync(path.join(out,'apoio/captura-real.json'),'utf8'))
const [run1,run2]=capture.captures
const equalFrames=run1.trace.length===38&&run2.trace.length===38
const observedResult=!run1.onDestination&&run2.onDestination&&run1.x===run2.x
const raw=fs.readFileSync(path.join(root,'postagens/01-p01-a-p10.md'),'utf8')
const p07=raw.split('<a id="p07"></a>')[1].split('<a id="p08"></a>')[0]
const p04=raw.split('<a id="p04"></a>')[1].split('<a id="p05"></a>')[0]
const metadataCorrect=p07.includes('**Extensão:** 7 slides.')&&p04.includes('**Extensão:** 6 slides.')&&!p04.includes('p07-primeira-dificuldade')
const passed=slides.every(s=>s.png&&s.width===1080&&s.height===1350)&&localLinks.every(x=>x.exists)&&layout.length===7&&layout.every(x=>x.passed)&&capture.passed&&onlyDistance&&equalFrames&&observedResult&&metadataCorrect
const report={passed,slides,localLinks,gameChanges:changes,onlyDistance,equalFrames,observedResult,metadataCorrect,layoutPassed:layout.every(x=>x.passed),capturePassed:capture.passed,publication:'Não agendado nem publicado',copyReview:'Texto conferido contra a ficha editorial; ilustrações e capturas revisadas visualmente.'}
fs.writeFileSync(path.join(out,'apoio/verificacao-entrega.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({passed,slides,onlyDistance,equalFrames,observedResult,metadataCorrect,linksChecked:localLinks.length,broken:localLinks.filter(x=>!x.exists)}))
if(!passed)process.exitCode=1
