import type { SceneAction, SceneId } from '../../src/learning/scene'
import { scenePaths } from './exploration-paths'

/** Current free-exploration lessons require comparisons beyond the original guided journeys. */
export const freeExplorationPaths: Partial<Record<SceneId, SceneAction[]>> = {
  'touch-response': [
    { type: 'touch-hiding-place', id: 0 },
    { type: 'connect', port: 'touch', enabled: true },
    { type: 'touch-hiding-place', id: 0 },
    { type: 'touch-hiding-place', id: 1 },
  ],
  // As Moedas em exploração livre (02/11/2026) cobram também "sem sumir, a mesma moeda contou de
  // novo": a comparação que justifica tirar a moeda do grupo.
  'coin-counter': [
    { type: 'coin-disappears', enabled: false },
    { type: 'touch-coin', coin: 0 },
    { type: 'touch-coin', coin: 1 },
    { type: 'touch-coin', coin: 0 },
    { type: 'restart-coins' },
    { type: 'coin-disappears', enabled: true },
    ...scenePaths['coin-counter'],
  ],
  'lighthouse-position': [
    ...scenePaths['lighthouse-position'],
    { type: 'key-position', axis: 'x', value: 300 },
    { type: 'key-position', axis: 'x', value: 160 },
    { type: 'key-position', axis: 'y', value: 300 },
    { type: 'key-position', axis: 'y', value: 250 },
  ],
  'lighthouse-walk': [
    { type: 'movement-command', enabled: false },
    { type: 'hold-arrow', held: true },
    { type: 'walk-frames', count: 1 },
    { type: 'movement-command', enabled: true },
    { type: 'hold-arrow', held: false },
    ...scenePaths['lighthouse-walk'],
    { type: 'hold-arrow', held: false },
    { type: 'walk-frames', count: 1 },
    { type: 'walk-order', order: 'correct' },
    { type: 'test-walk-order' },
    { type: 'walk-order', order: 'reverse' },
    { type: 'test-walk-order' },
    // A beirada (01/11/2026): sai sem o limite e volta ao ligar o limite.
    { type: 'restart-walk' },
    { type: 'keep-on-screen', enabled: false },
    { type: 'hold-arrow', held: true },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'keep-on-screen', enabled: true },
    { type: 'advance', seconds: 1 / 30 },
    // A câmera lenta (01/11/2026): um segundo de caminhada na velocidade de verdade.
    { type: 'restart-walk' },
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    { type: 'advance', seconds: 0.5 },
    { type: 'advance', seconds: 0.6 },
  ],
}
