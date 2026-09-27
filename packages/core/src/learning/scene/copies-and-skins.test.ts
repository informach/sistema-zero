import { describe, expect, test } from 'bun:test'
import { isSceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart } from './state'

describe('o arquivo e as publicações são cópias', () => {
  test('exportar fotografa a cor daquele momento; importar cria projeto independente', () => {
    const start: SceneStart = { scene: 'copy-vs-original' }
    let state = stepScene(start, openScene(start), { type: 'export-file' })
    state = stepScene(start, state, { type: 'recolor', side: 'lesson', color: 'verde' })
    state = stepScene(start, state, { type: 'import-file' })
    expect(state.copies.lessonColor).toBe('verde')
    expect(state.copies.fileColor).toBe('azul')
    expect(state.copies.studioColor).toBe('azul')
    expect(state.evidence.discoveries).toContain('independent')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('republicar cria outro cartão e preserva a versão antiga', () => {
    const start: SceneStart = { scene: 'published-copy' }
    let state = stepScene(start, openScene(start), { type: 'publish' })
    state = stepScene(start, state, { type: 'open-mural' })
    state = stepScene(start, state, { type: 'recolor', side: 'project', color: 'rosa' })
    expect(state.copies.posts).toEqual([{ id: 1, color: 'azul' }])
    state = stepScene(start, state, { type: 'publish' })
    expect(state.copies.posts).toEqual([
      { id: 1, color: 'azul' },
      { id: 2, color: 'rosa' },
    ])
    expect(state.copies.muralOpenedId).toBe(1)
    expect(state.evidence.discoveries).toContain('republish')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })
})

describe('as mesmas regras, outra história', () => {
  const start: SceneStart = { scene: 'same-rules-new-skin' }

  test('trocar os três desenhos não mexe nas regras nem nas posições do jogo', () => {
    let state = stepScene(start, openScene(start), { type: 'play-move', direction: 1 })
    const x = state.skinGame.x
    state = stepScene(start, state, { type: 'skin', theme: 'road' })
    expect(state.skinGame.x).toBe(x)
    expect(state.skinGame.shootEnabled).toBe(true)
    expect(state.evidence.discoveries).toContain('skin-only')
    state = stepScene(start, state, { type: 'skin', theme: 'sea' })
    expect(state.skinGame.visited).toEqual(['space', 'road', 'sea'])
    expect(state.evidence.discoveries).toContain('three-skins')
  })

  test('desligar o tiro muda a regra e impede projéteis enquanto o jogo roda', () => {
    let state = stepScene(start, openScene(start), { type: 'rule-toggle', enabled: false })
    state = stepScene(start, state, { type: 'play-shoot' })
    expect(state.skinGame.shots).toHaveLength(0)
    expect(state.evidence.discoveries).not.toContain('rule-off')
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.skinGame.frames).toBe(10)
    expect(state.evidence.discoveries).toContain('rule-off')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
    expect(isSceneAction({ type: 'skin', theme: 'sea' }, 'published-copy')).toBe(false)
  })
})
