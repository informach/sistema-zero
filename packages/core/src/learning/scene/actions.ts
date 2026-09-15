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
] as const
export type ScenePort = (typeof SCENE_PORTS)[number]

export type SceneAction =
  | { type: 'create' }
  | { type: 'connect'; port: ScenePort; enabled: boolean }
  | { type: 'layer'; front: boolean }
  | { type: 'jump'; input: 'key' | 'tap' }
  | { type: 'impulse'; force: number }
  | { type: 'advance'; seconds: number }
  | { type: 'move'; distance: number }
  | { type: 'resize'; width: number }
  | { type: 'start'; input: 'key' | 'tap' }
  | { type: 'collide' | 'home' | 'restart' | 'clock' | 'reset' }
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
  /** A troca automática entre os quadros, e a velocidade dela. */
  | { type: 'play'; on: boolean }
  | { type: 'rate'; perSecond: number }
  /** O fantasma do quadro anterior, e onde o desenho do segundo quadro fica. */
  | { type: 'onion'; on: boolean }
  | { type: 'shift'; offset: number }
  /** O traço e o espelho. ⚠️ O eixo viaja JUNTO do interruptor, como em `place`: ligar o
   *  espelho sem dizer onde ele está deixaria a cena com dois estados para uma coisa só. */
  | { type: 'paint'; column: number }
  | { type: 'mirror'; on: boolean; line: number }
  /** A lupa: qual desenho ela está olhando, e de quão perto. */
  | { type: 'inspect'; kind: 'pixel' | 'vector'; zoom: number }
  /** Onde cortar a folha, e o tamanho que o recorte tem DENTRO do jogo. */
  | { type: 'cut'; cell: number }
  | { type: 'sprite'; size: number }
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
  | { type: 'mode'; kind: 'ask' | 'event' }
  /** O tiro e a recarga entre dois tiros. */
  | { type: 'shoot' }
  | { type: 'recharge'; seconds: number }
  /** Onde está o alvo da mira. */
  | { type: 'target'; x: number; y: number }
  /** Para que lado a criança empurra o personagem: −1, 0 ou 1 em cada eixo. */
  | { type: 'direction'; x: number; y: number }
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
  /** O raio-X do modelo: os pontos ligados, sem a roupa. */
  | { type: 'wireframe'; on: boolean }
  /** Onde a mira está apontando na tela. */
  | { type: 'point'; x: number; y: number }
  /** O miolo e o contorno da mesma forma. */
  | { type: 'ink'; part: 'fill' | 'stroke'; on: boolean }
  /** De que lado vem a luz, e se a sombra está pintada. */
  | { type: 'light'; side: 'left' | 'right' }
  | { type: 'shade'; on: boolean }

/** Quais portas cada cena oferece. Cena sem porta não tem bancada de fios. */
const PORTS: Record<SceneId, readonly ScenePort[]> = {
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
  'enemy-type': [],
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
  /** O roteiro de demonstração é mais apertado: ninguém assiste 30 s parado num passo. */
  scriptAdvance: { min: 0.001, max: 10 },
  move: { min: 20, max: 260 },
  /** A tela do Corre Dino: 480 x 270, a mesma medida que a criança digita no bloco. */
  placeX: { min: 0, max: 480 },
  placeY: { min: 0, max: 270 },
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
  /** As doze colunas do papel e as onze linhas onde o espelho pode ficar (entre colunas). */
  column: { min: 0, max: 11 },
  mirrorLine: { min: 1, max: 11 },
  /** A lupa. Em 1 as duas pedras parecem a mesma; a partir de 5 a borda conta qual é qual. */
  zoom: { min: 1, max: 8 },
  /** As quatro células da folha e o tamanho do recorte dentro do jogo, em pixels. */
  cell: { min: 1, max: 4 },
  sprite: { min: 16, max: 96 },
  interval: { min: 0.5, max: 2 },
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
} as const

/** As letras que o mapa de `tilemap` entende. Cada uma vira sempre a mesma coisa. */
export const MAP_TILES = ['.', '#', 'o'] as const

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function between(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}
const oneOf = (scenes: readonly SceneId[], scene: SceneId) => scenes.includes(scene)

const JUMPS: readonly SceneId[] = ['gravity', 'impulse', 'jump-sound']
const TICKS: readonly SceneId[] = [
  'draw-loop',
  'frames',
  'lives',
  'gravity',
  'impulse',
  'jump-sound',
  'spawn',
  'cleanup',
  'game-state',
  'score',
  'random',
  'acceleration',
  'restart',
  // O núcleo do Iniciante 2D: todas estas mostram o que acontece COM O TEMPO.
  'velocity',
  'hold-vs-press',
  'enemy-type',
  'contact',
  'cooldown',
  'aim',
  'diagonal',
  // O motor: as três que mostram o que o TEMPO faz.
  'pool',
  'entity-state',
  'delta-time',
  'circle-collision',
]
const MATCHES: readonly SceneId[] = ['controls', 'restart', 'game-state', 'score']
/** As duas cenas que mostram os mesmos dois quadros: a troca e o fantasma. */
const ANIMATIONS: readonly SceneId[] = ['frames', 'onion-skin']

/**
 * Uma ação só é legal na cena que a oferece. O motor trata ação ilegal como no-op em vez de
 * erro: um roteiro antigo ou um pacote adulterado não derruba a aula da criança.
 */
export function isSceneAction(value: unknown, scene: SceneId): value is SceneAction {
  if (!isRecord(value)) return false
  const L = SCENE_LIMITS
  switch (value.type) {
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
      return between(value.seconds, L.advance.min, L.advance.max) && oneOf(TICKS, scene)
    case 'move':
      return (
        (scene === 'hitbox' || scene === 'restart') &&
        between(value.distance, L.move.min, L.move.max)
      )
    case 'resize':
      return scene === 'hitbox' && between(value.width, L.resize.min, L.resize.max)
    case 'start':
      return oneOf(MATCHES, scene) && (value.input === 'key' || value.input === 'tap')
    case 'collide':
      return scene === 'restart' || scene === 'score' || scene === 'lives'
    case 'home':
      return oneOf(MATCHES, scene)
    case 'restart':
      return scene === 'restart'
    case 'clock':
      return scene === 'acceleration'
    case 'interval':
      return scene === 'spawn' && between(value.seconds, L.interval.min, L.interval.max)
    case 'sample':
      return (
        (scene === 'random' || scene === 'acceleration') &&
        (value.kind === 'position' || value.kind === 'velocity') &&
        between(value.unit, L.sample.min, L.sample.max) &&
        typeof value.guided === 'boolean'
      )
    case 'hint':
      return between(value.level, L.hint.min, L.hint.max) && Number.isInteger(value.level)
    case 'place':
      return (
        scene === 'coordinates' &&
        between(value.x, L.placeX.min, L.placeX.max) &&
        between(value.y, L.placeY.min, L.placeY.max) &&
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
      return (
        scene === 'stage-size' &&
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
    case 'play':
      return scene === 'frames' && typeof value.on === 'boolean'
    case 'rate':
      return scene === 'frames' && between(value.perSecond, L.rate.min, L.rate.max)
    case 'onion':
      return scene === 'onion-skin' && typeof value.on === 'boolean'
    case 'shift':
      return (
        scene === 'onion-skin' &&
        between(value.offset, L.shift.min, L.shift.max) &&
        Number.isInteger(value.offset)
      )
    case 'paint':
      return (
        scene === 'symmetry' &&
        between(value.column, L.column.min, L.column.max) &&
        Number.isInteger(value.column)
      )
    case 'mirror':
      return (
        scene === 'symmetry' &&
        typeof value.on === 'boolean' &&
        between(value.line, L.mirrorLine.min, L.mirrorLine.max) &&
        Number.isInteger(value.line)
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
    case 'mode':
      return scene === 'contact' && (value.kind === 'ask' || value.kind === 'event')
    case 'shoot':
      return scene === 'cooldown'
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
    case 'wireframe':
      return scene === 'mesh' && typeof value.on === 'boolean'
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
}
export const SETUP_LIMITS = { actions: 8, goals: 8 } as const
