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
  caption: string
}

export interface SceneStart {
  scene: SceneId
  /** Só `gravity` e `impulse` aceitam; o professor escolhe a altura de partida do salto. */
  initialImpulse?: number
}

export function initialScene({ scene, initialImpulse }: SceneStart): SceneState {
  return {
    evidence: { actions: 0, discoveries: [], observations: [], hints: 0 },
    // ⚠️ Duas cenas começam DESMONTADAS de propósito: em `world` a criança cria o Dino, e em
    // `gravity` ela liga a gravidade. Nas outras, isso já vem pronto para não roubar o foco.
    world: { created: scene !== 'world', drawn: scene !== 'world', front: false },
    flight: {
      gravity: scene !== 'gravity',
      force: initialImpulse ?? 9,
      y: 0,
      time: null,
      atForce: 9,
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
  const { evidence, world, flight, sound, crowd, match, contact, speed } = value
  if (!isRecord(evidence) || !isRecord(world) || !isRecord(flight) || !isRecord(sound)) return false
  if (!isRecord(crowd) || !isRecord(match) || !isRecord(contact) || !isRecord(speed)) return false
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
  return numbers(speed.samples.positions, 12) && numbers(speed.samples.velocities, 12)
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
