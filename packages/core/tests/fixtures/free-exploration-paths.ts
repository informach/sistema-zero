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
    // A câmera lenta (01/11/2026): um segundo de caminhada na velocidade de verdade.
    { type: 'restart-walk' },
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    { type: 'advance', seconds: 0.5 },
    { type: 'advance', seconds: 0.6 },
  ],
}
