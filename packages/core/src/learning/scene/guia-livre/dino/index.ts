import type { SceneId } from '../../actions'
import type { GuiaLivre } from '../tipos'
import { cleanup, coordinates, drawLoop, gameState, layers, variable, world } from './espelhos'
import { guia as onceVsAlways } from './once-vs-always'
import { guia as random } from './random'
import { guia as restart } from './restart'
import { guia as spawn } from './spawn'
import { guia as velocity } from './velocity'

/**
 * As variantes do Corre Dino das cenas que a Nave contra Asteroides já usa em exploração livre (frente
 * A da conversão do Corre Dino, 02/11/2026): as 12 experiências das Aulas 1, 2, 4, 5, 6, 7, 9, 11 e 12.
 * O registro (`guia-livre/index.ts`) as compõe com as da Nave (`comVarianteDoDino`), e o cenário do
 * bloco escolhe qual vale.
 */
export const GUIAS_DINO_A: Partial<Record<SceneId, GuiaLivre>> = {
  'once-vs-always': onceVsAlways,
  coordinates,
  world,
  'draw-loop': drawLoop,
  layers,
  spawn,
  velocity,
  cleanup,
  'game-state': gameState,
  restart,
  variable,
  random,
}
