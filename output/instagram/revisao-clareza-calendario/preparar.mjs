import fs from 'node:fs'
import path from 'node:path'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/revisao-clareza-calendario')
const history=path.join(base,'historico/2026-10-13-antes-clareza-geral')
fs.mkdirSync(history,{recursive:true})
const files=[...fs.readdirSync(path.join(base,'postagens')).filter(f=>f.endsWith('.md')).map(f=>'postagens/'+f),'README.md','03-postagens.md','04-postagens-manychat.md','campanhas/manychat-desafio/README.md','campanhas/manychat-desafio/fluxo-curto.md']
for(const relative of files){
 const target=path.join(history,relative);fs.mkdirSync(path.dirname(target),{recursive:true})
 if(!fs.existsSync(target))fs.copyFileSync(path.join(base,relative),target)
}
const sources=['01-p01-a-p10.md','02-p11-a-p20.md','03-p21-a-p30.md','09-p31-a-p40.md','10-p41-a-p50.md','11-p51-a-p60.md']
const all=[]
for(const source of sources){
 const doc=fs.readFileSync(path.join(base,'postagens',source),'utf8').replaceAll('\r\n','\n')
 const items=[...doc.matchAll(/^## (P\d+) · ([\s\S]*?)(?=^## P\d+ · |$(?![\s\S]))/gm)].map(m=>({id:m[1],source,section:m[2]}))
 all.push(...items)
 const brief=items.map(p=>`## ${p.id} · ${p.section.split('\n')[0]}\n${p.section.split('\n').filter(l=>l.startsWith('**Necessidade:')||l.startsWith('**Capa do Reel:')||l.startsWith('>')||l.startsWith('### ')||/^\| \d/.test(l)).join('\n')}`).join('\n\n')
 fs.writeFileSync(path.join(work,source.replace('.md','-leitura.txt')),brief)
}
fs.writeFileSync(path.join(work,'originais.json'),JSON.stringify(all,null,2))
console.log(all.map(p=>p.id+' '+p.section.split('\n')[0]+' | '+(p.section.match(/\*\*Formato:\*\* ([^.]+)/)?.[1]||'')).join('\n'))
