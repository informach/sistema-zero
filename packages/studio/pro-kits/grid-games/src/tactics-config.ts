import type { TacticsConfig } from './tactics-model'
export const config: TacticsConfig = {
  terrain: [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 0, 1, 2, 1],
    [1, 1, 1, 1, 1, 2, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
  ],
  units: [
    { id: 'guardiao', side: 'friend', role: 'guardian', x: 1, y: 3, health: 5, maxHealth: 5 },
    { id: 'exploradora', side: 'friend', role: 'scout', x: 1, y: 2, health: 4, maxHealth: 4 },
    { id: 'robo-a', side: 'rival', role: 'guardian', x: 5, y: 2, health: 3, maxHealth: 3 },
    { id: 'robo-b', side: 'rival', role: 'guardian', x: 5, y: 4, health: 3, maxHealth: 3 },
  ],
  home: { x: 1, y: 3 },
  moveRange: 2,
  recruitCost: 2,
  maxFriends: 4,
  initialCoins: 2,
}
