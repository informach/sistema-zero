import fs from 'node:fs'
import path from 'node:path'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const data=JSON.parse(fs.readFileSync(path.join(work,'revisao-clareza.json'),'utf8')).P34
for(const file of ['03-postagens.md','postagens/12-mapa-cobertura.md','producao/postagens/README.md']){
 const p=path.join(base,file)
 const doc=fs.readFileSync(p,'utf8').replaceAll('P34 · Seu filho vive reclamando de jogo.','P34 · Imagine seu filho criando um jogo do jeito dele.').replaceAll('P34 · Seu filho vive reclamando de jogo |','P34 · Imagine seu filho criando um jogo do jeito dele |')
 fs.writeFileSync(p,doc)
}
const dir=path.join(base,'producao/postagens/p34-a-ideia-veio-dele/apoio/v4')
fs.writeFileSync(path.join(dir,'copy-publica.txt'),[...data.slides.flat(),...data.caption].join('\n\n')+'\n')
const source=path.join(dir,'fontes-e-producao.md')
fs.writeFileSync(source,fs.readFileSync(source,'utf8')+'\n## Ajuste do assunto da capa\n\nAbertura atual: “Imagine seu filho criando um jogo do jeito dele.” A ideia de reclamação foi retirada da capa, do convite final e da legenda após feedback da Helena. O depoimento fala da vontade de mudar a própria criação; a peça parte desse desejo. A fala literal, os retratos, as ilustrações e as demonstrações permanecem. A versão anterior está em output/instagram/refacao-final-2026-10-13/antes-ajuste-gancho-p34.\n')
console.log('Registros do P34 atualizados.')
