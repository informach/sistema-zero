import type { SceneAction, SceneId } from '../../../src/learning/scene'

export const segundo: SceneAction = { type: 'advance', seconds: 1 }
export const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => segundo)
export const vy = (v: number): SceneAction => ({ type: 'velocity', vx: 0, vy: v })
export const nascer = (quadros: 20 | 40 | 80): SceneAction => ({
  type: 'interval',
  seconds: quadros / 30,
})
export const espera = (on: boolean): SceneAction => ({
  type: 'connect',
  port: 'timer',
  enabled: on,
})
export const limpeza = (on: boolean): SceneAction => ({
  type: 'connect',
  port: 'cleanup',
  enabled: on,
})
export const sortear = (unit: number): SceneAction => ({
  type: 'sample',
  kind: 'position',
  unit,
  guided: false,
})
export const alvo = (subject: 'shot' | 'rock', target: 'group' | 'alias'): SceneAction => ({
  type: 'command-target',
  subject,
  target,
})
export const protecao = (frames: 0 | 15 | 45): SceneAction => ({ type: 'shield', frames })
export const proxima: SceneAction = { type: 'advance-to' }
export const tresPedras = [proxima, proxima, proxima]

/**
 * ⭐ Um caminho de sucesso por cena, na ordem que o Zappy sugere, sem `advance` acima de 1 s por ação
 * (`SESSION_LIMITS`). Os testes do member-shell e quem precisar de um caminho livre importam daqui.
 */
export const CAMINHOS_LIVRES_NAVE_B: Partial<Record<SceneId, SceneAction[]>> = {
  velocity: [vy(-9), segundo, vy(9), segundo],
  spawn: [segundo, espera(true), ...segundos(4), nascer(20), ...segundos(3)],
  cleanup: [...segundos(2), limpeza(true), segundo],
  random: [sortear(0.1), sortear(0.7), segundo],
  'collision-pair': [segundo, alvo('shot', 'alias'), alvo('rock', 'alias'), ...segundos(3)],
  invincibility: [...tresPedras, protecao(45), ...tresPedras, protecao(15), ...tresPedras],
}
