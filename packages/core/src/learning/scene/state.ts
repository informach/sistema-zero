import { isRecord, SCENE_LIMITS, type SceneId } from './actions'

/**
 * O estado de uma cena, agrupado por assunto.
 *
 * Antes era uma struct PLANA de 44 campos, inicializada inteira para todas as cenas — cada
 * uma usava ~6 e ignorava 38. Pior: a validação na volta do servidor descobria os campos
 * por REFLEXÃO sobre o exemplar inicial, então qualquer campo novo de array caía num
 * `length <= 12 && every(finite)` genérico. Aqui cada grupo se valida sozinho e explicitamente.
 */

export interface SceneCactus {
  id: number
  x: number
  velocity: number
}

/** O retrato do mundo no instante em que a criança descobriu alguma coisa. É o que alimenta
 *  a comparação "antes e depois" e o relatório do professor. */
export interface SceneObservation {
  id: string
  label: string
  height: number
  force: number
  gravity: boolean
  front: boolean
  distance: number
  width: number
  collision: boolean
  points: number
  screen: MatchScreen
  stored: number
  visible: number
  base: number
  x: number
  velocity: number
}

export type MatchScreen = 'start' | 'playing' | 'end'

/** O que a criança fez e o que ela percebeu. É a única parte que a avaliação lê. */
export interface SceneEvidence {
  actions: number
  discoveries: string[]
  observations: SceneObservation[]
  hints: number
}
/** Existir e aparecer são coisas diferentes: `created` é o objeto, `drawn` é o desenho. */
export interface SceneWorld {
  created: boolean
  drawn: boolean
  front: boolean
}
/** O salto. `atForce`/`atGravity` congelam as condições do voo em curso, para que mexer nos
 *  controles no meio do ar não reescreva a trajetória que já começou. */
export interface SceneFlight {
  gravity: boolean
  force: number
  y: number
  time: number | null
  atForce: number
  atGravity: boolean
  peak: number
}
export interface SceneSound {
  onJump: boolean
  count: number
  jumps: number
}
/** Os cactos que nascem, andam e somem. */
export interface SceneCrowd {
  timer: boolean
  interval: number
  cleanup: boolean
  remainder: number
  born: number
  removed: number
  cacti: SceneCactus[]
  elapsed: number
}
/** A partida: telas, pontos e as ligações que a fazem começar e recomeçar. */
export interface SceneMatch {
  guarded: boolean
  touch: boolean
  restartConnected: boolean
  screen: MatchScreen
  points: number
  clockRemainder: number
  scoreIdle: number
}
export interface SceneContact {
  distance: number
  width: number
}
/** O endereço do sprite na tela, e de onde ele veio. O par anterior é o que permite comparar
 *  sem guardar de memória: a cena desenha o fantasma da posição de antes. */
export interface ScenePlace {
  x: number
  y: number
  fromX: number
  fromY: number
  /** Os x já visitados, para reconhecer "mesmo x, altura diferente" sem guardar o histórico. */
  visitedX: number[]
}
/** A tela que a criança prepara: o tamanho e a moldura que mostra onde ela acaba. */
export interface SceneStageSize {
  width: number
  height: number
  border: boolean
  /** Os formatos que ela já experimentou, para a cena saber que houve comparação. */
  tried: number
}
/** O laço de desenho: repetir a cada quadro e limpar antes. */
export interface SceneRender {
  loop: boolean
  erase: boolean
  /** Quadros que o relógio andou desde a última troca de chave. */
  frames: number
  /** Desenhos acumulados na tela (o rastro de quem não limpa). */
  trail: number
}
/** A descrição do jogo e o que o leitor de tela leu em voz alta na última vez. */
export interface SceneDescription {
  text: string
  /** O que foi lido. Vazio antes do primeiro "ouvir". */
  heard: string
  /** Ela ouviu a tela SEM descrição, que é a descoberta que abre a cena. */
  heardEmpty: boolean
}
/**
 * Os dois quadros do desenho: qual está na tela, a troca automática e o fantasma.
 *
 * ⚠️ Um grupo para DUAS cenas (`frames` e `onion-skin`), como `crowd` serve o nascimento e a
 * limpeza: elas são a mesma bancada de animação vista de dois ângulos, e separá-las faria a
 * criança trocar de mundo entre uma seção e a seguinte da mesma aula.
 */
export interface SceneAnimation {
  /** 1 ou 2. São dois desenhos INTEIROS, não um desenho com partes. */
  frame: number
  playing: boolean
  /** Trocas por segundo. */
  rate: number
  /** Quantas trocas o relógio já fez. */
  swaps: number
  elapsed: number
  /** O fantasma do quadro anterior, por baixo. Guia de desenho: não entra na animação. */
  onion: boolean
  /** O quanto o desenho do quadro 2 andou em relação ao do quadro 1. */
  shift: number
}
/** O espelho: onde ele está, o que já foi pintado e com que eixo. */
export interface SceneMirror {
  on: boolean
  /** A linha do espelho, entre colunas: 1 a 11 num papel de 12 colunas. */
  line: number
  /** As colunas pintadas, na ordem. */
  painted: number[]
  /** O eixo usado no último traço espelhado. 0 = nenhum ainda. */
  lastLine: number
}
/** A lupa sobre as duas pedras: qual delas e de quão perto. */
export interface ScenePixels {
  kind: 'pixel' | 'vector'
  zoom: number
}
/** A folha de desenhos e o tamanho que o recorte tem dentro do jogo. */
export interface SceneSheet {
  /** Qual das quatro células está recortada. */
  cell: number
  /** O tamanho do sprite no jogo, em pixels. A folha NÃO muda com ele. */
  size: number
  /** As células que ela já recortou. */
  cuts: number[]
}
/** O placar e as vidas: duas contagens que mudam por motivos diferentes. */
export interface SceneLifeline {
  lives: number
  points: number
  /** O fio que faz a batida custar uma vida. */
  onHit: boolean
  /** O fio que soma ponto enquanto a nave está viva. */
  scoring: boolean
  hits: number
  /** O resto do segundo, para o ponto não depender do tamanho do passo do relógio. */
  remainder: number
}
export interface SceneSpeed {
  limited: boolean
  base: number
  ticks: number
  samples: { x: number; velocity: number; positions: number[]; velocities: number[] }
}

export interface SceneState {
  evidence: SceneEvidence
  world: SceneWorld
  flight: SceneFlight
  sound: SceneSound
  crowd: SceneCrowd
  match: SceneMatch
  contact: SceneContact
  speed: SceneSpeed
  place: ScenePlace
  description: SceneDescription
  stage: SceneStageSize
  render: SceneRender
  animation: SceneAnimation
  mirror: SceneMirror
  pixels: ScenePixels
  sheet: SceneSheet
  lifeline: SceneLifeline
  caption: string
}

export interface SceneStart {
  scene: SceneId
  /** Só `gravity` e `impulse` aceitam; o professor escolhe a altura de partida do salto. */
  initialImpulse?: number
}

/** O padrão dos grupos que a cena ganhou depois que já havia retrato guardado por aí. */
const PLACE_PADRAO: ScenePlace = { x: 110, y: 150, fromX: 110, fromY: 150, visitedX: [110] }
const DESCRIPTION_PADRAO: SceneDescription = { text: '', heard: '', heardEmpty: false }
// ⚠️ A tela nasce em 800 × 480, que é o que o bloco "Preparar o jogo" traz de fábrica — a
// Aula 1 pede para trocar por 480 × 270, e é essa troca que a cena existe para ensinar.
const STAGE_PADRAO: SceneStageSize = { width: 800, height: 480, border: false, tried: 0 }
const RENDER_PADRAO: SceneRender = { loop: false, erase: false, frames: 0, trail: 0 }
// ⚠️ A troca nasce PARADA e o fantasma DESLIGADO: as duas cenas de animação começam no
// desenho parado, que é a coisa que elas querem que a criança veja primeiro.
const ANIMATION_PADRAO: SceneAnimation = {
  frame: 1,
  playing: false,
  rate: 4,
  swaps: 0,
  elapsed: 0,
  onion: false,
  // 40 é um passo GRANDE de propósito: sem o fantasma ela chuta, e com ele vê que chutou.
  shift: 40,
}
const MIRROR_PADRAO: SceneMirror = { on: false, line: 6, painted: [], lastLine: 0 }
const PIXELS_PADRAO: ScenePixels = { kind: 'pixel', zoom: 1 }
const SHEET_PADRAO: SceneSheet = { cell: 1, size: 48, cuts: [] }
const LIFELINE_PADRAO: SceneLifeline = {
  lives: 3,
  points: 0,
  onHit: false,
  scoring: false,
  hits: 0,
  remainder: 0,
}

/**
 * ⚠️⚠️ Um retrato guardado ANTES de a cena ganhar um grupo novo de estado continua válido.
 *
 * `place` e `description` nasceram em 14/09/2026, com as cenas `coordinates` e `screen-reader`.
 * Sem esta hidratação, `isSceneState` recusaria todo checkpoint gravado antes disso — e o
 * player trata recusa como "esta descoberta mudou, recomece": a criança abriria uma cena que
 * ela já tinha mexido e encontraria o trabalho apagado, com um recado de erro. A conclusão em
 * si não se perderia (o servidor nunca rebaixa um `passed:true`), mas a montagem e as
 * comparações guardadas, sim.
 *
 * Grupo novo daqui para a frente entra do mesmo jeito: padrão aqui, e não campo obrigatório na
 * leitura do que já está no banco.
 */
export function hydrateSceneState(value: unknown): unknown {
  if (!isRecord(value)) return value
  const grupos = [
    ['place', PLACE_PADRAO],
    ['description', DESCRIPTION_PADRAO],
    ['stage', STAGE_PADRAO],
    ['render', RENDER_PADRAO],
    ['animation', ANIMATION_PADRAO],
    ['mirror', MIRROR_PADRAO],
    ['pixels', PIXELS_PADRAO],
    ['sheet', SHEET_PADRAO],
    ['lifeline', LIFELINE_PADRAO],
  ] as const
  if (grupos.every(([nome]) => isRecord(value[nome]))) return value
  const saida: Record<string, unknown> = { ...value }
  for (const [nome, padrao] of grupos)
    if (!isRecord(saida[nome])) saida[nome] = { ...(padrao as object) }
  return saida
}

export function initialScene({ scene, initialImpulse }: SceneStart): SceneState {
  const impulso = initialImpulse ?? 9
  return {
    evidence: { actions: 0, discoveries: [], observations: [], hints: 0 },
    // ⚠️ Duas cenas começam DESMONTADAS de propósito: em `world` a criança cria o Dino, e em
    // `gravity` ela liga a gravidade. Nas outras, isso já vem pronto para não roubar o foco.
    world: { created: scene !== 'world', drawn: scene !== 'world', front: false },
    flight: {
      gravity: scene !== 'gravity',
      force: impulso,
      y: 0,
      time: null,
      // ⚠️ O MESMO valor do `force`, e não um 9 cravado: antes do primeiro salto é o `atForce`
      // que o retrato de `observe` guarda, e com o impulso inicial em 14 a cena nascia dizendo
      // que o salto tinha sido de 9. Hoje nenhum teste morde esta linha — nas duas cenas de
      // salto toda observação acontece DEPOIS do salto, que carimba o `atForce` —, então é o
      // `impulso` compartilhado que impede os dois campos de divergirem de novo.
      atForce: impulso,
      atGravity: true,
      peak: 0,
    },
    sound: { onJump: false, count: 0, jumps: 0 },
    crowd: {
      timer: false,
      interval: 1,
      cleanup: false,
      remainder: 0,
      born: 0,
      removed: 0,
      cacti: [],
      elapsed: 0,
    },
    match: {
      guarded: false,
      touch: false,
      restartConnected: false,
      screen: 'start',
      points: 0,
      clockRemainder: 0,
      scoreIdle: 0,
    },
    contact: { distance: 140, width: 48 },
    speed: {
      limited: false,
      base: -5,
      ticks: 0,
      samples: { x: 500, velocity: -5, positions: [], velocities: [] },
    },
    // ⚠️ x 110 e y 150 são os MESMOS números que a Aula 1 pede no bloco "Criar dinossauro".
    // A cena abre onde o projeto dela vai ficar, para o número ter a mesma cara nos dois lugares.
    place: { ...PLACE_PADRAO },
    description: { ...DESCRIPTION_PADRAO },
    stage: { ...STAGE_PADRAO },
    render: { ...RENDER_PADRAO },
    animation: { ...ANIMATION_PADRAO },
    mirror: { ...MIRROR_PADRAO, painted: [] },
    pixels: { ...PIXELS_PADRAO },
    sheet: { ...SHEET_PADRAO, cuts: [] },
    lifeline: { ...LIFELINE_PADRAO },
    caption: '',
  }
}

/** Cópia rasa por grupo — o motor é imutável e devolve um estado novo a cada ação. */
export function cloneScene(state: SceneState): SceneState {
  return {
    evidence: {
      ...state.evidence,
      discoveries: [...state.evidence.discoveries],
      observations: [...state.evidence.observations],
    },
    world: { ...state.world },
    flight: { ...state.flight },
    sound: { ...state.sound },
    crowd: { ...state.crowd, cacti: state.crowd.cacti.map((c) => ({ ...c })) },
    match: { ...state.match },
    contact: { ...state.contact },
    speed: {
      ...state.speed,
      samples: {
        ...state.speed.samples,
        positions: [...state.speed.samples.positions],
        velocities: [...state.speed.samples.velocities],
      },
    },
    place: { ...state.place, visitedX: [...state.place.visitedX] },
    description: { ...state.description },
    stage: { ...state.stage },
    render: { ...state.render },
    animation: { ...state.animation },
    mirror: { ...state.mirror, painted: [...state.mirror.painted] },
    pixels: { ...state.pixels },
    sheet: { ...state.sheet, cuts: [...state.sheet.cuts] },
    lifeline: { ...state.lifeline },
    caption: state.caption,
  }
}

/** A regra de contato, num lugar só. A v1 tinha esta conta escrita três vezes, em duas
 *  parametrizações diferentes (por escala e por largura), e elas já não batiam. */
export function sceneContact(contact: SceneContact): boolean {
  return contact.distance <= contact.width / 2 + 18
}

/** Registra uma descoberta e guarda o retrato do mundo naquele instante. Um id só entra uma
 *  vez em cada lista; a legenda é sempre atualizada, porque é ela que a criança lê. */
export function observe(state: SceneState, id: string, label: string, discovered = true): void {
  if (discovered && !state.evidence.discoveries.includes(id)) state.evidence.discoveries.push(id)
  if (!state.evidence.observations.some((o) => o.id === id))
    state.evidence.observations.push({
      id,
      label,
      height: state.flight.peak,
      force: state.flight.atForce,
      gravity: state.flight.atGravity,
      front: state.world.front,
      distance: state.contact.distance,
      width: state.contact.width,
      collision: sceneContact(state.contact),
      points: state.match.points,
      screen: state.match.screen,
      stored: state.crowd.born - state.crowd.removed,
      visible: state.crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480).length,
      base: state.speed.base,
      x: state.speed.samples.x,
      velocity: state.speed.samples.velocity,
    })
  state.caption = label
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const between = (v: unknown, min: number, max: number): v is number =>
  num(v) && v >= min && v <= max
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const strings = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((s) => typeof s === 'string' && s.length <= 80)
const numbers = (v: unknown, max: number): v is number[] =>
  Array.isArray(v) && v.length <= max && v.every(num)

/**
 * Valida um estado que voltou do servidor, grupo a grupo e campo a campo.
 *
 * ⚠️ Explícito de propósito. A versão anterior descobria os campos por reflexão sobre o
 * exemplar inicial, o que fazia qualquer array novo herdar em silêncio um limite genérico.
 * Aqui, campo que ninguém declarou não passa.
 */
export function isSceneState(value: unknown): value is SceneState {
  if (!isRecord(value)) return false
  const { evidence, world, flight, sound, crowd, match, contact, speed, place, description } = value
  const { stage, render, animation, mirror, pixels, sheet, lifeline } = value
  if (!isRecord(evidence) || !isRecord(world) || !isRecord(flight) || !isRecord(sound)) return false
  if (!isRecord(crowd) || !isRecord(match) || !isRecord(contact) || !isRecord(speed)) return false
  if (!isRecord(place) || !isRecord(description)) return false
  if (!isRecord(stage) || !isRecord(render)) return false
  if (!isRecord(animation) || !isRecord(mirror) || !isRecord(pixels)) return false
  if (!isRecord(sheet) || !isRecord(lifeline)) return false
  if (typeof value.caption !== 'string' || value.caption.length > 500) return false
  if (!num(evidence.actions) || !num(evidence.hints)) return false
  if (!strings(evidence.discoveries, 40)) return false
  if (!Array.isArray(evidence.observations) || evidence.observations.length > 30) return false
  if (!evidence.observations.every(isSceneObservation)) return false
  if (!bool(world.created) || !bool(world.drawn) || !bool(world.front)) return false
  if (!bool(flight.gravity) || !bool(flight.atGravity)) return false
  if (!num(flight.force) || !num(flight.y) || !num(flight.atForce) || !num(flight.peak))
    return false
  if (flight.time !== null && !num(flight.time)) return false
  if (!bool(sound.onJump) || !num(sound.count) || !num(sound.jumps)) return false
  if (!bool(crowd.timer) || !bool(crowd.cleanup)) return false
  // ⚠️ `interval` PRECISA de faixa, não só de ser finito: com 0 o motor faz
  // `Math.floor(x / 0) = Infinity` e o laço de nascimento trava a aba da criança até
  // estourar a memória. Pelo jogo o campo só chega pela ação `interval` (0,5 a 2), então
  // este validador é a única barreira para um checkpoint corrompido.
  if (!between(crowd.interval, SCENE_LIMITS.interval.min, SCENE_LIMITS.interval.max)) return false
  if (!between(crowd.remainder, 0, SCENE_LIMITS.interval.max)) return false
  if (!num(crowd.born) || !num(crowd.removed) || !num(crowd.elapsed)) return false
  // ⚠️ O teto precisa caber no que o motor PRODUZ. Na cena `spawn` sem o relógio ligado —
  // que é o estado inicial dela, e a lição "em cada quadro nasce outro cacto" — nasce um
  // cacto a cada 1/30 s: dois segundos de brincadeira já dão 60. O motor limpa em
  // `x >= -480`, o que limita o vivo a 288.
  if (!Array.isArray(crowd.cacti) || crowd.cacti.length > 320) return false
  if (!crowd.cacti.every((c) => isRecord(c) && num(c.id) && num(c.x) && num(c.velocity)))
    return false
  if (!bool(match.guarded) || !bool(match.touch) || !bool(match.restartConnected)) return false
  if (match.screen !== 'start' && match.screen !== 'playing' && match.screen !== 'end') return false
  if (!num(match.points) || !num(match.clockRemainder) || !num(match.scoreIdle)) return false
  if (!num(contact.distance) || !num(contact.width)) return false
  if (!bool(speed.limited) || !num(speed.base) || !num(speed.ticks)) return false
  if (!isRecord(speed.samples)) return false
  if (!num(speed.samples.x) || !num(speed.samples.velocity)) return false
  if (!numbers(speed.samples.positions, 12) || !numbers(speed.samples.velocities, 12)) return false
  // ⚠️ O endereço vem com FAIXA, não só finito: ele é desenhado direto no palco, e um x de um
  // milhão num checkpoint corrompido tiraria o sprite da tela sem erro nenhum.
  const { placeX, placeY } = SCENE_LIMITS
  if (!between(place.x, placeX.min, placeX.max) || !between(place.y, placeY.min, placeY.max))
    return false
  if (!between(place.fromX, placeX.min, placeX.max)) return false
  if (!between(place.fromY, placeY.min, placeY.max)) return false
  if (!numbers(place.visitedX, 24)) return false
  if (typeof description.text !== 'string' || description.text.length > SCENE_LIMITS.describe.max)
    return false
  if (typeof description.heard !== 'string' || description.heard.length > 260) return false
  if (!bool(description.heardEmpty)) return false
  const { stageWidth, stageHeight } = SCENE_LIMITS
  if (!between(stage.width, stageWidth.min, stageWidth.max)) return false
  if (!between(stage.height, stageHeight.min, stageHeight.max)) return false
  if (!bool(stage.border) || !num(stage.tried)) return false
  if (!bool(render.loop) || !bool(render.erase)) return false
  if (!num(render.frames) || !num(render.trail)) return false
  return isArtState(animation, mirror, pixels, sheet, lifeline)
}

/**
 * Os cinco grupos de desenho e de vidas. Em função própria porque `isSceneState` já estava no
 * limite de tamanho que o Biome aceita, e porque eles entram e saem juntos.
 */
function isArtState(
  animation: Record<string, unknown>,
  mirror: Record<string, unknown>,
  pixels: Record<string, unknown>,
  sheet: Record<string, unknown>,
  lifeline: Record<string, unknown>,
): boolean {
  const L = SCENE_LIMITS
  // ⚠️ O quadro é 1 ou 2, e não "um número qualquer": o palco desenha o que estiver aqui, e
  // um 7 vindo de um retrato adulterado deixaria a cena sem desenho nenhum.
  if (animation.frame !== 1 && animation.frame !== 2) return false
  if (!bool(animation.playing) || !bool(animation.onion)) return false
  if (!between(animation.rate, L.rate.min, L.rate.max)) return false
  if (!between(animation.shift, L.shift.min, L.shift.max)) return false
  if (!num(animation.swaps) || !num(animation.elapsed)) return false
  if (!bool(mirror.on) || !between(mirror.line, L.mirrorLine.min, L.mirrorLine.max)) return false
  if (!numbers(mirror.painted, 24) || !num(mirror.lastLine)) return false
  if (!mirror.painted.every((c) => c >= L.column.min && c <= L.column.max)) return false
  if (pixels.kind !== 'pixel' && pixels.kind !== 'vector') return false
  if (!between(pixels.zoom, L.zoom.min, L.zoom.max)) return false
  if (!between(sheet.cell, L.cell.min, L.cell.max)) return false
  if (!between(sheet.size, L.sprite.min, L.sprite.max)) return false
  // ⚠️ Os VALORES, e não só a quantidade: o mesmo que `mirror.painted` já fazia. Um recorte 99
  // vindo de retrato adulterado não desenha nada na folha de quatro pedaços.
  if (!numbers(sheet.cuts, 4)) return false
  if (!sheet.cuts.every((c) => c >= L.cell.min && c <= L.cell.max)) return false
  if (!bool(lifeline.onHit) || !bool(lifeline.scoring)) return false
  if (!between(lifeline.lives, 0, 3)) return false
  if (!num(lifeline.points) || !num(lifeline.hits)) return false
  return between(lifeline.remainder, 0, 1)
}

function isSceneObservation(value: unknown): value is SceneObservation {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.length > 80) return false
  if (typeof value.label !== 'string' || value.label.length > 500) return false
  if (value.screen !== 'start' && value.screen !== 'playing' && value.screen !== 'end') return false
  if (!bool(value.gravity) || !bool(value.front) || !bool(value.collision)) return false
  return (
    num(value.height) &&
    num(value.force) &&
    num(value.distance) &&
    num(value.width) &&
    num(value.points) &&
    num(value.stored) &&
    num(value.visible) &&
    num(value.base) &&
    num(value.x) &&
    num(value.velocity)
  )
}
