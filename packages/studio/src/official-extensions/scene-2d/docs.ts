import { SCENE_METHODS } from './catalog'

/** Permanent tutor summary: every character counts against the 6k budget of each engine. */
export const sceneSummary = `
CAMADAS E PERSPECTIVA: createSceneLayer compõe imagens com alfa; cenário fixo continua único.
Crie camadas e pista em Ao iniciar, nunca no laço. A cada quadro desenhe, nessa ordem,
drawSceneLayers('back'), drawTrack e drawSceneLayers('front').
createTrack projeta X/Z; cameraTrack teleporta; advanceTrack registra encontros.
Consulte trackTouching/trackPassed após avançar. Use velocidade/60 no básico e velocidade*dt no Avançado.
`

const EXAMPLE_NAME = {
  SZGame2D: 'Descida da Neve (Jogo 2D)',
  SZGameKit: 'Descida da Neve (Jogo 2D Avançado)',
} as const

/**
 * The shared manual section. `examples` adds the pointer to the gallery: the student
 * manual cites examples, the tutor context never does.
 */
export function sceneDocumentation(api: 'SZGame2D' | 'SZGameKit', examples = false): string {
  return `
### Camadas transparentes e pista em perspectiva

Uma área vazia no Pinta já é transparente. No editor vetorial, **Visualizar fundo**
permite enxergar o quadriculado ou simular papel branco/escuro. Essa escolha não entra
na imagem exportada. Pintar de branco cria branco opaco; JPEG e imagens achatadas
com fundo branco não ganham transparência automaticamente.

Para compor um cenário, crie camadas com nomes diferentes. Use imagens com o mesmo
tamanho de tela para alinhar céu, montanhas e chão: as camadas usam o tamanho original,
sem o corte automático do cenário único. Escala, posição, opacidade, ordem, repetição
e movimento pertencem a cada camada. Os planos **fundo** e **frente** permitem colocar
personagens entre elas. Tela fica parada; mundo segue a câmera; paralaxe segue uma fração.
Uma faixa de montanhas pode se repetir só para os lados: as cópias se emendam sem
empilhar. Repetir para todos os lados cobre a tela inteira.

A pista usa X lateral e Z de distância. O personagem continua sendo uma imagem 2D.
Escala = foco / distância até a câmera; o pé do objeto fica no chão. Isso revela
objetos novos ao avançar, como na descida de esqui. O incremento atual é uma pista
plana; não inclui curvas, relevo ou malha 3D. Para deslocar a câmera para os lados
durante a partida, use **Câmera da pista** com a distância atual: manter a mesma
distância não apaga o passo do último Avançar.

**Criar camada** e **Criar pista** são preparação: ficam em **⚙️ Ao iniciar** ou em
uma função chamada só para recomeçar. Dentro do laço, a pista recomeçaria vazia a
cada quadro, e o Console avisa. No laço, desenhe nesta ordem:

\`\`\`js
${api}.drawSceneLayers('back');
${api}.drawTrack('pista');
${api}.drawSceneLayers('front');
\`\`\`

O desenho do fundo limpa o quadro anterior e repinta o cenário fixo, se existir.
O desenho da frente preserva o mundo. Os helpers entram em coordenadas lógicas da
tela e restauram a transformação do contexto; não aplique outra câmera aos valores projetados.

Os encontros com objetos comparam distância percorrida e largura no mundo. Assim,
um passo grande não atravessa uma bandeira sem detectá-la. Consulte os encontros
depois de **Avançar** e remova os objetos tratados. Teleportar a câmera para outra
distância não dispara encontros. Os encontros acompanham o avanço da câmera: um objeto
que você move sozinho na direção do jogador pode cruzar sem ser percebido, e aí vale
comparar as distâncias com os blocos de valor. A visibilidade é 1 ou 0; coordenadas fora de perto/longe retornam 0.
Projetar o ponto ou aumentar uma imagem não altera a caixa de colisão de um sprite existente.
O nome de um objeto pode ser um texto ou um número, como o contador de um laço.

Você dá o nome uma vez, no bloco que cria a camada, a pista ou o objeto. Nos blocos
que usam esse nome, toque nele para abrir a lista do que já foi criado e escolher. A
lista de objetos mostra os da pista que está no mesmo bloco. Um nome montado num laço
(por exemplo, juntando "obj" com o contador) não aparece na lista: encaixe o mesmo
bloco de texto por cima.

Limites: 64 camadas, 16 pistas, 2048 objetos por pista e 4096 cópias por desenho de
uma camada repetida. Entradas numéricas inválidas são ignoradas, com aviso no Console;
a opacidade fora de 0 a 1 é ajustada para o limite mais próximo.
Reiniciar o jogo limpa as camadas e as pistas, e o seu **⚙️ Ao iniciar** monta tudo de novo.
Criar uma pista com o mesmo nome reinicia seus objetos.

${SCENE_METHODS.map((entry) => `- **${entry.message.replace(/%\d+/g, '…').replace(/…( …)+/g, '…')}**: \`${api}.${entry.method}(${entry.args.map((arg) => arg.name.toLowerCase()).join(', ')})\`. ${entry.tooltip}`).join('\n')}
${
  examples
    ? `
Veja o exemplo **"${EXAMPLE_NAME[api]}"**: 12 estrelas, três vidas e uma pista inteira
montada com estes blocos. O exemplo **"Descida da Neve (Canvas)"**, em Exemplos
clássicos, faz a mesma descida com a matemática à mostra, sem extensão.
`
    : ''
}`.trim()
}
