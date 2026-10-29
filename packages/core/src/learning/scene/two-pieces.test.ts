import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { isSceneActivity } from './index'
import { isSceneState, type SceneState } from './state'

describe('a porta com duas peças', () => {
  const start = { scene: 'two-pieces' } as const
  const run = (actions: SceneAction[], from: SceneState = openScene(start)) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)

  test('abre com o jogo certo: nenhuma peça guardada, a regra "e" e a cabana fechada', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    const s = openScene(start)
    expect(s.pieces).toMatchObject({
      temChave: false,
      temEmblema: false,
      rule: 'and',
      door: 'closed',
    })
    expect(isSceneState(s)).toBe(true)
  })

  test('sem peça e com uma só, a cabana fica fechada; com as duas, abre', () => {
    const nada = run([{ type: 'try-cabin' }])
    expect(nada.pieces.door).toBe('closed')
    expect(nada.evidence.discoveries).toContain('none-closed')
    const uma = run([{ type: 'take-piece', piece: 'key' }, { type: 'try-cabin' }], nada)
    expect(uma.pieces.temChave).toBe(true)
    expect(uma.pieces.door).toBe('closed')
    expect(uma.evidence.discoveries).toContain('one-closed')
    const duas = run([{ type: 'take-piece', piece: 'emblem' }, { type: 'try-cabin' }], uma)
    expect(duas.pieces.door).toBe('open')
    expect(duas.evidence.discoveries).toContain('both-open')
    expect(duas.evidence.discoveries).not.toContain('any-order')
    expect(isSceneState(duas)).toBe(true)
  })

  test('uma peça já guardada não se pega de novo', () => {
    const s = run([{ type: 'take-piece', piece: 'emblem' }])
    expect(stepScene(start, s, { type: 'take-piece', piece: 'emblem' })).toBe(s)
  })

  test('abrir começando por cada peça mostra que a ordem não importa', () => {
    const s = run([
      { type: 'take-piece', piece: 'key' },
      { type: 'take-piece', piece: 'emblem' },
      { type: 'try-cabin' },
      { type: 'restart-cabin' },
      { type: 'take-piece', piece: 'emblem' },
      { type: 'take-piece', piece: 'key' },
      { type: 'try-cabin' },
    ])
    expect(s.pieces.door).toBe('open')
    expect(s.evidence.discoveries).toContain('any-order')
  })

  test('com "ou", uma peça só já abre (e "e" não)', () => {
    const s = run([
      { type: 'cabin-rule', rule: 'or' },
      { type: 'take-piece', piece: 'emblem' },
      { type: 'try-cabin' },
    ])
    expect(s.pieces.door).toBe('open')
    expect(s.evidence.discoveries).toContain('and-vs-or')
    expect(s.evidence.discoveries).not.toContain('both-open')
    const nada = run([{ type: 'cabin-rule', rule: 'or' }, { type: 'try-cabin' }])
    expect(nada.pieces.door).toBe('closed')
    expect(nada.caption).toContain('a chave ou o emblema')
  })

  test('recomeçar devolve as peças e fecha a cabana, mas a regra escolhida fica', () => {
    const s = run([
      { type: 'cabin-rule', rule: 'or' },
      { type: 'take-piece', piece: 'key' },
      { type: 'try-cabin' },
      { type: 'restart-cabin' },
    ])
    expect(s.pieces).toMatchObject({
      temChave: false,
      temEmblema: false,
      door: 'closed',
      rule: 'or',
      order: [],
    })
    expect(isSceneState(s)).toBe(true)
  })

  test('o caso do professor deixa peças guardadas, mas as aberturas começam vazias', () => {
    const caso = {
      scene: 'two-pieces',
      setup: {
        actions: [
          { type: 'take-piece', piece: 'key' },
          { type: 'take-piece', piece: 'emblem' },
          { type: 'try-cabin' },
        ],
      },
    } as const
    const s = openScene(caso as never)
    expect(s.pieces.temChave && s.pieces.temEmblema).toBe(true)
    expect(s.pieces.opened).toEqual({ keyFirst: false, emblemFirst: false })
    expect(s.evidence.discoveries).toEqual([])
  })

  test('o estado recusa peça guardada fora da ordem', () => {
    const s = openScene(start)
    expect(isSceneState({ ...s, pieces: { ...s.pieces, temChave: true } })).toBe(false)
  })
})
