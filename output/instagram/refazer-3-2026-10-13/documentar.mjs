import fs from 'node:fs'
import path from 'node:path'
const base=path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const work=path.resolve('output/instagram/refazer-3-2026-10-13')
const folders={P01:'p01-uma-ideia-dele',P34:'p34-a-ideia-veio-dele',P07:'p07-primeira-dificuldade'}
const jobs=['imagens-geradas.json','imagens-geradas-2.json','imagens-geradas-3.json','imagens-geradas-4.json'].flatMap(f=>JSON.parse(fs.readFileSync(path.join(work,f),'utf8')))
const details={
P01:`Base: Meu Mundo, extensão Mundo 3D, em packages/studio/src/official-extensions/world-3d/examples.ts. Runtime oficial da mesma pasta.

Para deixar o percurso legível, a montagem de demonstração usa terreno plano, roadGrid orgânica de 50 com largura 4, área livre de 27, sem grama alta, câmera de acompanhamento, luz fixa e motor sem som. Essas escolhas são iguais nas duas versões. Árvores, carrinho, água e objetos vêm do exemplo e do runtime oficial; nenhuma moeda foi acrescentada.

Só a força de carBoost muda entre as duas versões: 1.5 e 3. Mesma semente 314159, mesma posição inicial, mesma sequência ArrowUp + Shift por 700 ms, sem mover o carro por código. Resultado medido: z 10.1376 e velocidade 28.16 na primeira; z 16.22016 e velocidade 45.056 na segunda. O HUD arredonda para 28 e 45. A comparação mostra avanço e velocidade; não fabrica derrapagem nem colisão.

O panorama usa a mesma demonstração. A captura da interface completa, usada também como referência de monitor, vem do playground real do Estúdio com o exemplo original. A tela do jogo nas cenas fotográficas foi recriada usando essa captura como referência; as comparações isoladas são capturas reais, sem geração de pixels.

Arquivos: world-antes.js, world-depois.js, turbo-antes.png, turbo-depois.png, bloco-world-antes.png e bloco-world-depois.png.`,
P07:`Base: Salto nas Nuvens, Jogo 3D Avançado, em packages/studio/src/official-extensions/game-3d-advanced/examples.ts. Runtime e física oficiais.

Adaptação comum às duas versões: todas as plataformas, moedas e o ponto de partida do herói foram elevados em 15 unidades, para mostrar a queda abaixo das plataformas acima do piso global do motor. As distâncias relativas, a gravidade, a velocidade 8 e a força do pulo 11 foram mantidas. Câmera final comum em órbita 20, ângulo 15/35, olhando o ponto 5,15,-1. Não houve teletransporte do herói nem alteração de placar.

Entre as duas versões muda somente o x da segunda plataforma: 12 (distante) e 7 (perto). A moeda fica em 7,18,-2 nas duas.

Entrada idêntica: após 900 ms para pousar, ArrowLeft + ArrowDown + Space por 350 ms; soltar Down/Space, manter Left por 575 ms; soltar e aguardar 250 ms; Left por 90 ms, pausa de 80 ms; Up por 100 ms, pausa de 80 ms; ajustar apenas a câmera e avançar 50 ms.

Resultado medido: ambas chegam ao mesmo x 7.3343838525 e z -2.0640877817. Na versão distante o herói está em y 7.71088, caindo, com três moedas vivas (zero coletadas). Na próxima, está apoiado em y 16.8, com duas moedas vivas (uma coletada). O HUD real mostra 0 e 1. O bloco capturado preserva pulo 11.

Arquivos: nuvens-antes.js, nuvens-depois.js, salto-antes-fim.png, salto-depois-fim.png e bloco-nuvens-depois.png. As fotos de investigação e descoberta usam essas telas como referências de monitor.`,
P34:`Base: Batalha de Monstrinhos Profissional, Jogo 2D Avançado, em packages/studio/src/official-extensions/game-2d-advanced/examples/batalhaProfissionalExample.ts. Runtime oficial.

Comparação da mesma batalha de Alice, com a mesma ficha de Folhito nível 5 e Faisco nível 5, usando Brasa. A entrada na batalha usa a API pública pkmBattleTrainer com o time original da rival, sem alterar seus atributos. O golpe é escolhido pelo teclado real; a resolução usa o motor original. Aleatoriedade fixada em 0.5 nas duas partidas para manter o mesmo acerto e a mesma variação de dano. O único comando alterado é pkmTypeChart("fogo", "planta", 2) para 1.5.

Capturas do mesmo momento depois de Brasa: batalha-antes-5.png e batalha-depois-5.png. A barra de Folhito fica menor com 2 e maior com 1.5. Nenhuma barra ou mensagem foi desenhada manualmente. O destaque amarelo na tabela é uma marca editorial sobre a primeira linha real, com 1.5; não altera o conteúdo do bloco.

Os blocos foram renderizados com Blockly e as definições oficiais da extensão. Os recortes isolados retiram apenas a moldura da área, preservando o comando real.

Falas literais: Daniel, pai do Rafael, AV11, trecho 25,26–30,22 s do vídeo autorizado; a frase do filho citada por Daniel está em 28,58–30,22 s. O quadro aos 12 s serviu somente como referência de fisionomia. O relato do Rafael vem do depoimento da oferta do Desafio do Primeiro Jogo. O slide 7 não tem imagem da batalha nem atribui esse jogo ao aluno.

O novo retrato do Daniel usa como referência de tela packages/funnel/public/img/comunidade-dos-criadores/tela-jornada@2x.webp. A marca antiga não foi mantida. Não há áudio sintético nem alteração dos vídeos originais.`
}
for(const [id,folder] of Object.entries(folders)){
 const dir=path.join(base,'producao/postagens',folder,'apoio/v2')
 const own=jobs.filter(j=>j.id.startsWith(id.toLowerCase()))
 fs.writeFileSync(path.join(dir,'prompts.json'),JSON.stringify(own.map(j=>({...j,arquivo:j.id+'.png',ferramenta:'image_gen integrada',referencias:j.refs})),null,2))
 fs.writeFileSync(path.join(dir,'fontes-e-producao.md'),`# ${id} — refação completa das mídias

Produzido em 13/10/2026. Copy vigente integral, com ${id==='P34'?8:7} slides e convite final separado. Sem entrada de ManyChat. PNGs 1080 × 1350 (4:5).

## Cenas e identidade

Todas as cenas com pessoas foram geradas novamente com a ferramenta integrada image_gen, usando os retratos autorizados para orientar a fisionomia. Não reutilizam o enquadramento dos vídeos ou das fotos originais. Não são registros históricos das situações narradas. As telas fotografadas foram orientadas por referências reais da plataforma. As comparações de jogo e os recortes dos blocos são capturas diretas do runtime e do Blockly oficiais.

As falas são da copy aprovada, sem criar um novo depoimento para acompanhar a cena. A origem das cenas está também no texto alternativo. Não se acrescentou o rodapé “Cena ilustrativa” nem “Demonstração da equipe”.

Arquivo de prompts e referências: [prompts.json](prompts.json). Imagens geradas: ${own.map(j=>'['+j.id+'.png]('+j.id+'.png)').join(', ')}.

## Capturas e verificação da demonstração

${details[id]}

## Montagem e conferência

Layout nativo em HTML/CSS; Nunito 800/600, azul #194bd7, creme #fffcf4 e amarelo #ffdb56. A montagem editável está dois níveis acima. Os PNGs finais foram exportados no Chrome, sem copiar o texto sobre imagens antigas.

Verificações: contagem e dimensões dos PNGs; copy extraída da ficha comparada integralmente com os parágrafos da arte; legenda integral; carregamento das imagens/fontes; limites dos elementos; inspeção de prévias e slides de comparação. [Relatório de layout](verificacao-layout.json).

Scripts de produção e cópia das artes anteriores: output/instagram/refazer-3-2026-10-13 no workspace. O código da plataforma e os depoimentos originais não foram alterados.

Nenhuma publicação, agendamento ou automação foi executada.
`)
 const game=id==='P01'?'world':id==='P07'?'nuvens':'batalha'
 fs.copyFileSync(path.join(work,game+'-original.json'),path.join(dir,'exemplo-original.json'))
}
const source1=path.join(base,'postagens/01-p01-a-p10.md')
let d=fs.readFileSync(source1,'utf8')
d=d.replace('criança jogando com destreza, rosto, mãos e jogo visíveis (a cena da capa já produzida serve).','cena nova do André jogando com destreza, com rosto, mãos e o jogo visíveis. A foto original serve somente de referência da fisionomia.')
d=d.replace('A capa pode reutilizar a criança jogando com destreza. As artes anteriores não estão prontas para esta copy.','Refação concluída em 13/10/2026: sete slides com cenas novas e capturas reais; [prévia e arquivos](../producao/postagens/p01-uma-ideia-dele/index.html). As fotos serviram só para preservar a fisionomia. Adaptações e resultados estão no registro de produção.')
const p07Start=d.indexOf('## P07 ·'),p07End=d.indexOf('\n## P08 ·',p07Start)
let p07=d.slice(p07Start,p07End)
p07=p07.replace(/(\*\*Produção:\*\*[^\n]*)/,'$1\n\n**Mídia refeita em 13/10/2026:** sete slides, cenas novas de André e Júlio e comparação real de Salto nas Nuvens. [Prévia e arquivos](../producao/postagens/p07-primeira-dificuldade/index.html). As duas versões foram elevadas igualmente para visualizar a queda; a única diferença entre elas é a distância da plataforma. Detalhes e medições no registro interno.')
d=d.slice(0,p07Start)+p07+d.slice(p07End);fs.writeFileSync(source1,d)
const source2=path.join(base,'postagens/09-p31-a-p40.md')
d=fs.readFileSync(source2,'utf8')
const start=d.indexOf('## P34 ·'),end=d.indexOf('\n## P35 ·',start)
let s=d.slice(start,end)
s=s.replace('retrato real do Daniel (quadro aos 12 s).','retrato recriado do Daniel em um novo ambiente, com a nossa plataforma no monitor. O quadro aos 12 s serve somente para orientar a fisionomia.')
s=s.replace('ilustração editorial de uma criança apontando para a tela, braços cruzados, sem jogo real identificável.','cena recriada do André questionando uma regra do jogo, com gesto de dúvida e a batalha da nossa ferramenta no monitor; não é atribuída ao Rafael.')
s=s.replace('o mesmo bloco antes e depois da troca; duas capturas da mesma luta, lado a lado.','duas capturas da mesma luta, empilhadas para leitura no celular, com as regras identificadas e o bloco alterado para 1.5.')
s=s.replace('as seis linhas da tabela de tipos, com a linha alterada em destaque.','as seis linhas reais da tabela de tipos, com a primeira linha em 1.5 destacada em amarelo.')
s=s.replace('retrato real do Rafael (o da oferta, em tamanho pequeno).','retrato novo do Rafael, gerado com a foto da oferta apenas como referência de fisionomia.')
s=s.replace(/(\*\*Produção:\*\*[^\n]*)/,'$1\n\n**Mídia refeita em 13/10/2026:** oito slides com cenas novas, tela própria no monitor do Daniel, capturas reais da batalha e blocos oficiais. [Prévia e arquivos](../producao/postagens/p34-a-ideia-veio-dele/index.html). Fontes e prompts no registro interno; os vídeos originais foram preservados.')
d=d.slice(0,start)+s+d.slice(end);fs.writeFileSync(source2,d)
const readme=`# Produção das postagens do calendário

**Refação concluída em 13/10/2026:** P01, P34 e P07 usam integralmente as novas copies, novas cenas e novas capturas. São 22 PNGs em 1080 × 1350 (4:5).

| Material | Estado | Arquivos |
| --- | --- | --- |
| P01 · Seu filho já tem uma lista do que mudaria nos jogos | 7 slides; André jogando, ideia do turbo e comparação real | [Prévia](p01-uma-ideia-dele/index.html) · [Pasta](p01-uma-ideia-dele/) · [Legenda](p01-uma-ideia-dele/legenda.txt) |
| P34 · “Eu quero mudar isso aqui no jogo.” | 8 slides; retrato novo do Daniel, plataforma própria no monitor e batalha de monstrinhos | [Prévia](p34-a-ideia-veio-dele/index.html) · [Pasta](p34-a-ideia-veio-dele/) · [Legenda](p34-a-ideia-veio-dele/legenda.txt) |
| P07 · “Nada funciona”, ele diz. E fecha o notebook | 7 slides; investigação com André e Júlio e comparação real do salto | [Prévia](p07-primeira-dificuldade/index.html) · [Pasta](p07-primeira-dificuldade/) · [Legenda](p07-primeira-dificuldade/legenda.txt) |
| P02–P06, P08–P33 e P35–P60 | Copy, legenda e direção completas; mídias a produzir | [Calendário vigente](../../03-postagens.md) |
| E01–E06 | Copy e direção completas; mídia a produzir conforme necessidade | [Extras](../../postagens/07-extras-para-familias.md) |
| ST01–ST20 | Copy completa; imagens a produzir | [Stories](../../postagens/04-stories.md) |
| ManyChat | Categoria separada, fora deste calendário | [Documento próprio](../../04-postagens-manychat.md) |

Cada pasta contém os PNGs numerados, a legenda, os textos alternativos, a prévia e a montagem editável. Em apoio/v2 estão as novas cenas, as capturas, os prompts, as fontes e as verificações. As fotos originais serviram como referências de fisionomia; os novos retratos não são quadros dos depoimentos.

As capturas comparativas dos jogos e os blocos foram obtidos com os runtimes e as definições oficiais do Estúdio. As adaptações para a demonstração e os resultados estão documentados. O monitor do Daniel usa a plataforma Sistema Zero.

O convite para seguir fica em um slide final separado nos três carrosséis. O calendário comum não usa palavras-chave do ManyChat.

**Ordem destes carrosséis:** P01 → P34 → P07. P33 (imagem única) e P16 (Reel) continuam entre P01 e P34 na fila geral; essas mídias ainda serão produzidas. O próximo carrossel do calendário é P04.

As entregas anteriores foram substituídas nas pastas de publicação e guardadas apenas em output/instagram/refazer-3-2026-10-13/anterior. O antigo carrossel do “não consigo” continua fora da fila.

Nenhum material foi agendado ou publicado.
`
fs.writeFileSync(path.join(base,'producao/postagens/README.md'),readme)
const direction=path.join(base,'postagens/05-direcao-visual-e-producao.md')
d=fs.readFileSync(direction,'utf8')
d=d.replace(/\*\*P01, mídia anterior:\*\*[^\n]*/,'**P01, mídia refeita em 13/10/2026:** [sete slides](../producao/postagens/p01-uma-ideia-dele/index.html). Cenas novas de André e Júlio; Meu Mundo com comparação real do turbo 1.5 e 3. A foto de capa foi criada novamente, preservando a fisionomia de referência.')
d=d.replace(/\*\*P34, mídia anterior a refazer:\*\*[^\n]*/,'**P34, mídia refeita em 13/10/2026:** [oito slides](../producao/postagens/p34-a-ideia-veio-dele/index.html). Retratos novos de Daniel e Rafael, orientados pelas fotos autorizadas. A tela do Daniel mostra a plataforma Sistema Zero. Batalha de Monstrinhos Profissional com regra 2 e 1.5, mesma luta e capturas reais. O relato de Rafael ocupa um slide sem jogo.')
d=d.replace(/\*\*P07, mídia anterior a refazer:\*\*[^\n]*/,'**P07, mídia refeita em 13/10/2026:** [sete slides](../producao/postagens/p07-primeira-dificuldade/index.html). Cenas novas de André e Júlio, orientadas por suas fotos. Salto nas Nuvens com força 11 e uma mudança de distância. A comparação real confirma a queda na versão distante e a chegada com coleta da moeda na versão próxima. Adaptações comuns documentadas no registro.')
d=d.replace('A legibilidade das artes, as capturas comparativas e os cortes dos vídeos da nova versão serão verificados na produção.','As artes de P01, P34 e P07 foram refeitas e verificadas; as demais seguem para produção. Nesta refação, por solicitação da Helena, os retratos desses três carrosséis são cenas geradas com referência de fisionomia, sem reaproveitar o quadro original; as falas permanecem literais e a origem das imagens fica no registro e no texto alternativo.')
fs.writeFileSync(direction,d)
console.log('Fontes, prompts, fichas e índice atualizados.')
