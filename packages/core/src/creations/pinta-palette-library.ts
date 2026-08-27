export const PINTA_PALETTE_LIBRARY_TOOL = 'pinta'
export const PINTA_PALETTE_LIBRARY_ITEM_ID = 'sz-pinta-palettes'
export const PINTA_PALETTE_LIBRARY_KIND = 'palette-library'

export type PintaPaletteLibraryCreationClassification =
  | 'palette-library'
  | 'invalid-partial'
  | 'regular'

interface CreationIdentity {
  tool: string
  itemId: string
  kind: string
}

/**
 * Classifica a identidade reservada da biblioteca. `tool: pinta` sozinho é
 * comum a todos os desenhos; itemId e kind são os marcadores reservados.
 */
export function classifyPintaPaletteLibraryCreation(
  identity: CreationIdentity,
): PintaPaletteLibraryCreationClassification {
  const reservedItem = identity.itemId === PINTA_PALETTE_LIBRARY_ITEM_ID
  const reservedKind = identity.kind === PINTA_PALETTE_LIBRARY_KIND
  if (!reservedItem && !reservedKind) return 'regular'
  return identity.tool === PINTA_PALETTE_LIBRARY_TOOL && reservedItem && reservedKind
    ? 'palette-library'
    : 'invalid-partial'
}

export function isPintaPaletteLibraryCreation(identity: CreationIdentity): boolean {
  return classifyPintaPaletteLibraryCreation(identity) === 'palette-library'
}
