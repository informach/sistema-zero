import type { SceneAction, SceneGroup, SceneId } from './actions'

/**
 * Os 24 modelos de cena: o catálogo ÚNICO do sistema.
 *
 * Antes o conteúdo de uma cena estava espalhado por três lugares — `LEARNING_SCENE_DEFINITIONS`
 * (a v1, com controles), `EXPLORATION_DEFINITIONS` (a v2/v3, com metas e dicas) e um segundo
 * catálogo escondido dentro de `experienceScript()`, que trazia os roteiros de demonstração.
 * Um modelo tinha, portanto, duas casas e nenhuma delas completa. Aqui ele tem uma só.
 *
 * O texto é conteúdo pedagógico da dona: foi transportado literalmente, não reescrito.
 */

/** Um passo do roteiro de uma demonstração. */
export interface SceneStep {
  id: string
  /** O que a criança LÊ enquanto o passo acontece. */
  caption: string
  /** Que parte da tela merece atenção neste passo. */
  highlight?: 'scene' | 'tools' | 'compare'
  actions: SceneAction[]
  /** Só avança quando esta descoberta acontecer de verdade. */
  waitFor?: string
}

/** Uma coisa que a criança precisa PERCEBER. O motor emite o id no instante em que acontece;
 *  a avaliação só conta quais apareceram. */
export interface SceneGoal {
  id: string
  label: string
}

export interface SceneModel {
  id: SceneId
  group: SceneGroup
  /** O que a criança vai fazer, em uma frase. É o nome que o professor bate o olho e escolhe. */
  title: string
  instruction: string
  /** O que ela pode mexer. Hoje isto só aparecia DEPOIS da escolha, no resumo. */
  manipulates: string
  success: string
  /** A pergunta do "e se…", para quem terminar antes. */
  extra: string
  goals: readonly SceneGoal[]
  /** Escada de três degraus: observação → estratégia → passo literal. */
  hints: readonly [string, string, string]
  /** O roteiro da demonstração desta cena. A demonstração autorada substitui; sem ela, é este. */
  script: readonly SceneStep[]
}

export const SCENE_MODELS: Record<SceneId, SceneModel> = {
  coordinates: {
    id: 'coordinates',
    group: 'stage',
    title: 'O endereço na tela',
    instruction: 'Mude o x e veja para que lado o Dino vai. Depois mude só o y.',
    manipulates: 'O x e o y do Dino, na tela de 480 por 270',
    success:
      'x maior leva para a direita e y maior leva para baixo. Juntos, os dois são o endereço!',
    extra: 'E se os dois forem 0? Descubra em que canto da tela isso fica.',
    goals: [
      { id: 'right', label: 'x maior leva para a direita' },
      { id: 'down', label: 'y maior leva para baixo' },
      { id: 'same-x', label: 'Mesmo x, altura diferente' },
    ],
    hints: [
      'Mexa só no x e olhe para que lado o Dino foi.',
      'Agora deixe o x parado e aumente o y. Repare que ele não sobe.',
      'Escolha um x e visite duas alturas diferentes com ele.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O x diz se o Dino fica mais para a esquerda ou mais para a direita.',
        highlight: 'scene',
        actions: [{ type: 'place', x: 300, y: 150 }],
      },
      {
        id: 'step-2',
        caption: 'O y cresce para BAIXO: quanto maior o y, mais embaixo na tela.',
        highlight: 'scene',
        actions: [{ type: 'place', x: 300, y: 240 }],
      },
      {
        id: 'step-3',
        caption: 'O par x, y é o endereço do sprite. Aqui ele volta para 110 e 150.',
        highlight: 'scene',
        actions: [{ type: 'place', x: 110, y: 150 }],
      },
    ],
  },
  'screen-reader': {
    id: 'screen-reader',
    group: 'stage',
    title: 'O que o leitor de tela lê',
    instruction: 'Ouça a tela com o campo vazio. Depois escreva a sua descrição e ouça de novo.',
    manipulates: 'A descrição do jogo e o botão de ouvir a tela',
    success: 'O desenho não informa nada sozinho. A sua frase é que conta o objetivo e o controle!',
    extra: 'E se a frase falasse só da tecla? Daria para saber o que fazer no jogo?',
    goals: [
      { id: 'heard-empty', label: 'Ouviu a tela sem descrição' },
      { id: 'says-goal', label: 'A frase diz o que fazer no jogo' },
      { id: 'says-control', label: 'A frase diz como se joga' },
    ],
    hints: [
      'Aperte Ouvir a tela antes de escrever qualquer coisa.',
      'O programa não enxerga o desenho: ele lê o que estiver escrito.',
      'Conte as duas coisas numa frase: o que fazer no jogo e qual tecla usar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem descrição, quem não vê a tela ouve só isto.',
        highlight: 'scene',
        actions: [{ type: 'listen' }],
      },
      {
        id: 'step-2',
        caption: 'Agora a descrição conta o objetivo e o controle.',
        highlight: 'scene',
        actions: [
          { type: 'describe', text: 'Corra com o dino e pule os cactos apertando espaço' },
          { type: 'listen' },
        ],
      },
    ],
  },
  'stage-size': {
    id: 'stage-size',
    group: 'stage',
    title: 'A tela e o limite dela',
    instruction: 'Mude a largura e a altura. Depois ligue a borda e veja onde a tela acaba.',
    manipulates: 'Largura e altura da tela, e a moldura que mostra o limite',
    success: 'A tela tem um limite, e o limite é uma escolha sua!',
    extra: 'E se a tela ficar quadrada? O que muda para quem joga?',
    goals: [
      { id: 'border-on', label: 'A borda mostra onde a tela acaba' },
      { id: 'resized', label: 'A tela mudou de tamanho junto com os números' },
      { id: 'target', label: 'Chegou na tela de 480 por 270' },
    ],
    hints: [
      'Ligue a borda: sem ela a cor do fundo cobre tudo e o limite some.',
      'Mude a largura e veja a moldura acompanhar.',
      'Deixe 480 de largura e 270 de altura, o tamanho do Corre Dino.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem a borda, a cor cobre tudo e não dá para ver onde é a tela.',
        highlight: 'scene',
        actions: [{ type: 'border', visible: false }],
      },
      {
        id: 'step-2',
        caption: 'Com a borda, o retângulo aparece: é ali que o jogo acontece.',
        highlight: 'scene',
        actions: [{ type: 'border', visible: true }],
      },
      {
        id: 'step-3',
        caption: 'Os números mandam no formato. Esta é a tela do Corre Dino.',
        highlight: 'scene',
        actions: [{ type: 'stage', width: 480, height: 270 }],
      },
    ],
  },
  'draw-loop': {
    id: 'draw-loop',
    group: 'stage',
    title: 'Por que o desenho se repete',
    instruction:
      'Avance o relógio. Depois ligue o desenho a cada quadro e a limpeza, uma de cada vez.',
    manipulates: 'Desenhar a cada quadro, limpar antes de desenhar e o relógio',
    success:
      'Desenhar de novo a cada quadro é o que faz o jogo se mexer, e limpar antes é o que tira o rastro!',
    extra: 'E se limpar sem desenhar? O que sobra na tela?',
    goals: [
      { id: 'frozen', label: 'Sem repetir o desenho, a tela congela' },
      { id: 'trail', label: 'Sem limpar, fica rastro' },
      { id: 'moving', label: 'Com os dois, o Dino se mexe' },
    ],
    hints: [
      'Avance o relógio com tudo desligado e veja se alguma coisa muda.',
      'Ligue só o desenho a cada quadro. Olhe o que fica para trás.',
      'Agora ligue também a limpeza e avance de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com o desenho desligado, o relógio anda e a tela fica parada.',
        highlight: 'scene',
        actions: [
          { type: 'loop', on: false },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Desenhando a cada quadro, sem limpar, cada desenho fica na tela.',
        highlight: 'scene',
        actions: [
          { type: 'loop', on: true },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-3',
        caption: 'Limpando antes de desenhar, sobra um Dino só: o movimento aparece.',
        highlight: 'scene',
        actions: [
          { type: 'erase', on: true },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  frames: {
    id: 'frames',
    group: 'art',
    title: 'Dois desenhos viram movimento',
    instruction:
      'Veja o quadro 1 e o quadro 2. Depois ligue a troca, deixe o relógio andar e mexa na velocidade.',
    manipulates: 'Qual quadro aparece, a troca ligada e quantas trocas por segundo',
    success: 'Cada quadro continua sendo um desenho parado. É a troca rápida que faz o movimento!',
    extra: 'E se os dois quadros fossem iguais? Ainda pareceria que alguma coisa se mexe?',
    goals: [
      { id: 'two-drawings', label: 'São dois desenhos inteiros, um de cada vez' },
      { id: 'slow-shows-two', label: 'Devagar, dá para ver os dois desenhos' },
      { id: 'movement', label: 'Rápido, os dois viram movimento' },
    ],
    hints: [
      'Aperte quadro 1 e quadro 2 e olhe o que muda de um para o outro.',
      'Ligue a troca com 1 troca por segundo, deixe o relógio andar e conte os desenhos.',
      'Agora deixe em 8 trocas por segundo e olhe de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Cada quadro guarda um desenho inteiro. Este é o quadro 1.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 1 }],
      },
      {
        id: 'step-2',
        caption: 'E este é o quadro 2. Dois desenhos parados, não um desenho que se mexe.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 2 }],
      },
      {
        id: 'step-3',
        caption: 'Trocando devagar, dá para ver que são dois.',
        highlight: 'scene',
        actions: [
          { type: 'rate', perSecond: 1 },
          { type: 'play', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-4',
        caption: 'Rápido, o olho junta os dois e vira movimento.',
        highlight: 'scene',
        actions: [
          { type: 'rate', perSecond: 8 },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  'onion-skin': {
    id: 'onion-skin',
    group: 'art',
    title: 'O fantasma do quadro de antes',
    instruction: 'No quadro 2, mova o fogo sem o fantasma. Depois ligue o fantasma e compare.',
    manipulates: 'O fantasma do quadro anterior e o quanto o desenho do quadro 2 andou',
    success: 'O fantasma é uma guia, não um desenho: ele deixa você comparar sem decorar!',
    extra: 'E no quadro 1? Tente ligar o fantasma lá e veja o que aparece.',
    goals: [
      { id: 'blind-move', label: 'Mexeu no quadro 2 sem ver o de antes' },
      { id: 'ghost-on', label: 'O fantasma mostra o quadro anterior por baixo' },
      { id: 'even-step', label: 'Com o fantasma, o passo entre os dois ficou parelho' },
    ],
    hints: [
      'Vá para o quadro 2 e mova o fogo com o fantasma desligado.',
      'Agora ligue o fantasma. A imagem fraquinha é o quadro 1.',
      'Deixe o passo entre 12 e 28 para a troca ficar suave.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'No quadro 2, sem o fantasma, o tamanho do passo é chute.',
        highlight: 'scene',
        actions: [
          { type: 'frame', index: 2 },
          { type: 'shift', offset: 52 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Com o fantasma ligado, o quadro 1 aparece fraquinho por baixo.',
        highlight: 'scene',
        actions: [{ type: 'onion', on: true }],
      },
      {
        id: 'step-3',
        caption: 'Agora dá para escolher o passo olhando os dois juntos.',
        highlight: 'scene',
        actions: [{ type: 'shift', offset: 20 }],
      },
      {
        id: 'step-4',
        caption: 'No quadro 1 não há quadro anterior para mostrar.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 1 }],
      },
    ],
  },
  symmetry: {
    id: 'symmetry',
    group: 'art',
    title: 'Um traço, dois lados',
    instruction: 'Pinte com o espelho desligado. Ligue o espelho, pinte de novo e mude o eixo.',
    manipulates: 'Onde você pinta, o espelho ligado e a linha do eixo',
    success: 'Um traço só vira dois quando o espelho está ligado, e o eixo decide onde!',
    extra: 'E se o eixo ficar bem na beirada? Para onde vai o reflexo?',
    goals: [
      { id: 'one-side', label: 'Sem espelho, um traço é um traço só' },
      { id: 'two-sides', label: 'Com o espelho, um traço vira dois' },
      { id: 'axis-decides', label: 'Mudou o eixo e o reflexo mudou de lugar' },
    ],
    hints: [
      'Pinte uma coluna com o espelho desligado e conte os traços.',
      'Ligue o espelho e pinte de novo na mesma coluna.',
      'Mude a linha do eixo para outro lugar e pinte mais uma vez.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Espelho desligado: pintou um traço, apareceu um traço.',
        highlight: 'scene',
        actions: [
          { type: 'mirror', on: false, line: 6 },
          { type: 'paint', column: 3 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Com o espelho, o mesmo traço aparece dos dois lados da linha.',
        highlight: 'scene',
        actions: [
          { type: 'mirror', on: true, line: 6 },
          { type: 'paint', column: 4 },
        ],
      },
      {
        id: 'step-3',
        caption: 'O eixo mudou de lugar, e o reflexo foi junto.',
        highlight: 'scene',
        actions: [
          { type: 'mirror', on: true, line: 9 },
          { type: 'paint', column: 7 },
        ],
      },
    ],
  },
  'pixel-vector': {
    id: 'pixel-vector',
    group: 'art',
    title: 'De perto, a borda conta',
    instruction: 'Escolha uma pedra e aumente a lupa. Depois olhe a outra do mesmo jeito.',
    manipulates: 'Qual pedra a lupa mostra e de quão perto',
    success: 'De longe as duas parecem a mesma pedra. De perto, a borda conta qual é qual!',
    extra: 'Qual das duas você usaria numa nave bem pequena? E numa bem grande?',
    goals: [
      { id: 'stairs', label: 'De perto, o pixel vira escadinha' },
      { id: 'smooth', label: 'De perto, o vetor continua liso' },
      { id: 'alike', label: 'De longe, as duas parecem iguais' },
    ],
    hints: [
      'Deixe a lupa na pedra de pixel e aumente até 5.',
      'Agora troque para a pedra de vetor, com a lupa no mesmo lugar.',
      'Volte a lupa para 1 e compare as duas de longe.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'De longe, as duas pedras parecem a mesma coisa.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 1 }],
      },
      {
        id: 'step-2',
        caption: 'A pedra de pixel é feita de quadradinhos: de perto a borda vira escadinha.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 6 }],
      },
      {
        id: 'step-3',
        caption: 'A pedra de vetor é feita de curvas: de perto a borda continua lisa.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'vector', zoom: 6 }],
      },
      {
        id: 'step-4',
        caption: 'Nenhuma das duas é a certa. Cada uma serve para um jeito de desenhar.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'vector', zoom: 1 }],
      },
    ],
  },
  'sheet-vs-sprite': {
    id: 'sheet-vs-sprite',
    group: 'art',
    title: 'A folha não é o tamanho no jogo',
    instruction: 'Recorte um pedaço da folha. Depois mude o tamanho no jogo e olhe a folha.',
    manipulates: 'Qual pedaço da folha está recortado e o tamanho dele dentro do jogo',
    success: 'A folha guarda os desenhos; o tamanho no jogo é outra escolha, feita depois!',
    extra: 'E se dois pedaços tivessem tamanhos diferentes na folha? O que aconteceria?',
    goals: [
      { id: 'cut', label: 'Cada pedaço da folha é um desenho inteiro' },
      { id: 'two-cells', label: 'Dois pedaços diferentes, a mesma folha' },
      { id: 'size-apart', label: 'O tamanho no jogo mudou e a folha ficou igual' },
    ],
    hints: [
      'Escolha um dos quatro pedaços da folha.',
      'Agora escolha outro pedaço e compare o que aparece no jogo.',
      'Mexa no tamanho no jogo e olhe a folha: ela não muda.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A folha tem quatro pedaços, e cada um é um desenho inteiro.',
        highlight: 'scene',
        actions: [{ type: 'cut', cell: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Outro pedaço, outro desenho. A folha continua a mesma.',
        highlight: 'scene',
        actions: [{ type: 'cut', cell: 2 }],
      },
      {
        id: 'step-3',
        caption: 'O tamanho no jogo é escolha de depois: a folha não muda com ele.',
        highlight: 'scene',
        actions: [{ type: 'sprite', size: 80 }],
      },
    ],
  },
  world: {
    id: 'world',
    group: 'world',
    title: 'Faça o Dino aparecer',
    instruction: 'Crie o Dino nos bastidores. Depois ligue seu desenho à tela.',
    manipulates: 'Dino nos bastidores e ligação de desenho',
    success: 'É o mesmo Dino: existir e aparecer são coisas diferentes!',
    extra: 'E se você desligar o desenho? O Dino ainda existe?',
    goals: [
      { id: 'hidden', label: 'Dino existe sem aparecer' },
      { id: 'visible', label: 'O mesmo Dino aparece' },
    ],
    hints: [
      'Olhe os bastidores: o Dino já existe?',
      'Compare o Dino guardado com a tela do jogo.',
      'Toque em Desenhar e depois na Tela para ligar os dois.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O Dino existe nos bastidores.',
        highlight: 'scene',
        actions: [{ type: 'create' }],
      },
      {
        id: 'step-2',
        caption: 'Ligar o desenho faz o mesmo Dino aparecer.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'draw', enabled: true }],
      },
    ],
  },
  layers: {
    id: 'layers',
    group: 'world',
    title: 'Quem fica na frente?',
    instruction: 'Troque as peças de lugar. A última desenhada fica na frente!',
    manipulates: 'Ordem das peças Floresta e Dino',
    success: 'Agora o Dino aparece na frente da floresta!',
    extra: 'E se a floresta voltar para o último lugar?',
    goals: [
      { id: 'covered', label: 'Floresta na frente' },
      { id: 'front', label: 'Dino na frente' },
    ],
    hints: [
      'O Dino está escondido atrás de quê?',
      'Olhe a última peça na faixa de desenho.',
      'Escolha o Dino e toque no espaço Depois.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A floresta cobre o Dino.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: false }],
      },
      {
        id: 'step-2',
        caption: 'Quem é desenhado depois fica na frente.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: true }],
      },
    ],
  },
  gravity: {
    id: 'gravity',
    group: 'motion',
    title: 'Faça o Dino voltar ao chão',
    instruction: 'Toque no Dino para pular. Observe o que acontece sem aplicar a gravidade.',
    manipulates: 'Dino e ligação da gravidade ao personagem',
    success: 'A gravidade fez o Dino mudar de direção e voltar ao chão!',
    extra: 'E se você desligar a aplicação e repetir o mesmo pulo?',
    goals: [
      { id: 'floating', label: 'Subida sem aplicar gravidade' },
      { id: 'landed', label: 'Volta ao chão com gravidade' },
    ],
    hints: [
      'O Dino está voltando ou continua subindo?',
      'Repita o mesmo impulso com a gravidade aplicada.',
      'Ligue Gravidade ao Dino. Depois toque nele para saltar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Observe o salto sem gravidade.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 0.6 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Agora a gravidade traz o mesmo Dino de volta.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'gravity', enabled: true },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
        waitFor: 'landed',
      },
    ],
  },
  impulse: {
    id: 'impulse',
    group: 'motion',
    title: 'Escolha a altura do salto',
    instruction: 'Toque no Dino. Depois mude a seta do impulso e compare outro salto.',
    manipulates: 'Seta do impulso inicial e Dino',
    success: 'Com a mesma gravidade, um impulso maior alcança outra altura!',
    extra: 'E se você escolher uma altura entre as duas marcas?',
    goals: [
      { id: 'first-height', label: 'Um salto completo' },
      { id: 'other-height', label: 'Outra altura com a mesma gravidade' },
    ],
    hints: [
      'A marca mostra a altura do salto anterior.',
      'Mude só a seta. A gravidade continua igual.',
      'Escolha Baixo ou Alto e toque no Dino para comparar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Guarde a altura deste salto.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Só o impulso mudou. A gravidade continua igual.',
        highlight: 'scene',
        actions: [
          { type: 'impulse', force: 14 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  'jump-sound': {
    id: 'jump-sound',
    group: 'events',
    title: 'O som acompanha o salto',
    instruction: 'Aperte Espaço para saltar. Aperte de novo no ar e observe o som.',
    manipulates: 'Fio do som, Dino e comando Espaço',
    success: 'O som acompanha o salto de verdade, por tecla ou toque!',
    extra: 'E se você der outro comando enquanto o Dino ainda está no ar?',
    goals: [
      { id: 'false-sound', label: 'Som sem novo salto' },
      { id: 'quiet-air', label: 'Sem salto, o som espera' },
      { id: 'key-sound', label: 'Som no salto por tecla' },
      { id: 'tap-sound', label: 'Som no salto por toque' },
    ],
    hints: [
      'Um comando no ar consegue fazer outro salto?',
      'Compare ligar o som à tecla e ao acontecimento Pulou.',
      'Ligue Som a Pulou. Experimente Espaço e tocar no Dino.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A tecla pode soar mesmo com o Dino no ar.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 0.1 },
          { type: 'jump', input: 'key' },
        ],
      },
      {
        id: 'step-2',
        caption: 'Ligado ao acontecimento Pulou, o som acompanha o salto.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'sound', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  spawn: {
    id: 'spawn',
    group: 'population',
    title: 'Abra espaço entre os cactos',
    instruction: 'Avance o relógio. Depois ligue um intervalo ao nascimento dos cactos.',
    manipulates: 'Relógio, ligação de nascimento e marcas de intervalo',
    success: 'O intervalo abriu espaço sem mudar a velocidade dos cactos!',
    extra: 'E se o relógio esperar um pouco mais entre dois cactos?',
    goals: [
      { id: 'every-frame', label: 'Criação em cada quadro' },
      { id: 'spaced', label: 'Criação com intervalo' },
    ],
    hints: [
      'Veja quantos cactos nascem enquanto o relógio anda.',
      'Compare o mesmo tempo com e sem intervalo.',
      'Ligue Relógio a Nascer e avance dois segundos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Veja quantos cactos nascem sem intervalo.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 2 }],
      },
      {
        id: 'step-2',
        caption: 'No mesmo tempo, o intervalo reduz os nascimentos.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'timer', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  cleanup: {
    id: 'cleanup',
    group: 'population',
    title: 'Cuide dos cactos invisíveis',
    instruction: 'Avance o relógio até um cacto sair. Ele também saiu dos bastidores?',
    manipulates: 'Regra de remoção na saída e relógio',
    success: 'A regra retira do grupo cada cacto que sai da tela!',
    extra: 'E se você desligar a regra e deixar outros cactos saírem?',
    goals: [
      { id: 'invisible-stored', label: 'Fora da tela, ainda no grupo' },
      { id: 'removed', label: 'Regra retira automaticamente' },
    ],
    hints: [
      'Compare a pista com os cactos guardados nos bastidores.',
      'Sair da tela e sair do grupo são coisas diferentes.',
      'Encaixe Remover na borda de saída. Avance o relógio novamente.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sair da tela ainda deixa o cacto guardado.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 6 }],
      },
      {
        id: 'step-2',
        caption: 'A regra remove quem saiu.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'cleanup', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
    ],
  },
  'game-state': {
    id: 'game-state',
    group: 'events',
    title: 'O relógio espera você começar',
    instruction: 'Avance o relógio no início. Depois leve-o para dentro de Se jogando.',
    manipulates: 'Peça do relógio, região Se jogando e início da partida',
    success: 'O relógio espera no início e funciona na partida!',
    extra: 'E se você voltar ao início depois de jogar?',
    goals: [
      { id: 'outside', label: 'Relógio funcionando no início' },
      { id: 'waiting', label: 'Relógio espera no início' },
      { id: 'playing', label: 'Relógio funciona jogando' },
    ],
    hints: [
      'Por que há cactos antes de você começar?',
      'A região Se jogando só deixa agir durante a partida.',
      'Leve Relógio para Se jogando. Compare o início e a partida.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O relógio está funcionando antes de jogar.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Dentro de Jogando, ele espera o início.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  controls: {
    id: 'controls',
    group: 'events',
    title: 'Faça o convite funcionar',
    instruction: 'A tela diz Toque ou Enter. Experimente tocar para começar.',
    manipulates: 'Tela inicial e fio do controle por toque',
    success: 'Você começou a partida por toque e por Enter!',
    extra: 'E se você desligar só o toque? O Enter ainda funciona?',
    goals: [
      { id: 'missing-touch', label: 'Toque ainda não conectado' },
      { id: 'start-tap', label: 'Partida iniciada por toque' },
      { id: 'start-key', label: 'Partida iniciada por Enter' },
    ],
    hints: [
      'O convite promete dois caminhos. Os dois funcionam?',
      'Olhe qual entrada está ligada a Começar.',
      'Ligue Toque a Começar. Teste os dois caminhos, voltando ao início.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Tocar ainda não inicia a partida.',
        highlight: 'scene',
        actions: [{ type: 'start', input: 'tap' }],
      },
      {
        id: 'step-2',
        caption: 'A ligação adiciona o toque ao mesmo início.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'touch', enabled: true },
          { type: 'start', input: 'tap' },
        ],
      },
    ],
  },
  restart: {
    id: 'restart',
    group: 'events',
    title: 'Jogue outra vez',
    instruction: 'Comece uma partida e aproxime o cacto para descobrir o que falta no fim.',
    manipulates: 'Início, cacto e ligação de reinício',
    success: 'Outra partida começou, com pontos e obstáculos reiniciados!',
    extra: 'E se você jogar e recomeçar mais uma vez?',
    goals: [
      { id: 'ended', label: 'Colisão encerrou a partida' },
      { id: 'restarted', label: 'Outra partida iniciada pela ação de reinício' },
    ],
    hints: [
      'A partida terminou. Como sair dessa tela?',
      'A ligação de Jogar de novo precisa iniciar outra rodada.',
      'Ligue Jogar de novo a Início e acione o botão no fim.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O contato encerra a partida.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'tap' },
          { type: 'move', distance: 25 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Jogar de novo prepara uma nova partida.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'restart', enabled: true }, { type: 'restart' }],
      },
    ],
  },
  hitbox: {
    id: 'hitbox',
    group: 'collision',
    title: 'Onde a batida acontece?',
    instruction: 'Aproxime o cacto. Depois mude a área do Dino, sem mudar seu desenho.',
    manipulates: 'Posição do cacto e alça da área de contato',
    success: 'O desenho ficou igual. A área mudou o momento da batida!',
    extra: 'E se a área ficar menor? Aproxime o cacto de novo.',
    goals: [
      { id: 'contact', label: 'Áreas em contato' },
      { id: 'separate', label: 'Áreas separadas' },
      { id: 'area-contrast', label: 'Mesma posição, áreas diferentes' },
    ],
    hints: [
      'Olhe as bordas das duas áreas.',
      'Deixe o cacto no mesmo lugar e mude só a área do Dino.',
      'Aproxime até a marca do meio. Compare as alças Menor e Maior.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'As áreas se tocam antes de os desenhos se misturarem.',
        highlight: 'scene',
        actions: [{ type: 'move', distance: 25 }],
      },
      {
        id: 'step-2',
        caption: 'Mesma posição, outra área. O resultado muda?',
        highlight: 'scene',
        actions: [
          { type: 'move', distance: 60 },
          { type: 'resize', width: 100 },
        ],
      },
    ],
  },
  score: {
    id: 'score',
    group: 'events',
    title: 'Pontos só durante a partida',
    instruction: 'Veja quando o placar cresce. Leve Somar ponto para dentro de Se jogando.',
    manipulates: 'Peça de pontuação, região Se jogando e relógio',
    success: 'Os pontos crescem jogando e ficam guardados fora da partida!',
    extra: 'E se você voltar ao início? Veja se o placar continua parado.',
    goals: [
      { id: 'score-playing', label: 'Pontos aumentam jogando' },
      { id: 'score-start', label: 'Pontos esperam no início' },
      { id: 'score-end', label: 'Valor fica parado no fim' },
    ],
    hints: [
      'O placar deve crescer antes de começar?',
      'Compare o mesmo passo do relógio no início, jogando e no fim.',
      'Leve Somar ponto para Se jogando. Teste os três momentos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O placar espera enquanto não estamos jogando.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Jogando, ele cresce. No fim, conserva o valor.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'key' },
          { type: 'advance', seconds: 3 },
          { type: 'collide' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  lives: {
    id: 'lives',
    group: 'events',
    title: 'Ponto e vida mudam por motivos diferentes',
    instruction: 'Ligue os dois fios. Depois bata no cacto e avance o relógio.',
    manipulates: 'O fio que soma ponto, o fio que tira vida e as batidas',
    success: 'Ponto e vida são duas contagens separadas: cada uma muda pelo seu próprio motivo!',
    extra: 'E se a batida tirasse ponto em vez de vida? O jogo ficaria justo?',
    goals: [
      { id: 'life-lost', label: 'A batida tirou uma vida' },
      { id: 'points-stay', label: 'Os pontos ficaram, mesmo perdendo vida' },
      { id: 'over', label: 'Sem vidas, a partida acabou' },
    ],
    hints: [
      'Ligue o fio que soma ponto e avance o relógio para o placar subir.',
      'Agora ligue o fio da vida e bata uma vez. Olhe as duas contagens.',
      'Bata as três vezes e veja o que acontece quando a última vida sai.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com o fio do ponto ligado, o placar sobe sozinho enquanto o Dino está vivo.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Sem o fio da vida, bater não custa nada.',
        highlight: 'scene',
        actions: [{ type: 'collide' }],
      },
      {
        id: 'step-3',
        caption: 'Com o fio ligado, a mesma batida tira uma vida. E os pontos ficam.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'life', enabled: true }, { type: 'collide' }],
      },
      {
        id: 'step-4',
        caption: 'Na última vida, a partida acaba. O placar guarda o que foi feito.',
        highlight: 'scene',
        actions: [{ type: 'collide' }, { type: 'collide' }],
      },
    ],
  },
  random: {
    id: 'random',
    group: 'speed',
    title: 'Cada cacto pode nascer diferente',
    instruction: 'Acione os exemplos do sorteador. Compare primeiro onde os cactos nascem.',
    manipulates: 'Sorteador de posição e velocidade, marcas dos resultados',
    success: 'O sorteio muda o resultado dentro dos limites escolhidos!',
    extra: 'Sorteie livremente. Um resultado pode se repetir!',
    goals: [
      { id: 'positions', label: 'Posições diferentes, mesma velocidade' },
      { id: 'velocities', label: 'Velocidades −5 e −6, mesma posição' },
    ],
    hints: [
      'A faixa mostra onde um cacto pode nascer.',
      'Compare uma coisa por vez: posição ou velocidade.',
      'Acione os dois exemplos de posição. Depois compare os dois de velocidade.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Dois exemplos de lugar, com a mesma velocidade.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'position', unit: 0, guided: true },
          { type: 'sample', kind: 'position', unit: 1, guided: true },
        ],
      },
      {
        id: 'step-2',
        caption: 'Mesmo lugar, duas velocidades possíveis.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'velocity', unit: 0, guided: true },
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ],
      },
    ],
  },
  acceleration: {
    id: 'acceleration',
    group: 'speed',
    title: 'Acelere com um limite',
    instruction: 'Crie um cacto. Avance o relógio e veja a velocidade dos próximos.',
    manipulates: 'Relógio, placa de limite e nascimento de cactos',
    success: 'A base para em −9. O sorteio ainda pode criar um novo cacto a −10!',
    extra: 'E os cactos antigos? Compare suas setas com a do novo cacto.',
    goals: [
      { id: 'base-limit', label: 'Base chega a −9 e permanece' },
      { id: 'variation-limit', label: 'No limite, sorteio produz −10' },
      { id: 'old-speed', label: 'Cacto anterior conserva sua velocidade' },
    ],
    hints: [
      'A seta de cada cacto mostra a velocidade que ele recebeu ao nascer.',
      'Compare a base do próximo cacto com a seta de um antigo.',
      'Encaixe o limite −9. Avance cinco passos e crie o exemplo com desconto 1.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Este cacto guarda a velocidade de nascimento.',
        highlight: 'scene',
        actions: [{ type: 'sample', kind: 'velocity', unit: 0, guided: true }],
      },
      {
        id: 'step-2',
        caption: 'O limite vale para a base dos próximos.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'limit', enabled: true },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'clock' },
          { type: 'sample', kind: 'velocity', unit: 1, guided: true },
        ],
      },
    ],
  },
}

export function sceneModel(scene: SceneId): SceneModel {
  return SCENE_MODELS[scene]
}

/** Os ids de meta de uma cena — o `waitFor` de um roteiro precisa ser um deles. */
export function sceneGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.map((g) => g.id)
}
