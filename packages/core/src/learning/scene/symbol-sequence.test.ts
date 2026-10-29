import { describe, expect, test } from 'bun:test'
import type { SceneAction, SequenceSymbol } from './actions'
import { openScene, stepScene } from './engine'
import { isSceneActivity } from './index'
import { sceneReadout } from './readout'
import { isSceneState, type SceneState } from './state'

describe('o baú dos símbolos', () => {
  const start = { scene: 'symbol-sequence' } as const
  const run = (actions: SceneAction[], from: SceneState = openScene(start)) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)
  const tocar = (...simbolos: SequenceSymbol[]): SceneAction[] =>
    simbolos.map((symbol) => ({ type: 'touch-symbol', symbol }))

  test('abre com o jogo certo: tudo apagado, o baú fechado, passo 0 e o baú na ordem', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    const s = openScene(start)
    expect(s.sequence).toEqual({
      mode: 'order',
      passo: 0,
      lit: [],
      chest: 'closed',
      at: null,
      missed: false,
    })
    expect(isSceneState(s)).toBe(true)
  })

  test('na ordem certa o passo anda 1, 2 e a estrela abre o baú', () => {
    const sol = run(tocar('sol'))
    expect(sol.sequence).toMatchObject({ passo: 1, lit: ['sol'] })
    const lua = run(tocar('lua'), sol)
    expect(lua.sequence).toMatchObject({ passo: 2, lit: ['sol', 'lua'] })
    expect(lua.evidence.discoveries).toContain('step-moves')
    const abriu = run(tocar('estrela'), lua)
    expect(abriu.sequence).toMatchObject({ chest: 'open', lit: ['sol', 'lua', 'estrela'] })
    expect(abriu.evidence.discoveries).toContain('right-order')
    expect(abriu.evidence.discoveries).not.toContain('restart-works')
    expect(isSceneState(abriu)).toBe(true)
    // Aberto, o baú espera a partida nova.
    expect(run(tocar('lua'), abriu).sequence).toEqual({ ...abriu.sequence, at: 'lua' })
  })

  test('fora da vez a tentativa recomeça; começar pelo meio não avança', () => {
    const fora = run(tocar('sol', 'estrela'))
    expect(fora.sequence).toMatchObject({ passo: 0, lit: [], chest: 'closed', missed: true })
    expect(fora.evidence.discoveries).toContain('out-of-turn')
    expect(fora.evidence.discoveries).not.toContain('middle-start')
    const meio = run(tocar('lua'))
    expect(meio.sequence).toMatchObject({ passo: 0, lit: [] })
    expect(meio.evidence.discoveries).toEqual(['middle-start'])
    // A lua de novo depois do passo 2 também é fora da vez.
    expect(run(tocar('sol', 'lua', 'lua')).sequence.passo).toBe(0)
  })

  test('depois de errar, recomeçar pelo sol abre; o erro é da partida', () => {
    const s = run(tocar('lua', 'sol', 'lua', 'estrela'))
    expect(s.sequence.chest).toBe('open')
    expect(s.evidence.discoveries).toContain('restart-works')
    const nova = run([{ type: 'restart-symbols' }], run(tocar('lua')))
    expect(nova.sequence.missed).toBe(false)
  })

  test('só contando, abre com os três em qualquer ordem; a comparação pede a ordem certa antes', () => {
    const sem = run([{ type: 'sequence-mode', mode: 'count' }, ...tocar('estrela', 'lua', 'sol')])
    expect(sem.sequence.chest).toBe('open')
    expect(sem.evidence.discoveries).not.toContain('count-vs-order')
    const repetido = run([{ type: 'sequence-mode', mode: 'count' }, ...tocar('lua', 'lua')])
    expect(repetido.sequence.lit).toEqual(['lua'])
    expect(sceneReadout('symbol-sequence', repetido)[0]).toMatchObject({
      label: 'contados',
      value: '1 de 3',
    })
    const s = run([
      ...tocar('sol', 'lua', 'estrela'),
      { type: 'sequence-mode', mode: 'count' },
      ...tocar('estrela', 'lua', 'sol'),
    ])
    expect(s.sequence).toMatchObject({ mode: 'count', chest: 'open' })
    expect(s.evidence.discoveries).toContain('count-vs-order')
  })

  test('um caso pode abrir com o sol aceso, mas o erro não vem do caso', () => {
    const caso = openScene({
      scene: 'symbol-sequence',
      setup: { actions: tocar('sol', 'estrela', 'sol') },
    })
    expect(caso.sequence).toMatchObject({ passo: 1, lit: ['sol'], missed: false })
    expect(caso.evidence.discoveries).toEqual([])
  })
})
