/**
 * O que a criança (ou o roteiro de uma demonstração) pode FAZER numa cena.
 *
 * Este arquivo é a única fonte de legalidade: o player, o validador de roteiro e o DTO do
 * servidor perguntam todos a `isSceneAction`. Antes existiam três cópias dessa regra —
 * uma no motor, uma no editor do admin e uma em TypeBox no members — e elas já divergiam
 * (o `interval` do servidor não tinha limite, o do editor ia de 0,5 a 2).
 */

/** As 24 cenas. Uma lista só: antes havia 13 "cenas" na v1 e 14 "missões" na v2/v3, com a
 *  v1 tratando salto como um conceito único e a v2 separando gravidade de impulso. As quatro
 *  primeiras nasceram em 14/09/2026 (a tela e quem a lê) e as cinco de desenho logo depois,
 *  para O Jogo do Meu Jeito, que não tinha UMA cena nativa. */
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
}

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
} as const

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
