import { describe, expect, test } from 'bun:test'
import { sceneDefaultGoalIds } from './catalog'
import { openScene, stepScene } from './engine'
import { gardenStep } from './garden'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { cloneScene, isSceneState } from './state'

describe('descoberta guiada no jardim', () => {
  test('reiniciar em cada descoberta mantém a orientação realizável', () => {
    const start = { scene: 'found-counter' as const }
    for (const stop of [1, 2, 3, 4]) {
      let state = openScene(start)
      const act = (action: Parameters<typeof stepScene>[2]) => {
        state = stepScene(start, state, action)
      }
      const path = [
        { type: 'find-character', id: 0 },
        { type: 'find-character', id: 1 },
        { type: 'look-around' },
        { type: 'find-character', id: 0 },
      ] as const
      for (const action of path.slice(0, stop)) act(action)
      act({ type: 'restart-search' })
      for (let turns = 0; turns < 8; turns++) {
        const id = gardenStep(start.scene, state)?.id
        if (id === 'count-complete') break
        if (id === 'count-first') act({ type: 'find-character', id: 0 })
        else if (id === 'count-second') act({ type: 'find-character', id: 1 })
        else if (id === 'count-empty') act({ type: 'look-around' })
        else if (id === 'count-repeat') act({ type: 'find-character', id: 0 })
        else if (id === 'count-restart') act({ type: 'restart-search' })
      }
      expect(gardenStep(start.scene, state)?.id).toBe('count-complete')
    }
  })
  test('toque num esconderijo invisível não muda o escolhido nem executa nova reação', () => {
    const start = { scene: 'touch-response' as const }
    let state = openScene(start)
    const act = (action: Parameters<typeof stepScene>[2]) => {
      state = stepScene(start, state, action)
    }
    act({ type: 'connect', port: 'touch', enabled: true })
    act({ type: 'start', input: 'tap' })
    act({ type: 'other-hiding-place' })
    act({ type: 'touch-hiding-place', id: 0 })
    act({ type: 'touch-hiding-place', id: 1 })
    act({ type: 'touch-hiding-place', id: 0 })
    expect(state.match.gardenChosen).toBe(1)
    expect(state.match.gardenFound).toEqual([0, 1])
    expect(state.caption).toContain('não executou outra reação')
  })
  test('o escolhido e a reação persistem, com a ação principal correspondente a cada etapa', () => {
    const start = {
      scene: 'touch-response' as const,
      setup: { goals: ['no-response', 'responds', 'second-target'] },
    }
    let session = initialExperiment(start)
    const act = (action: Parameters<typeof stepExperiment>[2]) => {
      session = stepExperiment(start, session, action).session
    }
    expect(gardenStep(start.scene, session.state)?.id).toBe('touch-first')
    act({ type: 'other-hiding-place' })
    expect(session.state.match.gardenRound).toBeUndefined()
    act({ type: 'start', input: 'tap' })
    expect(gardenStep(start.scene, session.state)?.primary).toBe('connect')
    act({ type: 'connect', port: 'touch', enabled: true })
    act({ type: 'start', input: 'tap' })
    expect(gardenStep(start.scene, session.state)?.primary).toBe('other')
    act({ type: 'other-hiding-place' })
    act({ type: 'touch-hiding-place', id: 1 })
    expect(session.state.match.gardenFound).toEqual([1])
    expect(session.state.match.screen).toBe('start')
    expect(session.state.match.gardenChosen).toBe(1)
    expect(gardenStep(start.scene, session.state)?.id).toBe('touch-complete')
    const copy = cloneScene(session.state)
    copy.match.gardenFound?.push(0)
    expect(session.state.match.gardenFound).toEqual([1])
    expect(readExperimentSession(start.scene, packExperiment(start.scene, session))?.state).toEqual(
      session.state,
    )
    act({ type: 'undo' })
    expect(session.state.evidence.discoveries).toContain('second-target')
    expect(session.state.match.gardenFound).toEqual([])
    expect(gardenStep(start.scene, session.state)?.id).toBe('touch-complete')
  })
  test('somar, vazio, repetição e nova busca preservam uma única contagem e sua última atualização', () => {
    const start = { scene: 'found-counter' as const }
    let state = openScene(start)
    const act = (action: Parameters<typeof stepScene>[2]) => {
      state = stepScene(start, state, action)
    }
    act({ type: 'find-character', id: 0 })
    act({ type: 'find-character', id: 1 })
    expect(state.match.counterUpdate).toEqual({ before: 1, after: 2, kind: 'add' })
    act({ type: 'look-around' })
    act({ type: 'find-character', id: 0 })
    expect(state.match.points).toBe(2)
    expect(gardenStep(start.scene, state)?.primary).toBe('restart')
    act({ type: 'restart-search' })
    expect(state.match.counterUpdate).toEqual({ before: 2, after: 0, kind: 'reset' })
    expect(gardenStep(start.scene, state)?.id).toBe('count-complete')
    expect(isSceneState(state)).toBe(true)
    expect(
      isSceneState({
        ...state,
        match: { ...state.match, counterUpdate: { before: -1, after: 0, kind: 'reset' } },
      }),
    ).toBe(false)
    // New goals are explicitly selected by the updated course, not imposed on old missions.
    expect(sceneDefaultGoalIds('found-counter')).not.toContain('repeat')
    expect(sceneDefaultGoalIds('touch-response')).not.toContain('second-target')
  })
})
