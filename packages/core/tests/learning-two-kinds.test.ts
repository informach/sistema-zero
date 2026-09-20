import { describe, expect, test } from 'bun:test'
import {
  blockCheckpoint,
  blockPrediction,
  type InteractiveBlock,
  isInteractiveBlock,
} from '../src/learning'
import { SCENE_MODELS } from '../src/learning/scene'
import { LESSON_SECTION_TEMPLATES } from '../src/learning/section-templates'

const experiment: InteractiveBlock = {
  kind: 'interactive',
  title: 'Teste a velocidade',
  instructions: 'Mude a velocidade e observe.',
  hints: [],
  required: true,
  activity: { type: 'experimentation', scene: 'velocity' },
}

describe('contrato do bloco interativo', () => {
  test('aceita experimentação e HTML, mas recusa os formatos removidos', () => {
    expect(isInteractiveBlock(experiment)).toBe(true)
    expect(
      isInteractiveBlock({
        ...experiment,
        required: false,
        activity: { type: 'html', html: '<p>Oi</p>' },
      }),
    ).toBe(true)
    expect(
      isInteractiveBlock({ ...experiment, activity: { type: 'demonstration', scene: 'velocity' } }),
    ).toBe(false)
    expect(isInteractiveBlock({ ...experiment, activity: { type: 'question' } })).toBe(false)
  })

  test('mantém palpite e pergunta final anexados à experimentação', () => {
    expect(blockPrediction(experiment)?.choices.length).toBeGreaterThan(0)
    expect(blockCheckpoint(experiment)?.choices.length).toBeGreaterThan(0)
  })

  test('o catálogo não tem roteiro e os modelos não pedem demonstração', () => {
    expect(Object.values(SCENE_MODELS).every((model) => !('script' in model))).toBe(true)
    expect(LESSON_SECTION_TEMPLATES.map((template) => String(template.intent))).not.toContain(
      'demonstration',
    )
  })
})
