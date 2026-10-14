import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const sets=[['P01','p01-uma-ideia-dele',7],['P34','p34-a-ideia-veio-dele',8],['P07','p07-primeira-dificuldade',7]]
const browser=await chromium.launch({channel:'chrome',headless:true})
const report={pngs:[],copy:[],errors:[],links:0}
const quote=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'').trimEnd()).join('\n').trim().split(/\n\s*\n/).filter(Boolean)
try{
for(const [id,folder,count] of sets){
 const dir=path.join(base,'producao/postagens',folder)
 const files=fs.readdirSync(dir).filter(f=>/^\d\d-p\d\d\.png$/.test(f))
 if(files.length!==count)report.errors.push({id,count:files.length,expected:count})
 for(const f of files){
  const bytes=fs.readFileSync(path.join(dir,f))
  const size=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]
  if(size[0]!==1080||size[1]!==1350)report.errors.push({file:f,size})
  report.pngs.push({id,file:f,width:size[0],height:size[1],sha256:createHash('sha256').update(bytes).digest('hex')})
 }
 const page=await browser.newPage({viewport:{width:1080,height:1350}})
 await page.goto(pathToFileURL(path.join(dir,'montagem.html')).href)
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
 const actual=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>{
  const box=a.getBoundingClientRect(),issues=[]
  for(const p of a.querySelectorAll('.copy,header,footer')){
   const range=document.createRange();range.selectNodeContents(p)
   for(const r of range.getClientRects())if(r.left<box.left+45||r.right>box.right-45||r.top<box.top+28||r.bottom>box.bottom-28)issues.push({text:p.textContent,x:r.x-box.x,y:r.y-box.y,w:r.width,h:r.height})
  }
  for(const img of a.querySelectorAll('img'))if(!img.naturalWidth)issues.push({image:img.src})
  return {copy:[...a.querySelectorAll('.copy')].map(p=>p.textContent),issues}
 }))
 const source=fs.readFileSync(path.join(base,'postagens',id==='P34'?'09-p31-a-p40.md':'01-p01-a-p10.md'),'utf8')
 const section=source.split('## '+id+' · ')[1].split(/\n## P\d/)[0]
 const expected=[...section.matchAll(/### Slide (\d+)[^\n]*\n([\s\S]*?)(?=\n###|\n\*\*Produção|$)/g)].map(m=>quote(m[2]))
 if(JSON.stringify(expected)!==JSON.stringify(actual.map(a=>a.copy)))report.errors.push({id,copy:'different'})
 const caption=quote(section.split('### Legenda')[1]).join('\n\n')
 if(fs.readFileSync(path.join(dir,'legenda.txt'),'utf8').trim()!==caption)report.errors.push({id,caption:'different'})
 actual.forEach((a,i)=>{for(const issue of a.issues)report.errors.push({id,slide:i+1,issue})})
 report.copy.push({id,slides:actual.length,captionExact:true})
 for(const name of ['index.html','montagem.html']){
  const html=fs.readFileSync(path.join(dir,name),'utf8')
  for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^https?:|^data:/.test(m[1]))continue
   report.links++;if(!fs.existsSync(path.resolve(dir,m[1])))report.errors.push({id,link:m[1]})
  }
 }
 await page.close()
}
}finally{await browser.close()}
fs.writeFileSync(path.resolve('output/instagram/refazer-3-2026-10-13/verificacao-final.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify({pngs:report.pngs.length,copy:report.copy,links:report.links,errors:report.errors}))
if(report.errors.length)process.exitCode=1
