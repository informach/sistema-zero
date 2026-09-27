import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart, UNIQUE_NAME_WARNINGS, uniqueNamesWarning } from './state'

const start: SceneStart = { scene: 'unique-names' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('um nome pertence a uma coisa', () => {
  test('sem criador, os três leitores avisam e a prévia segura a última posição', () => {
    let state = act(openScene(start), { type: 'advance', seconds: 1 })
    const last = state.uniqueNames.previewX
    state = act(state, { type: 'toggle-block', present: false })
    state = act(state, { type: 'advance', seconds: 1 })
    expect(uniqueNamesWarning(state.uniqueNames)).toBe('missing')
    expect(UNIQUE_NAME_WARNINGS.missing).toBe('O nome “nave” ainda não foi criado neste jogo')
    expect(state.uniqueNames.previewX).toBe(last)
    expect(state.evidence.discoveries).toContain('missing')
  })

  test('nome repetido é recusado; nome próprio religa a prévia', () => {
    let state = act(openScene(start), { type: 'name-field', name: 'nave' })
    expect(uniqueNamesWarning(state.uniqueNames)).toBe('clash')
    expect(UNIQUE_NAME_WARNINGS.clash).toBe(
      'O nome “nave” já foi criado neste trecho; escolha um nome diferente',
    )
    const last = state.uniqueNames.previewX
    state = act(state, { type: 'advance', seconds: 1 })
    expect(state.uniqueNames.previewX).toBe(last)
    state = act(state, { type: 'name-field', name: 'folha-nave' })
    expect(uniqueNamesWarning(state.uniqueNames)).toBeNull()
    state = act(state, { type: 'advance', seconds: 0.25 })
    expect(state.uniqueNames.previewX).toBeGreaterThan(last)
    expect(state.evidence.discoveries).toContain('own-name')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('escolher folha-nave direto não substitui a comparação com o aviso', () => {
    const state = act(openScene(start), { type: 'name-field', name: 'folha-nave' })
    expect(state.evidence.discoveries).not.toContain('own-name')
  })
})
