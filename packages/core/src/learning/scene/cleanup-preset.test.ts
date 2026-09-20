import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneSetup, type SceneStart } from './index'
import { sceneCactiOnScreen } from './state'

const tiro = { id: 'tiro-cima', exit: 'top', incoming: false } as const
const start = {
  scene: 'cleanup',
  setup: { preset: tiro, goals: ['invisible-stored', 'rule-removes'] },
} as unknown as SceneStart

const passar = (seconds: number, origem = openScene(start)) => {
  let state = origem
  for (let step = 0; step < Math.round(seconds / 0.05); step++)
    state = stepScene(start, state, { type: 'advance', seconds: 0.05 })
  return state
}

describe('cleanup: dois jogos, a mesma regra', () => {
  test('o caso da nave é validado e os tiros saem por cima', () => {
    expect(isSceneSetup(start.setup, 'cleanup')).toBe(true)
    expect(isSceneSetup({ preset: { ...tiro, exit: 'left' } }, 'cleanup')).toBe(false)
    expect(isSceneSetup(start.setup, 'spawn')).toBe(false)
    const initial = openScene(start)
    expect(sceneCactiOnScreen(initial.crowd)).toBe(3)
    expect(initial.crowd.cacti.every((object) => object.y !== undefined)).toBe(true)

    const later = passar(1.5, initial)
    expect(later.evidence.discoveries).toContain('invisible-stored')
    expect(later.crowd.cacti.some((object) => object.y !== undefined && object.y < 0)).toBe(true)
    expect(sceneCactiOnScreen(later.crowd)).toBeLessThan(later.crowd.born)

    const withRule = stepScene(start, later, { type: 'connect', port: 'cleanup', enabled: true })
    const cleaned = passar(1.5, withRule)
    expect(cleaned.evidence.discoveries).toContain('rule-removes')
    expect(cleaned.crowd.removed).toBeGreaterThan(0)
  })

  test('voltar ao começo recompõe os três tiros sem apagar descobertas', () => {
    const seen = passar(1.5)
    const reset = stepScene(start, seen, { type: 'reset' })
    expect(sceneCactiOnScreen(reset.crowd)).toBe(3)
    expect(reset.crowd.cacti.every((object) => object.y !== undefined)).toBe(true)
    expect(reset.evidence.discoveries).toContain('invisible-stored')
  })
})
