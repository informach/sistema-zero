import { gameTwoDWorldEventsRuntime } from './worldEvents'
import { gameTwoDWorldGroupsRuntime } from './worldGroups'
import { gameTwoDWorldTilesRuntime } from './worldTiles'
import { gameTwoDWorldTimersRuntime } from './worldTimers'

export const gameTwoDWorldRuntime =
  gameTwoDWorldTilesRuntime +
  gameTwoDWorldEventsRuntime +
  gameTwoDWorldGroupsRuntime +
  gameTwoDWorldTimersRuntime
