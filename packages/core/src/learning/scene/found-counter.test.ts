import { describe, expect, test } from 'bun:test'
import { sceneDefaultGoalIds } from './catalog'
import { openScene, stepScene } from './engine'
import { sceneSituation } from './readout'

const start = { scene: 'found-counter' } as const

describe('found-counter', () => {
  test('só um encontro aumenta Achados; recomeçar zera o valor atual', () => {
    const initial = openScene(start)
    expect(initial.match.points).toBe(0)
    const emptyAtStart = stepScene(start, initial, { type: 'look-around' })
    expect(sceneSituation(start.scene, emptyAtStart)).toBe(
      'Você procurou, mas não encontrou ninguém. Achados continua igual.',
    )
    expect(emptyAtStart.evidence.discoveries).not.toContain('no-find')

    const first = stepScene(start, initial, { type: 'find-character', id: 0 })
    expect(first.match.points).toBe(1)
    expect(sceneSituation(start.scene, first)).toBe('Você encontrou um personagem. Achados: 1.')
    expect(initial.match.points).toBe(0)

    const repeated = stepScene(start, first, { type: 'find-character', id: 0 })
    expect(repeated.match.points).toBe(1)
    expect(sceneSituation(start.scene, repeated)).toBe(
      'Este personagem já foi encontrado. Achados continua igual.',
    )

    const empty = stepScene(start, repeated, { type: 'look-around' })
    expect(empty.match.points).toBe(1)
    expect(sceneSituation(start.scene, empty)).toBe(
      'Você procurou, mas não encontrou ninguém. Achados continua igual.',
    )
    expect(empty.evidence.discoveries).toContain('no-find')

    const second = stepScene(start, empty, { type: 'find-character', id: 1 })
    expect(second.match.points).toBe(2)

    const restarted = stepScene(start, second, { type: 'restart-search' })
    expect(restarted.match.points).toBe(0)
    expect(sceneSituation(start.scene, restarted)).toBe('Uma nova busca começou. Achados: 0.')
    expect(
      sceneDefaultGoalIds(start.scene).every((id) => restarted.evidence.discoveries.includes(id)),
    ).toBe(true)
  })

  test('não há contagem sem fim nem ações de outras cenas', () => {
    let state = openScene(start)
    for (const id of [0, 1, 2, 0, 1, 2] as const)
      state = stepScene(start, state, { type: 'find-character', id })
    expect(state.match.points).toBe(3)
    expect(stepScene(start, state, { type: 'store', value: 100 })).toBe(state)
  })
})
