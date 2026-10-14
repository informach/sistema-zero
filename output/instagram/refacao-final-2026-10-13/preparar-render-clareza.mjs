import fs from 'node:fs'
import path from 'node:path'
const work=path.resolve('output/instagram/refacao-final-2026-10-13')
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const revised=JSON.parse(fs.readFileSync(path.join(work,'revisao-clareza.json'),'utf8'))
const folders={P01:'p01-uma-ideia-dele',P07:'p07-primeira-dificuldade',P34:'p34-a-ideia-veio-dele'}
let render=fs.readFileSync(path.join(work,'montar.mjs'),'utf8')
render=render.replaceAll("path.join(dir,'apoio/v3/","path.join(dir,'apoio/v4/")
 .replaceAll('href="apoio/v3/fontes-e-producao.md"','href="apoio/v4/fontes-e-producao.md"')
 .replace('Refação com a direção e copy da revisão 4','Copy simplificada · Direção de arte preservada')
 .replace("label:'Turbo 1,5'","label:'Antes'").replace("label:'Turbo 3'","label:'Depois'")
 .replace("label:'Plataforma em x 12'","label:'Mais longe'").replace("label:'Plataforma em x 7'","label:'Mais perto'")
 .replace("label:'Regra: 2 × de dano'","label:'Antes'").replace("label:'Regra: 1,5 × de dano'","label:'Depois'")
 .replace('.p01-3 .lead{font-size:64px}', '.p01-3 .lead{font-size:52px}')
 .replace('.p07-2 .lead{font-size:61px;', '.p07-2 .lead{font-size:55px;')
fs.writeFileSync(path.join(work,'montar-clareza.mjs'),render)
fs.writeFileSync(path.join(work,'verificar-clareza.mjs'),fs.readFileSync(path.join(work,'verificar-final.mjs'),'utf8').replaceAll('apoio/v3/verificacao-layout.json','apoio/v4/verificacao-layout.json').replace('verificacao-final.json','verificacao-clareza.json'))
const update=(relative,fn)=>{const f=path.join(base,relative);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')))}
for(const file of ['03-postagens.md','postagens/12-mapa-cobertura.md'])update(file,s=>{
 s=s.replaceAll('Seu filho sabe o nome de todos os youtubers de jogo. Mas nunca viu um jogo por dentro.',revised.P01.slides[0].join(' '))
 s=s.replaceAll('“Nada funciona”, ele diz, e fecha o notebook. Só que o problema de verdade cabia em quatro palavras.',revised.P07.slides[0].join(' '))
 return s
})
update('postagens/01-p01-a-p10.md',s=>s.replace(/(\*\*Versão anterior:\*\*[^\n]*(?:youtubers de jogo|quatro palavras)[^\n]*?) \(capa mantida\)/g,'$1 (apoio da capa simplificado)').replace(/\n---\n\n(\*\*Produção atual — revisão de clareza:\*\*[^\n]+)\n\n<a id="p02">/, '\n$1\n\n---\n\n<a id="p02">'))
update('README.md',s=>s.replace('**Três carrosséis refeitos conforme a revisão 4:**','**Três carrosséis com a copy simplificada após leitura das artes:**').replace('com fontes e verificações em `apoio/v3`.','com fontes das imagens em `apoio/v3` e a revisão de clareza em `apoio/v4`.'))
update('03-postagens.md',s=>s.replace('## Conferência e estado','## Conferência e estado\n\n**Clareza após leitura das artes:** somente P01, P07 e P34 receberam a nova revisão, a pedido da Helena. As explicações ligam a situação da família ao que a criança pratica criando jogos. A arte aprovada permanece. As demais peças aguardam essa passagem.'))
update('postagens/05-direcao-visual-e-producao.md',s=>s.replace('# Direção visual e produção das 60 publicações','# Direção visual e produção das 60 publicações\n\n**Copy simplificada após leitura das artes:** P01, P07 e P34 mantêm a arte aprovada e agora usam os textos da revisão de clareza. Fontes visuais em `apoio/v3`; copy atual e verificações em `apoio/v4`. Nos comparativos, os rótulos dizem “Antes”, “Depois”, “Mais longe” e “Mais perto”. Os números e as capturas do jogo permanecem reais.').replaceAll('refação da revisão 4 concluída','arte da revisão 4 e copy da revisão de clareza'))
update('producao/postagens/README.md',s=>s.replace('com a copy da revisão 4 e as direções atuais de arte e produção','com a copy simplificada após a leitura das artes pela Helena, preservando a direção visual aprovada').replace('**apoio/v3** registra copy usada, prompts, fontes e verificações.','**apoio/v4** registra a copy atual e as verificações. **apoio/v3** conserva as fontes das imagens, prompts e a copy anterior.').replace('em output/instagram/refacao-final-2026-10-13/anterior.','em output/instagram/refacao-final-2026-10-13/anterior e antes-clareza.'))
update('producao/postagens/index.html',s=>s.replace('Copy, arte e produção atuais ·','Copy simplificada · Arte aprovada preservada ·'))
for(const [id,slug] of Object.entries(folders)){
 const dir=path.join(base,'producao/postagens',slug)
 fs.writeFileSync(path.join(dir,'apoio/v4/copy-publica.txt'),[...revised[id].slides.flat(),...revised[id].caption].join('\n\n')+'\n')
 update('producao/postagens/'+slug+'/publicacao.txt',s=>s.replace('versão atual, revisão 4 de copy e nova produção','versão atual, revisão de clareza e arte aprovada preservada').replace('Prompts da ferramenta image_gen integrada e fontes em apoio/v3.','Prompts da ferramenta image_gen integrada e fontes das imagens em apoio/v3; copy atual e verificações em apoio/v4.').replace('As direções de arte e a copy atuais substituem as artes da tarde.','A copy simplificada substitui os textos anteriores, preservando a direção visual aprovada.'))
}
console.log('Renderização e registros preparados para a revisão de clareza.')
