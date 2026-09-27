import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart, twoClockFrame } from './state'

const start: SceneStart = { scene: 'two-clocks' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('nascimento e animação têm relógios diferentes', () => {
  test('nascer a cada 20 quadros cria mais pedras sem mudar os 8 desenhos por segundo', () => {
    let state = act(openScene(start), { type: 'birth-every', frames: 20 })
    state = act(state, { type: 'advance', seconds: 2 })
    expect(state.twoClocks.born).toBe(3)
    expect(state.twoClocks.animationRate).toBe(8)
    expect(state.evidence.discoveries).toContain('more-rocks')
    expect(state.evidence.discoveries).toContain('each-one')
    expect(twoClockFrame(state.twoClocks.rocks.at(-1)!, state.twoClocks.frames, 8)).toBe(0)
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('girar a 16 mantém os nascimentos nos quadros 40 e 80', () => {
    let state = act(openScene(start), { type: 'rate', perSecond: 16 })
    state = act(state, { type: 'advance', seconds: 3 })
    expect(state.twoClocks.rocks.map((rock) => rock.bornAt)).toEqual([40, 80])
    expect(state.evidence.discoveries).toContain('faster-spin')
  })

  test('mudar depois de começar pede recomeço para comparar um só ritmo por vez', () => {
    let state = act(openScene(start), { type: 'advance', seconds: 1 })
    state = act(state, { type: 'birth-every', frames: 20 })
    state = act(state, { type: 'advance', seconds: 1 })
    expect(state.evidence.discoveries).not.toContain('more-rocks')
    state = act(state, { type: 'reset' })
    expect(state.twoClocks.birthEvery).toBe(20)
    state = act(state, { type: 'advance', seconds: 2 })
    expect(state.evidence.discoveries).toContain('more-rocks')
  })
})
