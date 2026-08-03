import { gameTwoDCasualKitsBalloonRuntime } from './casualKitsBalloon'
import { gameTwoDCasualKitsSharedRuntime } from './casualKitsShared'
import { gameTwoDCasualKitsStickRuntime } from './casualKitsStick'

export const gameTwoDCasualKitsRuntime =
  gameTwoDCasualKitsSharedRuntime +
  gameTwoDCasualKitsStickRuntime +
  gameTwoDCasualKitsBalloonRuntime
