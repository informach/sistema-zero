import { isRecord } from './actions'
import {
  type OnceArea,
  type OnceCard,
  type OnceCardId,
  type OnceVsAlwaysPreset,
  oncePreset,
} from './presets'

export type OncePlacement = OnceArea | 'outside'
type CardNumbers = Record<OnceCardId, number>
type CardPlaces = Record<OnceCardId, OncePlacement>

export interface SceneOnce {
  frames: number
  placement: CardPlaces
  placedAtFrame: CardNumbers
  firedAtPlacement: CardNumbers
  fires: CardNumbers
  heroCount: number
  heroX: number
  background: boolean
  shots: number
  sounds: number
  hearts: number
  hits: number
}

const zeroCards = (): CardNumbers => ({ paint: 0, create: 0, move: 0, event: 0, lives: 0 })
const outsideCards = (): CardPlaces => ({
  paint: 'outside',
  create: 'outside',
  move: 'outside',
  event: 'outside',
  lives: 'outside',
})

export function initialOnce(preset: OnceVsAlwaysPreset | undefined): SceneOnce {
  const prepared = oncePreset(preset)
  return {
    frames: 0,
    placement: outsideCards(),
    placedAtFrame: zeroCards(),
    firedAtPlacement: zeroCards(),
    fires: zeroCards(),
    heroCount: prepared.id === 'uma-ficha-vidas' ? 1 : 0,
    heroX: 44,
    background: false,
    shots: 0,
    sounds: 0,
    hearts: 0,
    hits: 0,
  }
}

export function cloneOnce(state: SceneOnce): SceneOnce {
  return {
    ...state,
    placement: { ...state.placement },
    placedAtFrame: { ...state.placedAtFrame },
    firedAtPlacement: { ...state.firedAtPlacement },
    fires: { ...state.fires },
  }
}

export function placeOnce(
  state: SceneOnce,
  preset: OnceVsAlwaysPreset,
  card: OnceCardId,
  area: OncePlacement,
): boolean {
  if (!preset.cards.some((item) => item.id === card)) return false
  if (area !== 'outside' && !preset.areas.includes(area)) return false
  if (state.placement[card] === area) return false
  state.placement[card] = area
  state.placedAtFrame[card] = state.frames
  state.firedAtPlacement[card] = state.fires[card]
  return true
}

function fire(state: SceneOnce, card: OnceCard): void {
  state.fires[card.id] += 1
  switch (card.kind) {
    case 'paint':
      state.background = true
      break
    case 'create':
      state.heroCount += 1
      break
    case 'move':
      state.heroX = Math.min(430, state.heroX + 12)
      break
    case 'shot':
      state.shots += 1
      break
    case 'sound':
      state.sounds += 1
      break
    case 'lives':
      state.hearts = 3
      break
  }
}

/** Um quadro tem ordem fixa: iniciar no primeiro, motor em todos, batida no final. */
export function advanceOnce(state: SceneOnce, preset: OnceVsAlwaysPreset): void {
  state.frames += 1
  for (const card of preset.cards) {
    const area = state.placement[card.id]
    if ((area === 'start' && state.frames === 1) || area === 'loop') fire(state, card)
  }
  if (preset.hitEveryFrames && state.frames % preset.hitEveryFrames === 0) {
    state.hits += 1
    state.hearts = Math.max(0, state.hearts - 1)
  }
}

export function triggerOnce(state: SceneOnce, preset: OnceVsAlwaysPreset): boolean {
  const card = preset.cards.find((item) => item.id === 'event')
  if (!card || state.placement.event !== 'event') return false
  fire(state, card)
  return true
}

/** Evidência derivada do que ficou observável, nunca de colocar uma ficha sem rodar. */
export function onceDiscoveries(state: SceneOnce, preset: OnceVsAlwaysPreset): string[] {
  const found: string[] = []
  if (preset.id === 'uma-ficha-vidas') {
    if (
      state.placement.lives === 'start' &&
      state.placedAtFrame.lives === 0 &&
      state.fires.lives - state.firedAtPlacement.lives === 1 &&
      state.hits >= 2 &&
      state.hearts <= 1
    )
      found.push('once')
    return found
  }
  if (
    state.placement.paint === 'start' &&
    state.placedAtFrame.paint === 0 &&
    state.frames >= 3 &&
    state.fires.paint - state.firedAtPlacement.paint === 1
  )
    found.push('once')
  if (
    state.placement.move === 'loop' &&
    state.frames - state.placedAtFrame.move >= 3 &&
    state.fires.move - state.firedAtPlacement.move >= 3
  )
    found.push('always')
  if (
    state.placement.create === 'start' &&
    state.placement.move === 'loop' &&
    state.placedAtFrame.create === 0 &&
    state.placedAtFrame.move === 0 &&
    state.frames >= 5 &&
    state.fires.create - state.firedAtPlacement.create === 1 &&
    state.fires.move - state.firedAtPlacement.move >= 5 &&
    state.heroCount === 1
  )
    found.push('both')
  if (
    state.placement.event === 'event' &&
    state.frames - state.placedAtFrame.event >= 3 &&
    state.fires.event === state.firedAtPlacement.event
  )
    found.push('on-event')
  if (state.placement.event === 'event' && state.fires.event > state.firedAtPlacement.event)
    found.push('key-fires')
  if (state.placement.event === 'loop' && state.fires.event - state.firedAtPlacement.event >= 5)
    found.push('flood')
  return found
}

const nonnegativeInt = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const cardIds: OnceCardId[] = ['paint', 'create', 'move', 'event', 'lives']
const areas: OncePlacement[] = ['outside', 'start', 'loop', 'event']

export function isSceneOnce(value: unknown): value is SceneOnce {
  if (!isRecord(value)) return false
  if (!isRecord(value.placement) || !isRecord(value.placedAtFrame)) return false
  if (!isRecord(value.firedAtPlacement) || !isRecord(value.fires)) return false
  const placement = value.placement
  const placedAtFrame = value.placedAtFrame
  const firedAtPlacement = value.firedAtPlacement
  const fires = value.fires
  if (
    !cardIds.every((id) => {
      const area = placement[id]
      return typeof area === 'string' && areas.some((known) => known === area)
    })
  )
    if (!cardIds.every((id) => nonnegativeInt(placedAtFrame[id]))) return false
  if (!cardIds.every((id) => nonnegativeInt(firedAtPlacement[id]))) return false
  if (!cardIds.every((id) => nonnegativeInt(fires[id]))) return false
  return (
    nonnegativeInt(value.frames) &&
    nonnegativeInt(value.heroCount) &&
    nonnegativeInt(value.heroX) &&
    typeof value.background === 'boolean' &&
    nonnegativeInt(value.shots) &&
    nonnegativeInt(value.sounds) &&
    nonnegativeInt(value.hearts) &&
    nonnegativeInt(value.hits)
  )
}
