import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const originals=JSON.parse(fs.readFileSync(path.join(work,'originais.json'),'utf8'))
const changes=JSON.parse(fs.readFileSync(path.join(work,'coerencia-visual.json'),'utf8'))
const files=new Map()
for(const[id,c]of Object.entries(changes)){
 assert.ok(!['P01','P07','P34'].includes(id))
 const filename=id.startsWith('MC')?'04-postagens-manychat.md':'postagens/'+originals.find(o=>o.id===id).source
 const file=path.join(base,filename),doc=files.get(file)||fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')
 const start=doc.indexOf('## '+id+' · '),next=doc.indexOf('\n<a id=',start),end=next<0?doc.length:next
 assert.ok(start>=0,id)
 let s=doc.slice(start,end),vi=0,ri=0
 if(c.visuals)s=s.replace(/\*\*Visual:\*\*[^\n]*/g,line=>{vi++;return c.visuals[vi]?`**Visual:** ${c.visuals[vi]}`:line})
 if(c.artVisual)s=s.replace(/\*\*Visual:\*\*[^\n]*/,`**Visual:** ${c.artVisual}`)
 if(c.scenes)s=s.replace(/^\| (\d+[–-]\d+ s) \|([^\n]+)$/gm,(line,t,rest)=>{ri++;if(!c.scenes[ri])return line;const cols=rest.split('|').map(x=>x.trim());cols[2]=c.scenes[ri];return `| ${t} | ${cols.slice(0,3).join(' | ')} |`})
 for(const k of Object.keys(c.visuals||{}))assert.ok(+k<=vi,id+' visual '+k)
 for(const k of Object.keys(c.scenes||{}))assert.ok(+k<=ri,id+' cena '+k)
 files.set(file,doc.slice(0,start)+s+doc.slice(end))
}
for(const[file,doc]of files)fs.writeFileSync(file,doc)
console.log('Coerência de cenas e visuais aplicada a '+Object.keys(changes).length+' fichas.')
