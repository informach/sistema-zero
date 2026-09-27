import { describe, expect, test } from 'bun:test'
import { sceneDefaultGoalIds } from './catalog'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'

const scene = 'screen-reader' as const
const fraseAntiga = 'Corra com o dino e pule os cactos apertando espaço.'

describe('a descrição conta todos os controles', () => {
  test('a frase da Aula 1 continua sendo o caso preparado, sem completar a revisita', () => {
    const start = {
      scene,
      setup: {
        actions: [{ type: 'describe' as const, text: fraseAntiga }],
        goals: ['says-all-controls'],
      },
    }
    let state = openScene(start)
    expect(state.description.text).toBe(fraseAntiga)
    expect(state.evidence.discoveries).not.toContain('says-all-controls')
    state = stepScene(start, state, { type: 'listen' })
    expect(state.evidence.discoveries).not.toContain('says-all-controls')
    expect(evaluateExperimentation(scene, state, true, undefined, start.setup.goals).passed).toBe(
      false,
    )
  })

  test('só a frase com objetivo e os três controles conclui a revisita', () => {
    const start = { scene }
    let state = openScene(start)
    state = stepScene(start, state, {
      type: 'describe',
      text: 'Pule os cactos com espaço, com a seta para cima ou com toque na tela.',
    })
    state = stepScene(start, state, { type: 'listen' })
    expect(state.evidence.discoveries).toContain('says-all-controls')
    expect(
      evaluateExperimentation(scene, state, true, undefined, ['says-all-controls']).passed,
    ).toBe(true)
  })

  test('a Aula 1 não ganha uma meta que pertence à revisita', () => {
    expect(sceneDefaultGoalIds(scene)).not.toContain('says-all-controls')
  })
})
