import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, numberLineAnswer, type SceneStart } from './state'

const start: SceneStart = { scene: 'number-line' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('a régua dos negativos', () => {
  test('três Somar -1 movem o marcador três casas para a esquerda', () => {
    let state = openScene(start)
    for (let i = 0; i < 3; i++) state = act(state, { type: 'sum-minus-one' })
    expect(state.numberLine.value).toBe(-8)
    expect(state.numberLine.presses).toBe(3)
    expect(state.evidence.discoveries).toContain('colder')
  })

  test('o sinal muda a resposta sem mover o marcador; em -9, maior que vira não', () => {
    let state = act(openScene(start), { type: 'compare-op', operator: '>' })
    expect(state.numberLine.value).toBe(-5)
    expect(numberLineAnswer(state.numberLine)).toBe(true)
    expect(state.evidence.discoveries).toContain('greater')
    state = act(state, { type: 'step-value', value: -9 })
    expect(numberLineAnswer(state.numberLine)).toBe(false)
    expect(state.evidence.discoveries).toContain('stops')
  })

  test('o igual responde não durante o caminho e sim apenas no -9', () => {
    let state = openScene(start)
    for (let i = 0; i < 3; i++) {
      state = act(state, { type: 'sum-minus-one' })
      expect(numberLineAnswer(state.numberLine)).toBe(false)
    }
    state = act(state, { type: 'sum-minus-one' })
    expect(numberLineAnswer(state.numberLine)).toBe(true)
    expect(state.evidence.discoveries).toContain('silent')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('voltar ao começo repõe -5 e mantém o sinal escolhido', () => {
    let state = act(openScene(start), { type: 'compare-op', operator: '>' })
    state = act(state, { type: 'sum-minus-one' })
    state = act(state, { type: 'reset' })
    expect(state.numberLine).toEqual({
      value: -5,
      operator: '>',
      presses: 0,
      equalPresses: 0,
      sawFalseEqual: false,
    })
  })

  test('quatro apertos com outro sinal não entregam a descoberta do igual', () => {
    let state = act(openScene(start), { type: 'compare-op', operator: '>' })
    for (let i = 0; i < 4; i++) state = act(state, { type: 'sum-minus-one' })
    state = act(state, { type: 'compare-op', operator: '=' })
    expect(state.numberLine.value).toBe(-9)
    expect(state.numberLine.equalPresses).toBe(0)
    expect(state.evidence.discoveries).not.toContain('silent')
  })
})
