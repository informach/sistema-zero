import { gameTwoDArcadeDinoRuntime } from './arcadeKitsDino'
import { gameTwoDArcadeGorillasRuntime } from './arcadeKitsGorillas'
import { gameTwoDArcadeHudRuntime } from './arcadeKitsHud'
import { gameTwoDArcadeSpaceRuntime } from './arcadeKitsSpace'
import { gameTwoDEnemiesRuntime } from './enemies'

export const gameTwoDArcadeKitsRuntime =
  gameTwoDArcadeSpaceRuntime +
  gameTwoDEnemiesRuntime +
  gameTwoDArcadeHudRuntime +
  gameTwoDArcadeDinoRuntime +
  gameTwoDArcadeGorillasRuntime
