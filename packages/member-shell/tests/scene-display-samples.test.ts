import { describe, expect, test } from 'bun:test'
import {
  castText,
  openScene,
  SCENE_IDS,
  sceneReadout,
  sceneSituation,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { sceneDisplaySamples } from '../src/components/scene-display-samples'

describe('amostras visuais da experiência', () => {
  test('cobrem todas as cenas e a abertura real continua representada', () => {
    for (const scene of SCENE_IDS) {
      const samples = sceneDisplaySamples(scene)
      const initial = openScene(sceneStart({ type: 'experimentation', scene }))
      expect(samples.readouts.length, scene).toBeGreaterThanOrEqual(
        sceneReadout(scene, initial).length,
      )
      expect(samples.situations.length, scene).toBeGreaterThan(0)
      expect(samples.situations, scene).toContain(sceneSituation(scene, initial))
    }
  })

  test('reserva os números e as frases que aparecem após a pedra se mover', () => {
    const scene = 'velocity'
    const start = sceneStart({ type: 'experimentation', scene })
    const initial = openScene(start)
    const moved = stepScene(start, initial, { type: 'velocity', vx: -5, vy: 0 })
    const samples = sceneDisplaySamples(scene)
    expect(samples.readouts[0]?.value.length).toBeGreaterThanOrEqual(
      sceneReadout(scene, moved)[0]?.value.length ?? 0,
    )
    expect(samples.situations).toContain(sceneSituation(scene, moved))
  })

  test('veste as amostras com o elenco da atividade', () => {
    const cast = { hero: { name: 'pedra', gender: 'f' as const } }
    const samples = sceneDisplaySamples('velocity', cast)
    expect(samples.situations.some((text) => text.includes('pedra'))).toBe(true)
    expect(samples.situations.every((text) => text === castText(text, cast))).toBe(true)
  })

  test('reserva o vocabulário certo para quadro e ações feitas', () => {
    expect(sceneDisplaySamples('draw-loop').readouts[0]?.label).toBe('quadro')
    expect(sceneDisplaySamples('once-vs-always').readouts[0]?.label).toBe('ações feitas')
  })
})
