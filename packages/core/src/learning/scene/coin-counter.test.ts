import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { isSceneActivity } from './index'
import { isSceneState, type SceneState } from './state'

describe('o contador de moedas', () => {
  const start = { scene: 'coin-counter' } as const
  const run = (actions: SceneAction[], from: SceneState = openScene(start)) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)

  test('abre com o jogo certo: zero moedas, seis no caminho, a moeda some e "pelo menos 5"', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    const s = openScene(start)
    expect(s.coins.moedas).toBe(0)
    expect(s.coins.present).toEqual([true, true, true, true, true, true])
    expect(s.coins.disappear).toBe(true)
    expect(s.coins.rule).toBe('at-least')
    expect(s.coins.chest).toBe('closed')
    expect(isSceneState(s)).toBe(true)
  })

  test('cada moeda soma 1 e mostra antes → agora; a primeira sozinha não fecha "cada moeda"', () => {
    const um = run([{ type: 'touch-coin', coin: 0 }])
    expect(um.coins.moedas).toBe(1)
    expect(um.coins.last).toEqual({ before: 0, after: 1 })
    expect(um.coins.present[0]).toBe(false)
    expect(um.evidence.discoveries).not.toContain('each-adds')
    const dois = run([{ type: 'touch-coin', coin: 3 }], um)
    expect(dois.coins.last).toEqual({ before: 1, after: 2 })
    expect(dois.evidence.discoveries).toContain('each-adds')
  })

  test('continuar encostado não é encontro novo; voltar à moeda que sumiu não soma', () => {
    const s = run([{ type: 'touch-coin', coin: 2 }])
    expect(stepScene(start, s, { type: 'touch-coin', coin: 2 })).toBe(s)
    const volta = run([{ type: 'leave-coin' }, { type: 'touch-coin', coin: 2 }], s)
    expect(volta.coins.moedas).toBe(1)
    expect(volta.evidence.discoveries).toEqual(expect.arrayContaining(['kept', 'no-double']))
  })

  test('sem sumir, a mesma moeda conta de novo (o erro aparece no número)', () => {
    const s = run([
      { type: 'coin-disappears', enabled: false },
      { type: 'touch-coin', coin: 1 },
      { type: 'leave-coin' },
      { type: 'touch-coin', coin: 1 },
    ])
    expect(s.coins.moedas).toBe(2)
    expect(s.coins.present[1]).toBe(true)
    expect(s.evidence.discoveries).toContain('counts-again')
    expect(s.evidence.discoveries).not.toContain('each-adds')
  })

  test('o baú: menos que 5 fecha; 5 abre nas duas regras; 6 só abre com "pelo menos 5"', () => {
    const quatro = run([0, 1, 2, 3].map((c) => ({ type: 'touch-coin', coin: c }) as SceneAction))
    const tentou = run([{ type: 'try-chest' }], quatro)
    expect(tentou.coins.chest).toBe('closed')
    expect(tentou.evidence.discoveries).toContain('below-goal')
    const cinco = run(
      [
        { type: 'touch-coin', coin: 4 },
        { type: 'chest-rule', rule: 'equals' },
        { type: 'try-chest' },
      ],
      tentou,
    )
    expect(cinco.coins.chest).toBe('open')
    const seis = run(
      [
        { type: 'touch-coin', coin: 5 },
        { type: 'try-chest' },
        { type: 'chest-rule', rule: 'at-least' },
      ],
      cinco,
    )
    expect(seis.coins.chest).toBe('closed')
    expect(seis.evidence.discoveries).not.toContain('compare-rules')
    const aberto = run([{ type: 'try-chest' }], seis)
    expect(aberto.coins.chest).toBe('open')
    expect(aberto.evidence.discoveries).toContain('compare-rules')
  })

  test('recomeçar zera o contador e devolve as moedas, mas as regras escolhidas ficam', () => {
    const s = run([
      { type: 'chest-rule', rule: 'equals' },
      { type: 'touch-coin', coin: 0 },
      { type: 'restart-coins' },
    ])
    expect(s.coins.moedas).toBe(0)
    expect(s.coins.present.every(Boolean)).toBe(true)
    expect(s.coins.rule).toBe('equals')
    expect(s.coins.last).toBeNull()
    expect(isSceneState(s)).toBe(true)
  })

  test('o caso do professor deixa moedas pegas, mas a história do gesto começa vazia', () => {
    const caso = {
      scene: 'coin-counter',
      setup: {
        actions: [
          { type: 'touch-coin', coin: 0 },
          { type: 'touch-coin', coin: 1 },
        ],
      },
    } as const
    const s = openScene(caso as never)
    expect(s.coins.moedas).toBe(2)
    expect(s.coins.adds).toBe(0)
    expect(s.coins.counted.some(Boolean)).toBe(false)
    expect(s.evidence.discoveries).toEqual([])
    // A primeira soma da criança não fecha "cada moeda soma um" com as somas do caso.
    const depois = stepScene(caso as never, s, { type: 'touch-coin', coin: 2 })
    expect(depois.evidence.discoveries).not.toContain('each-adds')
  })
})
