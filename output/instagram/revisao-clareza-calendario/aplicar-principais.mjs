import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const originals=JSON.parse(fs.readFileSync(path.join(work,'originais.json'),'utf8'))
const drafts=Object.assign({},...fs.readdirSync(work).filter(f=>/^p\d+-p\d+\.json$/.test(f)).map(f=>JSON.parse(fs.readFileSync(path.join(work,f),'utf8'))))
const files=new Map(),report=[]
const q=ps=>ps.map(p=>'> '+p).join('\n>\n')
for(const [id,data] of Object.entries(drafts)){
 assert.ok(!['P01','P07','P34'].includes(id),'Referência aprovada fora do escopo')
 const origin=originals.find(p=>p.id===id);assert.ok(origin,id)
 const file=path.join(base,'postagens',origin.source)
 let doc=files.get(file)||fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')
 const start=doc.indexOf('## '+id+' · '),next=doc.indexOf('\n<a id=',start),end=next<0?doc.length:next
 let section=doc.slice(start,end)
 const title=data.title||data.cover||data.slides?.[0].slice(0,2).join(' ')||data.art?.[0]
 assert.ok(title,id+' título')
 section=section.replace(/^## [^\n]+/,`## ${id} · ${title}`)
 section=section.replace(/\*\*O que mudou nesta revisão(?: de clareza)?:\*\*[^\n]+/,`**O que mudou nesta revisão de clareza:** ${data.reason||'A situação, a ação da criança e a ligação com a criação de jogos foram explicadas com palavras comuns. A legenda mantém o mesmo assunto e acrescenta uma orientação ou um contexto útil.'}`)
 section=section.replace(/\*\*Versão anterior:\*\*[^\n]*?(?= \*\*Dor ou desejo:)/,`**Versão anterior:** [Ficha antes desta revisão](../historico/2026-10-13-antes-clareza-geral/postagens/${origin.source}#${id.toLowerCase()}).`)
 if(data.slides){
  let count=0
  section=section.replace(/(### Slide (\d+)[^\n]*\n+)[\s\S]*?(?=\n\*\*Visual:)/g,(_,heading,n)=>{count++;assert.ok(data.slides[+n-1],id+' slide '+n);return heading+q(data.slides[+n-1])+'\n'})
  assert.equal(count,data.slides.length,id+' quantidade de slides')
  if(data.visuals){let vi=0;section=section.replace(/\*\*Visual:\*\*[^\n]+/g,()=>`**Visual:** ${data.visuals[vi++]}`);assert.equal(vi,data.visuals.length,id+' visuais')}
 }
 if(data.art){
  assert.match(section,/### Arte\n/)
  section=section.replace(/(### Arte\n+)[\s\S]*?(?=\n\*\*Visual:)/,(_,head)=>head+q(data.art)+'\n')
  if(data.artVisual)section=section.replace(/\*\*Visual:\*\*[^\n]+/,`**Visual:** ${data.artVisual}`)
 }
 let total=0
 if(data.reel){
  section=section.replace(/\*\*Capa do Reel:\*\*[^\n]+/,`**Capa do Reel:** ${data.cover}`)
  let index=0
  section=section.replace(/^\| (\d+)[–-](\d+) s \|([^\n]+)$/gm,(line,a,b,rest)=>{
   const original=rest.split('|').map(x=>x.trim()),row=data.reel[index++];assert.ok(row,id+' tomada '+index)
   const [screen,speech,scene]=row
   const duration=Math.max(+b-+a,speech?Math.ceil(speech.split(/\s+/).length/2.2):4)
   const result=`| ${total}–${total+duration} s | ${screen} | ${speech} | ${scene||original[2]} |`;total+=duration;return result
  })
  assert.equal(index,data.reel.length,id+' quantidade de tomadas')
  section=section.replace(/Reel, cerca de \d+ s/,`Reel, cerca de ${total} s`)
  section=section.replace(/\*\*Ritmo:\*\*[^\n]+/,'**Ritmo:** estimativa recalculada para até 2,2 palavras por segundo, com tempo para observar a demonstração. Conferir na gravação; ampliar a duração quando necessário, sem acelerar a fala.')
 }
 assert.ok(data.caption?.length,id+' legenda')
 let captionCount=0
 section=section.replace(/(### Legenda\n+)[\s\S]*?(?=\n\*\*(?:Produção|Direção desta revisão):)/,(_,head)=>{captionCount++;return head+q(data.caption)+'\n'})
 assert.equal(captionCount,1,id+' legenda localizada')
 if(data.productionNote){
  const note=`**Direção desta revisão:** ${data.productionNote}\n\n`
  section=section.replace(/\*\*Direção desta revisão:\*\*[^\n]+\n\n/,'')
  section=section.replace('**Produção:**',note+'**Produção:**')
 }
 doc=doc.slice(0,start)+section+doc.slice(end);files.set(file,doc)
 report.push({id,title,format:data.reel?'Reel':data.art?'Imagem':'Carrossel',slides:data.slides?.length,seconds:total||undefined,captionWords:data.caption.join(' ').split(/\s+/).length})
}
for(const [file,doc] of files)fs.writeFileSync(file,doc)
fs.writeFileSync(path.join(work,'principais-revistas.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
