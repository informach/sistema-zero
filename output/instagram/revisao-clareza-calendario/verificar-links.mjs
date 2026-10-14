import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const paths=['README.md','03-postagens.md','04-postagens-manychat.md','campanhas/manychat-desafio/README.md','campanhas/manychat-desafio/fluxo-curto.md','pesquisas/revisao-clareza-geral-2026-10-13.md',...fs.readdirSync(path.join(root,'postagens')).filter(f=>/^(0[1234579]|1[0-5])-.*\.md$/.test(f)).map(f=>'postagens/'+f)]
const broken=[],checked=[]
for(const file of paths){
 const full=path.join(root,file),doc=fs.readFileSync(full,'utf8')
 for(const match of doc.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)){
  const url=match[1];if(/^[a-z]+:\/\//i.test(url)||url.startsWith('#'))continue
  const [target]=url.split('#'),resolved=path.resolve(path.dirname(full),decodeURIComponent(target))
  if(!fs.existsSync(resolved))broken.push({file,url})
  checked.push({file,url})
 }
}
fs.writeFileSync('output/instagram/revisao-clareza-calendario/links.json',JSON.stringify({files:paths.length,checked:checked.length,broken},null,2))
console.log(JSON.stringify({files:paths.length,checked:checked.length,broken},null,2))
if(broken.length)process.exitCode=1
