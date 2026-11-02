import type { SceneId } from '../actions'
import { guia as cleanup } from './cleanup'
import { guia as collisionPair } from './collision-pair'
import { guia as coordinates } from './coordinates'
import { guia as copyVsOriginal } from './copy-vs-original'
import { guia as drawLoop } from './draw-loop'
import { guia as fillStroke } from './fill-stroke'
import { guia as fixedVsRead } from './fixed-vs-read'
import { guia as frames } from './frames'
import { guia as gameState } from './game-state'
import { guia as invincibility } from './invincibility'
import { guia as layers } from './layers'
import { guia as motionAmount } from './motion-amount'
import { guia as onceVsAlways } from './once-vs-always'
import { guia as onionSkin } from './onion-skin'
import { guia as pixelVector } from './pixel-vector'
import { guia as publishedCopy } from './published-copy'
import { guia as random } from './random'
import { guia as restart } from './restart'
import { guia as sameRulesNewSkin } from './same-rules-new-skin'
import { guia as shading } from './shading'
import { guia as sheetVsSprite } from './sheet-vs-sprite'
import { guia as spawn } from './spawn'
import { guia as symmetry } from './symmetry'
import type { GuiaLivre } from './tipos'
import { guia as twoClocks } from './two-clocks'
import { guia as uniqueNames } from './unique-names'
import { guia as variable } from './variable'
import { guia as velocity } from './velocity'
import { guia as world } from './world'

export type { GuiaLivre } from './tipos'

/**
 * As cenas do Construtor em exploração livre (Nave contra Asteroides e O Jogo do Meu Jeito,
 * 02/11/2026). Uma cena só usa o guia quando o manifesto liga `setup.freeExploration`; sem isso,
 * a bancada antiga continua (o Corre Dino divide várias destas cenas).
 */
export const GUIAS_LIVRES: Partial<Record<SceneId, GuiaLivre>> = {
  cleanup: cleanup,
  'collision-pair': collisionPair,
  coordinates: coordinates,
  'draw-loop': drawLoop,
  'fixed-vs-read': fixedVsRead,
  'game-state': gameState,
  invincibility: invincibility,
  layers: layers,
  'once-vs-always': onceVsAlways,
  random: random,
  restart: restart,
  spawn: spawn,
  variable: variable,
  velocity: velocity,
  world: world,
  'copy-vs-original': copyVsOriginal,
  'fill-stroke': fillStroke,
  frames: frames,
  'motion-amount': motionAmount,
  'onion-skin': onionSkin,
  'pixel-vector': pixelVector,
  'published-copy': publishedCopy,
  'same-rules-new-skin': sameRulesNewSkin,
  shading: shading,
  'sheet-vs-sprite': sheetVsSprite,
  symmetry: symmetry,
  'two-clocks': twoClocks,
  'unique-names': uniqueNames,
}
