import type { BlockDefinition } from '../../blockly/blocks/types'
import { gameTwoDClassicBlocks } from './blockCatalogClassic'
import { gameTwoDFundamentalBlocks } from './blockCatalogFundamentals'
import { gameTwoDGroupAndHudBlocks } from './blockCatalogGroups'
import { gameTwoDInteractionBlocks } from './blockCatalogInteraction'
import { gameTwoDKitBlocks } from './blockCatalogKits'
import { gameTwoDWorldBlocks } from './blockCatalogWorlds'

export const gameTwoDBlocks: BlockDefinition[] = [
  ...gameTwoDClassicBlocks,
  ...gameTwoDFundamentalBlocks,
  ...gameTwoDInteractionBlocks,
  ...gameTwoDGroupAndHudBlocks,
  ...gameTwoDKitBlocks,
  ...gameTwoDWorldBlocks,
]
