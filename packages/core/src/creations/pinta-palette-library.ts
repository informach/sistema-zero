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
 * O ID é reservado no canal do Pinta. O kind é exclusivo da biblioteca.
 */
export function classifyPintaPaletteLibraryCreation(
  identity: CreationIdentity,
): PintaPaletteLibraryCreationClassification {
  const reservedItem =
    identity.tool === PINTA_PALETTE_LIBRARY_TOOL &&
    identity.itemId === PINTA_PALETTE_LIBRARY_ITEM_ID
  const reservedKind = identity.kind === PINTA_PALETTE_LIBRARY_KIND
  if (!reservedItem && !reservedKind) return 'regular'
  return reservedItem && reservedKind ? 'palette-library' : 'invalid-partial'
}

export function isPintaPaletteLibraryCreation(identity: CreationIdentity): boolean {
  return classifyPintaPaletteLibraryCreation(identity) === 'palette-library'
}
