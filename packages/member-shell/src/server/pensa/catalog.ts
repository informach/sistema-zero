import 'server-only'
import { createHash } from 'node:crypto'
import { PENSA_GAME_RUNTIME_EXTENSION_IDS } from '@sistemazero/core/pensa'
import {
  BLOCK_LEVELS,
  SERVER_BLOCK_CATALOG,
  type ServerBlockCatalogEntry,
} from '@sistemazero/studio/server-catalog'
import { SERVER_MECHANIC_DOCUMENTS } from '@sistemazero/studio/server-knowledge'
import type { StudioTier } from '../../lib/studio-tier'

export const PENSA_RUNTIME_EXTENSIONS = PENSA_GAME_RUNTIME_EXTENSION_IDS

export const PENSA_CATALOG_VERSION = createHash('sha256')
  .update(JSON.stringify([SERVER_BLOCK_CATALOG, SERVER_MECHANIC_DOCUMENTS]))
  .digest('hex')

export function dimensionAllows(
  entry: Pick<ServerBlockCatalogEntry, 'extension'> & { category?: string },
  dimension: '2d' | '3d',
): boolean {
  return dimension === '3d' || (!entry.extension?.includes('3d') && !entry.category?.includes('3D'))
}

export function pensaCatalog(tier: StudioTier, dimension: '2d' | '3d') {
  const earned = tier.allowBlocks ? new Set(tier.allowBlocks) : null
  const blocks = SERVER_BLOCK_CATALOG.filter((entry) => {
    if (!tier.allowedModes.includes('blocks') || !dimensionAllows(entry, dimension)) return false
    if (earned) {
      if (!earned.has(entry.type)) return false
    } else if (BLOCK_LEVELS.indexOf(entry.level) > BLOCK_LEVELS.indexOf(tier.level)) return false
    return entry.extension === null || tier.allowedExtensions.includes(entry.extension)
  })
  const documents = SERVER_MECHANIC_DOCUMENTS.filter(
    (document) =>
      tier.allowedExtensions.includes(document.extension) &&
      dimensionAllows({ extension: document.extension }, dimension),
  )
  return { blocks, documents }
}

export function pensaExtensionName(id: string): string {
  const document = SERVER_MECHANIC_DOCUMENTS.find((item) => item.extension === id)
  if (!document) return id
  return document.title.replace(/^Manual oficial\s*[—–:-]\s*/u, '')
}
