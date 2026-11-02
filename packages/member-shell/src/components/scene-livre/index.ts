import type { SceneId } from '@sistemazero/core/learning/scene'
import type { ComponentType } from 'react'
import { LivreCleanup } from './cleanup'
import { LivreCollisionPair } from './collision-pair'
import { LivreCoordinates } from './coordinates'
import { LivreCopyVsOriginal } from './copy-vs-original'
import { LivreDrawLoop } from './draw-loop'
import { LivreFillStroke } from './fill-stroke'
import { LivreFixedVsRead } from './fixed-vs-read'
import { LivreFrames } from './frames'
import { LivreGameState } from './game-state'
import { LivreInvincibility } from './invincibility'
import { LivreLayers } from './layers'
import { LivreMotionAmount } from './motion-amount'
import { LivreOnceVsAlways } from './once-vs-always'
import { LivreOnionSkin } from './onion-skin'
import { LivrePixelVector } from './pixel-vector'
import { LivrePublishedCopy } from './published-copy'
import { LivreRandom } from './random'
import { LivreRestart } from './restart'
import { LivreSameRulesNewSkin } from './same-rules-new-skin'
import { LivreShading } from './shading'
import { LivreSheetVsSprite } from './sheet-vs-sprite'
import { LivreSpawn } from './spawn'
import { LivreSymmetry } from './symmetry'
import { LivreTwoClocks } from './two-clocks'
import { LivreUniqueNames } from './unique-names'
import { LivreVariable } from './variable'
import { LivreVelocity } from './velocity'
import { LivreWorld } from './world'

/**
 * As telas das cenas do Construtor em exploração livre (02/11/2026). `scene-activity.tsx` usa a
 * tela daqui quando o manifesto liga `setup.freeExploration`.
 */
export const TELAS_LIVRES: Partial<Record<SceneId, ComponentType>> = {
  cleanup: LivreCleanup,
  'collision-pair': LivreCollisionPair,
  coordinates: LivreCoordinates,
  'draw-loop': LivreDrawLoop,
  'fixed-vs-read': LivreFixedVsRead,
  'game-state': LivreGameState,
  invincibility: LivreInvincibility,
  layers: LivreLayers,
  'once-vs-always': LivreOnceVsAlways,
  random: LivreRandom,
  restart: LivreRestart,
  spawn: LivreSpawn,
  variable: LivreVariable,
  velocity: LivreVelocity,
  world: LivreWorld,
  'copy-vs-original': LivreCopyVsOriginal,
  'fill-stroke': LivreFillStroke,
  frames: LivreFrames,
  'motion-amount': LivreMotionAmount,
  'onion-skin': LivreOnionSkin,
  'pixel-vector': LivrePixelVector,
  'published-copy': LivrePublishedCopy,
  'same-rules-new-skin': LivreSameRulesNewSkin,
  shading: LivreShading,
  'sheet-vs-sprite': LivreSheetVsSprite,
  symmetry: LivreSymmetry,
  'two-clocks': LivreTwoClocks,
  'unique-names': LivreUniqueNames,
}
