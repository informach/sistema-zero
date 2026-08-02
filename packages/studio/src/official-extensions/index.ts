import type { ExtensionDefinition } from '#extensions'
import { gameTwoDExtension } from './game-2d'
import { gameKitExtension } from './game-2d-advanced'
import { gameThreeDExtension } from './game-3d'
import { gameKit3DExtension } from './game-3d-advanced'
import { worldThreeDExtension } from './world-3d'

/**
 * Catálogo oficial de extensões. É a única fonte da verdade: manifestos,
 * blocos e runtimes são síncronos; exemplos são chunks locais carregados pelo
 * provider compartilhado. Não há fetch remoto nem marketplace. Para adicionar
 * uma extensão nova, edite este array E passe pelo processo de revisão descrito
 * em docs/EXTENSIONS.md.
 */
export const OFFICIAL_CATALOG: readonly ExtensionDefinition[] = Object.freeze([
  gameTwoDExtension,
  gameKitExtension,
  gameThreeDExtension,
  gameKit3DExtension,
  worldThreeDExtension,
])

export function findExtension(id: string): ExtensionDefinition | undefined {
  return OFFICIAL_CATALOG.find((e) => e.manifest.id === id)
}

export * from './game-2d'
export * from './game-2d-advanced'
export * from './game-3d'
export * from './game-3d-advanced'
export * from './world-3d'
