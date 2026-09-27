import type { BlockDefinition } from '../../blockly/blocks/types'
import { gameTwoDActionBlocks } from './blockCatalogActions'
import { gameTwoDClassicBlocks } from './blockCatalogClassic'
import { gameTwoDFundamentalBlocks } from './blockCatalogFundamentals'
import { gameTwoDGroupAndHudBlocks } from './blockCatalogGroups'
import { gameTwoDInteractionBlocks } from './blockCatalogInteraction'
import { gameTwoDKitBlocks } from './blockCatalogKits'
import { gameTwoDTextBlocks } from './blockCatalogText'
import { gameTwoDWorldBlocks } from './blockCatalogWorlds'

export const gameTwoDBlocks: BlockDefinition[] = [
  ...gameTwoDActionBlocks,
  ...gameTwoDTextBlocks,
  ...gameTwoDClassicBlocks,
  ...gameTwoDFundamentalBlocks,
  ...gameTwoDInteractionBlocks,
  ...gameTwoDGroupAndHudBlocks,
  ...gameTwoDKitBlocks,
  ...gameTwoDWorldBlocks,
]
