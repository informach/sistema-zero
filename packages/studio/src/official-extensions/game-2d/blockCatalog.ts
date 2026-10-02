import type { BlockDefinition } from '../../blockly/blocks/types'
import { sceneBlocks } from '../scene-2d/blocks'
import { gameTwoDActionBlocks } from './blockCatalogActions'
import { gameTwoDClassicBlocks } from './blockCatalogClassic'
import { gameTwoDFundamentalBlocks } from './blockCatalogFundamentals'
import { gameTwoDGroupAndHudBlocks } from './blockCatalogGroups'
import { gameTwoDInteractionBlocks } from './blockCatalogInteraction'
import { gameTwoDKitBlocks } from './blockCatalogKits'
import { gameTwoDTextBlocks } from './blockCatalogText'
import { gameTwoDWorldBlocks } from './blockCatalogWorlds'

export const gameTwoDBlocks: BlockDefinition[] = [
  ...sceneBlocks('g2d'),
  ...gameTwoDActionBlocks,
  ...gameTwoDTextBlocks,
  ...gameTwoDClassicBlocks,
  ...gameTwoDFundamentalBlocks,
  ...gameTwoDInteractionBlocks,
  ...gameTwoDGroupAndHudBlocks,
  ...gameTwoDKitBlocks,
  ...gameTwoDWorldBlocks,
]
