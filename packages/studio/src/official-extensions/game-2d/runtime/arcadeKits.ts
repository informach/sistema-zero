import { gameTwoDArcadeDinoRuntime } from './arcadeKitsDino'
import { gameTwoDArcadeGorillasRuntime } from './arcadeKitsGorillas'
import { gameTwoDArcadeHudRuntime } from './arcadeKitsHud'
import { gameTwoDArcadeSpaceRuntime } from './arcadeKitsSpace'

export const gameTwoDArcadeKitsRuntime =
  gameTwoDArcadeSpaceRuntime +
  gameTwoDArcadeHudRuntime +
  gameTwoDArcadeDinoRuntime +
  gameTwoDArcadeGorillasRuntime
