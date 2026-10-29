import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { isSceneActivity } from './index'
import { isSceneState, type SceneState } from './state'

describe('a ponte apressada', () => {
  const start = { scene: 'timed-bridge' } as const
  const run = (actions: SceneAction[], from: SceneState = openScene(start)) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)
  const esperar = (n: number): SceneAction[] =>
    Array.from({ length: n }, () => ({ type: 'wait-second' }))

  test('abre com o jogo certo: a ponte levantada, o relógio parado e o "depois de" na alavanca', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    const s = openScene(start)
    expect(s.bridge).toMatchObject({ ponteAberta: false, place: 'lever', timers: [], at: 'start' })
    expect(isSceneState(s)).toBe(true)
  })

  test('antes de puxar, a ponte não deixa atravessar; puxar baixa a ponte', () => {
    const fechada = run([{ type: 'touch-bridge' }])
    expect(fechada.bridge.at).toBe('bridge')
    expect(fechada.caption).toBe('A ponte está levantada. Puxe a alavanca primeiro.')
    expect(fechada.evidence.discoveries).toContain('closed-start')
    const puxou = run([{ type: 'pull-lever' }], fechada)
    expect(puxou.bridge).toMatchObject({ ponteAberta: true, timers: [4], sincePull: 0 })
    expect(puxou.evidence.discoveries).toContain('lever-opens')
    expect(isSceneState(puxou)).toBe(true)
  })

  test('indo antes dos 4 segundos, atravessa; atravessar na hora da puxada não conta', () => {
    const logo = run([{ type: 'pull-lever' }, { type: 'touch-bridge' }])
    expect(logo.bridge.at).toBe('stone')
    expect(logo.evidence.discoveries).not.toContain('in-time')
    const s = run([{ type: 'pull-lever' }, ...esperar(2), { type: 'touch-bridge' }])
    expect(s.bridge.at).toBe('stone')
    expect(s.evidence.discoveries).toContain('in-time')
    // Na pedra, a alavanca fica do outro lado da água.
    expect(stepScene(start, s, { type: 'pull-lever' }).bridge.pulls).toBe(1)
  })

  test('no quarto segundo a ponte sobe sozinha, e puxar de novo baixa outra vez', () => {
    const tres = run([{ type: 'pull-lever' }, ...esperar(3)])
    expect(tres.bridge.ponteAberta).toBe(true)
    const subiu = run(esperar(1), tres)
    expect(subiu.bridge).toMatchObject({ ponteAberta: false, timers: [], rises: 1 })
    expect(subiu.evidence.discoveries).toContain('rises-alone')
    expect(run([{ type: 'touch-bridge' }], subiu).bridge.at).toBe('bridge')
    const deNovo = run([{ type: 'pull-lever' }], subiu)
    expect(deNovo.bridge.ponteAberta).toBe(true)
    expect(deNovo.evidence.discoveries).toContain('pull-again')
  })

  test('cada puxada com a ponte baixada soma um "depois de", como o jogo', () => {
    const s = run([{ type: 'pull-lever' }, ...esperar(2), { type: 'pull-lever' }])
    expect(s.bridge.timers).toEqual([2, 4])
    // O primeiro relógio sobe a ponte mesmo com a segunda puxada no meio.
    expect(run(esperar(2), s).bridge.ponteAberta).toBe(false)
  })

  test('com o "depois de" no começo, ele roda uma vez só e a ponte não sobe mais', () => {
    const comeco = run([{ type: 'timer-place', place: 'start' }])
    expect(comeco.bridge.timers).toEqual([4])
    // Puxar logo: o relógio do começo sobe a ponte uma vez.
    const cedo = run([{ type: 'pull-lever' }, ...esperar(4)], comeco)
    expect(cedo.bridge.ponteAberta).toBe(false)
    expect(cedo.evidence.discoveries).not.toContain('timer-place')
    const depois = run([{ type: 'pull-lever' }, ...esperar(6)], cedo)
    expect(depois.bridge.ponteAberta).toBe(true)
    expect(depois.bridge.timers).toEqual([])
    expect(depois.evidence.discoveries).toContain('timer-place')
    expect(isSceneState(depois)).toBe(true)
  })

  test('recomeçar volta à partida nova sem perder o lugar do "depois de"', () => {
    const s = run([
      { type: 'timer-place', place: 'start' },
      ...esperar(5),
      { type: 'pull-lever' },
      { type: 'restart-bridge' },
    ])
    expect(s.bridge).toMatchObject({ ponteAberta: false, place: 'start', timers: [4], clock: 0 })
  })

  test('o retrato recusa relógio fora do teto', () => {
    const s = openScene(start)
    expect(isSceneState({ ...s, bridge: { ...s.bridge, timers: [5] } })).toBe(false)
    expect(isSceneState({ ...s, bridge: { ...s.bridge, timers: Array(9).fill(1) } })).toBe(false)
    expect(isSceneState({ ...s, bridge: { ...s.bridge, place: 'meio' } })).toBe(false)
  })
})
