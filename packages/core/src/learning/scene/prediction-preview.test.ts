import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
import { SCENE_MODELS } from './catalog'
import { scenePredictionPreview } from './prediction-preview'

describe('a prévia segura da cena', () => {
  test('toda cena declara uma prévia e abre no estado inicial sem descobertas', () => {
    for (const scene of SCENE_IDS) {
      expect(SCENE_MODELS[scene].predictionPreview, scene).toBeDefined()
      const { preview, state } = scenePredictionPreview({ type: 'experimentation', scene })
      expect(preview.initial, scene).toBe(true)
      expect(state.evidence.discoveries, scene).toEqual([])
    }
  })

  test('a prévia usa o caso real da atividade, mas não carrega as descobertas dele', () => {
    const { state } = scenePredictionPreview({
      type: 'experimentation',
      scene: 'coordinates',
      cast: { hero: { name: 'nave', gender: 'f' } },
      setup: {
        actions: [{ type: 'place', x: 400, y: 40 }],
        goals: ['down'],
      },
    })
    expect(state.place.x).toBe(400)
    expect(state.place.y).toBe(40)
    expect(state.evidence.discoveries).toEqual([])
  })

  test('layers declara as informações que não podem aparecer antes do palpite', () => {
    const { preview } = scenePredictionPreview({ type: 'experimentation', scene: 'layers' })
    expect(preview.conceal).toEqual(['layers-order'])
  })

  test('leitor de tela começa sem texto escrito, escutado ou controle antecipado', () => {
    const { preview, state } = scenePredictionPreview({
      type: 'experimentation',
      scene: 'screen-reader',
    })
    expect(state.description.text).toBe('')
    expect(state.description.heard).toBe('')
    expect('control' in preview).toBe(false)
  })
})
