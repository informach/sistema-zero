import { describe, expect, test } from 'bun:test'
import { discoveryGuidance } from './discovery-guidance'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { isSceneActivity } from './index'
import { sceneReadout, sceneSituation } from './readout'

describe('touch-response', () => {
  test('é uma experimentação nativa do catálogo', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: 'touch-response' })).toBe(true)
  })

  test('só conclui depois de testar sem reação e depois ver a resposta', () => {
    const start = { scene: 'touch-response' } as const
    let state = openScene(start)
    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: true })
    expect(sceneGoals(start.scene, state).filter((goal) => goal.complete)).toHaveLength(0)

    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: false })
    state = stepScene(start, state, { type: 'start', input: 'tap' })
    expect(state.match.screen).toBe('start')
    expect(
      sceneGoals(start.scene, state)
        .filter((goal) => goal.complete)
        .map((goal) => goal.id),
    ).toEqual(['no-response'])

    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: true })
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
    state = stepScene(start, state, { type: 'start', input: 'tap' })
    expect(state.match.screen).toBe('playing')
    expect(evaluateExperimentation(start.scene, state).passed).toBe(true)
    expect(sceneReadout(start.scene, state)).toContainEqual({
      label: 'arbusto',
      value: 'invisível',
      tone: 'a',
    })
    expect(sceneSituation(start.scene, state)).toBe(
      'O arbusto ficou invisível e o coelho apareceu.',
    )

    const novoTeste = stepScene(start, state, { type: 'home' })
    expect(novoTeste.match.screen).toBe('start')
    expect(novoTeste.match.touch).toBe(true)
    expect(sceneSituation(start.scene, novoTeste)).toBe('O arbusto está visível.')

    const reinicio = stepScene(start, state, { type: 'reset' })
    expect(reinicio.match.screen).toBe('start')
    expect(reinicio.match.touch).toBe(false)
  })
})

describe('touch-response livre: a fala pede o teste que falta, com a regra como está', () => {
  // Full review de 08/11/2026: com a regra já tirada, o Zappy pedia "Agora tire a regra" ou testar
  // a regra nas pedras, sem regra nenhuma encaixada.
  const activity = {
    type: 'experimentation' as const,
    scene: 'touch-response' as const,
    cenario: 'jardim' as const,
    setup: { freeExploration: true, goals: ['no-response', 'responds', 'second-target'] },
  }
  const start = { scene: 'touch-response' as const, setup: activity.setup }
  const fala = (acoes: Parameters<typeof stepScene>[2][]) =>
    discoveryGuidance(
      activity,
      acoes.reduce((s, a) => stepScene(start, s, a), openScene(start)),
    )?.id
  const ENCAIXA = { type: 'connect', port: 'touch', enabled: true } as const
  const TIRA = { type: 'connect', port: 'touch', enabled: false } as const
  const ARBUSTO = { type: 'touch-hiding-place', id: 0 } as const

  test('encaixou, achou e tirou a regra: pede o toque sem ela', () => {
    expect(fala([ENCAIXA, ARBUSTO])).toBe('touch-with')
    expect(fala([ENCAIXA, ARBUSTO, TIRA])).toBe('touch-without')
  })

  test('já testou sem e com a regra, e a regra está fora: pede para encaixar e tocar nas pedras', () => {
    expect(fala([ARBUSTO, ENCAIXA, { type: 'restart-hiding-places' }, ARBUSTO, TIRA])).toBe(
      'touch-stones',
    )
  })
})
