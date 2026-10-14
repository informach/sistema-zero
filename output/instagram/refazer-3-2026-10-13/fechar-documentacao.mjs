import fs from 'node:fs'
import path from 'node:path'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const dir=path.join(base,'producao/postagens/p01-uma-ideia-dele/apoio/v2')
const r=JSON.parse(fs.readFileSync('output/instagram/refazer-3-2026-10-13/imagens-geradas-5.json','utf8'))[0]
const prompts=JSON.parse(fs.readFileSync(path.join(dir,'prompts.json'),'utf8'))
prompts.push({...r,arquivo:r.id+'.png',ferramenta:'image_gen integrada',referencias:r.refs})
fs.writeFileSync(path.join(dir,'prompts.json'),JSON.stringify(prompts,null,2))
let d=fs.readFileSync(path.join(dir,'fontes-e-producao.md'),'utf8')
d=d.replace('O panorama usa a mesma demonstração.','O panorama do slide 6 usa o exemplo original com relevo 4, câmera cinema e a atmosfera oficial no entardecer (setTime). A grama alta e o som foram retirados, e a área livre foi ajustada para 20; os demais elementos vêm do exemplo. O arquivo world-ambiente.js registra essa composição. Abaixo dele entram os blocos reais de terreno, água e ciclo de dia/noite, em vez do print inteiro do editor. A captura mostra a floresta e o relevo; não se desenhou um rio inexistente sobre ela.')
d=d.replace('## Montagem e conferência','## Última versão do P01\n\nA ficha foi atualizada durante a produção para a capa “Ele sabe o nome de todos os youtubers de jogo”, série “Por trás do jogo”. O texto final foi lido novamente da ficha. A cena do slide 2 foi gerada mais uma vez para mostrar André assistindo a uma partida, com as mãos fora dos controles: [p01-assistindo.png](p01-assistindo.png). O arquivo p01-ideia.png permanece apenas como alternativa de produção, sem uso nos PNGs finais.\n\n## Montagem e conferência')
fs.writeFileSync(path.join(dir,'fontes-e-producao.md'),d)
const readme=path.join(base,'producao/postagens/README.md')
d=fs.readFileSync(readme,'utf8').replace('P01 · Seu filho já tem uma lista do que mudaria nos jogos','P01 · Ele sabe o nome de todos os youtubers de jogo').replace('7 slides; André jogando, ideia do turbo e comparação real','7 slides; série Por trás do jogo, André jogando e assistindo, bastidores e comparação real do turbo')
fs.writeFileSync(readme,d)
const direction=path.join(base,'postagens/05-direcao-visual-e-producao.md')
d=fs.readFileSync(direction,'utf8').replace('A foto de capa foi criada novamente, preservando a fisionomia de referência.','A foto de capa foi criada novamente, preservando a fisionomia de referência. A última copy abre com “Ele sabe o nome de todos os youtubers de jogo”, com selo Por trás do jogo; a cena do slide 2 mostra André como espectador.')
fs.writeFileSync(direction,d)
const source=path.join(base,'postagens/01-p01-a-p10.md')
d=fs.readFileSync(source,'utf8').replace('a arte em produção continua valendo; refazer só os textos.','mídia refeita em 13/10/2026 com a última copy, selo Por trás do jogo e cenas novas, conforme a solicitação de refazer também as imagens. [Prévia e arquivos](../producao/postagens/p01-uma-ideia-dele/index.html).')
d=d.replace('P07 será refeito do zero; as artes e capturas atuais (Mini plataforma) deixam de valer.','P07 foi refeito do zero; as antigas artes e capturas de Mini plataforma foram substituídas.')
fs.writeFileSync(source,d)
for(const folder of ['p01-uma-ideia-dele','p34-a-ideia-veio-dele','p07-primeira-dificuldade']){
 fs.writeFileSync(path.join(base,'producao/postagens',folder,'apoio/LEIA-ME.md'),'# Apoio de produção\n\nA versão atual usa os arquivos de v2. Nela estão cenas novas, capturas reais, prompts, fontes e verificações. Os arquivos soltos desta pasta pertencem ao material anterior e servem apenas como referências ou fontes, incluindo as fontes tipográficas e sua licença. Eles não são slides para publicação.\n')
}
console.log('Última copy do P01 e nova cena de espectador documentadas.')
