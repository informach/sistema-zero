import type { SceneAction, SceneGroup, SceneId } from './actions'

/**
 * Os 45 modelos de cena: o catálogo ÚNICO do sistema.
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
  /* ── O núcleo do Iniciante 2D (15/09/2026) ─────────────────────────────────────────────── */
  velocity: {
    id: 'velocity',
    group: 'motion',
    // ⚠️ Sem adjetivo preso ao personagem: "andar" não é verbo de ligação, então a régua do
    // elenco não flexiona o que vem depois dele — uma turma de nave lia "a nave andar sozinho".
    title: 'O que move o Dino a cada quadro',
    instruction:
      'Escolha uma velocidade e avance o relógio. Depois experimente um número negativo.',
    manipulates: 'Velocidade do Dino nos dois eixos, e o relógio',
    success: 'A posição muda sozinha porque a velocidade é somada nela em cada quadro!',
    extra: 'E se a velocidade for zero enquanto o relógio continua andando?',
    goals: [
      { id: 'moves', label: 'A posição mudou sozinha, com o relógio' },
      { id: 'left', label: 'Velocidade negativa levou para a esquerda' },
      { id: 'stopped', label: 'Com velocidade zero, ele fica parado' },
    ],
    hints: [
      'Você escolheu uma velocidade. Agora avance o relógio e olhe o número do x.',
      'A velocidade não move nada sozinha: quem move é o relógio, um quadro de cada vez.',
      'Ponha a velocidade em −5 e avance o relógio duas vezes.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Velocidade 5: a cada quadro ele anda um pouco para a direita.',
        highlight: 'scene',
        actions: [
          { type: 'velocity', vx: 5, vy: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'moves',
      },
      {
        id: 'step-2',
        caption: 'Com o número negativo, o mesmo relógio leva para o outro lado.',
        highlight: 'scene',
        actions: [
          { type: 'velocity', vx: -5, vy: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'left',
      },
      {
        id: 'step-3',
        caption: 'Zero é parado: o relógio anda e ele fica.',
        highlight: 'scene',
        actions: [
          { type: 'velocity', vx: 0, vy: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'stopped',
      },
    ],
  },
  'hold-vs-press': {
    id: 'hold-vs-press',
    group: 'events',
    title: 'Apertar uma vez, ou segurar',
    instruction: 'Aperte o botão algumas vezes. Depois segure e avance o relógio.',
    manipulates: 'O aperto, o segurar e o relógio',
    success:
      'Um é acontecimento, o outro é pergunta: por isso as duas foram parar em lugares diferentes!',
    extra: 'E se você segurar por mais tempo ainda?',
    goals: [
      { id: 'one-step', label: 'Apertar uma vez andou um passo' },
      { id: 'while-held', label: 'Segurando, ela anda enquanto durar' },
      { id: 'apart', label: 'No mesmo tempo, as duas em lugares diferentes' },
    ],
    hints: [
      'Aperte o botão de cima e conte os passos: um aperto, um passo.',
      'A de baixo pergunta "a tecla está apertada?" a cada quadro — e só anda enquanto a resposta for sim.',
      'Segure o botão e avance o relógio duas ou três vezes sem soltar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Um aperto, um passo. Apertar é um acontecimento.',
        highlight: 'scene',
        actions: [{ type: 'press' }, { type: 'press' }, { type: 'advance', seconds: 0.5 }],
      },
      {
        id: 'step-2',
        caption: 'Segurando, a de baixo anda o tempo todo.',
        highlight: 'scene',
        actions: [
          { type: 'hold', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'while-held',
      },
    ],
  },
  variable: {
    id: 'variable',
    group: 'events',
    title: 'Guardar, mudar e mostrar',
    instruction: 'Guarde um número na caixa. Mude ele sem mostrar. Só depois ligue o mostrar.',
    manipulates: 'O número guardado, a soma e o mostrar na tela',
    success: 'São três coisas diferentes: guardar, mudar e mostrar!',
    extra: 'E se você mostrar primeiro e mudar depois?',
    goals: [
      { id: 'stored', label: 'A caixa guardou um número' },
      { id: 'changed-hidden', label: 'Mudou o valor sem estar na tela' },
      { id: 'shown', label: 'Mostrar não mudou o valor guardado' },
    ],
    hints: [
      'A caixa está aí com um número. Some alguma coisa nela e olhe: a tela mudou?',
      'O número existe mesmo sem ninguém ver. Mostrar é só desenhar o que já está guardado.',
      'Guarde 10, some 5 com o mostrar desligado, e só então ligue o mostrar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A caixa guarda um número. Ninguém está vendo ainda.',
        highlight: 'tools',
        actions: [{ type: 'store', value: 10 }],
      },
      {
        id: 'step-2',
        caption: 'Somar muda o que está guardado, mesmo com a tela sem mostrar.',
        highlight: 'tools',
        actions: [{ type: 'change', by: 5 }],
      },
      {
        id: 'step-3',
        caption: 'Mostrar desenha o valor. O valor era o mesmo antes.',
        highlight: 'scene',
        actions: [{ type: 'show', on: true }],
      },
    ],
  },
  'group-loop': {
    id: 'group-loop',
    group: 'population',
    title: 'Qual deles a torre escolhe?',
    instruction: 'Olhe cada cacto do grupo e escolha o mais perto. Depois ligue o laço.',
    manipulates: 'Olhar cada um do grupo, escolher um e o fio do laço',
    success: 'Para escolher um do grupo é preciso olhar todos — é isso que o laço faz!',
    extra: 'E se outro chegar mais perto depois da escolha?',
    goals: [
      { id: 'looked-all', label: 'Olhou todos do grupo antes de escolher' },
      { id: 'nearest', label: 'Escolheu o mais perto depois de olhar todos' },
      { id: 'auto', label: 'Com o laço ligado, a escolha acompanha quem está mais perto' },
    ],
    hints: [
      'Você tem três cactos e uma torre. Olhe cada um antes de decidir.',
      'Não dá para saber qual é o mais perto sem comparar os três — e comparar é percorrer.',
      'Toque em cada um dos três e depois escolha o do meio.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A torre olha um por um do grupo.',
        highlight: 'scene',
        actions: [
          { type: 'look', id: 1 },
          { type: 'look', id: 2 },
          { type: 'look', id: 3 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Depois de olhar todos, ela fica com o mais perto.',
        highlight: 'scene',
        actions: [{ type: 'choose', id: 2 }],
      },
    ],
  },
  'enemy-type': {
    id: 'enemy-type',
    group: 'population',
    title: 'Uma ficha, muitos cactos',
    instruction: 'Faça nascer alguns cactos. Depois mude a ficha e olhe todos eles.',
    manipulates: 'A ficha do tipo (velocidade e vida) e o nascimento de mais um',
    success: 'Mudar a ficha mudou todos de uma vez: o jogo mora nos dados!',
    extra: 'E se você mudar a vida com dez cactos na tela?',
    goals: [
      { id: 'many', label: 'Nasceram vários do mesmo molde' },
      { id: 'all-change', label: 'Mudou a ficha e TODOS mudaram juntos' },
    ],
    hints: [
      'Você tem uma ficha com dois números. Faça nascer três cactos dela.',
      'Os que nasceram não guardam cópia: eles LEEM a ficha. Mude um número e olhe todos.',
      'Toque em nascer três vezes e depois mude a velocidade para 7.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Três cactos nascem da mesma ficha.',
        highlight: 'scene',
        actions: [{ type: 'spawnOne' }, { type: 'spawnOne' }, { type: 'spawnOne' }],
      },
      {
        id: 'step-2',
        caption: 'Um número na ficha muda os três de uma vez.',
        highlight: 'tools',
        actions: [{ type: 'define', field: 'speed', value: 7 }],
      },
    ],
  },
  camera: {
    id: 'camera',
    group: 'stage',
    title: 'A tela é uma janela',
    instruction: 'Ande com o Dino para a direita, bem longe. Depois ligue a câmera e ande de novo.',
    manipulates: 'A posição do Dino no mundo e o fio da câmera',
    success: 'O mundo é maior que a tela, e a câmera é a janela que anda junto com você!',
    extra: 'E se o Dino voltar para o começo do mundo?',
    goals: [
      { id: 'lost', label: 'Sem a câmera, o Dino saiu da tela' },
      { id: 'follows', label: 'Com a câmera, o Dino voltou a caber na tela' },
      { id: 'window', label: 'O mundo continua maior que a tela' },
    ],
    hints: [
      'O Dino está no mundo, e a tela mostra um pedaço dele. Ande bem para a direita.',
      'Sem a câmera, a janela fica parada: quem anda é só o Dino, até sumir.',
      'Leve o Dino para depois de 480 e depois ligue a câmera.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Longe demais: a tela acaba e o Dino some.',
        highlight: 'scene',
        actions: [{ type: 'walk', x: 700 }],
      },
      {
        id: 'step-2',
        caption: 'Com a câmera, a janela anda junto e ele volta a aparecer.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'camera', enabled: true }],
      },
    ],
  },
  contact: {
    id: 'contact',
    group: 'collision',
    title: 'Encostando, ou acabou de encostar?',
    instruction: 'Encoste o cacto e avance o relógio. Depois troque a pergunta do jogo e repita.',
    manipulates: 'A distância do cacto e o tipo da pergunta sobre o contato',
    success: 'Uma pergunta vale em todo quadro; a outra só no instante da batida!',
    extra: 'E se ele encostar, afastar e encostar de novo?',
    goals: [
      { id: 'drain', label: 'A pergunta contínua tirou vida em todo quadro' },
      { id: 'once', label: 'O acontecimento tirou vida uma vez só' },
      { id: 'apart', label: 'Afastar e voltar faz o acontecimento valer de novo' },
    ],
    hints: [
      'Encoste os dois e deixe o relógio andar: olhe a vida caindo.',
      '"Está encostando?" é uma pergunta que o jogo faz SEMPRE; "acabou de encostar" acontece uma vez.',
      'Com o cacto encostado, troque para o acontecimento e avance o relógio três vezes.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Encostado, a pergunta contínua tira vida a cada quadro.',
        highlight: 'scene',
        actions: [
          { type: 'approach', distance: 20 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'drain',
      },
      {
        id: 'step-2',
        caption: 'Com o acontecimento, a batida custa uma vez só.',
        highlight: 'tools',
        actions: [
          { type: 'mode', kind: 'event' },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'once',
      },
    ],
  },
  cooldown: {
    id: 'cooldown',
    group: 'events',
    title: 'O tiro que espera a vez',
    instruction: 'Atire várias vezes seguidas. Depois ponha uma recarga e tente de novo.',
    manipulates: 'O tiro e o tempo de recarga entre dois tiros',
    success: 'O relógio também serve para ESPERAR, e não só para repetir!',
    extra: 'E se a recarga for de dois segundos inteiros?',
    goals: [
      { id: 'burst', label: 'Sem recarga, os tiros saem todos juntos' },
      { id: 'spaced', label: 'Com recarga, os tiros saem espaçados' },
      { id: 'waiting', label: 'Atirar durante a recarga não fez nada' },
    ],
    hints: [
      'Aperte atirar várias vezes seguidas e conte quantos tiros saíram.',
      'A recarga é um relógio pequeno dentro da arma: enquanto ele não zera, o pedido não vira tiro.',
      'Ponha a recarga em 1 segundo e aperte atirar duas vezes seguidas.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem recarga, um pedido por quadro vira um tiro por quadro.',
        highlight: 'scene',
        actions: [{ type: 'shoot' }, { type: 'shoot' }, { type: 'shoot' }],
      },
      {
        id: 'step-2',
        caption: 'Com a recarga, o segundo pedido espera a vez.',
        highlight: 'tools',
        actions: [
          { type: 'recharge', seconds: 1 },
          { type: 'shoot' },
          { type: 'shoot' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'waiting',
      },
    ],
  },
  aim: {
    id: 'aim',
    group: 'motion',
    title: 'A seta que aponta',
    instruction: 'Mova o alvo e olhe a seta. Depois ligue a mira e avance o relógio.',
    manipulates: 'O lugar do alvo e o fio da mira',
    success: 'Apontar é uma seta do Dino até o alvo!',
    extra: 'E se o alvo ficar exatamente atrás do Dino?',
    goals: [
      { id: 'arrow', label: 'A seta virou junto com o alvo' },
      { id: 'follows', label: 'Com a mira ligada, o tiro foi na direção da seta' },
    ],
    hints: [
      'Arraste o alvo para outro canto e olhe a seta que sai do Dino.',
      'A seta é a direção: ligar a mira faz o tiro seguir por ela em vez de ir sempre reto.',
      'Ponha o alvo embaixo, ligue a mira e avance o relógio.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A seta aponta para onde o alvo está.',
        highlight: 'scene',
        actions: [{ type: 'target', x: 120, y: 220 }],
      },
      {
        id: 'step-2',
        caption: 'Com a mira ligada, o tiro vai pela seta.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'aim', enabled: true },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'follows',
      },
    ],
  },
  diagonal: {
    id: 'diagonal',
    group: 'motion',
    title: 'A diagonal corre mais',
    instruction: 'Ande para um lado só e veja a distância. Depois aperte duas setas juntas.',
    manipulates: 'As setas apertadas e a correção da diagonal',
    success: 'Na diagonal os dois passos se somam — a correção deixa os dois caminhos iguais!',
    extra: 'E se a correção ficar ligada andando reto?',
    goals: [
      { id: 'faster', label: 'Na diagonal ele andou mais no mesmo tempo' },
      { id: 'same', label: 'Com a correção, a diagonal anda o mesmo que o reto' },
    ],
    hints: [
      'Ande só para a direita e olhe a distância do passo. Agora aperte direita e baixo juntas.',
      'Cada seta dá um passo inteiro; duas setas dão dois passos no mesmo tempo.',
      'Com as duas setas apertadas, avance o relógio e depois ligue a correção.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Nas duas setas, ele anda mais do que numa só.',
        highlight: 'scene',
        actions: [
          { type: 'direction', x: 1, y: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'faster',
      },
      {
        id: 'step-2',
        caption: 'Com a correção, a diagonal volta a ter o tamanho certo.',
        highlight: 'tools',
        actions: [
          { type: 'connect', port: 'even', enabled: true },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'same',
      },
    ],
  },
  tilemap: {
    id: 'tilemap',
    group: 'world',
    title: 'O mapa escrito com letras',
    instruction: 'Troque uma letra do mapa e olhe o desenho. Depois faça um chão no meio do vazio.',
    manipulates: 'As letras das casas do mapa',
    success: 'O mapa é um dado: o desenho nasce das letras!',
    extra: 'E se você escrever a mesma letra num lugar bem diferente?',
    goals: [
      { id: 'text-is-map', label: 'Mudou a letra e o desenho mudou junto' },
      { id: 'same-letter', label: 'A mesma letra virou sempre a mesma coisa' },
    ],
    hints: [
      'Cada casa do mapa é uma letra. Toque numa casa vazia e escolha o bloco.',
      'Ninguém desenhou o chão um por um: ele nasceu das letras que estão escritas ali.',
      'Ponha três blocos seguidos numa linha do meio.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Uma letra trocada, um bloco novo no desenho.',
        highlight: 'scene',
        actions: [{ type: 'paint-tile', row: 3, col: 4, tile: '#' }],
      },
      {
        id: 'step-2',
        caption: 'A mesma letra em outro lugar vira a mesma coisa.',
        highlight: 'scene',
        actions: [
          { type: 'paint-tile', row: 3, col: 5, tile: '#' },
          { type: 'paint-tile', row: 3, col: 6, tile: '#' },
        ],
      },
    ],
  },
  /* ── O motor, o 3D e o ateliê (15/09/2026) ─────────────────────────────────────────────── */
  pool: {
    id: 'pool',
    group: 'population',
    title: 'O contador que só sobe',
    instruction:
      'Avance o relógio algumas vezes e olhe os dois números. Depois ligue a reciclagem.',
    manipulates: 'O relógio e o fio da reciclagem',
    success: 'Reciclar reaproveita o mesmo corpo: o contador de criados para de crescer!',
    extra: 'E se você desligar a reciclagem depois de um tempo?',
    goals: [
      { id: 'grows', label: 'O contador de criados só sobe, e nunca desce' },
      { id: 'recycled', label: 'Com reciclagem, o mesmo corpo volta a ser usado' },
      { id: 'steady', label: 'O número de criados parou de crescer' },
    ],
    hints: [
      'São dois números: quantos estão vivos agora e quantos já foram criados desde o começo.',
      'Um deles conta o que existe; o outro conta o que já foi feito — e é esse que denuncia o vazamento.',
      'Ligue a reciclagem e avance o relógio quatro vezes olhando o segundo número.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem reciclagem, cada passo do relógio cria mais um corpo.',
        highlight: 'scene',
        actions: [
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'grows',
      },
      {
        id: 'step-2',
        caption: 'Com a reciclagem, o mesmo corpo volta e o contador para.',
        highlight: 'tools',
        actions: [
          { type: 'connect', port: 'recycle', enabled: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'steady',
      },
    ],
  },
  'entity-state': {
    id: 'entity-state',
    group: 'events',
    title: 'Cada um com o seu cérebro',
    instruction: 'Ponha cada um num estado diferente e avance o relógio. Depois mude só um deles.',
    manipulates: 'O estado de cada um dos três e o relógio',
    success: 'Cada personagem tem o próprio cérebro, e o estado decide o que ele faz agora!',
    extra: 'E se os três ficarem no mesmo estado?',
    goals: [
      { id: 'own', label: 'Cada um ficou no seu próprio estado' },
      { id: 'acts', label: 'O estado de cada um decidiu o que ele fez agora' },
      { id: 'independent', label: 'Mudar um cérebro não mexeu nos outros' },
    ],
    hints: [
      'Os três começam parados. Escolha um estado diferente para cada um.',
      'O estado não é do jogo: é DE CADA UM. O primeiro pode estar mirando enquanto o segundo recarrega.',
      'Ponha o 1º em mirar, o 2º em atirar e avance o relógio.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Cada um em um estado; o relógio mostra o que cada um faz.',
        highlight: 'scene',
        actions: [
          { type: 'brain', id: 1, state: 'mirar' },
          { type: 'brain', id: 2, state: 'atirar' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'acts',
      },
      {
        id: 'step-2',
        caption: 'Mudar um não mexe nos outros dois.',
        highlight: 'tools',
        actions: [{ type: 'brain', id: 3, state: 'recarregar' }],
      },
    ],
  },
  'delta-time': {
    id: 'delta-time',
    group: 'motion',
    title: 'O mesmo jogo em dois computadores',
    instruction: 'Avance o relógio contando quadros. Depois troque para segundos e compare.',
    manipulates: 'O que o jogo conta para medir o tempo, e o relógio',
    success: 'Contando tempo, o jogo fica igual em qualquer computador!',
    extra: 'E se você voltar a contar quadros no meio do caminho?',
    goals: [
      { id: 'apart', label: 'Contando quadros, as duas máquinas se afastaram' },
      { id: 'together', label: 'Contando tempo, as duas chegaram juntas' },
    ],
    hints: [
      'São dois computadores com o mesmo jogo: um rápido e um devagar.',
      'Quadro não é tempo: o rápido faz mais quadros no mesmo segundo, e por isso anda mais.',
      'Avance o relógio contando quadros e depois troque para segundos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Contando quadros, o rápido dispara na frente.',
        highlight: 'scene',
        actions: [
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'apart',
      },
      {
        id: 'step-2',
        caption: 'Contando tempo, os dois andam o mesmo.',
        highlight: 'tools',
        actions: [
          { type: 'count', kind: 'seconds' },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'together',
      },
    ],
  },
  'circle-collision': {
    id: 'circle-collision',
    group: 'collision',
    title: 'A conta que decide a batida',
    instruction:
      'Avance o relógio e veja os dois se aproximarem. Depois mude um dos raios, e afaste os dois para comparar de novo.',
    manipulates: 'A distância entre os centros, os dois raios e o relógio que aproxima',
    success: 'A batida é a distância entre os centros contra a soma dos raios!',
    extra: 'E se os dois raios ficarem bem grandes?',
    goals: [
      { id: 'touch', label: 'A distância ficou menor que a soma dos raios' },
      { id: 'formula', label: 'Mudar o raio mudou o instante da batida' },
    ],
    hints: [
      'Olhe os dois números: a distância entre os centros e a soma dos raios.',
      'A batida não acontece quando os desenhos parecem encostar: acontece quando a conta bate.',
      'Deixe eles encostarem e então DIMINUA um raio: o mesmo lugar deixa de ser uma batida.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A distância diminui até ficar menor que a soma dos raios.',
        highlight: 'scene',
        actions: [
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'touch',
      },
      {
        id: 'step-2',
        caption: 'Com um raio menor, o mesmo lugar deixa de ser uma batida.',
        highlight: 'tools',
        actions: [{ type: 'radius', which: 'a', value: 10 }],
      },
    ],
  },
  'axis-z': {
    id: 'axis-z',
    group: 'stage',
    title: 'O eixo que faltava',
    instruction: 'Mexa em um eixo de cada vez. Comece pelo z, e depois suba pelo y.',
    manipulates: 'Os três eixos do espaço, um de cada vez',
    success: 'O z é a profundidade, e aqui o y maior é mais ALTO!',
    extra: 'E se o objeto voltar para o chão bem longe?',
    goals: [
      { id: 'depth', label: 'O z leva para longe e para perto' },
      { id: 'up', label: 'No 3D, o y maior é mais ALTO' },
      { id: 'shadow', label: 'A sombra no chão diz onde ele está' },
    ],
    hints: [
      'Agora são três números. Mexa só no z e olhe a sombra no chão.',
      'No 2D o y crescia para baixo; aqui ele cresce para cima, e é a mudança mais importante.',
      'Deixe o x e o z parados e aumente só o y.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O z leva o objeto para longe, e a sombra vai junto.',
        highlight: 'scene',
        actions: [{ type: 'place3d', x: 0, y: 0, z: 80 }],
      },
      {
        id: 'step-2',
        caption: 'O y levanta: aqui, mais y é mais alto.',
        highlight: 'scene',
        actions: [{ type: 'place3d', x: 0, y: 70, z: 80 }],
      },
    ],
  },
  'camera-3d': {
    id: 'camera-3d',
    group: 'stage',
    title: 'Gire até ver uma cor só',
    instruction:
      'Gire o cubo até ver uma cor sozinha. Depois ache uma posição com exatamente duas.',
    manipulates: 'A volta e a altura de onde a câmera olha',
    success: 'O que você vê depende de onde a câmera está!',
    extra: 'E se você girar até ver as três de uma vez?',
    goals: [
      { id: 'one-face', label: 'Girou até ver uma cor só' },
      { id: 'two-faces', label: 'Girou até ver exatamente duas cores' },
      { id: 'back', label: 'Voltou à vista de sempre com um toque' },
    ],
    hints: [
      'Cada face do cubo tem uma cor. Gire devagar e conte quantas aparecem.',
      'De frente aparece uma; do canto, duas ou três. É a câmera que decide, não o cubo.',
      'Baixe a altura da câmera e gire meia volta.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'De frente, uma cor só.',
        highlight: 'scene',
        actions: [{ type: 'orbit', yaw: 0, pitch: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Do canto, duas — e por cima, três.',
        highlight: 'scene',
        actions: [
          { type: 'orbit', yaw: 1, pitch: 1 },
          { type: 'orbit', yaw: 1, pitch: 2 },
        ],
      },
      {
        id: 'step-3',
        caption: 'Um toque devolve a vista de sempre.',
        highlight: 'tools',
        actions: [{ type: 'recenter' }],
      },
    ],
  },
  mesh: {
    id: 'mesh',
    group: 'art',
    title: 'Por baixo da roupa',
    instruction: 'Ligue o raio-X e olhe o modelo por dentro. Depois desligue e gire.',
    manipulates: 'O raio-X do modelo e a volta dele',
    success: 'O modelo é feito de pontos ligados, e a textura é a roupa!',
    extra: 'E se você girar com o raio-X ligado?',
    goals: [
      { id: 'points', label: 'Por baixo, o modelo é feito de pontos ligados' },
      { id: 'skin', label: 'A textura é a roupa que cobre os pontos' },
    ],
    hints: [
      'O bicho parece liso, mas tem alguma coisa por baixo. Ligue o raio-X.',
      'Os pontos e as linhas existem sempre: a roupa só os cobre.',
      'Ligue o raio-X, olhe, e desligue de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com o raio-X, aparecem os pontos e as linhas.',
        highlight: 'scene',
        actions: [{ type: 'wireframe', on: true }],
      },
      {
        id: 'step-2',
        caption: 'Sem ele, a roupa volta — e os pontos continuam lá.',
        highlight: 'scene',
        actions: [{ type: 'wireframe', on: false }],
      },
    ],
  },
  'pick-ray': {
    id: 'pick-ray',
    group: 'collision',
    title: 'A mira que para na primeira',
    instruction:
      'Aponte para as caixas. Depois mire no pedaço em que uma caixa cobre a outra e veja qual acende.',
    manipulates: 'Para onde a mira aponta',
    success: 'A mira é uma reta que sai da câmera e para na primeira coisa!',
    extra: 'E se você mirar no vazio?',
    goals: [
      { id: 'face', label: 'A face mirada acendeu' },
      { id: 'first', label: 'A reta parou na primeira caixa do caminho' },
    ],
    hints: [
      'Aponte para uma caixa e veja qual delas acende.',
      'A reta não atravessa: ela para na primeira coisa que encontra.',
      'Aponte no pedaço em que uma caixa cobre a outra: a reta para na da frente.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Mirar numa caixa acende ela.',
        highlight: 'scene',
        actions: [{ type: 'point', x: 110, y: 120 }],
      },
      {
        id: 'step-2',
        // A faixa em que a caixa 2 cobre a 1 — é a única parte da tela com duas no caminho.
        caption: 'Onde uma cobre a outra, a reta para na da frente.',
        highlight: 'scene',
        actions: [{ type: 'point', x: 330, y: 145 }],
      },
    ],
  },
  'fill-stroke': {
    id: 'fill-stroke',
    group: 'art',
    title: 'A cor de dentro e a linha de fora',
    instruction: 'Tire a linha de fora e olhe a forma. Depois tire a cor de dentro e olhe de novo.',
    manipulates: 'O miolo e o contorno da mesma forma',
    success: 'Preencher e contornar são dois desenhos no mesmo traço!',
    extra: 'E se os dois ficarem sem cor ao mesmo tempo?',
    goals: [
      { id: 'only-fill', label: 'Miolo sem linha continua sendo desenho' },
      { id: 'only-stroke', label: 'A linha sozinha guarda a forma' },
      { id: 'both', label: 'Os dois juntos são dois desenhos no mesmo traço' },
    ],
    hints: [
      'A forma tem duas partes: o que está dentro e a linha que fecha a borda.',
      'Cada uma pode existir sem a outra — e a forma continua sendo a mesma.',
      'Desligue o contorno, olhe, e depois desligue o miolo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem a linha, sobra o miolo.',
        highlight: 'scene',
        actions: [{ type: 'ink', part: 'stroke', on: false }],
      },
      {
        id: 'step-2',
        caption: 'Sem o miolo, sobra a linha — e a forma continua legível.',
        highlight: 'scene',
        actions: [
          { type: 'ink', part: 'fill', on: false },
          { type: 'ink', part: 'stroke', on: true },
        ],
      },
    ],
  },
  shading: {
    id: 'shading',
    group: 'art',
    title: 'A luz dá volume',
    instruction:
      'Ligue a sombra e olhe a forma. Tire ela de novo para comparar, e depois mude o lado da luz.',
    manipulates: 'A sombra e o lado da luz',
    success: 'Duas cores da mesma cor fazem a forma deixar de ser chapada!',
    extra: 'E se você trocar o lado da luz com a sombra desligada?',
    goals: [
      { id: 'flat', label: 'Sem sombra, a forma parece um adesivo' },
      { id: 'volume', label: 'Com as duas cores, a forma ganhou volume' },
      { id: 'side', label: 'Mudou o lado da luz e a sombra mudou de lado' },
    ],
    hints: [
      'A forma está pintada com uma cor só. Ligue a sombra e compare as duas.',
      'A sombra fica do lado CONTRÁRIO ao da luz — é isso que dá a impressão de volume.',
      'Com a sombra ligada, troque a luz para o outro lado.',
    ],
    script: [
      // ⚠️ A cena ABRE chapada, então o primeiro passo é LIGAR a sombra: começar desligando
      // seria um passo que não muda um pixel, narrado como se mudasse.
      {
        id: 'step-1',
        caption: 'Com a segunda cor mais escura, ela ganha volume.',
        highlight: 'scene',
        actions: [{ type: 'shade', on: true }],
      },
      {
        id: 'step-2',
        caption: 'Tirando a sombra, ela volta a parecer um adesivo colado na tela.',
        highlight: 'scene',
        actions: [{ type: 'shade', on: false }],
      },
      {
        id: 'step-3',
        caption: 'A sombra acompanha o lado da luz.',
        highlight: 'scene',
        actions: [
          { type: 'shade', on: true },
          { type: 'light', side: 'right' },
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
