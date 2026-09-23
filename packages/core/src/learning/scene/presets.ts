import { isRecord } from './actions'

/** A área em que uma ficha da once-vs-always pode ficar. */
export type OnceArea = 'start' | 'loop' | 'event'
export type OnceCardId = 'paint' | 'create' | 'move' | 'event' | 'lives' | 'panel'
export type OnceCardKind = 'paint' | 'create' | 'move' | 'shot' | 'sound' | 'lives' | 'panel'

export interface OnceCard {
  id: OnceCardId
  kind: OnceCardKind
  label: string
}

/** Configuração que o bloco da aula guarda; as cinco opções abaixo são modelos de autoria. */
export interface OnceVsAlwaysPreset {
  id:
    | 'duas-caixas-nave'
    | 'tres-caixas-tiro'
    | 'uma-ficha-vidas'
    | 'duas-caixas-dino'
    | 'tres-caixas-som'
  areas: OnceArea[]
  cards: OnceCard[]
  /** Só o contrafactual das vidas: a pedra bate a cada N quadros. */
  hitEveryFrames?: number
}

export interface OnceGoalCards {
  once?: OnceCardId
  always?: OnceCardId
  both?: { start: OnceCardId; loop: OnceCardId }
  event?: OnceCardId
}

export interface RandomPreset {
  id: 'cacto-direita' | 'pedra-acima'
  axis: 'right' | 'above'
  speedModule: boolean
}

export interface SpawnPreset {
  id: 'cacto-segundos' | 'pedra-quadros'
  unit: 'seconds' | 'frames'
  intervals: number[]
  falling: boolean
}

export interface CleanupPreset {
  id: 'cacto-esquerda' | 'tiro-cima'
  exit: 'left' | 'top'
  incoming: boolean
}

export interface GameStatePreset {
  id: 'cacto-18-quadros' | 'pedra-40-quadros'
  clockFrames: 18 | 40
  waitingSeconds: 2 | 4
  moment: 'state' | 'screen'
}

export type ScenePreset =
  | OnceVsAlwaysPreset
  | RandomPreset
  | SpawnPreset
  | CleanupPreset
  | GameStatePreset

export const GAME_STATE_PRESETS = {
  'cacto-18-quadros': {
    id: 'cacto-18-quadros',
    clockFrames: 18,
    waitingSeconds: 2,
    moment: 'state',
  },
  'pedra-40-quadros': {
    id: 'pedra-40-quadros',
    clockFrames: 40,
    waitingSeconds: 4,
    moment: 'screen',
  },
} as const satisfies Record<GameStatePreset['id'], GameStatePreset>

export function isGameStatePreset(value: unknown): value is GameStatePreset {
  if (!isRecord(value)) return false
  const model = GAME_STATE_PRESETS[value.id as GameStatePreset['id']]
  return Boolean(
    model &&
      value.clockFrames === model.clockFrames &&
      value.waitingSeconds === model.waitingSeconds &&
      value.moment === model.moment,
  )
}

export function gameStatePreset(value: ScenePreset | undefined): GameStatePreset {
  return value && isGameStatePreset(value) ? value : GAME_STATE_PRESETS['cacto-18-quadros']
}

export const CLEANUP_PRESETS = {
  'cacto-esquerda': { id: 'cacto-esquerda', exit: 'left', incoming: true },
  'tiro-cima': { id: 'tiro-cima', exit: 'top', incoming: false },
} as const satisfies Record<CleanupPreset['id'], CleanupPreset>

export function isCleanupPreset(value: unknown): value is CleanupPreset {
  if (!isRecord(value)) return false
  const model = CLEANUP_PRESETS[value.id as CleanupPreset['id']]
  return Boolean(model && value.exit === model.exit && value.incoming === model.incoming)
}

export function cleanupPreset(value: ScenePreset | undefined): CleanupPreset {
  return value && isCleanupPreset(value) ? value : CLEANUP_PRESETS['cacto-esquerda']
}

export const RANDOM_PRESETS = {
  'cacto-direita': { id: 'cacto-direita', axis: 'right', speedModule: true },
  'pedra-acima': { id: 'pedra-acima', axis: 'above', speedModule: false },
} as const satisfies Record<RandomPreset['id'], RandomPreset>

export const SPAWN_PRESETS = {
  'cacto-segundos': {
    id: 'cacto-segundos',
    unit: 'seconds',
    intervals: [0.5, 1, 1.4, 2],
    falling: false,
  },
  'pedra-quadros': {
    id: 'pedra-quadros',
    unit: 'frames',
    intervals: [20, 40, 80],
    falling: true,
  },
} as const satisfies Record<SpawnPreset['id'], SpawnPreset>

export const RANDOM_GOALS_BY_PRESET: Record<RandomPreset['id'], readonly string[]> = {
  'cacto-direita': ['positions', 'repeat', 'velocities'],
  'pedra-acima': ['positions', 'repeat', 'above'],
}

export const SPAWN_GOALS_BY_PRESET: Record<SpawnPreset['id'], readonly string[]> = {
  'cacto-segundos': ['every-frame', 'with-timer'],
  'pedra-quadros': ['every-frame', 'with-timer', 'same-fall'],
}

export function isRandomPreset(value: unknown): value is RandomPreset {
  if (!isRecord(value)) return false
  const model = RANDOM_PRESETS[value.id as RandomPreset['id']]
  return Boolean(model && value.axis === model.axis && value.speedModule === model.speedModule)
}

export function isSpawnPreset(value: unknown): value is SpawnPreset {
  if (!isRecord(value)) return false
  const model = SPAWN_PRESETS[value.id as SpawnPreset['id']]
  return Boolean(
    model &&
      value.unit === model.unit &&
      value.falling === model.falling &&
      Array.isArray(value.intervals) &&
      value.intervals.length === model.intervals.length &&
      value.intervals.every((interval, index) => interval === model.intervals[index]),
  )
}

export function randomPreset(value: ScenePreset | undefined): RandomPreset {
  return value && isRandomPreset(value) ? value : RANDOM_PRESETS['cacto-direita']
}

export function spawnPreset(value: ScenePreset | undefined): SpawnPreset {
  return value && isSpawnPreset(value) ? value : SPAWN_PRESETS['cacto-segundos']
}

export const ONCE_VS_ALWAYS_PRESETS = {
  'duas-caixas-nave': {
    id: 'duas-caixas-nave',
    areas: ['start', 'loop'],
    cards: [{ id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' }],
  },
  'tres-caixas-tiro': {
    id: 'tres-caixas-tiro',
    areas: ['start', 'loop', 'event'],
    cards: [
      { id: 'paint', kind: 'paint', label: 'Pintar o fundo' },
      { id: 'create', kind: 'create', label: 'Criar a nave' },
      { id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' },
      { id: 'event', kind: 'shot', label: 'Criar um tiro' },
    ],
  },
  'uma-ficha-vidas': {
    id: 'uma-ficha-vidas',
    areas: ['start', 'loop'],
    cards: [{ id: 'lives', kind: 'lives', label: 'Dar três vidas à nave' }],
    hitEveryFrames: 3,
  },
  'duas-caixas-dino': {
    id: 'duas-caixas-dino',
    areas: ['start', 'loop'],
    cards: [
      { id: 'paint', kind: 'paint', label: 'Pintar o fundo' },
      { id: 'create', kind: 'create', label: 'Criar o Dino' },
      { id: 'move', kind: 'move', label: 'Mover o Dino um pouquinho' },
    ],
  },
  'tres-caixas-som': {
    id: 'tres-caixas-som',
    areas: ['start', 'loop', 'event'],
    cards: [
      { id: 'paint', kind: 'paint', label: 'Pintar o fundo' },
      { id: 'create', kind: 'create', label: 'Criar o Dino' },
      { id: 'move', kind: 'move', label: 'Mover o Dino um pouquinho' },
      { id: 'event', kind: 'sound', label: 'Tocar efeito · pulo' },
    ],
  },
} as const satisfies Record<OnceVsAlwaysPreset['id'], OnceVsAlwaysPreset>

/** As fichas que tornam cada descoberta observável em cada caso da cena. */
export const ONCE_GOAL_CARDS_BY_PRESET = {
  'duas-caixas-nave': {
    once: 'move',
    always: 'move',
  },
  'tres-caixas-tiro': { event: 'event' },
  'uma-ficha-vidas': { once: 'lives' },
  'duas-caixas-dino': {
    once: 'paint',
    always: 'move',
    both: { start: 'create', loop: 'move' },
  },
  'tres-caixas-som': { event: 'event' },
} as const satisfies Record<OnceVsAlwaysPreset['id'], OnceGoalCards>

export function onceGoalCards(preset: OnceVsAlwaysPreset): OnceGoalCards {
  return ONCE_GOAL_CARDS_BY_PRESET[preset.id]
}

export const ONCE_GOALS_BY_PRESET: Record<OnceVsAlwaysPreset['id'], readonly string[]> = {
  'duas-caixas-nave': ['once', 'always'],
  'tres-caixas-tiro': ['on-event', 'key-fires', 'flood'],
  'uma-ficha-vidas': ['once'],
  'duas-caixas-dino': ['once', 'always', 'both'],
  'tres-caixas-som': ['on-event', 'key-fires'],
}

export function isOnceVsAlwaysPreset(value: unknown): value is OnceVsAlwaysPreset {
  if (!isRecord(value)) return false
  const candidate = value
  const id = candidate.id
  if (!isPresetId(id)) return false
  const model: OnceVsAlwaysPreset = ONCE_VS_ALWAYS_PRESETS[id]
  if (!Array.isArray(candidate.areas) || candidate.areas.length !== model.areas.length) return false
  if (!candidate.areas.every((area, index) => area === model.areas[index])) return false
  if (!Array.isArray(candidate.cards) || candidate.cards.length !== model.cards.length) return false
  if (
    !candidate.cards.every((card, index) => {
      if (!isRecord(card)) return false
      const row = card
      return (
        row.id === model.cards[index]?.id &&
        row.kind === model.cards[index]?.kind &&
        typeof row.label === 'string' &&
        row.label.trim().length > 0 &&
        row.label.length <= 80
      )
    })
  )
    return false
  return candidate.hitEveryFrames === model.hitEveryFrames
}

function isPresetId(value: unknown): value is keyof typeof ONCE_VS_ALWAYS_PRESETS {
  return typeof value === 'string' && Object.hasOwn(ONCE_VS_ALWAYS_PRESETS, value)
}

export function oncePreset(value: ScenePreset | undefined): OnceVsAlwaysPreset {
  return value && isOnceVsAlwaysPreset(value) ? value : ONCE_VS_ALWAYS_PRESETS['duas-caixas-dino']
}
