import type { SceneId } from '@sistemazero/core/learning/scene'
import type { ComponentType } from 'react'
import { LivreCleanupDino } from './cleanup'
import { LivreGameStateDino } from './game-state'
import { LivreRandomDino } from './random'
import { LivreRestartDino } from './restart'
import { LivreSpawnDino } from './spawn'
import { LivreVariableDino } from './variable'
import { LivreVelocityDino } from './velocity'

export { comTelaDoDino, semDino, telaDoDino } from './comum'

/**
 * As telas do Corre Dino das cenas que a Nave contra Asteroides já usa em exploração livre (frente A,
 * 02/11/2026). O registro (`scene-livre/index.ts`) as compõe com as da Nave (`comTelaDoDino`): o
 * cenário do bloco escolhe. `coordinates`, `world`, `draw-loop`, `layers` e `once-vs-always` não
 * estão aqui porque a tela da Nave já serve ao Dino (o elenco veste "o Dino").
 */
export const TELAS_DINO_A: Partial<Record<SceneId, ComponentType>> = {
  spawn: LivreSpawnDino,
  velocity: LivreVelocityDino,
  cleanup: LivreCleanupDino,
  'game-state': LivreGameStateDino,
  restart: LivreRestartDino,
  variable: LivreVariableDino,
  random: LivreRandomDino,
}
