import type { OnceArea, OnceCardId, ScenePreset } from './presets'
import type { SceneCopyColor } from './state'

/**
 * O que a criança (ou o roteiro de uma demonstração) pode FAZER numa cena.
 *
 * Este arquivo é a única fonte de legalidade: o player, o validador de roteiro e o DTO do
 * servidor perguntam todos a `isSceneAction`. Antes existiam três cópias dessa regra —
 * uma no motor, uma no editor do admin e uma em TypeBox no members — e elas já divergiam
 * (o `interval` do servidor não tinha limite, o do editor ia de 0,5 a 2).
 */

/** As 45 cenas. Uma lista só: antes havia 13 "cenas" na v1 e 14 "missões" na v2/v3, com a
 *  v1 tratando salto como um conceito único e a v2 separando gravidade de impulso. As quatro
 *  primeiras nasceram em 14/09/2026 (a tela e quem a lê) e as cinco de desenho logo depois,
 *  para O Jogo do Meu Jeito, que não tinha UMA cena nativa. As onze últimas são o NÚCLEO do
 *  Iniciante 2D (15/09/2026): os degraus da escada que faltavam para os outros sete cursos. */
export const SCENE_IDS = [
  'coordinates',
  'screen-reader',
  'stage-size',
  'draw-loop',
  'frames',
  'onion-skin',
  'symmetry',
  'pixel-vector',
  'sheet-vs-sprite',
  'world',
  'layers',
  'gravity',
  'impulse',
  'jump-sound',
  'fixed-vs-read',
  'once-vs-always',
  'collision-pair',
  'invincibility',
  'number-line',
  'unique-names',
  'motion-amount',
  'two-clocks',
  'copy-vs-original',
  'published-copy',
  'same-rules-new-skin',
  'spawn',
  'cleanup',
  'game-state',
  'controls',
  'restart',
  'hitbox',
  'score',
  'lives',
  'random',
  'acceleration',
  // O núcleo do Iniciante 2D (15/09/2026): os degraus da escada que as 24 primeiras não cobriam.
  // Elas nasceram para o Corre Dino, que é o curso 1; estas servem os oito cursos do nível e
  // voltam nos níveis 2 e 3, vestidas com outro elenco.
  'velocity',
  'hold-vs-press',
  'variable',
  'group-loop',
  'enemy-type',
  'camera',
  'contact',
  'cooldown',
  'aim',
  'diagonal',
  'tilemap',
  // O MOTOR (níveis 2 e 3): o que aparece quando o jogo deixa de ser uma tela só de blocos.
  'pool',
  'entity-state',
  'delta-time',
  'circle-collision',
  // A porta do 3D (níveis 4 a 6) e as duas do ateliê.
  'axis-z',
  'camera-3d',
  'mesh',
  'pick-ray',
  'fill-stroke',
  'shading',
] as const
export type SceneId = (typeof SCENE_IDS)[number]

/** Agrupa as cenas na escolha do professor. Era `SimulationFamily`, no módulo da v1 — a
 *  única coisa que a v2/v3 realmente importava de lá. */
export const SCENE_GROUPS = [
  'stage',
  'art',
  'world',
  'motion',
  'events',
  'population',
  'collision',
  'speed',
] as const
export type SceneGroup = (typeof SCENE_GROUPS)[number]

/** Os fios que a criança liga na bancada. ⚠️ Vários nomes aqui se repetem como id de cena
 *  (`gravity`, `cleanup`, `restart`) e como tipo de ação (`restart`, `clock`). São eixos
 *  diferentes de propósito: a cena é o assunto, a porta é a ligação, a ação é o gesto. */
export const SCENE_PORTS = [
  'draw',
  'gravity',
  'sound',
  'timer',
  'cleanup',
  'condition',
  'touch',
  'restart',
  'limit',
  /** O fio que faz a batida custar uma vida. Só a cena `lives` o oferece. */
  'life',
  /** O laço que percorre o grupo antes de escolher um. Só `group-loop`. */
  'loop',
  /** A câmera que segue o herói. Só `camera`. */
  'camera',
  /** A mira que aponta para o alvo. Só `aim`. */
  'aim',
  /** A correção que deixa a diagonal do mesmo tamanho. Só `diagonal`. */
  'even',
  /** O nascedouro que reaproveita o corpo de quem morreu. Só `pool`. */
  'recycle',
  /**
   * Cada cacto COPIA a ficha ao nascer, em vez de lê-la sempre (lote 5 do Raio-X). Só `enemy-type`.
   * ⚠️ É uma porta, e não uma ação nova, pela mesma razão do laço e da mira: é uma regra que liga e
   * desliga, com o estado no rótulo da chave.
   */
  'copy',
] as const
export type ScenePort = (typeof SCENE_PORTS)[number]

export type SceneAction =
  | { type: 'place-in-area'; card: OnceCardId; area: OnceArea | 'outside' }
  | { type: 'trigger' }
  | { type: 'value-source'; source: 'fixed' | 'read' }
  | { type: 'box-marks'; on: boolean }
  | { type: 'clear-marks' }
  | { type: 'command-target'; subject: 'shot' | 'rock'; target: 'group' | 'alias' }
  | { type: 'shield'; frames: 0 | 15 | 45 | 90 }
  | { type: 'advance-to' }
  | { type: 'step-value'; value: number }
  | { type: 'sum-minus-one' }
  | { type: 'compare-op'; operator: '>' | '=' | '<' }
  | { type: 'toggle-block'; present: boolean }
  | { type: 'name-field'; name: '' | 'nave' | 'folha-nave' | 'nave2' }
  | { type: 'nudge'; piece: 'crater' | 'body'; amount: number }
  | { type: 'birth-every'; frames: 20 | 40 | 80 }
  | { type: 'export-file' | 'import-file' | 'publish' | 'open-mural' }
  | { type: 'recolor'; side: 'lesson' | 'studio' | 'project'; color: SceneCopyColor }
  | { type: 'skin'; theme: 'space' | 'road' | 'sea' }
  | { type: 'rule-toggle'; enabled: boolean }
  | { type: 'play-move'; direction: -1 | 1 }
  | { type: 'play-shoot' }
  | { type: 'create' }
  | { type: 'connect'; port: ScenePort; enabled: boolean }
  | { type: 'layer'; front: boolean }
  | { type: 'jump'; input: 'key' | 'tap' }
  | { type: 'impulse'; force: number }
  | { type: 'advance'; seconds: number }
  | { type: 'move'; distance: number }
  | { type: 'resize'; width: number }
  | { type: 'start'; input: 'key' | 'tap' }
  /** Onde a peça Somar ponto mora: relógio e região Se são escolhas independentes. */
  | { type: 'score-place'; clock: 'loose' | 'frame' | 'second'; guarded: boolean }
  | { type: 'collide' | 'home' | 'restart' | 'reset' }
  | { type: 'interval'; seconds: number }
  | { type: 'sample'; kind: 'position' | 'velocity'; unit: number; guided: boolean }
  | { type: 'hint'; level: number }
  /** O endereço do sprite na tela. Um eixo por vez é escolha da CRIANÇA, não do tipo. */
  | { type: 'place'; x: number; y: number }
  /** O texto que a descrição do jogo informa ao leitor de tela. */
  | { type: 'describe'; text: string }
  /** A criança pediu para ouvir o que o leitor de tela lê. */
  | { type: 'listen' }
  /** O tamanho da tela do jogo, em pixels. */
  | { type: 'stage'; width: number; height: number }
  /** A moldura que mostra onde a tela acaba. */
  | { type: 'border'; visible: boolean }
  /** Desenhar a cada quadro (o laço) e limpar antes de desenhar (a borracha). */
  | { type: 'loop'; on: boolean }
  | { type: 'erase'; on: boolean }
  /** Qual dos dois quadros está na tela. */
  | { type: 'frame'; index: number }
  /** Faz o quadro 2 mostrar o mesmo fogo do quadro 1, ou restaura a diferença. */
  | { type: 'same-frames'; on: boolean }
  /** A troca automática entre os quadros, e a velocidade dela. */
  | { type: 'play'; on: boolean }
  | { type: 'rate'; perSecond: number }
  /** O fantasma do quadro anterior, e onde o desenho do segundo quadro fica. */
  | { type: 'onion'; on: boolean }
  | { type: 'shift'; offset: number }
  /** A lupa: qual desenho ela está olhando, e de quão perto. */
  | { type: 'inspect'; kind: 'pixel' | 'vector'; zoom: number }
  /** Onde cortar a folha, e o tamanho que o recorte tem DENTRO do jogo. */
  | { type: 'cut'; cell: number }
  | { type: 'sprite'; size: number }
  /* ── O ateliê, redesenhado no lote 5 do Raio-X (16/09/2026) ──────────────────────────── */
  /** O espelho do Pinta, sempre no MEIO do desenho: desligado, lado a lado (`x`), de cima e de
   *  baixo (`y`) ou os DOIS (`xy`, consertos do review da onda B do lote 5: no Pinta são duas chaves
   *  independentes). ⚠️ O Pinta não tem eixo móvel: o espelho mora no meio do desenho, e a cena não
   *  pede à criança que procure um eixo que não existe. */
  | { type: 'mirror-mode'; mode: 'off' | 'x' | 'y' | 'xy' }
  /** Um traço pronto da nave na grade 16 × 16: a asa, a ponta ou a cabine. */
  | { type: 'trace'; piece: 'asa' | 'ponta' | 'cabine' }
  /** O Balde enche a asa esquerda; o espelho não copia preenchimentos. */
  | { type: 'fill' }
  /** Um quadradinho tocado direto na grade 16 × 16. */
  | { type: 'dot'; x: number; y: number }
  /** Apagar o papel, para refazer a comparação. */
  | { type: 'clear-paper' }
  /** A largura do recorte na folha de 64 × 32 da nave: 16, 32 ou 64 (a altura fica 32). */
  | { type: 'crop'; width: number }
  /* ── O núcleo do Iniciante 2D (15/09/2026) ───────────────────────────────────────────── */
  /** A velocidade do sprite: quanto ele anda em cada quadro, e para que lado. */
  | { type: 'velocity'; vx: number; vy: number }
  /** O gesto que dispara UMA vez, e o que vale ENQUANTO durar. */
  | { type: 'press' }
  | { type: 'hold'; on: boolean }
  /** A caixa que guarda um número: guardar, mudar e mostrar são três coisas. */
  | { type: 'store'; value: number }
  | { type: 'change'; by: number }
  | { type: 'show'; on: boolean }
  /** O laço sobre o grupo: olhar um por um antes de escolher. */
  | { type: 'look'; id: number }
  | { type: 'choose'; id: number }
  /** A ficha do tipo de inimigo, e o nascimento de mais um dela. */
  | { type: 'define'; field: 'speed' | 'life'; value: number }
  | { type: 'spawnOne' }
  /** Onde o herói está no mundo — que é maior que a tela. */
  | { type: 'walk'; x: number }
  /** Aproximar quem bate, e QUAL pergunta o jogo faz sobre o contato. */
  | { type: 'approach'; distance: number }
  /** O tiro e a recarga entre dois tiros. */
  | { type: 'shoot' }
  | { type: 'recharge'; seconds: number }
  /** Onde está o alvo da mira. */
  | { type: 'target'; x: number; y: number }
  /** Para que lado a criança empurra o personagem: −1, 0 ou 1 em cada eixo. */
  | { type: 'direction'; x: number; y: number }
  /**
   * Andar 1 segundo com as setas apertadas, a partir do começo (lote 5 do Raio-X). Só `diagonal`.
   * ⚠️ É o gesto que tomou o lugar do relógio nesta cena: "o passo deste quadro" dependia do botão
   * (3,39 no ▶, 84,85 no roteiro), e andar 1 segundo é sempre o mesmo caminho.
   */
  | { type: 'stride' }
  /** A letra de uma casa do mapa escrito em texto. */
  | { type: 'paint-tile'; row: number; col: number; tile: string }
  /* ── O motor, o 3D e o ateliê (15/09/2026) ───────────────────────────────────────────── */
  /** O cérebro de UM personagem: o estado em que ele está agora. */
  | { type: 'brain'; id: number; state: 'parado' | 'mirar' | 'atirar' | 'recarregar' }
  /** O que o jogo conta para medir o tempo: quadros ou segundos. */
  | { type: 'count'; kind: 'frames' | 'seconds' }
  /** O raio de um dos dois círculos da colisão escrita à mão. */
  | { type: 'radius'; which: 'a' | 'b'; value: number }
  /** O lugar de um objeto no espaço. ⚠️ Aqui o y cresce para CIMA. */
  | { type: 'place3d'; x: number; y: number; z: number }
  /** De onde a câmera olha: a volta e a altura. */
  | { type: 'orbit'; yaw: number; pitch: number }
  /** A câmera de volta à vista de sempre. */
  | { type: 'recenter' }
  /**
   * "Ver os pontos" do modelo, em TRÊS degraus (lote 5 do Raio-X): `nada` (só a pele), `metade` (a
   * pele transparente, com os pontos logo embaixo) e `tudo` (só a malha). Só `mesh`.
   */
  | { type: 'see-points'; level: MeshLevel }
  /**
   * Onde o estado das torres MORA (lote 5 do Raio-X): em cada uma (`shared: false`) ou um só para o
   * jogo inteiro (`shared: true`). É a crença errada que a criança testa. Só `entity-state`.
   */
  | { type: 'brain-scope'; shared: boolean }
  /** Onde a mira está apontando na tela. */
  | { type: 'point'; x: number; y: number }
  /** O miolo e o contorno da mesma forma. */
  | { type: 'ink'; part: 'fill' | 'stroke'; on: boolean }
  /** De que lado vem a luz, e se a sombra está pintada. */
  | { type: 'light'; side: 'left' | 'right' }
  | { type: 'shade'; on: boolean }

/** Os três degraus do "Ver os pontos" da cena `mesh`, do que mostra menos ao que mostra mais. */
export const MESH_LEVELS = ['nada', 'metade', 'tudo'] as const
export type MeshLevel = (typeof MESH_LEVELS)[number]
/**
 * Como a criança lê cada degrau: o que acontece com a PELE (consertos do review da onda B do lote 5).
 * ⚠️⚠️ "Ver os pontos: metade" no controle e "ver os pontos" na faixa, logo embaixo de "do que um
 * modelo 3D é feito?", respondiam a previsão antes do palpite. Os ids não mudam (sessões salvas).
 * Faixa, bancada e editor do admin leem esta tabela.
 */
export const MESH_SKIN_LABELS: Record<MeshLevel, string> = {
  nada: 'inteira',
  metade: 'transparente',
  tudo: 'sem pele',
}

/** Quais portas cada cena oferece. Cena sem porta não tem bancada de fios. */
const PORTS: Record<SceneId, readonly ScenePort[]> = {
  'once-vs-always': [],
  'fixed-vs-read': [],
  'collision-pair': [],
  invincibility: [],
  'number-line': [],
  'unique-names': [],
  'motion-amount': [],
  'two-clocks': [],
  'copy-vs-original': [],
  'published-copy': [],
  'same-rules-new-skin': [],
  coordinates: [],
  'screen-reader': [],
  'stage-size': [],
  'draw-loop': [],
  frames: [],
  'onion-skin': [],
  symmetry: [],
  'pixel-vector': [],
  'sheet-vs-sprite': [],
  world: ['draw'],
  layers: [],
  gravity: ['gravity'],
  impulse: [],
  'jump-sound': ['sound'],
  spawn: ['timer'],
  cleanup: ['cleanup'],
  'game-state': ['condition'],
  controls: ['touch'],
  restart: ['restart'],
  hitbox: [],
  score: ['condition'],
  lives: ['life', 'condition'],
  random: [],
  acceleration: ['limit'],
  velocity: [],
  'hold-vs-press': [],
  variable: [],
  'group-loop': ['loop'],
  'enemy-type': ['copy'],
  camera: ['camera'],
  contact: [],
  cooldown: [],
  aim: ['aim'],
  diagonal: ['even'],
  tilemap: [],
  pool: ['recycle'],
  'entity-state': [],
  'delta-time': [],
  'circle-collision': [],
  'axis-z': [],
  'camera-3d': [],
  mesh: [],
  'pick-ray': [],
  'fill-stroke': [],
  shading: [],
}

/**
 * A tela que o jogo pede: a medida que a Aula 1 manda a criança digitar, e o alvo da cena
 * `stage-size`. ⚠️ Estava cravada em dois lugares (o motor e o palco); a frase que diz quanto
 * FALTA para chegar nela seria a terceira cópia.
 */
export const STAGE_TARGET = { width: 480, height: 270 } as const

/** Limites numéricos das ações, num lugar só. O DTO do servidor os importa daqui em vez de
 *  redeclarar à mão, que era como o `interval` acabou sem teto do lado de lá. */
export const SCENE_LIMITS = {
  impulse: { min: 5, max: 14 },
  advance: { min: 0.001, max: 30 },
  move: { min: 20, max: 260 },
  /** A tela do Corre Dino: 480 x 270, a mesma medida que a criança digita no bloco. */
  placeX: { min: 0, max: 480 },
  placeY: { min: 0, max: 270 },
  /**
   * ⚠️⚠️ O endereço da cena `coordinates` (lote 5 do Raio-X, 16/09/2026): até a MAIOR tela que um
   * caso pode escolher (a do Desafio, 800 × 480, com a ação `stage`). Quem prende o endereço na tela
   * DO CASO é o motor (`place.width`/`place.height`). Não é o `placeX`/`placeY`: esses continuam
   * medindo a tela do Corre Dino para o `draw-loop` (`render.x`) e a `hold-vs-press`. A `velocity` usa
   * `driveX`/`driveY`.
   */
  addressX: { min: 0, max: 800 },
  addressY: { min: 0, max: 480 },
  /** A frase que ela escreve no bloco da descrição. */
  describe: { min: 0, max: 200 },
  /** A tela que a criança prepara. A da Aula 1 (480 por 270) mora dentro desta faixa. */
  stageWidth: { min: 160, max: 800 },
  stageHeight: { min: 90, max: 480 },
  resize: { min: 24, max: 120 },
  /** Trocas por segundo entre os dois quadros. Abaixo de 1 não é animação, acima de 12 a
   *  diferença deixa de ser visível numa tela de aula. */
  rate: { min: 1, max: 12 },
  /** O quanto o desenho do segundo quadro anda em relação ao primeiro. */
  shift: { min: 0, max: 60 },
  /** A lupa. Em 1 as duas pedras parecem a mesma; a partir de 5 a borda conta qual é qual. */
  zoom: { min: 1, max: 8 },
  /** As quatro células da folha e o tamanho do recorte dentro do jogo, em pixels. */
  cell: { min: 1, max: 4 },
  sprite: { min: 16, max: 96 },
  /** A grade 16 × 16 do espelho (lote 5 do Raio-X): cada quadradinho de 0 a 15 nos dois eixos. */
  paperCell: { min: 0, max: 15 },
  interval: { min: 0.5, max: 3 },
  sample: { min: 0, max: 1 },
  hint: { min: 1, max: 3 },
  /** O núcleo do Iniciante 2D. */
  velocity: { min: -10, max: 10 },
  /** A caixa de `variable`: o placar de um jogo de criança não passa de dois dígitos aqui. */
  boxValue: { min: 0, max: 99 },
  boxChange: { min: -5, max: 5 },
  /** Os três invasores do laço sobre o grupo. */
  targetId: { min: 1, max: 3 },
  /** A ficha do tipo de inimigo. */
  typeSpeed: { min: 1, max: 9 },
  typeLife: { min: 1, max: 5 },
  /** O mundo de `camera`, que é mais largo que a tela de 480. */
  worldX: { min: 0, max: 1200 },
  /** A distância de quem vem bater, em `contact`. */
  approach: { min: 0, max: 200 },
  /** A recarga entre dois tiros, em segundos. */
  recharge: { min: 0, max: 2 },
  /** O alvo da mira, na tela do jogo. */
  aimX: { min: 0, max: 480 },
  aimY: { min: 0, max: 270 },
  /** A grade do mapa escrito: 6 linhas de 10 casas. */
  mapRow: { min: 0, max: 5 },
  mapCol: { min: 0, max: 9 },
  /** Os três personagens com cérebro próprio. */
  brainId: { min: 1, max: 3 },
  /** Os raios dos dois círculos da colisão na mão. */
  radius: { min: 10, max: 60 },
  /**
   * A distância entre os CENTROS, em `circle-collision`.
   * ⚠️ Faixa própria de propósito: ela emprestava a do `approach` (que é de `contact`), e mexer
   * numa cena quebrava a validação do retrato da outra em silêncio.
   */
  centers: { min: 0, max: 200 },
  /** O quanto cada máquina de `delta-time` já andou. Teto para o retrato não crescer sem fim. */
  machineX: { min: 0, max: 4000 },
  /** O espaço em três eixos. ⚠️ O y cresce para CIMA, ao contrário da tela 2D. */
  spaceX: { min: -120, max: 120 },
  spaceY: { min: 0, max: 120 },
  spaceZ: { min: -120, max: 120 },
  /** A volta da câmera, em oitavos, e a altura dela. */
  yaw: { min: 0, max: 7 },
  pitch: { min: 0, max: 2 },
  /** Onde a mira aponta, na tela da cena. */
  pointX: { min: 0, max: 480 },
  pointY: { min: 0, max: 270 },
  /**
   * Onde o personagem da `velocity` pode estar (lote 5 do Raio-X). A tela é de 480 por 270, e a
   * cena desenha também a faixa FORA dela: à direita (onde o cacto nasce, depois de 480) e acima
   * (onde a pedra do Desafio nasce, em y negativo). ⚠️ Não é o `placeX`/`placeY`: esses medem a tela.
   */
  driveX: { min: 0, max: 540 },
  driveY: { min: -60, max: 270 },
} as const

/** As letras que o mapa de `tilemap` entende. Cada uma vira sempre a mesma coisa. */
export const MAP_TILES = ['.', '#', 'o'] as const

/**
 * O vocabulário do ateliê (lote 5 do Raio-X, 16/09/2026). Listas, e não faixas, porque são as
 * ESCOLHAS que o Pinta oferece: os dois espelhos, os traços prontos da nave e as larguras do recorte
 * que a folha de dois quadros de 32 × 32 aceita. O DTO do servidor e o editor do admin leem daqui.
 */
export const MIRROR_MODES = ['off', 'x', 'y', 'xy'] as const
export const SYMMETRY_PIECES = ['asa', 'ponta', 'cabine'] as const
export const SHEET_CROP_WIDTHS = [16, 32, 64] as const

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function between(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}
const oneOf = (scenes: readonly SceneId[], scene: SceneId) => scenes.includes(scene)

/**
 * ⭐⭐ O RELÓGIO de cada cena com tempo, em QUADROS POR SEGUNDO (lote 4 do Raio-X, 16/09/2026).
 *
 * ⚠️⚠️ Até o lote 4 o motor contava UM quadro por chamada de `advance`, qualquer que fosse o tempo,
 * e o player manda tamanhos diferentes: o ▶ ~25 fatias irregulares por segundo, o "Um passo" 0,2 s
 * e o roteiro 1 s. O mesmo gesto dava números diferentes conforme o botão (a `contact` perdia ~25
 * de vida por segundo com o ▶ e 1 no roteiro; a `diagonal` marcava 3,39, 16,97 ou 84,85). Hoje o
 * motor ACUMULA os segundos (`clock.carry`) e roda a lógica uma vez por quadro INTEIRO deste
 * ritmo: o mesmo tempo dá o mesmo resultado em qualquer fatiamento. É também a régua de
 * legalidade do `advance`: cena fora desta tabela não tem relógio.
 *
 * O ritmo é escolhido pelo que a criança precisa VER, não pelo jogo de verdade (que roda a 60):
 * - **4**: `draw-loop` (o rastro e o Dino que anda se leem um a um), `contact` (um coração por
 *   quadro num ritmo que dá para contar) e `hold-vs-press` (cada quadro com a tecla apertada é um
 *   passo de 30 da raquete de baixo, o mesmo passo que a de cima dá quando a tecla afunda).
 * - **5**: `velocity`, uma soma `x + vx` por quadro. Cada passo fica à vista, e o Dino ainda anda
 *   (vx 5 = 25 por segundo).
 * - **30**: o salto (`gravity`, `impulse`, `jump-sound`: o modelo é de 30 Hz, um quadro é um tique
 *   dele) e `spawn` ("a cada quadro" são 30 por segundo, a parede).
 * - **24**: `frames`, para caber a troca mais rápida (12 por segundo) com cada troca num quadro.
 * - **20**: `cleanup`, `game-state` e `restart` (lote 5: os cactos da partida vêm até o Dino),
 *   movimento liso com um passo que ainda se vê.
 * - **10**: `cooldown` (a recarga em décimos), `aim`, `delta-time`, `circle-collision` (2 por
 *   quadro: a distância fica INTEIRA e bate exata na soma dos raios), `pool` (lote 5: o cacto
 *   ATRAVESSA a tela em 10 quadros, e o "Um passo" anda um pedaço da travessia), `enemy-type` e
 *   `group-loop` (lote 5: os cactos andam, e o laço mede de novo em cada quadro).
 * - **1**: `score` e `lives` (um ponto por segundo: cada passo é um ponto) e `entity-state` (uma
 *   decisão de cada torre por segundo). ⚠️ A `diagonal` saiu (lote 5): andar 1 segundo é um gesto.
 *
 * ⚠️ Mudou um número? A tabela "a meta só cai quando a criança VIU" (`core/CLAUDE.md`) e os
 * roteiros de demonstração (`playsOut`) precisam continuar valendo: rode `clock.test.ts`.
 */
export const SCENE_FRAME_RATE = {
  'same-rules-new-skin': 10,
  'once-vs-always': 4,
  'fixed-vs-read': 30,
  'collision-pair': 10,
  invincibility: 30,
  'unique-names': 4,
  'motion-amount': 8,
  'two-clocks': 30,
  'draw-loop': 4,
  frames: 24,
  lives: 1,
  gravity: 30,
  impulse: 30,
  'jump-sound': 30,
  spawn: 30,
  random: 30,
  cleanup: 20,
  'game-state': 20,
  score: 1,
  // No sorteio da pedra o ▶ mostra a queda. No cacto, sortear velocidade ainda é um gesto próprio.
  // A aceleração continua sem ▶ geral: o relógio dela é o gesto "Passar 5 segundos".
  // ⚠️ A `restart` subiu de 10 para 20: o tempo passou a mover os cactos até a batida.
  restart: 20,
  // O núcleo do Iniciante 2D: todas estas mostram o que acontece COM O TEMPO.
  velocity: 5,
  'hold-vs-press': 4,
  // ⚠️ Lote 5 do Raio-X (G5): a `group-loop` ganhou relógio (os cactos vão e voltam, e o laço mede
  // de novo em todo quadro), a `enemy-type` passou a mover os cactos, e a `diagonal` SAIU: o gesto
  // dela é "Andar 1 segundo" (`stride`), que é sempre o mesmo caminho em qualquer botão.
  'group-loop': 10,
  'enemy-type': 10,
  contact: 4,
  cooldown: 10,
  aim: 10,
  // O motor: as que mostram o que o TEMPO faz.
  // ⚠️⚠️ A `pool` subiu de 1 para 10 no lote 5 do Raio-X: o cacto ANDA pela tela (a travessia é de
  // 1 s, `POOL_CROSSING`), e a um quadro por segundo ele pularia da entrada para a pilha. Continua um
  // cacto por segundo; ela deixou de ser de quadro longo (o gesto não recomeça mais o quadro).
  pool: 10,
  'entity-state': 1,
  'delta-time': 10,
  'circle-collision': 10,
} as const satisfies Partial<Record<SceneId, number>>

/** Quantos quadros por segundo esta cena conta, ou `null` para a cena sem relógio. */
export function sceneFrameRate(scene: SceneId): number | null {
  return (SCENE_FRAME_RATE as Partial<Record<SceneId, number>>)[scene] ?? null
}

/**
 * As cenas em que o QUADRO é o assunto: o botão de passo diz "Avançar 1 quadro".
 *
 * ⚠️ Só onde um quadro da cena é o quadro de que a cena FALA. `frames` e `onion-skin` chamam de
 * quadro o DESENHO da animação; a `delta-time` compara os quadros de dois computadores (o rápido
 * faz dois por quadro da cena); nas outras o quadro é só o passo do relógio. Nelas o botão continua
 * "Um passo", e é o mesmo gesto: um quadro.
 */
const QUADRO_E_O_ASSUNTO: readonly SceneId[] = [
  'once-vs-always',
  'draw-loop',
  'spawn',
  'velocity',
  'hold-vs-press',
  'contact',
]

/**
 * O nome do botão de passo desta cena, ou `null` para a cena sem relógio. "Avançar 1 quadro" anda UM
 * quadro; "Um passo" anda os quadros inteiros de ~0,2 s (`sceneStepSeconds`).
 */
export function sceneStepLabel(scene: SceneId): 'Avançar 1 quadro' | 'Um passo' | null {
  if (sceneFrameRate(scene) === null) return null
  return QUADRO_E_O_ASSUNTO.includes(scene) ? 'Avançar 1 quadro' : 'Um passo'
}

/** Quanto tempo o "Um passo" mostra: perto disto, sempre em quadros INTEIROS da cena. */
const PASSO_VISIVEL = 0.2

/**
 * O tempo que o botão de passo manda, ou `null` para a cena sem relógio.
 *
 * ⚠️⚠️ Um quadro só onde o quadro é o ASSUNTO (review do lote 4 do Raio-X, 16/09/2026). Nas outras,
 * um quadro de 1/30 s é um tique invisível: o pulo pedia 30 cliques, ver os dois desenhos da `frames`
 * 48 e um cacto sair da tela na `cleanup` 109, e quem mais depende do passo é quem não acompanha o
 * movimento do ▶. "Um passo" anda os quadros INTEIROS mais perto de 0,2 s (6 no salto, 5 na `frames`,
 * 4 na `cleanup`, 2 nas de 10 por segundo), e nunca menos de um (1 s nas de 1 por segundo).
 * ⚠️ Inteiros, e não 0,2 s cravados: o passo continua sem comer nem deixar pedaço de quadro, e a
 * sobra que o ▶ deixou fica intacta.
 */
export function sceneStepSeconds(scene: SceneId): number | null {
  const fps = sceneFrameRate(scene)
  if (fps === null) return null
  if (QUADRO_E_O_ASSUNTO.includes(scene)) return 1 / fps
  return Math.max(1, Math.round(PASSO_VISIVEL * fps)) / fps
}

/** Até quantos quadros por segundo o quadro é LONGO: a criança espera por ele. */
const QUADRO_LONGO = 2

/**
 * A cena conta o tempo em quadros LONGOS (1 ou 2 por segundo: `score`, `lives`, `entity-state`)?
 * ⚠️ A `pool` saiu no lote 5 (subiu para 10 por segundo, com o cacto andando), e a `diagonal` também
 * (perdeu o relógio: andar 1 segundo é o gesto dela).
 *
 * ⚠️⚠️ Uma régua só para as duas coisas que o quadro longo pede (review do lote 4): o GESTO recomeça
 * o quadro no motor (`stepScene`, e o `undo` na sessão), e o player mostra o quadro EM ANDAMENTO
 * enquanto o ▶ roda (`SceneReadoutBand`). Se o lote 5 subir o ritmo de uma delas, as duas saem juntas.
 */
export function sceneLongFrame(scene: SceneId): boolean {
  const fps = sceneFrameRate(scene)
  return fps !== null && fps <= QUADRO_LONGO
}

const JUMPS: readonly SceneId[] = ['gravity', 'impulse', 'jump-sound']
const MATCHES: readonly SceneId[] = ['controls', 'restart', 'game-state', 'score']
/** As duas cenas que mostram os mesmos dois quadros: a troca e o fantasma. */
const ANIMATIONS: readonly SceneId[] = ['frames', 'onion-skin']

/**
 * Uma ação só é legal na cena que a oferece. O motor trata ação ilegal como no-op em vez de
 * erro: um roteiro escrito para outra cena, ou um pacote adulterado, não derruba a aula da criança.
 */
export function isSceneAction(value: unknown, scene: SceneId): value is SceneAction {
  if (!isRecord(value)) return false
  const L = SCENE_LIMITS
  switch (value.type) {
    case 'place-in-area':
      return (
        scene === 'once-vs-always' &&
        typeof value.card === 'string' &&
        ['paint', 'create', 'move', 'event', 'lives'].includes(value.card) &&
        typeof value.area === 'string' &&
        ['outside', 'start', 'loop', 'event'].includes(value.area)
      )
    case 'trigger':
      return scene === 'once-vs-always'
    case 'value-source':
      return scene === 'fixed-vs-read' && (value.source === 'fixed' || value.source === 'read')
    case 'box-marks':
      return scene === 'fixed-vs-read' && typeof value.on === 'boolean'
    case 'clear-marks':
      return scene === 'fixed-vs-read'
    case 'command-target':
      return (
        scene === 'collision-pair' &&
        (value.subject === 'shot' || value.subject === 'rock') &&
        (value.target === 'group' || value.target === 'alias')
      )
    case 'shield':
      return scene === 'invincibility' && [0, 15, 45, 90].includes(value.frames as number)
    case 'advance-to':
      return scene === 'invincibility'
    case 'step-value':
      return (
        scene === 'number-line' && Number.isInteger(value.value) && between(value.value, -12, 0)
      )
    case 'sum-minus-one':
      return scene === 'number-line'
    case 'compare-op':
      return (
        scene === 'number-line' &&
        (value.operator === '>' || value.operator === '=' || value.operator === '<')
      )
    case 'toggle-block':
      return scene === 'unique-names' && typeof value.present === 'boolean'
    case 'name-field':
      return (
        scene === 'unique-names' &&
        ['', 'nave', 'folha-nave', 'nave2'].includes(value.name as string)
      )
    case 'nudge':
      return (
        scene === 'motion-amount' &&
        (value.piece === 'crater' || value.piece === 'body') &&
        Number.isInteger(value.amount) &&
        between(value.amount, 0, 12)
      )
    case 'birth-every':
      return scene === 'two-clocks' && [20, 40, 80].includes(value.frames as number)
    case 'export-file':
    case 'import-file':
      return scene === 'copy-vs-original'
    case 'publish':
    case 'open-mural':
      return scene === 'published-copy'
    case 'recolor':
      return (
        ((scene === 'copy-vs-original' && (value.side === 'lesson' || value.side === 'studio')) ||
          (scene === 'published-copy' && value.side === 'project')) &&
        ['azul', 'rosa', 'verde', 'laranja'].includes(value.color as string) &&
        (scene !== 'published-copy' || value.color !== 'laranja')
      )
    case 'skin':
      return (
        scene === 'same-rules-new-skin' && ['space', 'road', 'sea'].includes(value.theme as string)
      )
    case 'rule-toggle':
      return scene === 'same-rules-new-skin' && typeof value.enabled === 'boolean'
    case 'play-move':
      return scene === 'same-rules-new-skin' && (value.direction === -1 || value.direction === 1)
    case 'play-shoot':
      return scene === 'same-rules-new-skin'
    case 'create':
      return scene === 'world'
    case 'connect':
      return PORTS[scene].some((p) => p === value.port) && typeof value.enabled === 'boolean'
    case 'layer':
      return scene === 'layers' && typeof value.front === 'boolean'
    case 'jump':
      return oneOf(JUMPS, scene) && (value.input === 'key' || value.input === 'tap')
    case 'impulse':
      return scene === 'impulse' && between(value.force, L.impulse.min, L.impulse.max)
    case 'advance':
      return between(value.seconds, L.advance.min, L.advance.max) && sceneFrameRate(scene) !== null
    case 'move':
      return scene === 'hitbox' && between(value.distance, L.move.min, L.move.max)
    case 'resize':
      return scene === 'hitbox' && between(value.width, L.resize.min, L.resize.max)
    case 'start':
      return oneOf(MATCHES, scene) && (value.input === 'key' || value.input === 'tap')
    case 'score-place':
      return (
        scene === 'score' &&
        (value.clock === 'loose' || value.clock === 'frame' || value.clock === 'second') &&
        typeof value.guarded === 'boolean' &&
        (value.clock !== 'loose' || !value.guarded)
      )
    case 'collide':
      return scene === 'score' || scene === 'lives'
    case 'home':
      return oneOf(MATCHES, scene)
    case 'restart':
      return scene === 'restart'
    case 'interval':
      return scene === 'spawn' && between(value.seconds, L.interval.min, L.interval.max)
    case 'sample':
      // ⚠️ Na `acceleration` só a VELOCIDADE (lote 5): lá o sorteio é o "Passar 5 segundos", e o
      // lugar de nascimento não é assunto da cena.
      return (
        (scene === 'random' || (scene === 'acceleration' && value.kind === 'velocity')) &&
        (value.kind === 'position' || value.kind === 'velocity') &&
        between(value.unit, L.sample.min, L.sample.max) &&
        typeof value.guided === 'boolean'
      )
    case 'hint':
      return between(value.level, L.hint.min, L.hint.max) && Number.isInteger(value.level)
    case 'place':
      return (
        (scene === 'coordinates' || (scene === 'fixed-vs-read' && value.y === 0)) &&
        between(value.x, L.addressX.min, L.addressX.max) &&
        between(value.y, L.addressY.min, L.addressY.max) &&
        Number.isInteger(value.x) &&
        Number.isInteger(value.y)
      )
    case 'describe':
      // ⚠️ O texto é da CRIANÇA e vai para a tela: aqui só o tamanho e o tipo. Ele nunca é
      // interpretado como marcação em lugar nenhum (o player o renderiza como texto).
      return (
        scene === 'screen-reader' &&
        typeof value.text === 'string' &&
        value.text.length <= L.describe.max
      )
    case 'listen':
      return scene === 'screen-reader'
    case 'stage':
      // ⚠️ Também na `coordinates` (lote 5 do Raio-X): é como um CASO escolhe a tela do endereço (o
      // Desafio abre em 800 × 480, a tela do jogo da criança). A bancada dela não oferece o gesto.
      return (
        (scene === 'stage-size' || scene === 'coordinates') &&
        between(value.width, L.stageWidth.min, L.stageWidth.max) &&
        between(value.height, L.stageHeight.min, L.stageHeight.max) &&
        Number.isInteger(value.width) &&
        Number.isInteger(value.height)
      )
    case 'border':
      return scene === 'stage-size' && typeof value.visible === 'boolean'
    case 'loop':
      return scene === 'draw-loop' && typeof value.on === 'boolean'
    case 'erase':
      return scene === 'draw-loop' && typeof value.on === 'boolean'
    case 'frame':
      return oneOf(ANIMATIONS, scene) && (value.index === 1 || value.index === 2)
    case 'same-frames':
      return scene === 'frames' && typeof value.on === 'boolean'
    case 'play':
      return (scene === 'frames' || scene === 'motion-amount') && typeof value.on === 'boolean'
    case 'rate':
      return (
        (scene === 'frames' && between(value.perSecond, L.rate.min, L.rate.max)) ||
        (scene === 'two-clocks' && [2, 8, 16].includes(value.perSecond as number))
      )
    case 'onion':
      return scene === 'onion-skin' && typeof value.on === 'boolean'
    case 'shift':
      return (
        scene === 'onion-skin' &&
        between(value.offset, L.shift.min, L.shift.max) &&
        Number.isInteger(value.offset)
      )
    case 'inspect':
      return (
        scene === 'pixel-vector' &&
        (value.kind === 'pixel' || value.kind === 'vector') &&
        between(value.zoom, L.zoom.min, L.zoom.max) &&
        Number.isInteger(value.zoom)
      )
    case 'cut':
      return (
        scene === 'sheet-vs-sprite' &&
        between(value.cell, L.cell.min, L.cell.max) &&
        Number.isInteger(value.cell)
      )
    case 'sprite':
      return (
        scene === 'sheet-vs-sprite' &&
        between(value.size, L.sprite.min, L.sprite.max) &&
        Number.isInteger(value.size)
      )
    // ── O ateliê do lote 5 do Raio-X ──────────────────────────────────────────────────────
    case 'mirror-mode':
      return scene === 'symmetry' && MIRROR_MODES.some((m) => m === value.mode)
    case 'trace':
      return scene === 'symmetry' && SYMMETRY_PIECES.some((p) => p === value.piece)
    case 'fill':
      return scene === 'symmetry'
    case 'dot':
      return (
        scene === 'symmetry' &&
        between(value.x, L.paperCell.min, L.paperCell.max) &&
        between(value.y, L.paperCell.min, L.paperCell.max) &&
        Number.isInteger(value.x) &&
        Number.isInteger(value.y)
      )
    case 'clear-paper':
      return scene === 'symmetry'
    case 'crop':
      return scene === 'sheet-vs-sprite' && SHEET_CROP_WIDTHS.some((w) => w === value.width)
    // ── O núcleo do Iniciante 2D ──────────────────────────────────────────────────────────
    case 'velocity':
      return (
        scene === 'velocity' &&
        between(value.vx, L.velocity.min, L.velocity.max) &&
        between(value.vy, L.velocity.min, L.velocity.max) &&
        Number.isInteger(value.vx) &&
        Number.isInteger(value.vy)
      )
    case 'press':
      return scene === 'hold-vs-press'
    case 'hold':
      return scene === 'hold-vs-press' && typeof value.on === 'boolean'
    case 'store':
      return (
        scene === 'variable' &&
        between(value.value, L.boxValue.min, L.boxValue.max) &&
        Number.isInteger(value.value)
      )
    case 'change':
      return (
        scene === 'variable' &&
        between(value.by, L.boxChange.min, L.boxChange.max) &&
        Number.isInteger(value.by) &&
        value.by !== 0
      )
    case 'show':
      return scene === 'variable' && typeof value.on === 'boolean'
    case 'look':
    case 'choose':
      return (
        scene === 'group-loop' &&
        between(value.id, L.targetId.min, L.targetId.max) &&
        Number.isInteger(value.id)
      )
    case 'define':
      return (
        scene === 'enemy-type' &&
        (value.field === 'speed' || value.field === 'life') &&
        Number.isInteger(value.value) &&
        (value.field === 'speed'
          ? between(value.value, L.typeSpeed.min, L.typeSpeed.max)
          : between(value.value, L.typeLife.min, L.typeLife.max))
      )
    case 'spawnOne':
      return scene === 'enemy-type'
    case 'walk':
      return (
        scene === 'camera' &&
        between(value.x, L.worldX.min, L.worldX.max) &&
        Number.isInteger(value.x)
      )
    case 'approach':
      // ⚠️⚠️ Vale nas DUAS cenas de distância. Em `circle-collision` o relógio só aproxima, e
      // sem um jeito de afastar a meta da conta (`formula`, que pede o resultado TROCAR com a
      // distância parada) ficava impossível depois de ~6 segundos de ▶ — com a pista mandando
      // fazer exatamente o que já não funcionava, e nada na tela dizendo para recomeçar.
      return (
        (scene === 'contact' || scene === 'circle-collision') &&
        between(value.distance, L.approach.min, L.approach.max) &&
        Number.isInteger(value.distance)
      )
    case 'shoot':
      // ⚠️ Nas `lives` o tiro é o ACERTO que soma ponto (lote 5): no Desafio o ponto vem do tiro no
      // asteroide, e não do tempo jogado.
      // ⚠️ E na `aim` (lote 5, G5): o tiro sai com o GESTO "Atirar" e voa pela seta ou reto.
      return (
        scene === 'cooldown' || scene === 'lives' || scene === 'aim' || scene === 'fixed-vs-read'
      )
    case 'recharge':
      return scene === 'cooldown' && between(value.seconds, L.recharge.min, L.recharge.max)
    case 'target':
      return (
        scene === 'aim' &&
        between(value.x, L.aimX.min, L.aimX.max) &&
        between(value.y, L.aimY.min, L.aimY.max) &&
        Number.isInteger(value.x) &&
        Number.isInteger(value.y)
      )
    case 'direction':
      // −1, 0 ou 1 em cada eixo: é o que um teclado de setas produz.
      return (
        scene === 'diagonal' &&
        [-1, 0, 1].includes(value.x as number) &&
        [-1, 0, 1].includes(value.y as number)
      )
    case 'stride':
      return scene === 'diagonal'
    case 'paint-tile':
      return (
        scene === 'tilemap' &&
        between(value.row, L.mapRow.min, L.mapRow.max) &&
        between(value.col, L.mapCol.min, L.mapCol.max) &&
        Number.isInteger(value.row) &&
        Number.isInteger(value.col) &&
        MAP_TILES.some((t) => t === value.tile)
      )
    // ── O motor, o 3D e o ateliê ──────────────────────────────────────────────────────────
    case 'brain':
      return (
        scene === 'entity-state' &&
        between(value.id, L.brainId.min, L.brainId.max) &&
        Number.isInteger(value.id) &&
        ['parado', 'mirar', 'atirar', 'recarregar'].includes(value.state as string)
      )
    case 'count':
      return scene === 'delta-time' && (value.kind === 'frames' || value.kind === 'seconds')
    case 'radius':
      return (
        scene === 'circle-collision' &&
        (value.which === 'a' || value.which === 'b') &&
        between(value.value, L.radius.min, L.radius.max) &&
        Number.isInteger(value.value)
      )
    case 'place3d':
      return (
        scene === 'axis-z' &&
        between(value.x, L.spaceX.min, L.spaceX.max) &&
        between(value.y, L.spaceY.min, L.spaceY.max) &&
        between(value.z, L.spaceZ.min, L.spaceZ.max) &&
        Number.isInteger(value.x) &&
        Number.isInteger(value.y) &&
        Number.isInteger(value.z)
      )
    case 'orbit':
      if (!between(value.yaw, L.yaw.min, L.yaw.max) || !Number.isInteger(value.yaw)) return false
      // ⚠️ No `mesh` quem gira é o MODELO, não uma câmera: a altura não tem efeito nenhum lá, e
      // aceitá-la punha um campo mudo no DTO e no editor do professor. Fica travada no meio.
      if (scene === 'mesh') return value.pitch === 1
      return (
        scene === 'camera-3d' &&
        between(value.pitch, L.pitch.min, L.pitch.max) &&
        Number.isInteger(value.pitch)
      )
    case 'recenter':
      return scene === 'camera-3d'
    case 'see-points':
      return scene === 'mesh' && MESH_LEVELS.some((n) => n === value.level)
    case 'brain-scope':
      return scene === 'entity-state' && typeof value.shared === 'boolean'
    case 'point':
      return (
        scene === 'pick-ray' &&
        between(value.x, L.pointX.min, L.pointX.max) &&
        between(value.y, L.pointY.min, L.pointY.max) &&
        Number.isInteger(value.x) &&
        Number.isInteger(value.y)
      )
    case 'ink':
      return (
        scene === 'fill-stroke' &&
        (value.part === 'fill' || value.part === 'stroke') &&
        typeof value.on === 'boolean'
      )
    case 'light':
      return scene === 'shading' && (value.side === 'left' || value.side === 'right')
    case 'shade':
      return scene === 'shading' && typeof value.on === 'boolean'
    case 'reset':
      return true
    default:
      return false
  }
}

/** As portas que uma cena oferece — o editor do admin monta a bancada a partir disto. */
export function scenePorts(scene: SceneId): readonly ScenePort[] {
  return PORTS[scene]
}

/**
 * O CASO desta atividade: por onde a cena começa e o que ela cobra.
 *
 * ⚠️⚠️ É a peça que faz uma cena render mais de um uso. Até aqui um modelo tinha uma missão só
 * — as metas eram do catálogo, iguais para todo mundo, e a única coisa que o professor
 * escolhia era o elenco e (em duas cenas) o impulso inicial. O elenco trocou QUEM está no
 * palco; o setup troca DE ONDE ele parte e O QUE conta como descoberta, que é como uma mesma
 * mecânica serve dezenas de exercícios no Brilliant.
 *
 * ⚠️ `actions` são as mesmas ações do motor, pela mesma régua (`isSceneAction`): não há um
 * segundo vocabulário de "condição inicial" para manter em dia. Elas rodam ANTES de a criança
 * entrar, e a evidência é zerada em seguida — senão a cena abriria com descobertas que
 * ninguém fez, e uma experimentação passaria sozinha.
 */
export interface SceneSetup {
  /** O que já aconteceu quando a criança chega. `reset` não entra: ele volta para cá. */
  actions?: SceneAction[]
  /** Quais metas do modelo esta atividade cobra. Sem lista, são todas as do modelo. */
  goals?: string[]
  /** O caso concreto que esta atividade usa; validado contra a cena. */
  preset?: ScenePreset
  /** Textos desta aula para uma meta existente; o id e o que a meta prova não mudam. */
  goalCopy?: Record<string, { label?: string; pedido?: string }>
}
export const SETUP_LIMITS = { actions: 8, goals: 8 } as const
