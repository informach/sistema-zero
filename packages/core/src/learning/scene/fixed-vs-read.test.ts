import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart } from './state'

const start: SceneStart = { scene: 'fixed-vs-read' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('o número escrito e o número lido', () => {
  test('dois disparos com 400 escrito deixam marcas iguais apesar de a nave mudar de lugar', () => {
    let state = act(openScene(start), { type: 'shoot' })
    state = act(state, { type: 'place', x: 700, y: 0 })
    state = act(state, { type: 'shoot' })
    expect(state.fixedRead.marks.map((mark) => [mark.x, mark.heroX])).toEqual([
      [400, 400],
      [400, 700],
    ])
    expect(state.evidence.discoveries).toContain('same-spot')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('a leitura usa a posição atual uma vez, e o tiro antigo mantém seu caminho', () => {
    let state = act(openScene(start), { type: 'value-source', source: 'read' })
    state = act(state, { type: 'place', x: 600, y: 0 })
    state = act(state, { type: 'shoot' })
    const oldShot = state.fixedRead.shots[0]
    state = act(state, { type: 'place', x: 250, y: 0 })
    state = act(state, { type: 'advance', seconds: 1 })
    expect(state.fixedRead.shots[0]?.x).toBe(oldShot?.x)
    expect(state.fixedRead.shots[0]?.y).toBeLessThan(oldShot?.y ?? 0)
    expect(state.evidence.discoveries).toContain('follows')
  })

  test('a marca da caixa depende de um disparo alinhado; limpar não apaga o tiro', () => {
    let state = act(openScene(start), { type: 'place', x: 600, y: 0 })
    state = act(state, { type: 'box-marks', on: true })
    state = act(state, { type: 'shoot' })
    expect(state.evidence.discoveries).not.toContain('box-marks')
    state = act(state, { type: 'value-source', source: 'read' })
    state = act(state, { type: 'shoot' })
    expect(state.evidence.discoveries).toContain('box-marks')
    state = act(state, { type: 'clear-marks' })
    expect(state.fixedRead.marks).toEqual([])
    expect(state.fixedRead.shots).toHaveLength(2)
  })

  test('voltar ao começo preserva as descobertas e restaura o caso preparado', () => {
    let state = act(openScene(start), { type: 'shoot' })
    state = act(state, { type: 'place', x: 700, y: 0 })
    state = act(state, { type: 'shoot' })
    state = act(state, { type: 'reset' })
    expect(state.fixedRead).toEqual(openScene(start).fixedRead)
    expect(state.evidence.discoveries).toContain('same-spot')
  })
})
