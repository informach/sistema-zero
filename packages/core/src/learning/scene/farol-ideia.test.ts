import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * Dias 2 e 3 do Farol (02/11/2026): a memória da chave, a pergunta da porta e os dois números, só
 * com a ideia e com o convite à investigação do Cadê. Antes do teste, o Zappy pergunta e diz o que
 * observar; o resultado só aparece na fala de DEPOIS dele.
 */
const falas = new Map(
  (['collect-and-remember', 'lighthouse-key', 'lighthouse-position'] as const).flatMap((cena) =>
    discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const),
  ),
)

describe('Farol, Dias 2 e 3: o Zappy fala da ideia', () => {
  test.each([...falas.keys()])('%s não fala de regra, ação, bloco, então nem senão', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bregra|ação de guardar|\badicion|\bretir|\bbloco|\bentão\b|\bsenão\b|\bcomando/i,
    )
  })

  const ANTES: [string, RegExp][] = [
    ['memory-first', /continuou falso|virou verdadeiro|não guard/i],
    ['memory-first-saved', /continuou falso|virou verdadeiro|não guard/i],
    ['door-with', /abriu|acendeu|avisou|fechada/i],
    ['door-without', /abriu|acendeu|avisou|fechada/i],
    ['position-start', /direita|esquerda|para cima|para baixo/i],
    // A fala que explica um caso já testado não entrega o PRÓXIMO teste.
    ['memory-compare', /virou verdadeiro/i],
    ['memory-compare-off', /continuou falso/i],
    ['memory-away', /não apagou|continua assim/i],
    ['memory-restart', /volta a falso/i],
    ['door-compare-without', /avisou|fechada/i],
    ['door-compare-with', /abriu|acendeu/i],
    ['position-height', /y maior|y menor|para cima|para baixo/i],
    ['position-width', /x maior|x menor|direita|esquerda/i],
  ]
  test.each(ANTES)('%s não conta o resultado antes do teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Farol, Dias 2 e 3: a fala acompanha a ordem que a criança escolheu', () => {
  const tocar = (activity: ExperimentationActivity, actions: SceneAction[]) => {
    const start: SceneStart = { scene: activity.scene, setup: activity.setup }
    const estado = actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
    return discoveryGuidance(activity, estado)?.id
  }

  test('quem começa com a memória ligada é convidado a compará-la desligada', () => {
    const memoria: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'collect-and-remember',
      cenario: 'farol',
      setup: { freeExploration: true },
    }
    expect(tocar(memoria, [])).toBe('memory-first')
    expect(tocar(memoria, [{ type: 'remember-collection', enabled: true }])).toBe(
      'memory-first-saved',
    )
    expect(
      tocar(memoria, [{ type: 'remember-collection', enabled: true }, { type: 'collect-key' }]),
    ).toBe('memory-compare-off')
    expect(tocar(memoria, [{ type: 'collect-key' }])).toBe('memory-compare')
    // Mudou a memória com a chave fora: recomeçar volta à comparação que falta.
    const ligadaPrimeiro: SceneAction[] = [
      { type: 'remember-collection', enabled: true },
      { type: 'collect-key' },
      { type: 'remember-collection', enabled: false },
    ]
    expect(tocar(memoria, ligadaPrimeiro)).toBe('memory-edited')
    expect(tocar(memoria, [...ligadaPrimeiro, { type: 'restart-collection' }])).toBe(
      'memory-compare-off',
    )
  })

  test('a porta testada com a chave primeiro: o Zappy propõe o caso sem a chave', () => {
    const porta: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'lighthouse-key',
      cenario: 'farol',
      setup: { freeExploration: true },
    }
    const dar: SceneAction = { type: 'key-state', hasKey: true }
    const testar: SceneAction = { type: 'try-lighthouse-door' }
    expect(tocar(porta, [dar])).toBe('door-with')
    expect(tocar(porta, [dar, testar])).toBe('door-compare-without')
    // Preparar de novo o caso já testado não repete a pergunta dele.
    expect(tocar(porta, [dar, testar, dar])).toBe('door-compare-without')
    expect(tocar(porta, [dar, testar, { type: 'key-state', hasKey: false }])).toBe('door-without')
  })

  test('quem começa pelo y ouve a explicação do y e é convidado ao x', () => {
    const posicao: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'lighthouse-position',
      cenario: 'farol',
      setup: { freeExploration: true, goals: ['x-minus', 'x-plus', 'y-minus', 'y-plus'] },
    }
    const y = (value: number): SceneAction => ({ type: 'key-position', axis: 'y', value })
    const x = (value: number): SceneAction => ({ type: 'key-position', axis: 'x', value })
    expect(tocar(posicao, [])).toBe('position-start')
    expect(tocar(posicao, [y(250), y(20)])).toBe('position-width')
    expect(tocar(posicao, [x(300), x(100)])).toBe('position-height')
    expect(tocar(posicao, [x(300), x(100), y(250), y(20)])).toBe('position-complete')
  })
})
