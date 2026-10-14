import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const changed=new Set(['P01','P07','P34'])
let unchanged=0
const sections=text=>new Map([...text.replaceAll('\r\n','\n').matchAll(/^## (P\d+) · ([\s\S]*?)(?=^## P\d+ · |$(?![\s\S]))/gm)].map(m=>[m[1],m[2].trim()]))
for(const name of ['01-p01-a-p10.md','09-p31-a-p40.md']){
 const old=sections(fs.readFileSync(path.join(base,'historico/2026-10-13-antes-clareza-tres-produzidas',name),'utf8'))
 const current=sections(fs.readFileSync(path.join(base,'postagens',name),'utf8'))
 assert.equal(old.size,current.size)
 for(const [id,text] of old){
  if(changed.has(id))continue
  assert.equal(current.get(id),text,'Copy fora do escopo alterada: '+id);unchanged++
 }
}
assert.equal(unchanged,17)
const folders=['p01-uma-ideia-dele','p07-primeira-dificuldade','p34-a-ideia-veio-dele']
const refs=html=>[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1])
for(const slug of folders){
 const previous=refs(fs.readFileSync(path.join(work,'antes-clareza',slug,'montagem.html'),'utf8'))
 const current=refs(fs.readFileSync(path.join(base,'producao/postagens',slug,'montagem.html'),'utf8'))
 assert.deepEqual(current,previous,'Imagem trocada: '+slug)
}
const report={publicCopyOutsideScopeUnchanged:unchanged,carouselsWithImageSourcesPreserved:3,issues:[]}
fs.writeFileSync(path.join(work,'verificacao-escopo-clareza.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
