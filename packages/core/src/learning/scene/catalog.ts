import { SCENE_IDS, type SceneAction, type SceneGroup, type SceneId } from './actions'

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
  /**
   * Que parte da tela merece atenção neste passo. ⚠️ `compare` só desenha nas cenas de
   * `SCENE_COMPARISONS`; nas outras continua VÁLIDO (o roteiro escrito para outra cena abre) e não
   * mostra nada.
   */
  highlight?: 'scene' | 'tools' | 'compare'
  actions: SceneAction[]
  /** Só avança quando esta descoberta acontecer de verdade. */
  waitFor?: string
}

/**
 * As cenas que mostram a COMPARAÇÃO guardada ("Guardar este jeito" e o destaque `compare` da etapa).
 *
 * ⚠️⚠️ A lista ÚNICA (full review de 16/09/2026). Player e admin tinham cada um a sua: o admin oferecia
 * "Comparação" em `gravity`, `impulse`, `hitbox` e `jump-sound`, e o player, desde o lote 5 do Raio-X, só
 * desenhava na `hitbox` (a `impulse` guarda as duas marcas no próprio palco, a `gravity` compara com o
 * pulo pontilhado, e a `jump-sound` ganhou palco próprio). O professor escolhia "Comparação" numa etapa da
 * `gravity` e a criança não via nada, sem aviso. ⚠️ O `isSceneScript` NÃO recusa `compare` fora daqui: um
 * bloco já gravado com ele viraria inválido e trancaria a seção por um destaque que não desenha nada.
 */
export const SCENE_COMPARISONS = ['hitbox'] as const satisfies readonly SceneId[]

/** A cena desenha a comparação guardada? Ver `SCENE_COMPARISONS`. */
export function sceneShowsComparison(scene: SceneId): boolean {
  return (SCENE_COMPARISONS as readonly SceneId[]).includes(scene)
}

/** Uma coisa que a criança precisa PERCEBER. O motor emite o id no instante em que acontece;
 *  a avaliação só conta quais apareceram. */
export interface SceneGoal {
  id: string
  label: string
  /**
   * ⚠️⚠️ Meta que só existe para um CASO do professor (`setup.goals`), e nunca entra na missão de
   * fábrica. `down` e `up` da `velocity` nasceram para o Dia 2 do Desafio; somadas às outras três,
   * a missão de fábrica passou a cobrar cinco metas que a instrução, as pistas e a demonstração
   * não pediam (a prévia do admin e toda experimentação sem caso). `sceneTargets` e `sceneGoals`
   * deixam estas de fora quando não há caso; `isSceneSetup` continua aceitando as cinco.
   */
  soNoCaso?: true
  /**
   * O que FAZER para a meta cair, sem a resposta ("Aumente só o y"). O `label` é a CONCLUSÃO
   * ("y maior leva para baixo") e só aparece depois que a meta cai.
   *
   * ⚠️ O "Ainda falta" do "Já descobri" mostrava o rótulo da meta que faltava, e em `up` o
   * rótulo é a própria descoberta ("Velocidade negativa levou para cima"): a criança lia o que o
   * palpite tinha perguntado antes de fazer o gesto. Com `pedido`, o avaliador diz o gesto.
   *
   * ⚠️⚠️ OBRIGATÓRIO desde o lote 2 do Raio-X (16/09/2026): meta nova sem pedido reprova no TS.
   * Três regras para escrever um (cobradas em `cast.test.ts` e `questions.test.ts`):
   *  - um gesto que a bancada de HOJE oferece, com o nome que o botão tem. ⚠️ O TEMPO é "deixe o
   *    tempo passar" (ou o ▶): nenhum botão se chama "avançar o relógio", e o botão de passo tem DOIS
   *    nomes desde o lote 4 ("Avançar 1 quadro" ou "Um passo", `sceneStepLabel`), então pedido nenhum
   *    o cita. Na `acceleration` o tempo é o botão "Passar 5 segundos", e o pedido usa esse nome;
   *  - nunca o resultado nem o resultado de OUTRA meta ("depois de o Dino sumir" entrega a
   *    previsão da `camera`): os pedidos podem ficar todos à vista antes de qualquer meta cair;
   *  - sobrevive ao elenco: sem pronome e sem particípio solto longe do nome.
   */
  pedido: string
}

/** Partes do palco que poderiam entregar a resposta antes de a criança apostar. */
export type ScenePredictionPreviewConceal = 'layers-order' | 'camera-colors'

/** A prévia é sempre o começo real da cena, com redactions declaradas quando necessárias. */
export interface ScenePredictionPreview {
  initial: true
  conceal: readonly ScenePredictionPreviewConceal[]
  /** Um controle citado pelo palpite, desenhado na prévia sem ficar utilizável. */
  control?: { label: string; note: string }
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
  /** A cena que a criança vê antes de responder ao palpite. */
  predictionPreview: ScenePredictionPreview
  /**
   * ⚠️⚠️ A frase de sucesso de uma MISSÃO RESTRITA, pela lista de metas dela em ordem alfabética e
   * juntas por `+` (consertos do review da onda A do lote 5). O Dia 1 do Desafio cobra só `down`, e o
   * cartão afirmava "x maior vai para a direita… E o 0, 0 fica no canto de cima!", o que a criança não
   * viu. Sem entrada, vale `success`. Quem lê é `sceneSuccess` (evaluate).
   */
  successNoCaso?: Readonly<Record<string, string>>
}

const SCENE_MODEL_DEFINITIONS: Record<SceneId, Omit<SceneModel, 'predictionPreview'>> = {
  coordinates: {
    id: 'coordinates',
    group: 'stage',
    title: 'O endereço na tela',
    instruction:
      'Mude o x e veja para que lado o Dino vai. Depois mude só o y. Por último, leve o Dino para x 0 e y 0.',
    // ⚠️ Sem "480 por 270" (lote 5): a tela é a do CASO, e o Desafio abre em 800 × 480.
    manipulates: 'O x e o y do Dino na tela do jogo',
    success: 'x maior vai para a direita. y maior vai para baixo. E o 0, 0 fica no canto de cima!',
    successNoCaso: { down: 'y maior leva o Dino para baixo. O 0 do y fica lá no alto!' },
    // ⚠️ A pergunta de antes ("E se os dois forem 0?") virou a meta `origin`.
    extra: 'E se o y for igual à altura da tela? O Dino ainda aparece?',
    goals: [
      { id: 'right', label: 'x maior leva para a direita', pedido: 'Aumente só o x.' },
      { id: 'down', label: 'y maior leva para baixo', pedido: 'Aumente só o y.' },
      // ⚠️⚠️ Era `same-x` ("mesmo x, altura diferente"), que caía junto com `down` (lote 5 do Raio-X).
      // Nenhum manifesto a cobrava em `setup.goals`.
      {
        id: 'origin',
        label: 'O 0, 0 fica no canto de cima, à esquerda',
        pedido: 'Leve o Dino para x 0 e y 0.',
      },
    ],
    hints: [
      'Mexa só no x e olhe para que lado o Dino foi.',
      // ⚠️ Sem "Repare que ele não sobe": era a resposta da previsão escrita na pista, e com um
      // pronome que o elenco não flexiona.
      'Agora deixe o x parado e aumente o y. Olhe para onde o Dino vai.',
      'Diminua o x até 0. Depois diminua o y até 0.',
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
        // ⚠️ Sem "Aqui ele volta" (lote 5): pronome que o elenco não flexiona.
        id: 'step-3',
        caption: 'Em x 0 e y 0, o canto de cima da caixa do Dino encosta no canto da tela.',
        highlight: 'scene',
        actions: [{ type: 'place', x: 0, y: 0 }],
      },
    ],
  },
  'screen-reader': {
    id: 'screen-reader',
    group: 'stage',
    title: 'O que o leitor de tela lê',
    instruction: 'Ouça a tela com o campo vazio. Depois escreva a sua descrição e ouça de novo.',
    manipulates: 'A descrição do jogo e o botão de ouvir a tela',
    success: 'O programa não vê o desenho. Quem conta o jogo é a sua frase!',
    extra: 'E se a frase falasse só da tecla? Daria para saber o que fazer no jogo?',
    goals: [
      {
        id: 'heard-empty',
        label: 'Sem frase, a pessoa ouve só Imagem',
        pedido: 'Aperte Ouvir a tela com o campo vazio.',
      },
      {
        id: 'says-goal',
        label: 'A frase diz o que fazer',
        pedido: 'Escreva o que se faz no jogo e aperte Ouvir a tela de novo.',
      },
      {
        id: 'says-control',
        label: 'A frase diz como jogar',
        pedido: 'Escreva também qual tecla usar e aperte Ouvir a tela de novo.',
      },
    ],
    hints: [
      'Aperte Ouvir a tela antes de escrever qualquer coisa.',
      // ⚠️ A pista 2 era "o programa não enxerga o desenho", a resposta da previsão da cena.
      'Escreva o que se faz no jogo. Por exemplo: pule, corra, desvie.',
      'Escreva também a tecla. Por exemplo: apertando espaço.',
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
    // ⚠️ A borda PRIMEIRO, e sem "veja onde a tela acaba" (review do lote 2): a previsão pergunta se
    // dá para ver onde a tela acaba sem a borda, e a instrução fica logo acima dela.
    instruction:
      'Ligue a borda e veja o que aparece. Depois mude a largura e a altura até chegar em 480 por 270.',
    // ⚠️ "borda", e não "moldura": é o nome do botão e do bloco do Estúdio (lote 5).
    manipulates: 'Largura e altura da tela, e a borda que mostra o limite',
    success: 'A tela tem um limite, e o limite é uma escolha sua!',
    extra: 'E se a tela ficar quadrada? O que muda para quem joga?',
    goals: [
      {
        id: 'border-on',
        label: 'A borda mostra onde a tela acaba',
        pedido: 'Ligue a borda da tela.',
      },
      {
        id: 'resized',
        label: 'A borda acompanha os números',
        // ⚠️ Com a borda à vista: sem ela a tela não se vê, e o número mudaria sem nada na tela mudar.
        // ⚠️⚠️ E o MOTOR confere (lote 5): sem a borda a meta não cai, e a bancada deixa os números
        // fechados até ela aparecer.
        pedido: 'Com a borda à vista, mude a largura ou a altura.',
      },
      {
        id: 'target',
        label: 'Chegou na tela de 480 por 270',
        pedido: 'Deixe a tela em 480 por 270.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 dizia "sem ela a cor do fundo cobre tudo", a resposta da previsão da cena.
      'Aperte o botão da borda.',
      'Com a borda à vista, diminua a largura e olhe a borda.',
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
    // ⚠️ Os nomes dos controles do lote 5: "Desenhar o Dino: só no começo / a cada quadro" e "Limpar a
    // tela antes" (o bloco do Estúdio se chama "Limpar a tela").
    instruction:
      'Aperte Avançar 1 quadro e olhe a tela e o x do Dino. Depois desenhe o Dino a cada quadro. Por último, ligue Limpar a tela antes.',
    manipulates: 'Quando desenhar o Dino, limpar a tela antes e o relógio',
    success: 'A cada quadro o jogo limpa a tela e desenha de novo. É assim que o Dino anda!',
    extra: 'E se limpar sem desenhar? O que sobra na tela?',
    goals: [
      {
        id: 'frozen',
        label: 'Sem desenhar de novo, a tela não muda',
        // ⚠️⚠️ "Com o Dino na tela" (review do lote 2): depois de limpar SEM desenhar a tela fica vazia,
        // e o pedido antigo ("com o desenho desligado, avance") repetia um gesto que não derrubava a
        // meta. Não mudar pede alguma coisa desenhada para ficar parada.
        // ⚠️ "Aperte Avançar 1 quadro", o botão que a instrução nomeia (consertos do review da onda A do
        // lote 5): nesta cena o passo tem sempre esse nome (`sceneStepLabel`), e "deixe o tempo passar"
        // mandava procurar outro botão.
        pedido:
          'Com o Dino na tela, desenhe só no começo, sem limpar a tela, e aperte Avançar 1 quadro.',
      },
      {
        id: 'trail',
        label: 'Sem limpar, os desenhos velhos ficam',
        pedido: 'Desenhe o Dino a cada quadro, sem limpar a tela, e deixe o tempo passar.',
      },
      {
        id: 'moving',
        label: 'Limpando e desenhando, o Dino anda',
        pedido: 'Desenhe o Dino a cada quadro, ligue Limpar a tela antes e deixe o tempo passar.',
      },
    ],
    hints: [
      'Aperte Avançar 1 quadro e compare a tela com o x do Dino na faixa.',
      'Escolha desenhar a cada quadro e avance dois quadros.',
      'Ligue Limpar a tela antes e avance de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com o desenho só no começo, o x do Dino anda e a tela fica parada.',
        highlight: 'scene',
        actions: [
          { type: 'loop', on: false },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Desenhando a cada quadro, sem limpar, os desenhos de antes ficam na tela.',
        highlight: 'scene',
        actions: [
          { type: 'loop', on: true },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-3',
        caption: 'Limpando antes de desenhar, sobra um Dino só, que anda.',
        highlight: 'scene',
        actions: [
          { type: 'erase', on: true },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  /* ── O ateliê de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026) ──────────────
     ⚠️⚠️ As cinco abaixo e as duas do fim (`fill-stroke`, `shading`) são a PONTE para o Pinta: o nome
     de cada controle é o do botão da ferramenta (Prévia, Velocidade, Espelho lado a lado,
     Preenchimento, Contorno, Sem cor) e o desenho é o da aula (a nave 32 × 32 com fogo, a pedra do
     asteroide, a folha de 64 × 32). Proposta em `analise/g4-atelie.md`. */
  frames: {
    id: 'frames',
    group: 'art',
    title: 'Dois desenhos viram movimento',
    // ⚠️⚠️ O Dino que ANDAVA entre os quadros saiu (lote 5): a Aula 3 quer o corpo parado e só o
    // fogo mudando ("se a nave inteira mexeu, desfaça"), e a cena ensinava o contrário.
    instruction:
      'Olhe o quadro 1 e o quadro 2. Depois ligue a prévia rápida, pare, e experimente devagar.',
    manipulates: 'Qual quadro aparece, a prévia tocando e a velocidade dela',
    success:
      'Cada quadro continua sendo um desenho parado. É a troca rápida que faz o fogo pulsar!',
    extra: 'E se os dois quadros fossem iguais? O fogo ainda ia pulsar?',
    goals: [
      {
        id: 'two-drawings',
        label: 'Com a prévia parada, olhou o quadro 1 e o quadro 2',
        pedido: 'Com a prévia parada, passe do quadro 1 para o quadro 2.',
      },
      {
        id: 'movement',
        label: 'Rápido, viu o fogo pulsar',
        pedido: 'Ponha a velocidade em 8 e deixe a prévia tocar.',
      },
      // ⭐ Lote 5: parar a prévia rápida é ver que na tela há UM quadro de cada vez, a resposta da
      // previsão. Antes a demonstração acabava com o relógio parado e a faixa dizendo "andando".
      // ⚠️ Antes do "devagar" de propósito: é a meta que responde a previsão, e em último lugar o
      // palpite só voltaria junto com a conclusão (a régua do `pedidos-no-motor`).
      {
        id: 'paused-one',
        label: 'Parou a prévia rápida e viu um quadro só',
        pedido: 'Com a prévia rápida tocando, pare a prévia.',
      },
      {
        id: 'slow-shows-two',
        label: 'Devagar, viu um quadro e depois o outro',
        pedido: 'Ponha a velocidade em 2, ligue a prévia e espere.',
      },
    ],
    hints: [
      'Com a prévia parada, aperte Quadro 1 e Quadro 2. Olhe o que muda de um para o outro.',
      'Ponha a velocidade em 8, espere o fogo pulsar e pare a prévia.',
      'Agora ponha a velocidade em 2 e ligue a prévia. Conte os quadros que aparecem.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Quadro 1: a nave com o fogo pequeno.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Quadro 2: a mesma nave, com o fogo maior.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 2 }],
      },
      {
        id: 'step-3',
        caption: 'Devagar, 2 por segundo. Um, outro, um, outro.',
        highlight: 'scene',
        // ⚠️ A prévia PARA no fim da parte: entre uma parte e outra o relógio do player para, e a
        // faixa não pode dizer "tocando" sobre um fogo congelado.
        actions: [
          { type: 'rate', perSecond: 2 },
          { type: 'play', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'play', on: false },
        ],
      },
      {
        id: 'step-4',
        // ⚠️⚠️ No PASSADO, e a prévia PARA no fim desta parte também (consertos do review da onda B do
        // lote 5, M1): entre a parte 4 e a 5 a faixa dizia "prévia: tocando" e a frase "troca 8
        // quadros por segundo" sobre um fogo congelado, até a criança apertar "Ver a parte 5".
        caption: 'Rápido, 8 por segundo. O fogo pulsou e a nave ficou parada.',
        highlight: 'scene',
        actions: [
          { type: 'rate', perSecond: 8 },
          { type: 'play', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'play', on: false },
        ],
      },
      {
        id: 'step-5',
        // ⚠️ A parte 5 TOCA de novo e para de repente: parada só com `play off`, ela só trocava a faixa
        // para "parada", sem mudar um pixel. ⚠️ 1,5 s, que cai em quadro inteiro a 24 por segundo (o
        // editor do admin avisa tempo que não cai, e 0,4 s eram 9,6 quadros).
        caption: 'De novo rápido, e parou de repente. Na prévia ficou um quadro inteiro.',
        highlight: 'scene',
        actions: [
          { type: 'rate', perSecond: 8 },
          { type: 'play', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 0.5 },
          { type: 'play', on: false },
        ],
      },
    ],
  },
  'onion-skin': {
    id: 'onion-skin',
    group: 'art',
    title: 'O fantasma do quadro de antes',
    // ⚠️⚠️ Lote 5: a mesma nave dos quadros, e o que muda é o FOGO. O Dino andava entre os quadros e a
    // régua "passo 52" dava a medida mesmo sem o fantasma.
    instruction:
      'No quadro 2, mude o fogo com o fantasma desligado. Depois ligue o fantasma e compare os dois fogos.',
    manipulates: 'O fantasma do quadro anterior e o tamanho do fogo do quadro 2',
    success:
      'O fantasma é uma guia, não um desenho: ele deixa você comparar os dois fogos sem decorar!',
    extra: 'E no quadro 1? Tente ligar o fantasma lá e veja o que aparece.',
    goals: [
      {
        id: 'blind-move',
        label: 'Mudou o fogo 2 sem ver o fogo 1',
        pedido: 'No quadro 2, com o fantasma desligado, mude o tamanho do fogo 2.',
      },
      {
        id: 'ghost-on',
        // ⚠️⚠️ "Tracejado", e não "clarinho por baixo" (consertos do review da onda B do lote 5, A2): o
        // fantasma é o contorno do fogo 1 POR CIMA do fogo 2, e a meta afirmava o que ninguém via.
        label: 'Viu o fogo 1 tracejado no quadro 2',
        pedido: 'Vá para o quadro 2 e ligue o fantasma.',
      },
      {
        id: 'even-step',
        label: 'Com o fantasma, deixou o fogo 2 maior e dentro do quadro',
        pedido:
          'No quadro 2, com o fantasma ligado, deixe o fogo 2 um pouco maior que o fogo 1, sem passar da borda.',
      },
    ],
    hints: [
      'Vá para o quadro 2 e mude o tamanho do fogo com o fantasma desligado.',
      'Agora ligue o fantasma. O fogo tracejado é o do quadro 1.',
      'Deixe o fogo 2 um pouco maior que o fogo tracejado, sem passar da borda do quadro.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Quadro 2, fantasma desligado. O fogo cresceu quanto? Não dá para saber.',
        highlight: 'scene',
        actions: [
          { type: 'frame', index: 2 },
          { type: 'shift', offset: 8 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Com o fantasma ligado, o fogo do quadro 1 aparece tracejado por cima.',
        highlight: 'scene',
        actions: [{ type: 'onion', on: true }],
      },
      {
        id: 'step-3',
        caption: 'Com os dois à vista, o fogo cresce um pouco e sai do mesmo lugar.',
        highlight: 'scene',
        actions: [{ type: 'shift', offset: 20 }],
      },
      {
        id: 'step-4',
        // ⚠️ Palavras DIFERENTES da frase embaixo do palco (consertos do review da onda B do lote 5,
        // B3): as duas diziam "No quadro 1 não há quadro anterior para mostrar.", uma em cima da outra.
        caption: 'Voltou para o quadro 1. Com o fantasma ligado, nada tracejado aparece.',
        highlight: 'scene',
        actions: [{ type: 'frame', index: 1 }],
      },
    ],
  },
  symmetry: {
    id: 'symmetry',
    group: 'art',
    // ⚠️ O título antigo ("Um traço, dois lados") respondia a previsão logo abaixo dele.
    title: 'O que o espelho faz com o seu traço?',
    // ⚠️⚠️ Lote 5: o Espelho lado a lado do Pinta reflete sempre no MEIO do desenho, e existe também o
    // de cima e de baixo. A cena mandava mover um eixo que a ferramenta não tem.
    // ⚠️⚠️ Os dois espelhos são DUAS chaves independentes, como no Pinta (consertos do review da onda B
    // do lote 5): a cena tinha uma escolha de três, e "E se os dois estivessem ligados?" não se tentava.
    instruction:
      'Pinte a asa com os espelhos desligados. Ligue o Espelho lado a lado e pinte de novo. Depois deixe ligado só o espelho de cima e de baixo e pinte mais uma vez.',
    manipulates: 'Os dois espelhos do Pinta e os traços da nave na grade',
    success:
      'Com o espelho ligado, cada traço aparece também do outro lado do meio. Desligado, fica só onde você pintou!',
    extra: 'E se os dois espelhos estivessem ligados? Onde cairiam as cópias da asa?',
    goals: [
      {
        id: 'one-side',
        label: 'Pintou com o espelho desligado',
        pedido: 'Com os dois espelhos desligados, pinte a asa.',
      },
      {
        id: 'two-sides',
        label: 'Pintou com o Espelho lado a lado',
        // ⚠️ "Só" o lado a lado e a ASA: com os dois ligados nenhuma meta cai, e a cópia da cabine
        // encosta no traço (A3).
        pedido: 'Deixe ligado só o Espelho lado a lado e pinte a asa.',
      },
      {
        // ⚠️ O id ficou (manifestos e sessões): era "mudou o eixo", e virou o segundo espelho do Pinta.
        id: 'axis-decides',
        label: 'Pintou com o espelho de cima e de baixo',
        pedido: 'Deixe ligado só o espelho de cima e de baixo e pinte a asa.',
      },
    ],
    hints: [
      'Pinte a asa e conte quantas asas apareceram.',
      'Ligue o Espelho lado a lado e pinte a asa de novo. Olhe a grade inteira.',
      'Desligue o Espelho lado a lado, ligue o de cima e de baixo e pinte a asa de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Espelhos desligados: você pinta a asa, e aparece uma asa.',
        highlight: 'scene',
        actions: [
          { type: 'mirror-mode', mode: 'off' },
          { type: 'trace', piece: 'asa' },
        ],
      },
      {
        id: 'step-2',
        caption: 'Com o Espelho lado a lado, a outra asa aparece do outro lado do meio.',
        highlight: 'scene',
        actions: [
          { type: 'clear-paper' },
          { type: 'mirror-mode', mode: 'x' },
          { type: 'trace', piece: 'asa' },
        ],
      },
      {
        id: 'step-3',
        caption: 'Com o espelho de cima e de baixo, a cópia cai do outro lado do meio, em cima.',
        highlight: 'scene',
        actions: [
          { type: 'clear-paper' },
          { type: 'mirror-mode', mode: 'y' },
          { type: 'trace', piece: 'asa' },
        ],
      },
    ],
  },
  'pixel-vector': {
    id: 'pixel-vector',
    group: 'art',
    title: 'De perto, a borda conta',
    // ⚠️⚠️ Lote 5: UMA lupa para as duas pedras, que têm a MESMA silhueta (a de pixel é a curva da de
    // vetor rasterizada em 16 × 16). A de pixel era um oval de outra forma, e a pedra que não estava
    // sob a lupa ficava miúda ao lado da outra.
    instruction: 'Aproxime as duas pedras bem devagar. Olhe a borda de cada uma.',
    manipulates: 'O quanto a lupa aproxima as duas pedras',
    success:
      'De longe as duas parecem a mesma pedra. De perto, a de pixel mostra os quadradinhos e a de vetor continua lisa!',
    extra: 'Qual das duas você usaria numa nave bem pequena? E numa bem grande?',
    goals: [
      {
        id: 'stairs',
        label: 'Aproximou até as bordas ficarem diferentes',
        // ⚠️ 4, e não 3 (consertos do review da onda B do lote 5, M5): em 3 a pedra parecia peneira.
        pedido: 'Deixe Aproximar em 4 vezes ou mais.',
      },
      {
        // ⚠️ O id ficou: era "de perto, o vetor continua liso", e virou os pontos da Caneta à vista.
        id: 'smooth',
        label: 'Aproximou até ver os pontos do vetor',
        pedido: 'Deixe Aproximar em 6 vezes ou mais.',
      },
      {
        id: 'alike',
        label: 'Voltou para longe e comparou de novo',
        pedido: 'Depois de aproximar, volte Aproximar para 1 ou 2 vezes.',
      },
    ],
    hints: [
      'Aproxime devagar e pare quando uma borda mudar.',
      'Continue aproximando. Olhe o que aparece na borda da pedra de vetor.',
      'Volte Aproximar para 1 vez e compare as duas de longe.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Lupa em 2: as duas pedras quase do tamanho do jogo.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 2 }],
      },
      {
        id: 'step-2',
        caption: 'Lupa em 4: a borda de pixel vira degraus, e a de vetor continua lisa.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 4 }],
      },
      {
        id: 'step-3',
        caption: 'Lupa em 8: de um lado os quadradinhos, do outro os pontos da Caneta.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 8 }],
      },
      {
        id: 'step-4',
        caption: 'De longe, as duas voltam a parecer a mesma pedra.',
        highlight: 'scene',
        actions: [{ type: 'inspect', kind: 'pixel', zoom: 1 }],
      },
    ],
  },
  'sheet-vs-sprite': {
    id: 'sheet-vs-sprite',
    group: 'art',
    title: 'A folha e o tamanho no jogo',
    // ⚠️⚠️ Lote 5: a folha é a da nave (64 × 32, dois quadros de 32 × 32) e a escolha é a LARGURA do
    // recorte, a que a seção da Aula 6 promete. A folha era de 64 × 64 com quatro Dinos, e a única
    // meta fechava num toque no tamanho do jogo.
    instruction:
      'Mude a largura do recorte e olhe a nave no jogo. Depois mude o tamanho no jogo e olhe a folha.',
    manipulates: 'A largura do recorte na folha da nave, o quadro recortado e o tamanho no jogo',
    success:
      'O recorte precisa ter o tamanho de UM quadro da folha. O tamanho no jogo é outra escolha!',
    extra: 'E se a folha tivesse quatro quadros de 16 por 32? Que largura de recorte você usaria?',
    goals: [
      {
        id: 'squeezed',
        label: 'Viu o jogo mostrar a folha inteira',
        pedido: 'Escolha a largura 64 e olhe o jogo.',
      },
      {
        id: 'crop-half',
        label: 'Recortou 16 e olhou o jogo',
        pedido: 'Escolha a largura 16 e olhe o jogo.',
      },
      {
        id: 'crop-whole',
        label: 'Achou o recorte que mostra uma nave inteira',
        pedido: 'Escolha a largura 32 e olhe o jogo.',
      },
      // ⚠️ O id ficou (a Aula 6 o cobra no caso); só abre DEPOIS do recorte de uma nave inteira.
      {
        id: 'size-apart',
        label: 'Mudou o tamanho no jogo e conferiu a folha',
        // ⚠️ "Bem maior ou bem menor" (consertos do review da onda B do lote 5, B8): um toque no + só
        // chegava a 62, quase a nave de fábrica, e a meta caía com a mão ainda no botão.
        pedido: 'Com o recorte de 32, deixe a nave do jogo bem maior ou bem menor e olhe a folha.',
      },
    ],
    hints: [
      'Mude a largura do recorte e olhe o que aparece no jogo.',
      'Um quadro da folha tem 32 de largura. Que recorte mostra uma nave inteira?',
      'Com o recorte de 32, deixe a nave do jogo bem maior e compare a folha com antes.',
    ],
    script: [
      {
        id: 'step-1',
        // ⚠️⚠️ O jogo ABRE vazio (consertos do review da onda B do lote 5, A4): a parte 1 é a que carrega
        // a folha inteira, e a resposta da previsão da Aula 6 não aparece antes do palpite.
        caption: 'O jogo mostra a folha inteira: duas naves espremidas.',
        highlight: 'scene',
        actions: [{ type: 'crop', width: 64 }],
      },
      {
        id: 'step-2',
        caption: 'Recorte de 32 por 32: agora cabe uma nave só.',
        highlight: 'scene',
        actions: [{ type: 'crop', width: 32 }],
      },
      {
        id: 'step-3',
        // ⚠️ Oito trocas, e o fogo nomeado (consertos do review da onda B do lote 5, B7): "o fogo pulsa"
        // com quatro trocas em ~1,8 s chegava com o fogo já parado.
        caption: 'Trocando de quadro, o fogo muda: pequeno, grande, pequeno, grande.',
        highlight: 'scene',
        actions: [
          { type: 'cut', cell: 2 },
          { type: 'cut', cell: 1 },
          { type: 'cut', cell: 2 },
          { type: 'cut', cell: 1 },
          { type: 'cut', cell: 2 },
          { type: 'cut', cell: 1 },
          { type: 'cut', cell: 2 },
          { type: 'cut', cell: 1 },
        ],
      },
    ],
  },
  world: {
    id: 'world',
    group: 'world',
    title: 'Criar e mostrar são duas coisas diferentes',
    instruction:
      'Primeiro, crie o Dino nos bastidores. Depois, faça o Dino aparecer na tela do jogo.',
    manipulates: 'Criar o Dino nos bastidores e mostrar o Dino na tela',
    success: 'Quando aparece na tela do jogo, é o mesmo Dino que já existia nos bastidores.',
    extra: 'Quando você tirar o Dino da tela, o Dino deixa de existir?',
    goals: [
      {
        id: 'hidden',
        label: 'O Dino existe nos bastidores',
        pedido: 'Crie o Dino nos bastidores.',
      },
      {
        id: 'visible',
        label: 'O mesmo Dino aparece na tela',
        pedido: 'Mostre o Dino na tela do jogo.',
      },
    ],
    hints: [
      'Olhe a ficha dos bastidores e a tela do jogo.',
      'Primeiro, crie o Dino nos bastidores.',
      'Depois, mostre o Dino na tela do jogo.',
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
        caption: 'Mostrar o Dino na tela faz o mesmo Dino aparecer no jogo.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'draw', enabled: true }],
      },
      {
        id: 'step-3',
        caption: 'Tirar o Dino da tela não apaga o que existe nos bastidores.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'draw', enabled: false }],
      },
    ],
  },
  layers: {
    id: 'layers',
    group: 'world',
    title: 'Quem fica na frente?',
    // ⚠️ A instrução terminava com "A última desenhada fica na frente!": a regra que a cena existe
    // para a criança descobrir, escrita logo acima da previsão.
    instruction: 'O Dino está escondido. Mude a ordem de desenhar e faça o Dino aparecer.',
    // ⚠️ É a `<desc>` do palco (lote 5): "Ordem das peças Floresta e Dino" passava por um
    // `toLowerCase()` e o leitor de tela ouvia "ordem das peças chama e dino" com o elenco.
    manipulates: 'A ordem de desenhar do Dino e da floresta',
    success: 'Só a ordem mudou: quem é desenhado por último fica por cima, e ninguém foi apagado!',
    // ⚠️ "E se a floresta voltar para o último lugar?" virou a MISSÃO 2 (lote 5 do Raio-X).
    extra: 'E se fossem três peças? Quem ficaria por cima de todas?',
    // ⚠️⚠️ Três missões, nesta ordem (lote 5 do Raio-X): o Dino aparecer, esconder de novo SÓ com a
    // ordem (o que prova que ninguém foi apagado) e voltar o Dino para a frente, que é o arranjo do
    // jogo. Um toque fechava as duas primeiras (a ação observava os dois lados da troca).
    // ⚠️⚠️ `back-in-front` é META desde o full review de experiência (16/09/2026, M4): a arrumação final
    // era uma condição ESCONDIDA do avaliador (`settled`), e a faixa dizia "Descobertas 2 de 2 ✓✓" sobre
    // uma cena que não concluía, com uma frase explicando por que 2 de 2 não bastava. Acrescentada no
    // FIM, sem renomear nada (nenhum manifesto cita as metas da `layers` em `setup.goals`).
    // ⚠️ Com `pilha: 'camadas'` os pedidos são os de `LAYERS_CAMADAS` (pilha.ts): a lista do Pinta se lê
    // ao contrário.
    goals: [
      {
        id: 'front',
        label: 'O Dino apareceu na frente',
        pedido: 'Leve o Dino para o fim da ordem de desenhar.',
      },
      {
        id: 'covered',
        label: 'Escondeu de novo só trocando a ordem',
        pedido: 'Com o Dino no fim da ordem de desenhar, leve a floresta para o fim.',
      },
      {
        id: 'back-in-front',
        label: 'No jogo, quem é desenhado por último fica na frente',
        pedido: 'Leve o Dino de novo para o fim da ordem de desenhar.',
      },
    ],
    hints: [
      'Onde está o resto do Dino?',
      // ⚠️ "Quem está embaixo é desenhado por último" diz como a LISTA se lê (de cima para baixo, como
      // os blocos do Estúdio), e não quem fica por cima no desenho.
      'Olhe a lista A ordem de desenhar. Quem está embaixo é desenhado por último.',
      'Leve o Dino para o fim da lista.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'O Dino foi para o fim da ordem de desenhar e apareceu na frente.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: true }],
      },
      {
        id: 'step-2',
        caption: 'A floresta voltou para o fim e cobriu o Dino de novo. Ninguém foi apagado.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: false }],
      },
      {
        // ⚠️ A terceira missão (full review de experiência, M4): o arranjo do jogo volta no fim.
        id: 'step-3',
        caption: 'O Dino voltou para o fim da ordem de desenhar e ficou na frente, como no jogo.',
        highlight: 'scene',
        actions: [{ type: 'layer', front: true }],
      },
    ],
  },
  gravity: {
    id: 'gravity',
    group: 'motion',
    title: 'Faça o Dino voltar ao chão',
    // ⚠️ "No meio do pulo" (lote 5 do Raio-X): ligar a gravidade agora age no voo que já começou.
    instruction:
      'Aqui a gravidade está desligada. Faça o Dino pular e veja até onde vai. Depois, com o Dino no ar, ligue a gravidade.',
    manipulates: 'O Dino e a ligação da gravidade',
    success: 'A gravidade puxou para baixo, a subida virou descida e o Dino voltou ao chão!',
    extra: 'E se você desligar a gravidade no meio da queda?',
    goals: [
      {
        id: 'floating',
        label: 'Sem gravidade, não parou de subir',
        pedido: 'Com a gravidade desligada, faça o Dino pular e espere.',
      },
      {
        id: 'landed',
        label: 'Com gravidade, o pulo voltou ao chão',
        // ⚠️ "No ar" (lote 5): é o gesto que mostra a gravidade agindo. Ligar e pular de novo continua
        // valendo (o motor cobra só ter visto o pulo sem gravidade antes).
        pedido: 'Com o Dino no ar, ligue a gravidade e espere.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 perguntava "voltando ou subindo?" com o Dino parado no chão (a situação vem na
      // frente dela). O gesto e o número que respondem, sem a resposta.
      'Toque no Dino e olhe o número da altura. O número para de crescer?',
      'Com o Dino no ar, ligue a gravidade e olhe o que muda.',
      // ⚠️ O pulo antes (consertos do review da onda A do lote 5): o fio fica fechado até o Dino passar do
      // meio da subida sem gravidade, e a pista 3 mandava ligar um fio fechado.
      'Pule e espere o número parar de crescer. Depois ligue Gravidade ao Dino com o Dino no ar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem gravidade, o Dino sobe e não para.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1.5 },
        ],
      },
      {
        id: 'step-2',
        // ⚠️ Sem teletransporte (lote 5 do Raio-X): a gravidade é ligada NO AR e age dali.
        caption:
          'Com a gravidade ligada no ar, a subida freou, virou queda e o Dino voltou ao chão.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'gravity', enabled: true },
          { type: 'advance', seconds: 2.5 },
        ],
        waitFor: 'landed',
      },
    ],
  },
  impulse: {
    id: 'impulse',
    group: 'motion',
    title: 'Escolha a altura do salto',
    // ⚠️ O 14 NA instrução (review do lote 2): a previsão pergunta pelo impulso 14, e a meta que a
    // responde é a do impulso mais forte. ⚠️ "As duas marcas" (lote 5): elas ficam no palco.
    instruction:
      'Faça o Dino pular com impulso 9. Depois leve o impulso até 14 e pule de novo. Compare as duas marcas.',
    manipulates: 'O impulso do salto e o Dino',
    success: 'Com a mesma gravidade, um impulso maior fez uma marca muito mais alta!',
    // ⚠️ O caso novo da proposta do g2, para quem terminar antes: aplicar, e não repetir.
    extra: 'Agora faça um salto que passe da marca azul e fique abaixo de 150.',
    goals: [
      {
        id: 'first-height',
        label: 'Um salto chegou ao chão',
        pedido: 'Faça o Dino pular e espere o salto terminar.',
      },
      {
        id: 'other-height',
        label: 'Outro impulso, marca bem diferente',
        // ⚠️ Os DOIS impulsos no pedido (lote 5): a meta compara a marca de agora com a de antes, e
        // "leve até 14 e pule de novo" não servia a quem já tinha pulado com 14.
        pedido: 'Pule com impulso 9 e depois com impulso 14.',
      },
    ],
    hints: [
      'A marca azul é o salto de antes.',
      'Mude só o impulso. A gravidade fica igual.',
      'Leve o impulso até 14 e toque no Dino.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Esta marca fica no palco: é o salto de antes.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 2 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Só o impulso mudou. Compare as duas marcas.',
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
    title: 'O som acompanha o pulo',
    instruction:
      'Aperte Espaço duas vezes no mesmo pulo. Depois pule tocando no Dino. Conte os sons.',
    manipulates: 'A peça Tocar som, o Dino e a tecla Espaço',
    success: 'Em Quando o Dino pular, o som toca uma vez em cada pulo, por tecla ou por toque!',
    extra: 'E se você apertar Espaço várias vezes no mesmo pulo, com o som em Quando o Dino pular?',
    // ⚠️⚠️ A missão de fábrica são TRÊS metas (lote 5 do Raio-X): o som sem pulo, o pulo sem som (o
    // outro defeito que a aula conserta, e que acontecia calado) e um som em cada pulo pelos dois
    // jeitos. As três antigas de detalhe (`quiet-air`, `key-sound`, `tap-sound`) ficam para um caso
    // (`soNoCaso`): ids não mudam, e a `every-jump` cai quando as duas de tecla e toque caíram.
    goals: [
      {
        id: 'false-sound',
        label: 'Som sem pulo',
        pedido: 'Com Tocar som em Quando apertar Espaço, aperte Espaço duas vezes no mesmo pulo.',
      },
      {
        id: 'silent-jump',
        label: 'Pulo sem som',
        pedido: 'Com Tocar som em Quando apertar Espaço, pule tocando no Dino.',
      },
      {
        id: 'quiet-air',
        label: 'Sem pulo novo, o som esperou',
        pedido: 'Com Tocar som em Quando o Dino pular, aperte Espaço duas vezes no mesmo pulo.',
        soNoCaso: true,
      },
      {
        id: 'key-sound',
        label: 'Com o som no pulo, a tecla fez pulo e som',
        pedido: 'Com Tocar som em Quando o Dino pular, pule pela tecla Espaço.',
        soNoCaso: true,
      },
      {
        id: 'tap-sound',
        label: 'Com o som no pulo, o toque fez pulo e som',
        pedido: 'Com Tocar som em Quando o Dino pular, pule tocando no Dino.',
        soNoCaso: true,
      },
      {
        id: 'every-jump',
        label: 'Um som em cada pulo, por tecla e por toque',
        pedido:
          'Leve Tocar som para Quando o Dino pular. Depois pule pela tecla Espaço e tocando no Dino.',
      },
    ],
    hints: [
      'Aperte Espaço duas vezes no mesmo pulo. Conte os ♪.',
      'Agora pule tocando no Dino. Tocou som?',
      'Leve Tocar som para Quando o Dino pular e teste os dois jeitos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A tecla tocou o som sem outro pulo, e o toque fez o Dino pular sem som.',
        highlight: 'scene',
        actions: [
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 0.2 },
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 1.6 },
          { type: 'jump', input: 'tap' },
        ],
      },
      {
        id: 'step-2',
        caption: 'Em Quando o Dino pular, cada pulo toca um som.',
        highlight: 'scene',
        actions: [
          { type: 'advance', seconds: 1.6 },
          { type: 'connect', port: 'sound', enabled: true },
          { type: 'jump', input: 'key' },
          { type: 'advance', seconds: 1.6 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1.6 },
        ],
      },
    ],
  },
  spawn: {
    id: 'spawn',
    group: 'population',
    title: 'Abra espaço entre os cactos',
    // ⚠️ "▶ Tempo" (lote 5 do Raio-X): o relógio da cena é o ▶, e "o relógio" é onde a peça mora.
    // Eram dois relógios com o mesmo nome na mesma frase.
    instruction:
      'Aperte ▶ Tempo e veja os cactos nascerem. Depois leve Criar cacto para dentro do relógio e compare.',
    manipulates: 'A peça Criar cacto, o relógio e o intervalo',
    success: 'Com o relógio, nasce um cacto de cada vez e sobra espaço entre um cacto e outro!',
    extra: 'E se o relógio esperar um pouco mais entre dois cactos?',
    goals: [
      {
        id: 'every-frame',
        label: 'Viu a parede de cactos',
        pedido: 'Com Criar cacto em A cada quadro, deixe o tempo passar um segundo inteiro.',
      },
      {
        id: 'spaced',
        label: 'Com o relógio, sobrou espaço',
        // ⚠️ "até nascerem dois", e não "dois segundos": com o intervalo de 2 s, dois segundos
        // davam UM nascimento, e a meta pede dois.
        pedido:
          'Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos.',
      },
    ],
    hints: [
      'Veja quantos cactos nascem enquanto o tempo passa.',
      'Compare o mesmo tempo com e sem o relógio.',
      'Leve Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem relógio, nasce um cacto em cada quadro. Olhe a parede.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 2 }],
      },
      {
        id: 'step-2',
        // ⚠️ `tools` (lote 5 do Raio-X): a demonstração do Meu Jeito ligava o relógio sem a bancada à
        // vista, e a mudança acontecia invisível.
        caption: 'Agora Criar cacto mora no relógio: um a cada segundo.',
        highlight: 'tools',
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
    // ⚠️ O título antigo ("Cuide dos cactos invisíveis") respondia a previsão ("some do jogo?").
    title: 'Para onde vai o cacto que sai da tela?',
    instruction:
      'Aperte ▶ Tempo e veja um cacto sair da tela. Olhe os bastidores. Depois ligue Remover do grupo quem saiu da tela e compare.',
    manipulates: 'A regra Remover do grupo quem saiu da tela e o tempo',
    success: 'Sair da tela não tira ninguém do grupo: quem tira é a regra!',
    extra: 'E se você desligar a regra e deixar outros cactos saírem?',
    goals: [
      {
        id: 'invisible-stored',
        label: 'Saiu da tela e ficou no grupo',
        pedido: 'Deixe o tempo passar até dois cactos saírem da tela.',
      },
      {
        id: 'removed',
        label: 'A regra tirou do grupo quem saiu',
        // ⚠️ O nome da CHAVE da bancada (lote 5 do Raio-X), que é o do bloco do Estúdio. Eram cinco
        // nomes para uma regra: "limpeza", "Remover do grupo → Saída da tela", "Encaixe Remover",
        // "Retirar regra" e "remoção na saída".
        pedido: 'Ligue Remover do grupo quem saiu da tela e deixe o tempo passar.',
      },
    ],
    hints: [
      'Olhe a prateleira dos bastidores quando um cacto sai.',
      // ⚠️ "Sair da tela não é sair do grupo" era a conclusão (consertos do review da onda A do lote 5).
      'Conte os cactos da prateleira depois que um cacto sai.',
      'Ligue Remover do grupo quem saiu da tela e aperte ▶ Tempo de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Os cactos que saíram da tela continuam na prateleira dos bastidores.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 2 }],
      },
      {
        id: 'step-2',
        caption: 'Com a regra ligada, quem sai da tela vai para os removidos.',
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
    // ⚠️ O título antigo ("O relógio espera você começar") puxava para a resposta ERRADA da previsão.
    title: 'O relógio na tela de início',
    // ⚠️⚠️ A peça é Criar cacto, DENTRO do relógio (lote 5 do Raio-X): na cena o Relógio entrava no
    // Se, e no Estúdio, logo depois, é o Se que entra no relógio ("mova a criação do cacto para
    // dentro dele"). E "▶ Tempo" para o relógio da cena não ter o mesmo nome da peça.
    instruction:
      'Aperte ▶ Tempo na tela de início. Nascem cactos? Depois leve Criar cacto para dentro de Se jogando e compare.',
    manipulates: 'A peça Criar cacto, a caixa Se jogando e o começo da partida',
    success: 'Dentro de Se jogando, Criar cacto espera no início e volta a criar na partida!',
    extra: 'E se você voltar ao início depois de jogar?',
    goals: [
      {
        id: 'outside',
        label: 'Nasceram cactos antes de começar',
        pedido: 'Na tela de início, com Criar cacto fora do Se, deixe o tempo passar.',
      },
      {
        id: 'waiting',
        label: 'No início, nada nasceu por 2 segundos',
        pedido:
          'Leve Criar cacto para dentro de Se jogando e deixe o tempo passar 2 segundos na tela de início.',
      },
      {
        id: 'playing',
        label: 'Jogando, voltou a nascer',
        pedido: 'Com Criar cacto dentro de Se jogando, comece a partida e deixe o tempo passar.',
      },
    ],
    hints: [
      // ⚠️ "Por que há cactos antes de você começar?" respondia a previsão ("nascem cactos no
      // início?"), e a pista pode ser lida antes do palpite.
      'Aperte ▶ Tempo na tela de início e conte os cactos que aparecem.',
      'O que fica dentro de Se jogando só acontece durante a partida.',
      'Leve Criar cacto para dentro de Se jogando. Compare o início e a partida.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Na tela de início, os cactos nascem.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 1 }],
      },
      {
        id: 'step-2',
        caption: 'Dentro de Se jogando, Criar cacto espera a partida começar.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 2 },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 1 },
        ],
      },
    ],
  },
  controls: {
    id: 'controls',
    group: 'events',
    title: 'O convite para começar',
    // ⚠️ O convite diz os DOIS caminhos (lote 5 do Raio-X): a instrução e a pista 1 falavam de dois
    // caminhos, e o desenho dizia só "Toque para começar".
    instruction: 'A tela promete dois jeitos de começar. Teste os dois.',
    manipulates: 'A tela de início e a peça Começar',
    success: 'Agora os dois jeitos que o convite promete começam a partida!',
    extra: 'E se você levar Começar de volta para Quando apertar Enter? O Enter ainda funciona?',
    // ⚠️⚠️ Sem o fio (lote 5 do Raio-X): Começar é uma PEÇA que muda de evento, o gesto do Estúdio da
    // seção seguinte ("mova o mesmo Se para Quando apertar qualquer tecla ou tocar"). Ela fica à
    // vista desde a abertura, então nenhum pedido depende de outra meta.
    goals: [
      {
        id: 'missing-touch',
        label: 'Tocou e nada aconteceu',
        pedido: 'Com Começar em Quando apertar Enter, toque na tela de início.',
      },
      {
        id: 'start-tap',
        label: 'Começou tocando',
        pedido:
          'Leve Começar para Quando apertar qualquer tecla ou tocar na tela, e toque na tela de início.',
      },
      {
        id: 'start-key',
        label: 'Começou com Enter',
        pedido: 'Na tela de início, aperte Enter.',
      },
    ],
    hints: [
      // ⚠️ O desenho só mostra o toque, e "Os dois funcionam?" já sugeria que não.
      'Toque na tela de início e olhe se ela muda.',
      'Olhe em que caixa está a peça Começar.',
      'Leve Começar para Quando apertar qualquer tecla ou tocar na tela. Teste os dois jeitos, voltando ao início.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Tocar na tela não começou a partida.',
        highlight: 'scene',
        actions: [{ type: 'start', input: 'tap' }],
      },
      {
        id: 'step-2',
        caption:
          'Com Começar em Quando apertar qualquer tecla ou tocar na tela, o toque começa a partida.',
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
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X (16/09/2026): a pista tem VÁRIOS cactos, e o gesto é o do
    // jogo (tocar na tela). O que muda é o que o toque faz no FIM, e a pista mostra a diferença. A
    // cena antiga nunca mostrava o contraste do título ("Recomeçar é só trocar de tela?").
    instruction:
      'Jogue até bater. No fim, toque na tela. Depois troque o que o toque faz e jogue de novo.',
    manipulates: 'O toque na tela, o que o toque faz no fim e os cactos da pista',
    // ⚠️ Sem "pontos": esta cena não tem placar, e a Aula 9 vem antes de o placar existir.
    success: 'A pista começou limpa. Isso é jogar de novo de verdade!',
    extra: 'E se você trocar para Ir para o início de novo? A pista fica como?',
    goals: [
      {
        id: 'ended',
        label: 'A batida levou para o fim',
        pedido: 'Toque na tela e deixe o tempo passar.',
      },
      {
        id: 'screen-only',
        label: 'Só trocar de tela deixou os cactos na pista',
        pedido: 'No fim, com Ir para o início escolhido, toque na tela duas vezes.',
      },
      {
        id: 'restarted',
        label: 'Reiniciar começou com a pista limpa',
        // ⚠️ A comparação é obrigatória: o motor só dá esta meta depois de `screen-only`.
        pedido:
          'Depois de jogar de novo com Ir para o início, escolha Reiniciar o jogo e, no fim, toque na tela duas vezes.',
      },
    ],
    hints: [
      'Olhe a pista depois de voltar para o início. Quantos cactos ficaram?',
      'Troque o que o toque faz no fim e compare as duas pistas.',
      // ⚠️ A comparação na ordem (consertos do review da onda A do lote 5): a pista 3 mandava direto ao
      // Reiniciar, o atalho que não conta sem ter visto a pista herdada.
      'Primeiro jogue com Ir para o início e olhe a pista. Depois escolha Reiniciar o jogo e compare.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Toque na tela e o tempo passa: um cacto chega, bate, e a partida acaba.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 3 },
        ],
        waitFor: 'ended',
      },
      {
        id: 'step-2',
        caption:
          'O toque no fim só voltou para o início. Tocando de novo, a partida começa com os cactos da anterior.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'tap' },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'screen-only',
      },
      {
        id: 'step-3',
        caption: 'Com Reiniciar o jogo, o toque no fim limpa a pista. A partida nova começa vazia.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'restart', enabled: true },
          { type: 'start', input: 'tap' },
          { type: 'start', input: 'tap' },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'restarted',
      },
    ],
  },
  hitbox: {
    id: 'hitbox',
    group: 'collision',
    title: 'Onde a batida acontece?',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: a cena abre com a área GRANDE (130%), como o jogo da Aula
    // 10 antes do conserto, e o gesto é DIMINUIR até 80%. A cena antiga aumentava a área, na direção
    // contrária à da aula, e em largura absoluta, enquanto o Estúdio fala em porcentagem.
    // ⚠️⚠️ Sem "olhe o espaço entre os desenhos" (consertos do review da onda A do lote 5): a instrução
    // fica logo acima da previsão ("antes ou só quando os desenhos se encostarem?") e dizia que haveria
    // espaço entre eles no BATEU. Olhar o vão fica para a pista, depois do BATEU.
    instruction:
      'Traga o cacto um toque de cada vez até aparecer BATEU. Depois deixe o cacto no mesmo lugar e mude só a área do Dino.',
    manipulates: 'A Distância do cacto e o Tamanho da área do Dino',
    success: 'O Dino ficou do mesmo tamanho. Só a área mudou, e a batida ficou justa!',
    extra: 'Com a área em 80%, traga o cacto de novo. Quando aparece BATEU agora?',
    goals: [
      {
        id: 'contact',
        label: 'BATEU com os desenhos ainda longe',
        // ⚠️⚠️ Um toque de cada vez (review do lote 2): de 10 em 10 a batida aparece em 50, com um vão
        // de 10 entre os desenhos. Trazer o cacto até em cima do Dino não mostra vão nenhum.
        pedido: 'Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez.',
      },
      {
        id: 'area-contrast',
        label: 'Área menor, mesmo lugar: a batida sumiu',
        // ⚠️ "Sem mexer na Distância", e não "parado", que não concorda com a pedra.
        pedido: 'Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino.',
      },
    ],
    hints: [
      // ⚠️ "Olhe os dois desenhos", e não "olhe o espaço entre eles": era o que a criança ia ver.
      'Aproxime o cacto um toque de cada vez e olhe os dois desenhos quando aparecer BATEU.',
      'Deixe o cacto onde bateu. Mude só a área do Dino.',
      'Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino até 80% e veja o BATEU sumir.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'BATEU! Mas olhe: os desenhos ainda não se tocam.',
        highlight: 'scene',
        // ⚠️ Em 59, e não 50 (consertos do review da onda A do lote 5): o vão de 19 se vê; o de 10 não.
        actions: [{ type: 'move', distance: 59 }],
      },
      {
        id: 'step-2',
        caption: 'Mesmo lugar, área em 80%. Agora não bateu.',
        highlight: 'scene',
        actions: [{ type: 'resize', width: 51.2 }],
      },
    ],
  },
  score: {
    id: 'score',
    group: 'events',
    // ⚠️ O título antigo ("Pontos só durante a partida") respondia a previsão.
    title: 'Quando o placar cresce?',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: a criança VÊ o erro primeiro (a peça solta soma até no
    // início) e só depois muda a peça de lugar. Antes dava para pôr a peça certa logo de cara e
    // conferir três telas já certas.
    // ⚠️ Sem "em qual o placar não devia crescer?" (consertos do review da onda A do lote 5): a
    // pergunta pressupunha que o placar cresce onde não devia, logo acima da previsão sobre isso.
    instruction:
      'Deixe o tempo passar em cada tela (início, jogando e fim) e olhe o placar. Depois mude o Somar ponto de lugar e compare.',
    manipulates: 'Peça de pontuação, região Se jogando e a próxima tela',
    success: 'Os pontos crescem jogando e ficam guardados fora da partida!',
    extra: 'E se você voltar ao início? Veja se o placar continua parado.',
    goals: [
      {
        id: 'score-idle-wrong',
        label: 'Solto, o placar cresceu no início',
        pedido: 'Com Somar ponto solto, deixe o tempo passar na tela de início.',
      },
      {
        id: 'score-start',
        label: 'Dentro de Se jogando, o início esperou',
        // ⚠️ É COMPARAÇÃO: o motor só dá esta meta depois de a peça solta ter somado no início.
        // ⚠️ Mais curto (consertos do review da onda A do lote 5): o "Conferir" devolvia 25 palavras.
        pedido:
          'Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para Se jogando e espere de novo.',
      },
      {
        id: 'score-playing',
        label: 'Pontos aumentam jogando',
        pedido:
          'Com Somar ponto em Se jogando, aperte Próxima tela até Jogando e deixe o tempo passar.',
      },
      {
        id: 'score-end',
        label: 'No fim, o placar parou no valor',
        // ⚠️⚠️ É COMPARAÇÃO desde os consertos do review da onda A do lote 5 (A6): dois toques em
        // "Próxima tela" levavam ao Fim com o placar em 0, e a meta afirmava que ele "parou".
        pedido:
          'Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar.',
      },
    ],
    hints: [
      'Com a peça solta, o placar deve crescer antes de começar?',
      'Compare o placar das três telas na fileira embaixo do palco.',
      // ⚠️ O erro primeiro (consertos do review da onda A do lote 5): a pista 3 pulava a peça solta, que
      // é a meta obrigatória que abre a cena.
      'Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para Se jogando e passe pelas três telas.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com a peça solta, o placar cresce até na tela de início.',
        highlight: 'scene',
        actions: [{ type: 'advance', seconds: 2 }],
        waitFor: 'score-idle-wrong',
      },
      {
        id: 'step-2',
        caption: 'Dentro de Se jogando, o início espera.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'score-start',
      },
      {
        id: 'step-3',
        caption: 'Jogando, ele cresce. No fim, fica parado no valor.',
        highlight: 'scene',
        actions: [
          { type: 'start', input: 'key' },
          { type: 'advance', seconds: 3 },
          { type: 'collide' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'score-end',
      },
    ],
  },
  lives: {
    id: 'lives',
    group: 'events',
    // ⚠️ O título antigo ("Ponto e vida mudam por motivos diferentes") era a explicação da cena.
    title: 'O que a batida muda?',
    // ⚠️⚠️ O PONTO primeiro (review do lote 2): ligando os dois fios e batendo três vezes, a partida
    // acabava com o placar em 0, e depois do fim o relógio não soma. A meta que responde a previsão
    // (`points-stay`, os pontos ficam na batida) ficava impossível para quem seguia a instrução.
    // ⚠️⚠️ Sem "fio" (full review de experiência, M8): a bancada virou a PEÇA QUE MUDA DE CAIXA, o gesto do
    // Estúdio que o Desafio usa um dia antes. Os pedidos dizem para que caixa levar cada peça.
    instruction:
      'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois leve Perder uma vida para Quando bater e bata no cacto.',
    manipulates: 'A peça Somar ponto, a peça Perder uma vida e as batidas',
    success: 'Ponto e vida são duas contagens separadas: cada uma muda pelo seu próprio motivo!',
    extra: 'E se a batida tirasse ponto em vez de vida? O jogo ficaria justo?',
    goals: [
      {
        id: 'life-lost',
        label: 'A batida tirou uma vida',
        pedido: 'Leve Perder uma vida para Quando bater e bata no cacto.',
      },
      {
        id: 'points-stay',
        label: 'Os pontos ficaram, mesmo perdendo vida',
        pedido:
          'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar. Depois bata no cacto com Perder uma vida em Quando bater.',
      },
      {
        id: 'over',
        label: 'Sem vidas, a partida acabou.',
        pedido: 'Com Perder uma vida em Quando bater, bata até não sobrar nenhuma vida.',
      },
    ],
    hints: [
      'Leve Somar ponto para Enquanto tem vida e deixe o tempo passar para o placar subir.',
      'Agora leve Perder uma vida para Quando bater e bata uma vez. Olhe as duas contagens.',
      'Bata as três vezes e veja o que acontece quando a última vida sai.',
    ],
    // ⚠️⚠️ Sem "fio" nas falas (lote 5 do Raio-X): na demonstração a bancada não aparece, e as
    // quatro legendas falavam de fios que a criança nunca via. O Desafio tem roteiro PRÓPRIO, com o
    // ponto pelo acerto do tiro (dia-4).
    script: [
      {
        id: 'step-1',
        caption: 'O placar sobe com o tempo, e os corações continuam os mesmos.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'condition', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
      },
      {
        id: 'step-2',
        caption: 'O Dino bateu no cacto: saiu um coração, e o placar continua igual.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'life', enabled: true }, { type: 'collide' }],
      },
      {
        id: 'step-3',
        caption: 'Mais duas batidas: acabaram os corações e a partida. O placar guardou os pontos.',
        highlight: 'scene',
        actions: [{ type: 'collide' }, { type: 'collide' }],
      },
    ],
  },
  random: {
    id: 'random',
    group: 'speed',
    title: 'Cada cacto pode nascer diferente',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: sorteio DE VERDADE, um de cada vez. Eram quatro exemplos
    // fixos (500 e 560, −5 e −6), e a cena que pergunta se o lugar pode repetir nunca repetia.
    instruction:
      'Sorteie o lugar algumas vezes e olhe as marquinhas. Depois sorteie a velocidade e veja qual cacto chega mais longe.',
    manipulates: 'Sorteio do lugar e sorteio da velocidade, com as marquinhas e as raias',
    success: 'Cada sorteio saiu dentro dos limites que você deu, e às vezes repetiu!',
    extra: 'Sorteie a velocidade mais vezes. Algum cacto passa do de −6?',
    goals: [
      {
        id: 'positions',
        label: 'Saíram lugares diferentes',
        // ⚠️ "Até sair um lugar diferente" (consertos do review da onda A do lote 5): "três vezes", com
        // sete lugares, dava o MESMO lugar três vezes em 1 de cada 49, e a criança lia o pedido de novo.
        pedido: 'Aperte Sortear lugar até sair um lugar diferente.',
      },
      {
        id: 'repeat',
        label: 'Um lugar repetiu',
        // ⚠️ Oito vezes, e não "até repetir": são sete lugares, então oito sorteios repetem com
        // certeza, e o pedido não conta o resultado.
        pedido: 'Aperte Sortear lugar mais oito vezes.',
      },
      {
        id: 'velocities',
        label: 'O cacto −6 chegou mais longe que o −5',
        pedido: 'Aperte Sortear velocidade até sair um cacto −5 e um −6.',
      },
    ],
    hints: [
      'A régua mostra onde um cacto pode nascer, depois da borda da tela.',
      'Sorteie uma coisa por vez: primeiro o lugar, depois a velocidade.',
      'Aperte Sortear lugar muitas vezes. Depois aperte Sortear velocidade e compare as raias.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sorteando o lugar: 520, 550 e 520 de novo. Cada um dentro da régua.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'position', unit: 0.3, guided: false },
          { type: 'sample', kind: 'position', unit: 0.75, guided: false },
          { type: 'sample', kind: 'position', unit: 0.35, guided: false },
        ],
      },
      {
        id: 'step-2',
        caption: 'Sorteando a velocidade: o cacto de −6 anda mais em 1 segundo que o de −5.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'velocity', unit: 0.2, guided: false },
          { type: 'sample', kind: 'velocity', unit: 0.8, guided: false },
        ],
      },
    ],
  },
  acceleration: {
    id: 'acceleration',
    group: 'speed',
    title: 'Acelere com um limite',
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: UM relógio só, o do Estúdio ("a cada 5 segundos"), e cada
    // passo faz nascer um cacto numa fileira com o número colado nele. Eram dois relógios (o ▶ movia
    // os cactos, "Avançar o relógio" mudava a base), e uma placa que PRENDIA a base em −9.
    instruction:
      'Aperte Passar 5 segundos várias vezes e olhe a velocidade de cada cacto novo. O que acontece quando a base chega em −9?',
    manipulates: 'O relógio de 5 segundos, a condição Se velocidade > −9 e a fileira de cactos',
    success:
      'A base parou em −9, e mesmo assim um cacto saiu com −10. O sorteio vem depois da base!',
    extra: 'Desligue a condição de novo. Até onde a base vai?',
    goals: [
      {
        id: 'base-limit',
        label: 'A base parou em −9',
        pedido: 'Com a condição ligada, aperte Passar 5 segundos cinco vezes.',
      },
      {
        id: 'variation-limit',
        label: 'Mesmo parada em −9, saiu um cacto −10',
        // ⚠️ "Mais quatro vezes": com três cactos seguidos em −9, o motor garante o sorteio de 1.
        pedido: 'Com a base em −9 e a condição ligada, aperte Passar 5 segundos mais quatro vezes.',
      },
      {
        id: 'old-speed',
        label: 'Os cactos velhos não mudaram de número',
        pedido: 'Aperte Passar 5 segundos três vezes e olhe o número embaixo de cada cacto.',
      },
      {
        id: 'past-limit',
        label: 'Sem a condição, a base passou de −9',
        pedido: 'Desligue a condição e aperte Passar 5 segundos cinco vezes.',
      },
    ],
    hints: [
      'Olhe o número embaixo de cada cacto da fileira.',
      'Passe 5 segundos até a conta da base dizer não.',
      // ⚠️ Sem "até sair um −10" (consertos do review da onda A do lote 5): é a resposta da previsão.
      'Com a base parada em −9, passe mais 5 segundos algumas vezes e olhe o número de cada cacto novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A cada 5 segundos a base fica 1 mais rápida, e o cacto novo nasce com ela.',
        highlight: 'scene',
        actions: [
          { type: 'sample', kind: 'velocity', unit: 0, guided: false },
          { type: 'sample', kind: 'velocity', unit: 0, guided: false },
          { type: 'sample', kind: 'velocity', unit: 0, guided: false },
          { type: 'sample', kind: 'velocity', unit: 0, guided: false },
        ],
      },
      {
        id: 'step-2',
        caption: 'Em −9 a conta diz não, e a base fica. Os cactos velhos guardam os seus números.',
        highlight: 'scene',
        actions: [{ type: 'sample', kind: 'velocity', unit: 0, guided: false }],
      },
      {
        id: 'step-3',
        caption: 'A base continua −9, e o sorteio tirou mais 1: nasceu um cacto −10.',
        highlight: 'scene',
        actions: [{ type: 'sample', kind: 'velocity', unit: 1, guided: false }],
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
    // ⚠️ A missão de FÁBRICA é a do eixo do lado (`down`/`up` são metas só de caso), e a
    // instrução nomeia a velocidade: "a velocidade" sozinha não diz qual das duas da bancada.
    instruction:
      'Escolha uma velocidade para o lado e deixe o tempo passar. Depois experimente um número negativo.',
    manipulates: 'Velocidade do Dino nos dois eixos, e o relógio',
    success: 'A posição muda sozinha porque a velocidade é somada nela em cada quadro!',
    extra: 'E se a velocidade for zero enquanto o relógio continua andando?',
    goals: [
      {
        id: 'moves',
        label: 'A posição mudou sozinha, com o relógio',
        pedido: 'Escolha uma velocidade diferente de zero e deixe o tempo passar.',
      },
      {
        id: 'left',
        label: 'Velocidade negativa levou para a esquerda',
        pedido: 'Ponha um número negativo na velocidade para o lado e deixe o tempo passar.',
      },
      {
        id: 'stopped',
        label: 'Com velocidade zero, o Dino fica parado',
        // ⚠️ O pedido não pode contar o resultado: é exatamente o que a previsão antiga perguntava.
        // ⚠️ "Depois de ver o Dino andar": mexer no número sem o tempo passar não conta, e a meta é
        // uma comparação com o que andou.
        pedido:
          'Depois de ver o Dino andar, ponha as duas velocidades em zero e deixe o tempo passar.',
      },
      // ⚠️ As duas do eixo de CIMA E BAIXO nasceram para o Dia 2 do Desafio, onde o tiro sobe: o
      // caso cobrava `left`, e a instrução mandava mexer na velocidade para baixo. Cada uma só cai
      // com o personagem andando naquele sentido (ver o relógio da `velocity` no motor), e as
      // duas são SÓ DE CASO: a missão de fábrica continua sendo a do lado.
      // ⚠️⚠️ `up` ANTES de `down` (review do lote 2): no Dia 2 a previsão pergunta pelo −9 e é
      // respondida por `up`. Em último lugar ela só voltava junto com a conclusão. E os dois pedidos
      // não supõem ordem ("Agora troque… de novo" dizia que o positivo vinha antes).
      {
        id: 'up',
        label: 'Velocidade negativa levou para cima',
        soNoCaso: true,
        pedido: 'Ponha a velocidade para baixo num número negativo e deixe o tempo passar.',
      },
      {
        id: 'down',
        label: 'Velocidade positiva levou para baixo',
        soNoCaso: true,
        pedido: 'Ponha a velocidade para baixo num número positivo e deixe o tempo passar.',
      },
    ],
    hints: [
      // ⚠️ Os DOIS números: a pista é a do modelo, e um caso que cobra o eixo de cima e baixo sem
      // escrever pistas próprias mandaria a criança olhar o x com a nave descendo.
      'Escolha uma velocidade. Depois deixe o tempo passar e olhe o número de x na faixa.',
      'A velocidade não move nada sozinha: quem move é o relógio, um quadro de cada vez.',
      'Ponha a velocidade para o lado em −5 e deixe o tempo passar.',
    ],
    script: [
      // ⚠️ Lote 5 do Raio-X: a fala diz a CONTA de um quadro (o palco a escreve junto do Dino), e
      // não "anda um pouco", que era o que a criança via com o movimento de 2,5 px de antes.
      {
        id: 'step-1',
        caption: 'Velocidade 5: a cada quadro o x do Dino soma 5, e o Dino vai para a direita.',
        highlight: 'scene',
        actions: [
          { type: 'velocity', vx: 5, vy: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'moves',
      },
      {
        id: 'step-2',
        caption:
          'Velocidade −5: a cada quadro o x diminui 5, e o mesmo relógio leva para o outro lado.',
        highlight: 'scene',
        actions: [
          { type: 'velocity', vx: -5, vy: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'left',
      },
      {
        id: 'step-3',
        caption: 'Velocidade 0: a cada quadro o x soma 0, e o Dino fica no lugar.',
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
    // ⭐⭐ Lote 5 do Raio-X (G5): UMA tecla, ligada às duas raquetes. Eram dois botões ("Apertar uma
    // vez" e "Segurar a tecla"), e a criança saía achando que eram duas teclas.
    instruction: 'Toque a tecla bem rápido. Depois segure a tecla e conte até três.',
    manipulates: 'A tecla, que as duas raquetes escutam',
    success: 'Apertar acontece uma vez. Estar apertada vale enquanto você segura!',
    extra: 'E se você segurar por mais tempo ainda?',
    goals: [
      {
        id: 'one-step',
        label: 'Toque rápido: a de cima deu um passo',
        pedido: 'Toque a tecla bem rápido e solte.',
      },
      {
        id: 'while-held',
        label: 'Segurando, a de baixo não parou de andar',
        // ⚠️ "Conte até três": a meta pede três quadros com a tecla segurada (0,75 s).
        pedido: 'Segure a tecla e conte até três.',
      },
      {
        id: 'apart',
        // ⚠️⚠️ Mudou de sentido (lote 5): era "no mesmo tempo, as duas em lugares diferentes", que pedia a
        // de baixo PASSAR a de cima e não caía com o rótulo verdadeiro na tela. Nenhum manifesto a cita.
        label: 'Segurando, a de cima deu um passo só',
        pedido: 'Segure a tecla, conte até três e solte.',
      },
    ],
    hints: [
      'Toque a tecla rápido e olhe as duas raquetes.',
      'Agora segure a tecla. A de cima anda de novo?',
      'Segure a tecla e conte até três antes de soltar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Um toque rápido: a de cima dá um passo, e a de baixo quase não sai do lugar.',
        highlight: 'scene',
        actions: [
          { type: 'hold', on: true },
          { type: 'hold', on: false },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'one-step',
      },
      {
        id: 'step-2',
        caption: 'Segurando a tecla, a de baixo anda em todo quadro. A de cima deu um passo só.',
        highlight: 'scene',
        // ⚠️ A meta cai ao SOLTAR, e o `waitFor` pede o tempo depois: a etapa termina com a tecla solta.
        actions: [
          { type: 'hold', on: true },
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
          { type: 'hold', on: false },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'apart',
      },
    ],
  },
  variable: {
    id: 'variable',
    group: 'events',
    title: 'Guardar, mudar e mostrar',
    instruction: 'Guarde um número na caixa. Mude o número sem mostrar. Só depois ligue o mostrar.',
    manipulates: 'O número guardado, a soma e o mostrar na tela',
    success: 'São três coisas diferentes: guardar, mudar e mostrar!',
    extra: 'E se você mostrar primeiro e mudar depois?',
    goals: [
      { id: 'stored', label: 'A caixa guardou um número', pedido: 'Guarde um número na caixa.' },
      // ⚠️ Os nomes dos BLOCOS do desenho (consertos do review da onda A do lote 5): a bancada dizia
      // "Somar 1 ponto" e "Mostrar na tela" embaixo de "Somar em pontos" e "Mostrar placar".
      {
        id: 'changed-hidden',
        label: 'Mudou o valor sem estar na tela',
        pedido: 'Depois de guardar, aperte Somar 1 em pontos com Mostrar placar desligado.',
      },
      {
        id: 'shown',
        label: 'Mostrar não mudou o valor guardado',
        pedido: 'Depois de guardar, ligue Mostrar placar.',
      },
    ],
    hints: [
      // ⚠️ A pista 1 mandava somar ANTES de guardar, gesto que não conta. A 2 era a explicação.
      'Guarde um número na caixa. Depois some pontos e olhe: a tela mudou?',
      'Guarde um número e aperte Somar 1 em pontos. Olhe a caixa e a tela antes de ligar Mostrar placar.',
      'Guarde 0, some 1 três vezes com o mostrar desligado, e só então ligue o mostrar.',
    ],
    // ⚠️⚠️ Redesenho do lote 5 do Raio-X: os números têm a HISTÓRIA do jogo do Desafio ("Criar
    // variável pontos, valor 0", cada acerto soma 1, "Mostrar placar"), e os três blocos acendem no
    // palco. Era guardar 10 e somar 5, números sem história, com a caixa "Observe a montagem" vazia.
    // ⚠️ `scene` nas três partes: o gesto aparece no DESENHO (os blocos e os acertos), não na bancada.
    script: [
      {
        id: 'step-1',
        caption: 'O jogo cria a caixa pontos e guarda 0.',
        highlight: 'scene',
        actions: [{ type: 'store', value: 0 }],
      },
      {
        id: 'step-2',
        caption: 'Três acertos: a caixa vai para 3. A tela ainda não mostra nada.',
        highlight: 'scene',
        actions: [
          { type: 'change', by: 1 },
          { type: 'change', by: 1 },
          { type: 'change', by: 1 },
        ],
      },
      {
        id: 'step-3',
        caption: 'Mostrar placar copia o 3 para a tela. A caixa continua 3.',
        highlight: 'scene',
        actions: [{ type: 'show', on: true }],
      },
    ],
  },
  'group-loop': {
    id: 'group-loop',
    group: 'population',
    // ⭐⭐ Lote 5 do Raio-X (G5): as distâncias ficam ESCONDIDAS até medir, e são parecidas (118, 112 e
    // 125). Antes elas estavam escritas embaixo dos cactos e cada cacto ficava a uma distância da torre
    // proporcional ao número: dava para escolher o mais perto sem medir nenhum.
    title: 'Qual deles está mais perto?',
    instruction:
      'Meça cada cacto e escolha o mais perto. Depois ligue o laço e deixe o tempo passar.',
    manipulates: 'Medir cada cacto, escolher um e o laço',
    success: 'Para achar o mais perto, é preciso medir todos. O laço mede todos, em todo quadro!',
    extra: 'E se dois cactos ficarem à mesma distância da torre?',
    goals: [
      {
        id: 'looked-all',
        label: 'Mediu os três antes de escolher',
        pedido: 'Aperte Medir em cada cacto do grupo.',
      },
      {
        id: 'nearest',
        label: 'Escolheu o mais perto depois de medir',
        // ⚠️ "cada cacto" e "o cacto": "os três" e "o de menor" não concordam com a pedra.
        pedido: 'Depois de medir cada cacto do grupo, escolha o cacto de menor distância.',
      },
      {
        id: 'auto',
        // ⚠️⚠️ Lote 5: cai quando o laço TROCA a escolha sozinho, e não no ato de ligar.
        label: 'Com o laço, a escolha mudou sozinha quando outro chegou mais perto',
        // ⚠️ "Por 3 segundos": o mais perto troca de dono a cada 2,5 s no máximo (`HUNT_SWING`).
        pedido: 'Ligue o laço e deixe o tempo passar por 3 segundos.',
      },
    ],
    hints: [
      'Nenhum cacto tem número ainda. Meça um.',
      'Só dá para saber o menor comparando os três números.',
      'Meça o 1º, o 2º e o 3º. Depois escolha o menor número.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A torre mede um por um do grupo.',
        highlight: 'scene',
        actions: [
          { type: 'look', id: 1 },
          { type: 'look', id: 2 },
          { type: 'look', id: 3 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Depois de medir todos, fica com o mais perto.',
        highlight: 'scene',
        actions: [{ type: 'choose', id: 2 }],
      },
      {
        id: 'step-3',
        caption: 'Com o laço, a escolha pula sozinha quando outro chega mais perto.',
        highlight: 'scene',
        // ⚠️ 2 s (consertos do review da onda B do lote 5): da fase 0 o 2º segue o mais perto por 1,6 s,
        // e a troca só conta depois de 1 s de laço ligado (`HUNT_LOOP_SEEN_TICKS`).
        actions: [
          { type: 'connect', port: 'loop', enabled: true },
          { type: 'advance', seconds: 2 },
        ],
        waitFor: 'auto',
      },
    ],
  },
  'enemy-type': {
    id: 'enemy-type',
    group: 'population',
    // ⚠️ "Uma ficha, muitos cactos" soprava a resposta, e com a pedra virava "muitos pedras".
    title: 'A ficha dos cactos',
    // ⭐⭐ Lote 5 do Raio-X (G5): os cactos ANDAM com a velocidade da ficha e têm os corações da vida em
    // cima. E a cópia ao nascer, que liga esta cena à `acceleration` do Corre Dino.
    instruction:
      'Faça nascer três cactos e olhe os cactos andarem. Depois mude a velocidade na ficha.',
    manipulates: 'A ficha (velocidade e vida), o nascimento de mais um e a cópia ao nascer',
    success: 'Quem lê a ficha muda junto com ela. Quem copiou ao nascer fica como era!',
    extra: 'E se você mudar a vida com a cópia ligada?',
    goals: [
      {
        id: 'many',
        label: 'Nasceram três cactos da mesma ficha',
        pedido: 'Aperte Fazer nascer mais um três vezes.',
      },
      {
        id: 'all-change',
        // ⚠️⚠️ Lote 5: cai no quadro DEPOIS da mudança, com dois cactos que já andavam na tela.
        label: 'Mudou a ficha e os cactos que já andavam mudaram juntos',
        pedido: 'Faça nascer mais de um cacto, mude a velocidade na ficha e deixe o tempo passar.',
      },
      {
        id: 'copied',
        label: 'Copiando ao nascer, só os novos mudaram',
        pedido:
          'Ligue Copiar a ficha ao nascer, mude a velocidade na ficha, faça nascer mais um cacto e deixe o tempo passar.',
      },
    ],
    hints: [
      'Você tem uma ficha com dois números. Faça nascer três cactos dela.',
      // ⚠️ A pista 2 era a explicação da cena.
      // ⚠️ "em cima" (consertos do review da onda B do lote 5): o número fica em cima de cada cacto.
      'Mude a velocidade na ficha e olhe o número em cima de cada cacto.',
      'Aperte Fazer nascer mais um três vezes e depois mude a velocidade para 7.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Três cactos nascem da mesma ficha e começam a andar.',
        highlight: 'scene',
        actions: [
          { type: 'spawnOne' },
          { type: 'spawnOne' },
          { type: 'spawnOne' },
          { type: 'advance', seconds: 1 },
        ],
      },
      {
        id: 'step-2',
        caption: 'Um número na ficha muda os três no mesmo quadro.',
        highlight: 'scene',
        actions: [
          { type: 'define', field: 'speed', value: 7 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'all-change',
      },
      {
        id: 'step-3',
        caption: 'Copiando a ficha ao nascer, só o cacto novo anda com o número novo.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'copy', enabled: true },
          { type: 'define', field: 'speed', value: 3 },
          { type: 'spawnOne' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'copied',
      },
    ],
  },
  camera: {
    id: 'camera',
    group: 'stage',
    // ⚠️ "A tela é uma janela" era a resposta do "Agora explique".
    title: 'Até onde o Dino pode ir?',
    // ⭐⭐ Lote 5 do Raio-X (G5): o mundo tem MARCOS (árvores, uma pedra e a bandeira no fim), e o Dino
    // anda com o gesto "Andar", em vez de teleportar pelo deslizante.
    instruction: 'Leve o Dino até a bandeira. Depois faça a câmera seguir o Dino e ande de novo.',
    manipulates: 'Andar com o Dino pelo mundo e a câmera que segue',
    success: 'A tela é uma janela: a câmera leva a janela junto com o Dino!',
    extra: 'E se o Dino voltar para o começo do mundo?',
    goals: [
      {
        id: 'lost',
        label: 'Sem a câmera, o Dino saiu da tela',
        pedido: 'Com a câmera parada, leve o Dino para depois de 480.',
      },
      {
        id: 'follows',
        label: 'Com a câmera seguindo, o Dino voltou para a tela',
        // ⚠️ Sem "depois de o Dino sumir": sumir é a resposta da previsão desta cena.
        pedido:
          'Leve o Dino para depois de 480 com a câmera parada e então faça a câmera seguir o Dino.',
      },
      {
        id: 'window',
        // ⚠️⚠️ Lote 5: cai quando a janela MUDA de lugar com a câmera seguindo.
        label: 'Com a câmera seguindo, o cenário passou e o Dino ficou na tela',
        pedido:
          'Com a câmera parada, leve o Dino para depois de 480. Depois faça a câmera seguir o Dino e ande mais um pouco.',
      },
    ],
    hints: [
      // ⚠️ As duas primeiras pistas eram a explicação ("a tela mostra só um pedaço") e a resposta da
      // previsão ("até sumir"), e podem ser lidas antes do palpite.
      'Olhe onde o Dino está no mundo e o pedaço que a tela mostra. Ande para a direita.',
      'Com a câmera parada, leve o Dino bem para a direita e olhe a tela do jogo.',
      'Leve o Dino para depois de 480 e depois faça a câmera seguir o Dino.',
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
        caption: 'Com a câmera seguindo, a janela anda junto e o Dino volta a aparecer.',
        highlight: 'scene',
        actions: [{ type: 'connect', port: 'camera', enabled: true }],
      },
      {
        id: 'step-3',
        caption: 'Andando com a câmera, o cenário passa e o Dino fica na tela.',
        highlight: 'scene',
        actions: [{ type: 'walk', x: 900 }],
      },
    ],
  },
  contact: {
    id: 'contact',
    group: 'collision',
    // ⭐⭐ Lote 5 do Raio-X (G5): DUAS pistas com as duas regras ao mesmo tempo. Antes a criança trocava
    // a pergunta numa Escolha, a vida zerava, e o "3 perdidas" sumia no instante de comparar com o "1".
    title: 'Encostando, ou começou a encostar?',
    instruction: 'Encoste o cacto no Dino e espere. Depois afaste e encoste de novo.',
    manipulates: 'A distância dos cactos das duas pistas',
    success:
      '"Está encostando?" vale em todo quadro. "Começar a encostar" vale só no instante da batida!',
    extra: 'E se o cacto ficar encostado até acabarem os corações de cima?',
    goals: [
      {
        id: 'drain',
        label: '"Está encostando?" tirou um coração em todo quadro',
        pedido: 'Encoste o cacto no Dino e deixe o tempo passar.',
      },
      {
        id: 'once',
        label: '"Começar a encostar" tirou um coração só',
        pedido: 'Encoste o cacto no Dino, deixe o tempo passar e olhe a pista de baixo.',
      },
      {
        id: 'apart',
        label: 'Afastou, encostou de novo e perdeu mais um coração',
        // ⚠️⚠️ Termina no TEMPO (review do lote 2): a meta é conferida no passo do relógio.
        pedido:
          'Depois de encostar, afaste o cacto e deixe o tempo passar. Depois encoste de novo e deixe o tempo passar.',
      },
    ],
    hints: [
      'Encoste o cacto no Dino, deixe o tempo passar e olhe as duas pistas.',
      'Compare quantos corações saíram em cima e embaixo.',
      'Afaste o cacto, deixe o tempo passar e encoste de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption:
          'Encostado, a pista de cima perde um coração em todo quadro. A de baixo perdeu um só.',
        highlight: 'scene',
        actions: [
          { type: 'approach', distance: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'once',
      },
      {
        id: 'step-2',
        caption: 'Afastando e encostando de novo, a pista de baixo perde mais um.',
        highlight: 'scene',
        // ⚠️ 1 s encostado (consertos do review da onda B do lote 5): `apart` cai no terceiro quadro da
        // encostada nova, como `drain` e `once`, para as duas pistas estarem lado a lado quando cai.
        actions: [
          { type: 'approach', distance: 100 },
          { type: 'advance', seconds: 0.5 },
          { type: 'approach', distance: 0 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'apart',
      },
    ],
  },
  cooldown: {
    id: 'cooldown',
    group: 'events',
    // ⚠️ "O tiro que espera a vez" respondia a previsão.
    title: 'A arma e a recarga',
    // ⭐⭐ Lote 5 do Raio-X (G5): os tiros VOAM, e o aperto que não virou tiro pisca e some.
    instruction:
      'Aperte Atirar bem rápido, várias vezes. Depois ponha uma recarga e aperte rápido de novo.',
    manipulates: 'O tiro e o tempo de recarga entre dois tiros',
    success: 'O relógio também serve para ESPERAR: durante a recarga, apertar não faz nada!',
    extra: 'E se a recarga for de 2 segundos inteiros?',
    goals: [
      {
        id: 'burst',
        // ⚠️⚠️ Lote 5: cai no TERCEIRO tiro sem recarga dentro de 1 s, e não quando o relógio anda.
        label: 'Sem recarga, os tiros saíram colados',
        pedido: 'Tire a recarga e aperte Atirar três vezes bem rápido.',
      },
      // ⚠️ `waiting` antes de `spaced` (review do lote 2): é a meta que responde a previsão.
      {
        id: 'waiting',
        label: 'Apertar durante a recarga não fez tiro nenhum',
        pedido: 'Ponha uma recarga e aperte Atirar duas vezes bem rápido.',
      },
      {
        id: 'spaced',
        label: 'Com recarga, apareceu um vão entre os tiros',
        // ⚠️⚠️ "até aparecer Pronto para atirar" (review do lote 2): a frase embaixo do palco é o sinal
        // que a criança consegue esperar.
        pedido:
          'Ponha uma recarga e aperte Atirar. Deixe o tempo passar até aparecer Pronto para atirar e aperte Atirar de novo.',
      },
    ],
    hints: [
      'Aperte Atirar várias vezes seguidas e olhe os tiros voando.',
      // ⚠️ A pista 2 era a explicação ("o pedido não vira tiro"), e pode ser lida antes do palpite.
      'Ponha uma recarga e aperte Atirar várias vezes. Olhe quantos tiros saem.',
      'Ponha a recarga em 1 segundo e aperte Atirar duas vezes seguidas.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Sem recarga, cada aperto vira um tiro, e os tiros saem colados.',
        highlight: 'scene',
        actions: [
          { type: 'shoot' },
          { type: 'shoot' },
          { type: 'shoot' },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'burst',
      },
      {
        id: 'step-2',
        caption: 'Com a recarga, o segundo aperto não vira tiro.',
        highlight: 'tools',
        // ⚠️ Meio segundo, e não a recarga inteira: a etapa termina ESPERANDO, com a barra no meio.
        actions: [
          { type: 'recharge', seconds: 1 },
          { type: 'shoot' },
          { type: 'shoot' },
          { type: 'advance', seconds: 0.5 },
        ],
        waitFor: 'waiting',
      },
    ],
  },
  aim: {
    id: 'aim',
    group: 'motion',
    title: 'A seta que aponta',
    // ⭐⭐ Lote 5 do Raio-X (G5): o GESTO "Atirar", e o tiro que voa pela seta ou reto.
    instruction: 'Mude o alvo de lugar e atire. Depois ligue a mira e atire de novo.',
    manipulates: 'O lugar do alvo, a mira e o tiro',
    success: 'Apontar é achar a seta do Dino até o alvo. Com a mira, o tiro vai por ela!',
    extra: 'E se o alvo ficar atrás do Dino?',
    goals: [
      {
        id: 'arrow',
        label: 'A seta virou quando o alvo mudou de lugar',
        pedido: 'Mude o alvo de lugar e olhe a seta.',
      },
      {
        id: 'straight-miss',
        label: 'Sem a mira, o tiro foi reto e errou',
        // ⚠️ "acima ou abaixo do Dino": com o alvo na frente, reto e pela seta são o mesmo caminho.
        pedido:
          'Com a mira desligada e o alvo acima ou abaixo do Dino, aperte Atirar e olhe o tiro voar.',
      },
      {
        id: 'follows',
        // ⚠️⚠️ Lote 5: cai no ACERTO de um tiro que saiu com a mira ligada.
        label: 'Com a mira, o tiro foi pela seta e acertou',
        // ⚠️ "Olhe o tiro voar": Atirar solta o tempo, e a meta cai quando o tiro CHEGA no alvo.
        pedido: 'Ligue a mira, aperte Atirar e olhe o tiro voar.',
      },
    ],
    hints: [
      'Mude o alvo de lugar e olhe para onde a seta aponta.',
      // ⚠️ A pista 2 era a resposta da previsão.
      'Atire com a mira desligada, e depois com a mira ligada. Compare o caminho do tiro.',
      'Ligue a mira e aperte Atirar.',
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
        caption: 'Sem a mira, o tiro vai reto e passa longe do alvo.',
        highlight: 'scene',
        actions: [{ type: 'shoot' }, { type: 'advance', seconds: 1 }],
        waitFor: 'straight-miss',
      },
      {
        id: 'step-3',
        caption: 'Com a mira ligada, o tiro vai pela seta e acerta.',
        highlight: 'scene',
        actions: [
          { type: 'connect', port: 'aim', enabled: true },
          { type: 'shoot' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'follows',
      },
    ],
  },
  diagonal: {
    id: 'diagonal',
    group: 'motion',
    // ⭐⭐ Lote 5 do Raio-X (G5): o Dino, o rastro e o círculo de referência. "Andar 1 segundo" é o
    // gesto (sem relógio): o caminho não depende mais de qual botão do tempo foi apertado.
    title: 'Duas setas ao mesmo tempo',
    instruction:
      'Ande 1 segundo só para a direita. Depois ande 1 segundo com direita e baixo juntas.',
    manipulates: 'As setas apertadas, andar 1 segundo e a correção da diagonal',
    success:
      'Na diagonal o Dino anda para o lado E para baixo, e o caminho fica mais comprido. A correção deixa igual ao reto!',
    extra: 'E se a correção ficar ligada andando reto?',
    goals: [
      {
        id: 'straight',
        label: 'Andando reto, o Dino parou no círculo',
        pedido: 'Aperte uma seta só e aperte Andar 1 segundo.',
      },
      {
        id: 'faster',
        // ⚠️⚠️ Lote 5: só cai com o fantasma de uma andada RETA no palco, para comparar.
        label: 'Na diagonal, o Dino passou do círculo',
        pedido:
          'Ande 1 segundo com uma seta só. Depois aperte duas setas juntas e ande 1 segundo de novo.',
      },
      {
        id: 'same',
        label: 'Com a correção, a diagonal parou no círculo',
        pedido: 'Ligue a correção da diagonal, aperte duas setas juntas e ande 1 segundo.',
      },
    ],
    hints: [
      'Aperte só a seta para a direita e ande 1 segundo. Olhe onde o Dino para.',
      'Agora aperte a seta para a direita e a seta para baixo. O Dino para em cima do círculo?',
      'Ligue a correção e ande de novo na diagonal.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Uma seta só: em 1 segundo o Dino chega em cima do círculo.',
        highlight: 'scene',
        actions: [{ type: 'direction', x: 1, y: 0 }, { type: 'stride' }],
      },
      {
        id: 'step-2',
        caption: 'Duas setas juntas: no mesmo segundo, o Dino passa do círculo.',
        highlight: 'scene',
        actions: [{ type: 'direction', x: 1, y: 1 }, { type: 'stride' }],
      },
      {
        id: 'step-3',
        caption: 'Com a correção, a diagonal para em cima do círculo.',
        highlight: 'tools',
        actions: [{ type: 'connect', port: 'even', enabled: true }, { type: 'stride' }],
      },
    ],
  },
  tilemap: {
    id: 'tilemap',
    group: 'world',
    title: 'O mapa escrito com letras',
    // ⭐⭐ Lote 5 do Raio-X (G5): as letras do TEXTO do palco são tocáveis, com uma paleta de três letras,
    // e o Dino cai até o primeiro bloco da coluna dele.
    instruction:
      'Escolha uma letra e toque numa casa do texto. Depois escreva ooo numa linha do meio.',
    manipulates: 'A letra escolhida e as casas do texto do mapa',
    // ⚠️ "O mapa é um dado": para quem tem 9 anos, "dado" é o de jogar.
    success: 'O mapa é um texto que o jogo lê: cada letra vira sempre a mesma peça!',
    extra: 'E se você apagar o chão embaixo do Dino?',
    goals: [
      {
        id: 'text-is-map',
        label: 'Trocou uma letra e o desenho mudou',
        pedido: 'Escolha uma letra e toque numa casa do texto que tem outra letra.',
      },
      {
        id: 'coin-row',
        label: 'Três o seguidos numa linha do meio viraram três moedas no ar',
        pedido: 'Escolha a letra o e escreva três o seguidos numa linha do meio.',
      },
      {
        id: 'same-letter',
        // ⚠️⚠️ Lote 5: a mesma PEÇA (# ou o) em duas LINHAS. Caía apagando duas casas com ".".
        label: 'Escreveu a mesma peça em duas linhas, e as duas ficaram iguais',
        pedido: 'Escreva numa outra linha uma peça que você já escreveu.',
      },
    ],
    hints: [
      'Escolha a letra # e toque numa casa vazia do texto.',
      'Cada linha do texto é uma linha do desenho. Olhe a mesma casa nos dois.',
      'Escolha a letra o e toque em três casas seguidas da linha 3.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Uma letra trocada, uma peça nova no desenho.',
        highlight: 'scene',
        actions: [{ type: 'paint-tile', row: 3, col: 4, tile: '#' }],
      },
      {
        id: 'step-2',
        caption: 'Três o seguidos viram três moedas no ar.',
        highlight: 'scene',
        actions: [
          { type: 'paint-tile', row: 2, col: 3, tile: 'o' },
          { type: 'paint-tile', row: 2, col: 4, tile: 'o' },
          { type: 'paint-tile', row: 2, col: 5, tile: 'o' },
        ],
      },
      {
        id: 'step-3',
        caption: 'A mesma letra em outra linha vira a mesma peça.',
        highlight: 'scene',
        actions: [{ type: 'paint-tile', row: 1, col: 7, tile: 'o' }],
      },
    ],
  },
  /* ── O motor, o 3D e o ateliê (15/09/2026) ─────────────────────────────────────────────── */
  pool: {
    id: 'pool',
    group: 'population',
    // ⚠️ "O contador que só sobe" respondia a previsão ("quantos o jogo fabricou?").
    title: 'Quantos cactos o jogo já fabricou?',
    // ⭐ Lote 5 do Raio-X: o número PINTADO em cada cacto é o que se compara (nº 4, nº 5, nº 6 contra
    // nº 3, nº 3, nº 3). A chave tem o nome do gesto, e não "o fio": não há fio nenhum na bancada.
    instruction:
      'Aperte ▶ e olhe o número pintado em cada cacto. Depois ligue Reciclar quem saiu e olhe de novo.',
    manipulates: 'O tempo e a chave Reciclar quem saiu',
    success: 'Reciclando, o jogo usa de novo o cacto que saiu. O número de fabricados parou!',
    extra: 'E se você desligar a reciclagem depois de um tempo?',
    goals: [
      {
        id: 'grows',
        label: 'A cada vez, um cacto novo: o número só subiu',
        pedido: 'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3.',
      },
      {
        id: 'recycled',
        label: 'O mesmo cacto saiu e entrou de novo',
        // ⚠️ Até o cacto da tela SAIR: é na saída que ele volta (o motor só dá a meta a um cacto que
        // já estava na tela, e não ao primeiro que entra).
        pedido:
          'Ligue Reciclar quem saiu e deixe o tempo passar até o cacto da tela chegar na saída.',
      },
      {
        id: 'steady',
        label: 'O número de fabricados parou',
        // ⚠️⚠️ "até fabricados chegar a 3" (review do lote 2): com "algumas vezes" a meta anterior
        // (`grows`) não caía, e mais tempo com a reciclagem ligada nunca a derrubava.
        // ⚠️ "Por 4 segundos", e não "mais um pouco" (review do lote 4).
        pedido:
          'Com Reciclar quem saiu desligado, deixe o tempo passar até fabricados chegar a 3. Depois ligue Reciclar quem saiu e deixe o tempo passar por 4 segundos.',
      },
    ],
    hints: [
      'São dois números: quantos estão na tela agora e quantos o jogo já fabricou.',
      // ⚠️ A pista 2 respondia a previsão, e pode ser lida antes do palpite.
      'Aperte ▶ e olhe o número pintado em cada cacto que entra.',
      'Deixe o tempo passar até fabricados chegar a 3. Depois ligue Reciclar quem saiu e olhe o número pintado no cacto.',
    ],
    script: [
      {
        id: 'step-1',
        // ⚠️ "entra um cacto novo", e não "cada cacto que entra é novo": o elenco flexiona o que está
        // colado ao nome, e "é novo" longe dele sairia "cada pedra que entra é novo".
        caption: 'Sem reciclagem, entra um cacto novo a cada vez.',
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
        caption: 'Com a reciclagem, o mesmo cacto volta e o número para.',
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
    // ⚠️ "Cada um com o seu cérebro" respondia a previsão. ⚠️ Lote 5 do Raio-X: são as TORRES do Jogo 3D
    // Avançado (parado, mirar, atirar, recarregar), com uma pose que se vê de longe para cada estado.
    title: 'O que cada torre está fazendo?',
    instruction:
      'Ponha a 1ª torre para mirar e aperte ▶. Olhe as três. Depois mude só a 2ª. No fim, mude onde o estado mora.',
    manipulates: 'O estado de cada torre, onde o estado mora e o tempo',
    success: 'Cada torre guarda o seu estado, e é o estado que decide o que a torre faz agora!',
    extra: 'E se as três ficarem no mesmo estado?',
    goals: [
      {
        id: 'own',
        label: 'As três ficaram em estados diferentes',
        pedido: 'Com o estado morando em cada uma, ponha as três torres em estados diferentes.',
      },
      {
        id: 'acts',
        label: 'Com o relógio andando, cada torre fez o que o seu estado manda',
        pedido: 'Com pelo menos duas torres em estados diferentes, deixe o tempo passar.',
      },
      {
        id: 'independent',
        label: 'Mudou uma torre e as outras não mudaram',
        // ⚠️ DEPOIS do tempo passar: é quando o motor passa a contar a independência (antes dele
        // ninguém fez nada, e a meta caía no meio da montagem da primeira).
        pedido:
          'Com o estado morando em cada uma e duas torres em estados diferentes, deixe o tempo passar. Depois mude o estado de uma só.',
      },
      {
        // ⭐ Lote 5 do Raio-X: a crença errada ("o estado é do jogo"), testada de verdade.
        id: 'shared',
        label: 'Com o estado no jogo, as três mudaram juntas',
        pedido: 'Mude onde o estado mora para no jogo e troque o estado de uma torre.',
      },
    ],
    hints: [
      // ⚠️ Sem "As três torres começam paradas" (consertos do review da onda B do lote 5): a pista 1
      // vem colada na situação, e saía "A 1ª torre está atirando, a 2ª atirando… As três torres
      // começam paradas."
      'Escolha um estado para a 1ª torre e aperte ▶.',
      // ⚠️ A pista 2 era a explicação da cena, e pode ser lida antes do palpite.
      'Mude o estado de uma só e deixe o tempo passar. Olhe o que as outras duas fizeram.',
      'Deixe a 1ª mirando e a 2ª atirando, e deixe o tempo passar.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Cada torre num estado: o relógio mostra o que cada uma faz.',
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
        caption: 'Mudar uma torre não mexe nas outras duas.',
        highlight: 'tools',
        actions: [
          { type: 'brain', id: 3, state: 'recarregar' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'independent',
      },
      {
        id: 'step-3',
        caption: 'Com o estado no jogo, mudar uma torre muda as três.',
        highlight: 'tools',
        actions: [
          { type: 'brain-scope', shared: true },
          { type: 'brain', id: 1, state: 'atirar' },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'shared',
      },
    ],
  },
  'delta-time': {
    id: 'delta-time',
    group: 'motion',
    title: 'O mesmo jogo em dois computadores',
    // ⭐ Lote 5 do Raio-X: a corrida ACABA na chegada, e cada quadro desenhado deixa uma pegada.
    instruction:
      'Aperte ▶ e veja a corrida. Depois troque para "a cada segundo" e aperte ▶ de novo.',
    manipulates: 'Como o Dino anda (a cada quadro ou a cada segundo) e o tempo',
    success: 'Andando a cada segundo, o jogo fica igual em qualquer computador!',
    // ⚠️ "marcas", e não "pegadas" (consertos do review da onda B do lote 5): com o elenco de nave, a
    // pista e o "E se" falavam em pegadas de uma nave.
    extra: 'Andando a cada segundo, quem deixou mais marcas até a chegada?',
    goals: [
      {
        id: 'apart',
        label: 'A cada quadro, os dois computadores se separaram',
        // ⚠️ Quanto tempo (review do lote 2): "algumas vezes" com quatro passos não separava os dois.
        pedido: 'Com o Dino andando a cada quadro, deixe o tempo passar por dois segundos.',
      },
      {
        id: 'together',
        label: 'A cada segundo, os dois chegaram juntos',
        // ⚠️ Até a CHEGADA (lote 5): a meta diz "chegaram", e a corrida acaba lá.
        pedido:
          'Depois de ver os dois se separarem, troque para "a cada segundo" e deixe o tempo passar até a chegada.',
      },
    ],
    hints: [
      'São dois computadores com o mesmo jogo: um rápido e um devagar.',
      // ⚠️ A pista 2 era a resposta da previsão, e pode ser lida antes do palpite.
      'Aperte ▶ e compare as marcas de cada computador.',
      'Aperte ▶ com "a cada quadro". Depois troque e aperte ▶ de novo.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Andando a cada quadro, o rápido dispara na frente.',
        highlight: 'scene',
        actions: [
          { type: 'advance', seconds: 1 },
          { type: 'advance', seconds: 1 },
        ],
        waitFor: 'apart',
      },
      {
        id: 'step-2',
        caption: 'Andando a cada segundo, os dois chegam juntos.',
        highlight: 'tools',
        actions: [
          { type: 'count', kind: 'seconds' },
          { type: 'advance', seconds: 1 },
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
    // ⚠️ "A conta que decide a batida" respondia a previsão (lote 5 do Raio-X).
    title: 'Quando dois círculos batem?',
    // ⚠️⚠️ "espere", e não "até os dois baterem e pare" (consertos do review da onda B do lote 5): o
    // pedido exigia reflexo, e quem demorava via a distância chegar a 0 com os dois fundidos num disco.
    // Hoje o relógio só aproxima ATÉ a batida (`engine.ts`) e o player para o ▶ ali.
    instruction:
      'Aperte ▶ e espere os dois baterem. Olhe a fila dos raios. Depois diminua um raio sem mexer na distância.',
    manipulates: 'A distância entre os centros, os dois raios e o relógio que aproxima',
    success: 'Distância contra a soma dos raios: é essa conta que o jogo faz!',
    extra: 'E se os dois raios ficarem bem grandes?',
    goals: [
      {
        id: 'touch',
        // ⚠️ "igual ou menor" (lote 5): a meta cai com a distância IGUAL à soma (60 contra 60), e
        // "menor" prometia o que a tela não mostrava.
        label: 'A distância ficou igual ou menor que a soma dos raios',
        pedido:
          'Aproxime os dois círculos: deixe o tempo passar ou diminua a distância entre os centros.',
      },
      {
        id: 'formula',
        // ⚠️ O gesto é sem relógio: mudar o raio troca o resultado NO MESMO LUGAR, e não "o instante".
        label: 'Com os círculos parados, mudar um raio trocou o resultado',
        // ⚠️⚠️ "só encostando" (review do lote 2): com os círculos já sobrepostos, diminuir um raio sem
        // mexer na distância não desfaz a batida, e o pedido proibia a saída.
        pedido: 'Com os dois só encostando, diminua um dos raios sem mexer na distância.',
      },
    ],
    hints: [
      // ⭐ Lote 5: a fila dos raios deitados embaixo da linha da distância é o desenho da conta.
      'Olhe a fila dos dois raios, embaixo da linha da distância.',
      // ⚠️ A pista 2 era a frase que saiu do rodapé por ser FALSA neste palco, e pode ser lida antes
      // do palpite.
      'Aperte ▶ e espere aparecer "bateu". Olhe onde a fila dos raios termina.',
      'Deixe os dois só encostarem e então diminua um raio, sem mexer na distância.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'A distância diminui até a fila dos raios alcançar o outro centro.',
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
    // ⚠️⚠️ Lote 5 do Raio-X: o z primeiro, e depois o y. A sombra passou a pedir o cubo NO AR andando
    // pelo x ou pelo z, então o y já não fecha duas metas juntas (o motivo da ordem do review do lote 2).
    instruction: 'Mexa só no z e olhe a sombra. Depois aumente só o y, e mexa no z de novo.',
    manipulates: 'Os três eixos do espaço, um de cada vez',
    success: 'O z é a frente e o fundo. E no 3D, y maior é mais ALTO!',
    extra: 'E se o cubo voltar para o chão bem no fundo?',
    // ⚠️ `up` antes de `depth`: é a meta que responde a previsão, na ordem do "Conferir".
    goals: [
      { id: 'up', label: 'No 3D, o y maior é mais ALTO', pedido: 'Aumente só o y.' },
      { id: 'depth', label: 'O z leva para a frente e para o fundo', pedido: 'Mexa só no z.' },
      {
        id: 'shadow',
        label: 'No ar, a sombra andou pelo chão junto com o cubo',
        pedido: 'Levante o cubo com o y. Depois, com o cubo no ar, mexa só no x ou só no z.',
      },
    ],
    hints: [
      'Agora são três números. Mexa só no z e olhe o cubo e a sombra.',
      // ⚠️ A pista 2 era a resposta da previsão ("aqui ele cresce para cima").
      'No jogo 2D, aumentar o y descia. Veja o que acontece aqui.',
      'Aumente só o y. Depois, com o cubo no ar, mexa só no x.',
    ],
    script: [
      {
        id: 'step-1',
        // ⚠️⚠️ Decisão da dona (lote 5): z NEGATIVO é o fundo, como o kit Desvie e os blocos genéricos
        // do Jogo 3D (o inimigo nasce em z −20 e vem para a câmera) e o three.js.
        caption: 'O z negativo leva o cubo para o fundo: o cubo fica menor, e a sombra vai junto.',
        highlight: 'scene',
        actions: [{ type: 'place3d', x: 0, y: 0, z: -80 }],
      },
      {
        id: 'step-2',
        caption: 'O y levanta: aqui, mais y é mais alto.',
        highlight: 'scene',
        actions: [{ type: 'place3d', x: 0, y: 70, z: -80 }],
      },
      {
        id: 'step-3',
        caption: 'No ar, a sombra anda pelo chão junto com o cubo.',
        highlight: 'scene',
        actions: [{ type: 'place3d', x: 60, y: 70, z: -80 }],
      },
    ],
  },
  'camera-3d': {
    id: 'camera-3d',
    group: 'stage',
    // ⚠️⚠️ O título e a instrução diziam "até ver uma cor só" logo acima de "de frente, quantas cores
    // você vê?" (review do lote 2).
    title: 'Gire a câmera e conte as cores',
    instruction:
      'Mova a câmera em volta do cubo e conte as cores em cada lugar. Ache o lugar com menos cores, um com exatamente duas e um com três.',
    manipulates: 'A volta e a altura de onde a câmera olha',
    success: 'O cubo não mudou: o que você vê depende de onde a câmera está!',
    extra: 'E se a câmera ficar bem por baixo?',
    goals: [
      {
        id: 'one-face',
        label: 'Girou até ver uma cor só',
        pedido: 'Mova a câmera até ver uma cor só.',
      },
      {
        id: 'two-faces',
        label: 'Girou até ver exatamente duas cores',
        // ⚠️ "outro lugar": a cena ABRE mostrando duas cores, e o pedido parecia já cumprido.
        pedido: 'Leve a câmera para outro lugar com exatamente duas cores.',
      },
      {
        // ⭐ Lote 5 do Raio-X: no lugar de "voltou à vista de sempre", que era apertar um atalho.
        id: 'three-faces',
        label: 'Achou um lugar com três cores',
        pedido: 'Leve a câmera para um canto e mude a altura.',
      },
      {
        // ⚠️ Só num caso (lote 5): o botão continua na bancada como atalho, sem meta de fábrica.
        id: 'back',
        // ⚠️ "onde a câmera começou", e não "a vista de sempre" (consertos do review da onda B do lote 5):
        // a criança não conhece o canto do começo como "de sempre".
        label: 'Voltou para onde a câmera começou com um toque',
        soNoCaso: true,
        // ⚠️ "longe de onde começou": quem volta à mão para a volta 2 já está lá.
        pedido: 'Com a câmera longe de onde começou, aperte Voltar para onde a câmera começou.',
      },
    ],
    hints: [
      // ⭐ Lote 5: lados opostos têm a mesma cor, então contar as cores é contar os lados.
      'Lados opostos têm a mesma cor. Mova devagar e conte as cores.',
      // ⚠️ A pista 2 era a resposta da previsão, e pode ser lida antes do palpite.
      'Mude a volta de 1 em 1 e conte as cores em cada lugar. Depois mude a altura.',
      // ⚠️ A pista literal antiga ("baixe a altura e gire meia volta") levava a TRÊS cores. ⚠️ A volta
      // se conta de 1 a 8 desde o lote 5: a volta 1 é bem de frente.
      'Deixe a altura no meio e ponha a volta em 1.',
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
        caption: 'Do canto, duas. Do canto e por cima, três.',
        highlight: 'scene',
        actions: [
          { type: 'orbit', yaw: 1, pitch: 1 },
          { type: 'orbit', yaw: 1, pitch: 2 },
        ],
      },
      {
        id: 'step-3',
        caption: 'Um toque leva a câmera de volta para onde ela começou.',
        highlight: 'tools',
        actions: [{ type: 'recenter' }],
      },
    ],
  },
  mesh: {
    id: 'mesh',
    group: 'art',
    // ⚠️ "Por baixo da roupa" (lote 5 do Raio-X): o Molda diz PELE ("pinte a pele direto no modelo").
    title: 'O que tem embaixo da pele?',
    // ⚠️⚠️ "A pele" (inteira, transparente, sem pele) no lugar de "Ver os pontos" (nada, metade, tudo)
    // (consertos do review da onda B do lote 5): o nome do controle e a instrução "Ponha Ver os pontos
    // na metade" respondiam a previsão ("do que um modelo 3D é feito?") antes do palpite. Os ids da ação
    // (`nada`, `metade`, `tudo`) não mudaram.
    instruction:
      'Deixe a pele transparente e olhe o que aparece embaixo. Depois volte a pele inteira e gire o modelo.',
    manipulates: 'A pele (inteira, transparente ou sem pele) e a volta do modelo',
    success: 'A forma é feita de pontos ligados. A cor é uma pele pintada por cima!',
    extra: 'E se você girar com os pontos à vista?',
    goals: [
      {
        id: 'points',
        label: 'Viu os pontos e as linhas que formam o modelo',
        pedido: 'Deixe a pele transparente.',
      },
      {
        id: 'skin',
        label: 'Viu a pele por cima dos mesmos pontos',
        // ⚠️ Dois gestos (lote 5): a pele POR CIMA é uma comparação com os pontos já vistos.
        pedido: 'Depois de deixar a pele transparente, volte a pele inteira e olhe o modelo.',
      },
    ],
    hints: [
      'O modelo parece liso. Deixe a pele transparente.',
      // ⚠️ A pista 2 era o rodapé que saiu por responder a previsão.
      'Compare o modelo com a pele inteira e com a pele transparente.',
      'Deixe a pele transparente, olhe, e volte a pele inteira.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Com a pele transparente, aparecem os pontos e as linhas.',
        highlight: 'scene',
        actions: [{ type: 'see-points', level: 'metade' }],
      },
      {
        id: 'step-2',
        caption: 'Com a pele inteira de novo, os pontos continuam embaixo.',
        highlight: 'scene',
        actions: [{ type: 'see-points', level: 'nada' }],
      },
      {
        id: 'step-3',
        caption: 'Sem a pele, girar o modelo gira os pontos junto.',
        highlight: 'tools',
        actions: [
          { type: 'see-points', level: 'tudo' },
          { type: 'orbit', yaw: 3, pitch: 1 },
        ],
      },
    ],
  },
  'pick-ray': {
    id: 'pick-ray',
    group: 'collision',
    // ⚠️ "A mira que para na primeira" respondia a previsão ("qual acende?").
    title: 'Qual caixa a mira acende?',
    // ⭐ Lote 5 do Raio-X: duas vistas da MESMA cena, a do jogador e a de lado.
    // ⚠️ Onde uma cobre a outra PRIMEIRO (lote 5): é a meta que responde a previsão, e a caixa sozinha
    // vem depois (a ordem do "Conferir" é a das metas, e o palpite volta antes da conclusão).
    instruction:
      'Mire onde uma caixa cobre a outra e olhe a vista de lado. Depois mire na caixa sozinha.',
    manipulates: 'Para onde a mira aponta',
    success: 'A mira é uma reta que sai do seu olho e para na primeira coisa!',
    extra: 'E se você mirar no vazio?',
    goals: [
      {
        id: 'first',
        label: 'Com duas no caminho, acendeu a mais perto',
        pedido: 'Aponte a mira onde uma caixa cobre a outra.',
      },
      {
        id: 'face',
        label: 'A caixa mirada acendeu',
        // ⚠️ SOZINHA (lote 5): onde uma cobre a outra a meta é a outra, e as duas não caem juntas.
        pedido: 'Aponte a mira para a caixa sozinha.',
      },
    ],
    hints: [
      'Aponte para uma caixa e veja qual delas acende.',
      // ⚠️ As pistas 2 e 3 eram a resposta da previsão, e podem ser lidas antes do palpite.
      'Use o botão Mirar onde uma cobre a outra e olhe a vista de lado.',
      'Aperte Mirar onde uma cobre a outra.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Mirar numa caixa acende a caixa.',
        highlight: 'scene',
        actions: [{ type: 'point', x: 100, y: 125 }],
      },
      {
        id: 'step-2',
        // A faixa em que a caixa B cobre a A — é a única parte da tela com duas no caminho.
        caption: 'Onde uma cobre a outra, a reta para na mais perto.',
        highlight: 'scene',
        actions: [{ type: 'point', x: 330, y: 155 }],
      },
    ],
  },
  'fill-stroke': {
    id: 'fill-stroke',
    group: 'art',
    title: 'A cor de dentro e a linha de fora',
    // ⚠️⚠️ Lote 5: Preenchimento, Contorno e Sem cor, os nomes do Pinta. A cena dizia "miolo" e
    // "contorno à vista", e a pedra era um pentágono sobre um fundo liso (Sem cor parecia branco).
    instruction:
      'Deixe o contorno em Sem cor e olhe a pedra. Depois deixe o preenchimento em Sem cor e olhe de novo.',
    manipulates: 'O preenchimento e o contorno da pedra',
    success:
      'Preenchimento e contorno são duas partes com cor própria. Cada uma pode ficar em Sem cor!',
    extra: 'E se as duas partes ficarem em Sem cor ao mesmo tempo?',
    goals: [
      {
        id: 'only-fill',
        label: 'Deixou o contorno em Sem cor',
        // ⚠️ Sem "e o preenchimento pintado": eram as palavras da resposta certa ("Sobra o preenchimento").
        pedido: 'Deixe só o contorno em Sem cor.',
      },
      {
        id: 'only-stroke',
        label: 'Deixou o preenchimento em Sem cor',
        pedido: 'Deixe só o preenchimento em Sem cor.',
      },
      {
        id: 'both',
        label: 'Voltou as duas partes com cor',
        pedido: 'Depois de deixar uma parte em Sem cor, volte as duas com cor.',
      },
    ],
    hints: [
      'A pedra tem duas partes: o preenchimento, por dentro, e o contorno, na borda.',
      // ⚠️ A pista 2 era a explicação da cena.
      'Deixe uma parte de cada vez em Sem cor e olhe o que sobra.',
      // ⚠️ Até a volta das duas cores (consertos do review da onda B do lote 5): a escada nunca falava
      // da última meta, `both`.
      'Deixe o contorno em Sem cor, depois o preenchimento, e no fim volte as duas com cor.',
    ],
    script: [
      {
        id: 'step-1',
        caption: 'Contorno em Sem cor: sobra o preenchimento.',
        highlight: 'scene',
        actions: [{ type: 'ink', part: 'stroke', on: false }],
      },
      {
        id: 'step-2',
        // ⚠️⚠️ O contorno VOLTA antes de o preenchimento sair (lote 5): na ordem de antes a pedra
        // sumia inteira por um instante, com a legenda dizendo que sobrava a linha. ⚠️ E a volta tem
        // PARTE própria (consertos do review da onda B do lote 5, B11): dentro da parte seguinte, por
        // meio segundo a legenda 1 ("sobra o preenchimento") ficava sobre a pedra com as duas cores.
        caption: 'O contorno voltou.',
        highlight: 'scene',
        actions: [{ type: 'ink', part: 'stroke', on: true }],
      },
      {
        id: 'step-3',
        caption: 'Preenchimento em Sem cor: dá para ver o fundo por dentro. Sobra a linha.',
        highlight: 'scene',
        actions: [{ type: 'ink', part: 'fill', on: false }],
      },
      {
        id: 'step-4',
        caption: 'As duas com cor: preenchimento e contorno juntos.',
        highlight: 'scene',
        actions: [{ type: 'ink', part: 'fill', on: true }],
      },
    ],
  },
  shading: {
    id: 'shading',
    group: 'art',
    title: 'A luz dá volume',
    // ⚠️⚠️ Lote 5: três tons da família do azul em pixels (o tom da bola, um mais escuro e um mais
    // claro). A "sombra da mesma cor" era um crescente verde-oliva sobre a bola azul.
    instruction:
      'Ligue a sombra e a luz e olhe a bola. Desligue para comparar, e depois mude o sol de lado.',
    manipulates: 'Os tons de sombra e de luz e o lado do sol',
    success: 'Um azul mais escuro longe do sol e um mais claro perto dele deixam a bola redonda!',
    extra: 'E se você mudar o sol de lado com a sombra e a luz desligadas?',
    goals: [
      {
        id: 'flat',
        label: 'Tirou os tons e viu a bola chapada de novo',
        pedido: 'Ligue a sombra e a luz e depois desligue.',
      },
      {
        id: 'volume',
        label: 'Ligou os tons e viu a bola redonda',
        pedido: 'Ligue a sombra e a luz.',
      },
      {
        id: 'side',
        label: 'Mudou o sol de lado e viu a sombra trocar de lado',
        pedido: 'Com a sombra e a luz ligadas, mude o sol de lado.',
      },
    ],
    hints: [
      'A bola está pintada com um tom só. Ligue a sombra e a luz e compare.',
      // ⚠️ A pista 2 era a resposta do "Agora explique".
      'Com a sombra e a luz ligadas, mude o sol de lado. Olhe onde fica o azul mais escuro.',
      'Com a sombra e a luz ligadas, leve o sol para o outro lado.',
    ],
    script: [
      // ⚠️ A cena ABRE chapada, então o primeiro passo é LIGAR os tons: começar desligando
      // seria um passo que não muda um pixel, narrado como se mudasse.
      {
        id: 'step-1',
        caption:
          'Um azul mais escuro longe do sol e um mais claro perto dele: a bola ficou redonda.',
        highlight: 'scene',
        actions: [{ type: 'shade', on: true }],
      },
      {
        id: 'step-2',
        // ⚠️ "Com um tom só" (consertos do review da onda B do lote 5, B14): "sem os dois tons" vinha
        // logo depois de "três tons de azul", embaixo do palco.
        caption: 'Com um tom só, a bola parece um adesivo.',
        highlight: 'scene',
        actions: [{ type: 'shade', on: false }],
      },
      {
        id: 'step-3',
        // ⚠️⚠️ O SOL muda de lado ANTES de os tons voltarem (lote 5): na ordem de antes a sombra
        // aparecia por um instante do lado errado, justo na parte que ensina o lado.
        caption: 'Mudou o sol de lado. Olhe onde ficou o azul mais escuro.',
        highlight: 'scene',
        actions: [
          { type: 'light', side: 'right' },
          { type: 'shade', on: true },
        ],
      },
    ],
  },
}

const PREVIA_INICIAL: ScenePredictionPreview = { initial: true, conceal: [] }

/**
 * Uma entrada por cena, mesmo quando a prévia é a inicial sem redaction. Assim, qualquer cena
 * nova precisa decidir conscientemente o que mostra antes do palpite.
 */
const SCENE_PREDICTION_PREVIEWS: Record<SceneId, ScenePredictionPreview> = {
  coordinates: PREVIA_INICIAL,
  'screen-reader': {
    initial: true,
    conceal: [],
    control: {
      label: 'Ouvir a tela',
      note: 'Você vai usar este botão depois do seu palpite.',
    },
  },
  'stage-size': PREVIA_INICIAL,
  'draw-loop': PREVIA_INICIAL,
  frames: PREVIA_INICIAL,
  'onion-skin': PREVIA_INICIAL,
  symmetry: PREVIA_INICIAL,
  'pixel-vector': PREVIA_INICIAL,
  'sheet-vs-sprite': PREVIA_INICIAL,
  world: PREVIA_INICIAL,
  layers: { initial: true, conceal: ['layers-order'] },
  gravity: PREVIA_INICIAL,
  impulse: PREVIA_INICIAL,
  'jump-sound': PREVIA_INICIAL,
  spawn: PREVIA_INICIAL,
  cleanup: PREVIA_INICIAL,
  'game-state': PREVIA_INICIAL,
  controls: PREVIA_INICIAL,
  restart: PREVIA_INICIAL,
  hitbox: PREVIA_INICIAL,
  score: PREVIA_INICIAL,
  lives: PREVIA_INICIAL,
  random: PREVIA_INICIAL,
  acceleration: PREVIA_INICIAL,
  velocity: PREVIA_INICIAL,
  'hold-vs-press': PREVIA_INICIAL,
  variable: PREVIA_INICIAL,
  'group-loop': PREVIA_INICIAL,
  'enemy-type': PREVIA_INICIAL,
  camera: PREVIA_INICIAL,
  contact: PREVIA_INICIAL,
  cooldown: PREVIA_INICIAL,
  aim: PREVIA_INICIAL,
  diagonal: PREVIA_INICIAL,
  tilemap: PREVIA_INICIAL,
  pool: PREVIA_INICIAL,
  'entity-state': PREVIA_INICIAL,
  'delta-time': PREVIA_INICIAL,
  'circle-collision': PREVIA_INICIAL,
  'axis-z': PREVIA_INICIAL,
  'camera-3d': { initial: true, conceal: ['camera-colors'] },
  mesh: PREVIA_INICIAL,
  'pick-ray': PREVIA_INICIAL,
  'fill-stroke': PREVIA_INICIAL,
  shading: PREVIA_INICIAL,
}

export const SCENE_MODELS: Record<SceneId, SceneModel> = Object.fromEntries(
  SCENE_IDS.map((scene) => [
    scene,
    { ...SCENE_MODEL_DEFINITIONS[scene], predictionPreview: SCENE_PREDICTION_PREVIEWS[scene] },
  ]),
) as Record<SceneId, SceneModel>

export function sceneModel(scene: SceneId): SceneModel {
  return SCENE_MODELS[scene]
}

/** Os ids de meta de uma cena — o `waitFor` de um roteiro precisa ser um deles. */
export function sceneGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.map((g) => g.id)
}

/**
 * As metas da missão de FÁBRICA: todas, menos as que só existem para um caso (`soNoCaso`).
 *
 * ⚠️ É o que uma experimentação SEM `setup.goals` cobra. `sceneGoalIds` continua sendo a lista
 * inteira, porque é contra ela que o caso do professor e o `waitFor` do roteiro são conferidos.
 */
export function sceneDefaultGoalIds(scene: SceneId): string[] {
  return SCENE_MODELS[scene].goals.filter((g) => !g.soNoCaso).map((g) => g.id)
}
