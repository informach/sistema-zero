import type { SceneId } from '@sistemazero/core/learning/scene'
import type { ComponentType } from 'react'
import { LivreAcceleration } from './acceleration'
import { LivreCleanup } from './cleanup'
import { LivreCollisionPair } from './collision-pair'
import { LivreControls } from './controls'
import { LivreCoordinates } from './coordinates'
import { LivreCopyVsOriginal } from './copy-vs-original'
import { comTelaDoDino, TELAS_DINO_A } from './dino'
import { LivreDrawLoop } from './draw-loop'
import { LivreFillStroke } from './fill-stroke'
import { LivreFixedVsRead } from './fixed-vs-read'
import { LivreFrames } from './frames'
import { LivreGameState } from './game-state'
import { LivreGravity } from './gravity'
import { LivreHitbox } from './hitbox'
import { LivreImpulse } from './impulse'
import { LivreInvincibility } from './invincibility'
import { LivreJumpSound } from './jump-sound'
import { LivreLayers } from './layers'
import { LivreMotionAmount } from './motion-amount'
import { LivreNumberLine } from './number-line'
import { LivreOnceVsAlways } from './once-vs-always'
import { LivreOnionSkin } from './onion-skin'
import { LivrePixelVector } from './pixel-vector'
import { LivrePublishedCopy } from './published-copy'
import { LivreRandom } from './random'
import { LivreRestart } from './restart'
import { LivreSameRulesNewSkin } from './same-rules-new-skin'
import { LivreScore } from './score'
import { LivreScoreGoal } from './score-goal'
import { LivreScreenReader } from './screen-reader'
import { LivreShading } from './shading'
import { LivreSheetVsSprite } from './sheet-vs-sprite'
import { LivreSpawn } from './spawn'
import { LivreStageSize } from './stage-size'
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
  // O Corre Dino, frente B (02/11/2026).
  'stage-size': LivreStageSize,
  'screen-reader': LivreScreenReader,
  gravity: LivreGravity,
  impulse: LivreImpulse,
  'jump-sound': LivreJumpSound,
  // O Corre Dino, frente C (02/11/2026).
  controls: LivreControls,
  hitbox: LivreHitbox,
  score: LivreScore,
  'number-line': LivreNumberLine,
  acceleration: LivreAcceleration,
  // A meta do jogo (Nave, Dia 5, frente D, 02/11/2026).
  'score-goal': LivreScoreGoal,
}

// O Corre Dino, frente A (02/11/2026): as cenas que a Nave já usava em exploração livre ganham a
// tela do Dino (`scene-livre/dino/`), escolhida pelo cenário do bloco; a da Nave fica igual.
for (const [cena, dino] of Object.entries(TELAS_DINO_A) as [SceneId, ComponentType][]) {
  const nave = TELAS_LIVRES[cena]
  TELAS_LIVRES[cena] = nave ? comTelaDoDino(nave, dino) : dino
}
