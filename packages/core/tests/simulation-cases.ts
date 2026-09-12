import type { LearningScene } from '../src/learning'
export const simulationCases: Record<LearningScene, Record<string, number>[]> = {
  world: [
    { created: 1, visible: 0 },
    { created: 1, visible: 1 },
  ],
  layers: [
    { front: 0, clear: 1 },
    { front: 1, clear: 1 },
  ],
  jump: [
    { gravity: 0, force: 8 },
    { gravity: 1, force: 8 },
  ],
  'jump-sound': [
    { source: 0, airborne: 1, input: 0 },
    { source: 1, airborne: 0, input: 1 },
  ],
  spawn: [
    { timer: 0, interval: 1.4 },
    { timer: 1, interval: 1.4 },
  ],
  cleanup: [{ cleanup: 0 }, { cleanup: 1 }],
  'game-state': [
    { guarded: 0, screen: 0 },
    { guarded: 1, screen: 0 },
    { guarded: 1, screen: 1 },
  ],
  controls: [
    { touch: 0, input: 1 },
    { touch: 1, input: 1 },
    { touch: 1, input: 0 },
  ],
  restart: [{ restart: 0 }, { restart: 1 }],
  hitbox: [
    { scale: 1, distance: 30 },
    { scale: 0.5, distance: 100 },
  ],
  score: [
    { guarded: 1, screen: 0 },
    { guarded: 1, screen: 1 },
    { guarded: 1, screen: 2 },
  ],
  random: [
    { position: 500, sample: 0 },
    { position: 500, sample: 1 },
    { position: 560, sample: 1 },
  ],
  acceleration: [
    { limited: 1, ticks: 4, sample: 0 },
    { limited: 1, ticks: 5, sample: 0 },
    { limited: 1, ticks: 5, sample: 1 },
  ],
}
