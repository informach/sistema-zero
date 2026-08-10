import { gameTwoDWorldEventsRuntime } from './worldEvents'
import { gameTwoDWorldGroupsRuntime } from './worldGroups'
import { gameTwoDWorldSystemsRuntime } from './worldSystems'
import { gameTwoDWorldTilesRuntime } from './worldTiles'
import { gameTwoDWorldTimersRuntime } from './worldTimers'

export const gameTwoDWorldRuntime =
  gameTwoDWorldTilesRuntime +
  gameTwoDWorldEventsRuntime +
  gameTwoDWorldGroupsRuntime +
  gameTwoDWorldSystemsRuntime +
  gameTwoDWorldTimersRuntime
