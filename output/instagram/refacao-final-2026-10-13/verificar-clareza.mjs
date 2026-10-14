import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {pathToFileURL, fileURLToPath} from 'node:url'

const require=createRequire(path.resolve('packages/studio/package.json'))
const {chromium}=require('@playwright/test')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const root=path.join(base,'producao/postagens')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const posts=[['p01','p01-uma-ideia-dele',7,'01-p01-a-p10.md'],['p07','p07-primeira-dificuldade',7,'01-p01-a-p10.md'],['p34','p34-a-ideia-veio-dele',8,'09-p31-a-p40.md']]
const quoted=s=>s.split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'').trimEnd()).join('\n').trim().split(/\n\s*\n/).filter(Boolean)
const report={checkedAt:new Date().toISOString(),posts:[],linksChecked:0,issues:[]}
const hashes=new Set()
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1300,height:1000},deviceScaleFactor:1})
 for(const [id,slug,count,source] of posts){
  const dir=path.join(root,slug)
  const section=fs.readFileSync(path.join(base,'postagens',source),'utf8').split('## '+id.toUpperCase()+' · ')[1].split(/\n## P\d/)[0]
  const expectedSlides=[...section.matchAll(/### Slide (\d+)[^\n]*\n([\s\S]*?)(?=\n###|\n\*\*Produção|$)/g)].map(m=>quoted(m[2]))
  const expectedCaption=quoted(section.split('### Legenda')[1]).join('\n\n')
  assert.equal(fs.readFileSync(path.join(dir,'legenda.txt'),'utf8').trim(),expectedCaption)
  assert.equal(expectedSlides.length,count)
  const pngs=fs.readdirSync(dir).filter(f=>new RegExp('^\\d{2}-'+id+'\\.png$').test(f))
  assert.equal(pngs.length,count)
  const files=[]
  for(const name of pngs){
   const buffer=fs.readFileSync(path.join(dir,name))
   assert.equal(buffer.subarray(1,4).toString(),'PNG')
   const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20)
   assert.equal(width,1080);assert.equal(height,1350)
   const sha256=crypto.createHash('sha256').update(buffer).digest('hex')
   assert.ok(!hashes.has(sha256),'Slide duplicado: '+name);hashes.add(sha256)
   files.push({name,width,height,sha256})
  }
  await page.goto(pathToFileURL(path.join(dir,'montagem.html')).href)
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))})
  const actual=await page.evaluate(()=>[...document.querySelectorAll('article')].map(a=>[...a.querySelectorAll('.copy')].map(e=>e.textContent)))
  assert.deepEqual(actual,expectedSlides)
  const fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})))
  assert.ok(fonts.every(f=>f.status==='loaded'))
  const layout=JSON.parse(fs.readFileSync(path.join(dir,'apoio/v4/verificacao-layout.json'),'utf8'))
  assert.ok(layout.every(l=>l.issues.length===0&&l.missing===0))
  for(const name of ['index.html','montagem.html']){
   const file=path.join(dir,name),html=fs.readFileSync(file,'utf8')
   for(const match of html.matchAll(/(?:src|href)="([^"]+)"|url\(([^)]+)\)/g)){
    const ref=match[1]||match[2]
    if(ref.startsWith('#')||/^(?:https?:|data:)/.test(ref))continue
    const target=fileURLToPath(new URL(ref.replaceAll('&amp;','&'),pathToFileURL(file)))
    assert.ok(fs.existsSync(target),'Referência ausente: '+target);report.linksChecked++
   }
  }
  report.posts.push({id:id.toUpperCase(),slides:count,copyExact:true,captionExact:true,fonts,files})
 }
 const main=path.join(root,'index.html')
 for(const m of fs.readFileSync(main,'utf8').matchAll(/(?:src|href)="([^"]+)"/g)){
  assert.ok(fs.existsSync(path.resolve(root,m[1])));report.linksChecked++
 }
 await page.goto(pathToFileURL(main).href)
 await page.evaluate(async()=>await Promise.all([...document.images].map(i=>i.decode())))
 await page.screenshot({path:path.join(root,'previa-das-tres.png'),fullPage:true})
 await page.setViewportSize({width:390,height:844})
 for(const relative of ['index.html',...posts.map(p=>p[1]+'/index.html')]){
  await page.goto(pathToFileURL(path.join(root,relative)).href)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Prévia com rolagem horizontal: '+relative)
 }
 report.totalSlides=hashes.size
 assert.equal(report.totalSlides,22)
 fs.writeFileSync(path.join(work,'verificacao-clareza.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({slides:report.totalSlides,linksChecked:report.linksChecked,copy:'22 slides e 3 legendas iguais às fichas',dimensions:'1080 × 1350',fonts:'Carregadas',mobilePreviews:'4 sem rolagem horizontal',issues:report.issues},null,2))
}finally{await browser.close()}
