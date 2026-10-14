import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/postagens')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const q=ps=>ps.map(p=>'> '+p).join('\n>\n')
const reports=[]
for(const [datafile,docfile,kind] of [['extras.json','07-extras-para-familias.md','E'],['stories.json','04-stories.md','ST']]){
 const drafts=JSON.parse(fs.readFileSync(path.join(work,datafile),'utf8'))
 let doc=fs.readFileSync(path.join(base,docfile),'utf8').replaceAll('\r\n','\n')
 for(const [id,d] of Object.entries(drafts)){
  const start=doc.indexOf('## '+id+' · '),rest=doc.slice(start)
  const match=rest.slice(1).search(kind==='ST'?/\n<a id=/ : /\n## E\d+/),end=match<0?doc.length:start+1+match
  assert.ok(start>=0,id)
  let s=doc.slice(start,end).replace(/^## [^\n]+/,`## ${id} · ${d.title}`)
  let bi=0;const blocks=d.blocks||d.texts.map(t=>[t])
  s=s.replace(/(?:^>[^\n]*(?:\n|$))+/gm,()=>{const ps=blocks[bi++];assert.ok(ps,id+' blocos extras');return q(ps)+'\n'})
  assert.equal(bi,blocks.length,id+' quantidade de blocos')
  if(d.reel){
   let ri=0,time=0
   s=s.replace(/^\| (\d+)[–-](\d+) s \|([^\n]+)$/gm,(_,a,b,rest)=>{
    const old=rest.split('|').map(x=>x.trim()),row=d.reel[ri++];assert.ok(row,id)
    const dur=Math.max(+b-+a,Math.ceil(row[1].split(/\s+/).length/2.2))
    const line=`| ${time}–${time+dur} s | ${row[2]||old[0]} | ${row[0]} | ${row[1]} |`;time+=dur;return line
   })
   assert.equal(ri,d.reel.length,id+' tomadas')
   s=s.replace(/\*\*Capa:\*\*[^\n]*/,`**Capa:** ${d.title}`)
   s=s.replace(/\*\*Duração de referência:\*\*[^\n]*/,`**Duração de referência:** ${time} s, estimada em até 2,2 palavras por segundo. Legendar as falas completas e ajustar ao ritmo da gravação.`)
  }
  if(kind==='ST'){
   s=s.replace(/\*\*Versão anterior:\*\*[^\n]*/,`**Versão anterior:** [Antes da revisão de clareza](../historico/2026-10-13-antes-clareza-geral/postagens/04-stories.md#${id.toLowerCase()}).`)
   s=s.replace(/\*\*Fechamento:\*\*[^\n]*/,`**Fechamento:** ${d.texts[3]}`)
   s=s.replace(/\*\*Figurinha:\*\*[^\n]*\n\n/g,'')
   let screen=0
   s=s.replace(/### Tela (\d+)([\s\S]*?)(?=### Tela |\*\*Produção:|$)/g,(all,n,body)=>{
    screen++;const sticker=d.stickers?.[n]
    if(d.visuals)body=body.replace(/\*\*Visual:\*\*[^\n]*/,`**Visual:** ${d.visuals[+n-1]}`)
    if(sticker)body=body.replace('**Visual:**',`**Figurinha:** ${sticker}\n\n**Visual:**`)
    return `### Tela ${n}`+body
   })
   assert.equal(screen,4,id+' telas')
   s=s.replace(/\*\*Produção:\*\*[^\n]*/,`**Produção:** ${d.production}`)
  }
  doc=doc.slice(0,start)+s+doc.slice(end)
  reports.push({id,title:d.title,words:blocks.map(ps=>ps.join(' ').split(/\s+/).length)})
 }
 if(kind==='ST')doc=doc.replace(/\*\*Revisão:[\s\S]*?(?=\n\nFormato)/,'**Revisão de clareza: 13/10/2026.** As vinte sequências educam quem já segue, com quatro telas completas, situações compreensíveis e uma ideia por sequência. Não pedem para seguir nem levam à oferta. As figurinhas escutam experiências ou verificam algo mostrado, sem classificar a criança. Mantidos os vínculos com o calendário e a variedade visual; saem termos técnicos desnecessários, analogias que não explicavam a situação e promessas gerais sobre comportamento. [Régua de copy](13-guia-de-copy.md) · [Versão anterior](../historico/2026-10-13-antes-clareza-geral/postagens/04-stories.md).')
 fs.writeFileSync(path.join(base,docfile),doc)
}
fs.writeFileSync(path.join(work,'complementos-revistos.json'),JSON.stringify(reports,null,2))
console.log(JSON.stringify({pieces:reports.length,maxStoryWords:Math.max(...reports.filter(x=>x.id.startsWith('ST')).flatMap(x=>x.words))}))
