import { describe, expect, test } from 'bun:test'
import { blockCheckpoint, blockPrediction, isInteractiveBlock } from '../index'
import { isSceneAction, type SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { hydrateSceneState, isSceneState, type SceneStart } from './state'

const start = { scene: 'collect-and-remember' } as const
const play = (actions: SceneAction[], setup: SceneStart = start) =>
  actions.reduce((state, action) => stepScene(setup, state, action), openScene(setup))

describe('coletar e guardar a informação', () => {
  test('mesmo sumiço e aviso, mas somente a regra ligada guarda verdadeiro', () => {
    const without = play([{ type: 'collect-key' }])
    const withMemory = play([
      { type: 'remember-collection', enabled: true },
      { type: 'collect-key' },
    ])
    expect(without.collection.keyPresent).toBe(false)
    expect(withMemory.collection.keyPresent).toBe(false)
    expect(without.caption).toBe(withMemory.caption)
    expect(without.collection.hasKey).toBe(false)
    expect(withMemory.collection.hasKey).toBe(true)
    expect(without.evidence.discoveries).toEqual(['collected-without-memory'])
    expect(withMemory.evidence.discoveries).toEqual(['collected-with-memory'])
    expect(isSceneState(without)).toBe(true)
    expect(isSceneState(withMemory)).toBe(true)
  })

  test('mudar a regra e recomeçar no início não concedem descobertas', () => {
    const state = play([
      { type: 'restart-collection' },
      { type: 'remember-collection', enabled: true },
      { type: 'leave-key' },
    ])
    expect(state.evidence.discoveries).toEqual([])
    expect(state.collection.hasKey).toBe(false)
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
  })

  test('não coleta duas vezes nem muda retroativamente a regra de uma chave retirada', () => {
    const collected = play([{ type: 'collect-key' }])
    expect(stepScene(start, collected, { type: 'collect-key' })).toBe(collected)
    expect(stepScene(start, collected, { type: 'remember-collection', enabled: true })).toBe(
      collected,
    )
    expect(isSceneAction({ type: 'remember-collection', enabled: 'true' }, start.scene)).toBe(false)
    expect(isSceneAction({ type: 'collect-key' }, 'lighthouse-key')).toBe(false)
  })

  test('afastar conserva a memória; recomeçar restaura o estado, a regra e as descobertas', () => {
    const away = play([
      { type: 'remember-collection', enabled: true },
      { type: 'collect-key' },
      { type: 'leave-key' },
    ])
    expect(away.collection.hasKey).toBe(true)
    expect(away.collection.position).toBe('away')
    const restarted = stepScene(start, away, { type: 'restart-collection' })
    expect(restarted.collection).toEqual({
      remember: true,
      keyPresent: true,
      hasKey: false,
      position: 'near',
      collectedThisRound: false,
    })
    expect(restarted.evidence.discoveries).toEqual([
      'collected-with-memory',
      'remembered-after-leaving',
      'reset-after-remembering',
    ])
    expect(evaluateExperimentation(start.scene, restarted).passed).toBe(false)
    const completed = [
      { type: 'remember-collection', enabled: false },
      { type: 'collect-key' },
    ].reduce((state, action) => stepScene(start, state, action as SceneAction), restarted)
    expect(evaluateExperimentation(start.scene, completed).passed).toBe(true)
    expect(isSceneState(completed)).toBe(true)
  })

  test('uma coleta preparada no setup não empresta evidências ao primeiro afastamento ou reinício', () => {
    const setup: SceneStart = {
      ...start,
      setup: { actions: [{ type: 'remember-collection', enabled: true }, { type: 'collect-key' }] },
    }
    const state = play([{ type: 'leave-key' }, { type: 'restart-collection' }], setup)
    expect(state.evidence.discoveries).toEqual([])
  })

  test('uma tentativa antiga não concede afastamento sem coleta na partida atual', () => {
    const state = play([
      { type: 'remember-collection', enabled: true },
      { type: 'collect-key' },
      { type: 'restart-collection' },
      { type: 'leave-key' },
      { type: 'remember-collection', enabled: false },
      { type: 'collect-key' },
      { type: 'leave-key' },
    ])
    expect(state.evidence.discoveries).not.toContain('remembered-after-leaving')
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
  })

  test('hidrata retratos antigos sem o grupo novo e recusa grupo incompleto', () => {
    const old = JSON.parse(JSON.stringify(openScene({ scene: 'lighthouse-key' })))
    delete old.collection
    delete old.lighthouse.checkedKey
    expect(isSceneState(hydrateSceneState(old))).toBe(true)
    old.collection = { hasKey: true }
    expect(isSceneState(hydrateSceneState(old))).toBe(false)
  })

  test('a atividade do Farol permite a experiência sem palpite ou pergunta final', () => {
    const block = {
      kind: 'interactive' as const,
      title: 'O jogo guardou a chave?',
      instructions: 'Compare a chave, o aviso e temChave.',
      required: true,
      hints: [],
      semPerguntaFinal: true as const,
      activity: { type: 'experimentation' as const, scene: start.scene },
    }
    expect(isInteractiveBlock(block)).toBe(true)
    expect(blockPrediction(block)).toBeUndefined()
    expect(blockCheckpoint(block)).toBeUndefined()
  })
})
