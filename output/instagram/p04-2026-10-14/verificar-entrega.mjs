import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p04-arquivos-no-computador')
const qa=JSON.parse(fs.readFileSync(path.join(base,'apoio/verificacao.json'),'utf8'))
assert.deepEqual(qa.errors,[])
assert.equal(qa.copyEqual,true)
assert.ok(qa.fonts.normal&&qa.fonts.bold)
let links=0
for(const file of ['index.html','montagem.html','apoio/fontes-e-producao.md']){
 const full=path.join(base,file),text=fs.readFileSync(full,'utf8')
 const urls=file.endsWith('.html')?[...text.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]):[...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(m=>m[1])
 for(const url of urls){if(/^(?:https?:|#|data:)/.test(url))continue;assert.ok(fs.existsSync(path.resolve(path.dirname(full),url.split('#')[0])),file+': '+url);links++}
}
const pngs=[]
for(let n=1;n<=7;n++){
 const file=`0${n}-p04.png`,buf=fs.readFileSync(path.join(base,file))
 assert.equal(buf.toString('ascii',1,4),'PNG')
 const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20)
 assert.equal(width,1080);assert.equal(height,1350)
 pngs.push({file,width,height,bytes:buf.length})
}
for(const file of ['legenda.txt','texto-alternativo.txt','publicacao.txt','previa.png','apoio/prompts.json','apoio/imagens-geradas.json','apoio/copy.json'])assert.ok(fs.statSync(path.join(base,file)).size>0,file)
const summary={status:'conferido',slides:pngs,copyPreserved:true,fontsLoaded:true,localLinks:links,errors:[],artDirection:'Leitura visual de capa, sete slides, continuidade da personagem e prévia móvel; imagens independentes por slide.',scope:'P04 produzido, índices atualizados. Sem publicar, agendar, commit ou deploy.'}
fs.writeFileSync(path.join(base,'apoio/entrega-verificada.json'),JSON.stringify(summary,null,2))
console.log(JSON.stringify({slides:pngs.length,dimensions:'1080 × 1350',copyPreserved:true,fontsLoaded:true,localLinks:links,errors:[]},null,2))
