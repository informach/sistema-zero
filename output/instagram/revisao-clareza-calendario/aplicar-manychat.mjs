import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const drafts=Object.assign({},...['mc01-mc07.json','mc08-mc14.json'].map(f=>JSON.parse(fs.readFileSync(path.join(work,f),'utf8'))))
const file=path.join(base,'04-postagens-manychat.md')
let doc=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')
const q=ps=>ps.map(p=>'> '+p).join('\n>\n')
const words=s=>s.trim().split(/\s+/).length
const report=[]
for(const[id,d]of Object.entries(drafts)){
 const start=doc.indexOf('## '+id+' · '),next=doc.indexOf('\n<a id=',start),end=next<0?doc.length:next
 assert.ok(start>=0,id)
 let s=doc.slice(start,end)
 const title=d.cover||d.slides[0].join(' ')
 const keyword=s.match(/\*\*Palavra:\*\* ([^.]+)\./)[1]
 const ref=s.match(/\*\*Referência:\*\* (\[[^\n]+?\]\([^)]+\))/)[1]
 s=s.replace(/^## [^\n]*/,`## ${id} · ${title}`)
 s=s.replace(/\*\*Direção da peça:\*\*[\s\S]*?(?=\n\n### Slide|\n\n\*\*Capa do Reel)/,`**Direção da peça:** ${d.direction}`)
 if(d.slides){let count=0;s=s.replace(/(### Slide (\d+)[^\n]*\n+)[\s\S]*?(?=\n\*\*Visual:)/g,(_,h,n)=>{count++;assert.ok(d.slides[+n-1]);return h+q(d.slides[+n-1])+'\n'});assert.equal(count,d.slides.length,id+' slides')}
 if(d.visuals){let vi=0;s=s.replace(/\*\*Visual:\*\*[^\n]+/g,()=>`**Visual:** ${d.visuals[vi++]}`);assert.equal(vi,d.visuals.length,id+' visuais')}
 let seconds=0
 if(d.reel){
  s=s.replace(/\*\*Capa do Reel:\*\*[^\n]+/,`**Capa do Reel:** ${d.cover}`)
  let ri=0
  s=s.replace(/^\| (\d+)[–-](\d+) s \|([^\n]+)$/gm,(_,a,b,rest)=>{
   const old=rest.split('|').map(t=>t.trim()),r=d.reel[ri++];assert.ok(r,id+' tomada')
   const dur=Math.max(+b-+a,r[1]?Math.ceil(words(r[1])/2.2):4)
   const line=`| ${seconds}–${seconds+dur} s | ${r[0]} | ${r[1]} | ${r[2]||old[2]} |`;seconds+=dur;return line
  })
  assert.equal(ri,d.reel.length,id+' tomadas')
  s=s.replace(/cerca de \d+ s/,`cerca de ${seconds} s`)
 }
 let captions=0;s=s.replace(/(### Legenda\n+)[\s\S]*?(?=\n### Direct)/,(_,h)=>{captions++;return h+q(d.caption)+'\n'});assert.equal(captions,1,id+' legenda')
 let dm1=0,dm2=0
 s=s.replace(/(\*\*DM1\*\*\n+)[\s\S]*?(?=\n\*\*Botão interno:)/,(_,h)=>{dm1++;return h+q([d.dm1])+'\n'})
 const message=[d.dm2Start,'Aulas gravadas para filhos de 9 a 14 anos, no computador ou notebook com mouse e teclado.','Pagamento único, acesso por 30 dias após aprovação do pagamento e garantia de 7 dias a partir da compra.']
 s=s.replace(/(\*\*DM2 \(depois do toque\)\*\*\n+)[\s\S]*?(?=\n\*\*Botão de site:)/,(_,h)=>{dm2++;return h+q(message)+'\n'})
 assert.equal(dm1,1,id+' DM1');assert.equal(dm2,1,id+' DM2')
 s=s.replace(/\*\*Direção desta revisão:\*\*[^\n]+\n\n/,'')
 s=s.replace('**Produção:**',`**Direção desta revisão:** ${d.productionNote}\n\n**Produção:**`)
 doc=doc.slice(0,start)+s+doc.slice(end)
 report.push({id,title,keyword,ref,slides:d.slides?.length,seconds:seconds||undefined,captionWords:words(d.caption.join(' ')),dm1Words:words(d.dm1),dm2Words:words(message.join(' ')),dm2Chars:message.join('\n\n').length})
}
doc=doc.replace(/\| \[MC\d+\]\(#mc\d+\) \|[^\n]+/g,line=>{
 const id=line.match(/\[(MC\d+)\]/)[1],r=report.find(p=>p.id===id)
 const cells=line.split('|').map(s=>s.trim())
 cells[2]=r.title
 if(r.seconds)cells[3]=cells[3].replace(/cerca de \d+ s/,`cerca de ${r.seconds} s`)
 return '| '+cells.slice(1,-1).join(' | ')+' |'
})
fs.writeFileSync(file,doc)
fs.writeFileSync(path.join(work,'manychat-revisto.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report.map(({id,dm1Words,dm2Words,dm2Chars,seconds})=>({id,dm1Words,dm2Words,dm2Chars,seconds}))))
