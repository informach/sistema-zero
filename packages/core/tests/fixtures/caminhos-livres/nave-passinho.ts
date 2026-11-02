import type { SceneAction } from '../../../src/learning/scene'

const quadros = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 / 30 }) as const)

/**
 * "O tamanho do passinho" (Nave, Dia 1, 02/11/2026): os dois passinhos vistos em câmera lenta, dois
 * quadros seguidos cada. Também roda depois do caminho livre da `lighthouse-walk` (as escolhas que
 * ele deixou não atrapalham: o ritmo volta à câmera lenta e trocar o passinho volta ao começo).
 */
export const CAMINHO_DO_PASSINHO: SceneAction[] = [
  { type: 'restart-walk' },
  { type: 'keep-on-screen', enabled: false },
  { type: 'walk-pace', pace: 'lenta' },
  { type: 'walk-speed', speed: 1 },
  { type: 'hold-arrow', held: true },
  ...quadros(3),
  { type: 'walk-speed', speed: 3 },
  ...quadros(3),
]
