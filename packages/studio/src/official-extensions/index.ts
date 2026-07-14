import type { ExtensionDefinition } from '#extensions'
import { gameTwoDExtension } from './game-2d'
import { gameKitExtension } from './game-2d-advanced'
import { gameThreeDExtension } from './game-3d'

/**
 * Catálogo oficial de extensões. É a única fonte da verdade — não há loader
 * dinâmico, não há fetch remoto, não há marketplace. Para adicionar uma
 * extensão nova, edite este array E passe pelo processo de revisão descrito
 * em docs/EXTENSIONS.md.
 */
export const OFFICIAL_CATALOG: readonly ExtensionDefinition[] = Object.freeze([
  gameTwoDExtension,
  gameKitExtension,
  gameThreeDExtension,
])

export function findExtension(id: string): ExtensionDefinition | undefined {
  return OFFICIAL_CATALOG.find((e) => e.manifest.id === id)
}

export * from './game-2d'
export * from './game-2d-advanced'
export * from './game-3d'
