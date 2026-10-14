import fs from 'node:fs'
const base='docs/marketing/kids/comunidade-dos-criadores/instagram/postagens/'
const work='output/instagram/revisao-clareza-calendario/'
const originals=JSON.parse(fs.readFileSync(work+'originais.json','utf8'))
for(let lo of [2,11,21,31,41,51]){
 const out=[]
 for(const o of originals.filter(x=>+x.id.slice(1)>=lo&&+x.id.slice(1)<=Math.ceil(lo/10)*10&&!['P01','P07','P34'].includes(x.id))){
  const doc=fs.readFileSync(base+o.source,'utf8'),start=doc.indexOf('## '+o.id+' · '),next=doc.indexOf('\n<a id=',start),s=doc.slice(start,next<0?undefined:next)
  out.push(s.split('\n')[0])
  for(const m of s.matchAll(/### Slide (\d+)[^\n]*\n+([\s\S]*?)\*\*Visual:\*\* ([^\n]+)/g))out.push(m[1]+': '+m[2].trim().replaceAll('\n',' ').slice(0,145)+'\nVisual: '+m[3].slice(0,220))
  for(const m of s.matchAll(/^\| (\d+[–-]\d+ s) \|([^\n]+)/gm)){const c=m[2].split('|').map(t=>t.trim());out.push(m[1]+': '+c[1]+'\nCena: '+c[2])}
 }
 fs.writeFileSync(work+`visuais-${lo}.txt`,out.join('\n'))
}
