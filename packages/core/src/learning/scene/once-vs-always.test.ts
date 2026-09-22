import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { type ExperimentationActivity, sceneTargets } from './index'
import { initialOnce, isSceneOnce } from './once-vs-always'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'
import type { SceneStart, SceneState } from './state'

function lab(
  id: keyof typeof ONCE_VS_ALWAYS_PRESETS,
  goals: string[],
): {
  start: SceneStart
  targets: readonly string[]
  get: () => SceneState
  place: (
    card: 'paint' | 'create' | 'move' | 'event' | 'lives' | 'panel',
    area: 'start' | 'loop' | 'event',
  ) => void
  frames: (count: number) => void
  trigger: () => void
  reset: () => void
} {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene: 'once-vs-always',
    setup: { preset: ONCE_VS_ALWAYS_PRESETS[id], goals },
  }
  const start: SceneStart = { scene: activity.scene, setup: activity.setup }
  let state = openScene(start)
  const send = (action: Parameters<typeof stepScene>[2]) => {
    state = stepScene(start, state, action)
  }
  return {
    start,
    targets: sceneTargets(activity),
    get: () => state,
    place: (card, area) => send({ type: 'place-in-area', card, area }),
    frames: (count) => {
      for (let i = 0; i < count; i++) send({ type: 'advance', seconds: 0.25 })
    },
    trigger: () => send({ type: 'trigger' }),
    reset: () => send({ type: 'reset' }),
  }
}

describe('uma vez, sempre e na hora', () => {
  test('o piloto usa uma preparação visível sem ensinar que criar também desenha', () => {
    const c = lab('duas-caixas-nave', ['once', 'always', 'both'])
    expect(ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'].cards).toEqual([
      { id: 'panel', kind: 'panel', label: 'Ligar a nave' },
      { id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' },
    ])
    expect(c.get().once.heroCount).toBe(1)
    expect(c.get().evidence.discoveries).toEqual([])
    c.place('panel', 'start')
    c.place('move', 'loop')
    c.frames(5)
    expect(c.get().once.fires.panel).toBe(1)
    expect(c.get().once.fires.move).toBe(5)
    expect(c.get().evidence.discoveries).toContain('once')
    expect(c.get().evidence.discoveries).toContain('always')
    expect(c.get().evidence.discoveries).toContain('both')
    expect(
      evaluateExperimentation('once-vs-always', c.get(), true, undefined, c.targets).passed,
    ).toBe(true)
  })

  test('o caso do Dino mantém as fichas próprias e um disparo por quadro no motor', () => {
    const c = lab('duas-caixas-dino', ['once', 'always', 'both'])
    c.place('paint', 'start')
    c.place('move', 'loop')
    c.frames(3)
    expect(c.get().once.fires.paint).toBe(1)
    expect(c.get().once.fires.move).toBe(3)
    c.reset()
    c.place('create', 'start')
    c.place('move', 'loop')
    c.frames(5)
    expect(c.get().once.heroCount).toBe(1)
    expect(c.get().once.fires.create).toBe(1)
    expect(c.get().once.fires.move).toBe(5)
    expect(
      evaluateExperimentation('once-vs-always', c.get(), true, undefined, c.targets).passed,
    ).toBe(true)
  })

  test('o evento espera a tecla e, no motor, cria um tiro por quadro', () => {
    const c = lab('tres-caixas-tiro', ['on-event', 'key-fires', 'flood'])
    c.place('event', 'event')
    c.frames(3)
    expect(c.get().once.fires.event).toBe(0)
    expect(c.get().evidence.discoveries).toContain('on-event')
    c.trigger()
    expect(c.get().once.shots).toBe(1)
    expect(c.get().evidence.discoveries).toContain('key-fires')
    c.reset()
    c.place('event', 'loop')
    c.frames(5)
    expect(c.get().once.shots).toBe(5)
    expect(c.get().evidence.discoveries).toContain('flood')
    expect(
      evaluateExperimentation('once-vs-always', c.get(), true, undefined, c.targets).passed,
    ).toBe(true)
  })

  test('o preset do som dispara com a tecla, sem criar tiros', () => {
    const c = lab('tres-caixas-som', ['on-event', 'key-fires'])
    c.place('event', 'event')
    c.frames(3)
    c.trigger()
    expect(c.get().once.sounds).toBe(1)
    expect(c.get().once.shots).toBe(0)
    expect(
      evaluateExperimentation('once-vs-always', c.get(), true, undefined, c.targets).passed,
    ).toBe(true)
  })

  test('vidas dadas uma vez diminuem em duas batidas agendadas', () => {
    const c = lab('uma-ficha-vidas', ['once'])
    c.place('lives', 'start')
    c.frames(6)
    expect(c.get().once.hits).toBe(2)
    expect(c.get().once.hearts).toBe(1)
    expect(c.get().evidence.discoveries).toContain('once')
    c.reset()
    expect(c.get().once.frames).toBe(0)
    expect(c.get().once.placement.lives).toBe('outside')
    expect(c.get().once.fires.lives).toBe(0)
    expect(c.get().evidence.discoveries).toContain('once')
    c.place('lives', 'loop')
    c.frames(9)
    expect(c.get().once.hits).toBe(3)
    expect(c.get().once.hearts).toBe(2)
  })

  test('mudar a ficha depois de o jogo começar não inventa um começo que não houve', () => {
    const c = lab('duas-caixas-nave', ['once', 'both'])
    c.place('panel', 'loop')
    c.frames(1)
    c.place('panel', 'start')
    c.place('move', 'loop')
    c.frames(5)
    expect(c.get().evidence.discoveries).not.toContain('once')
    expect(c.get().evidence.discoveries).not.toContain('both')
    c.reset()
    c.place('panel', 'start')
    c.place('move', 'loop')
    c.frames(5)
    expect(c.get().evidence.discoveries).toContain('once')
    expect(c.get().evidence.discoveries).toContain('both')
  })

  test('o retrato recusa área desconhecida e números negativos', () => {
    const valid = initialOnce(ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'])
    expect(isSceneOnce(valid)).toBe(true)
    expect(
      isSceneOnce({
        ...valid,
        placement: { ...valid.placement, panel: 'inventada' },
      }),
    ).toBe(false)
    expect(isSceneOnce({ ...valid, frames: -1 })).toBe(false)
    expect(
      isSceneOnce({
        ...valid,
        placedAtFrame: { ...valid.placedAtFrame, panel: -1 },
      }),
    ).toBe(false)
  })
})
