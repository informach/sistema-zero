import type { MoldaAssetBase } from '../core/model'
import { DEFAULT_PALETTE_ID } from '../core/palette'
import type { MoldaSceneDocument } from '../scene/document'

export type NativeImportIdentity = Pick<MoldaAssetBase, 'id' | 'name' | 'createdAt' | 'updatedAt'>

/** Candidate only: each importer validates this with the native reader BEFORE traversing source. */
export function importDocumentBase(identity: NativeImportIdentity): MoldaSceneDocument {
  return {
    id: identity.id,
    name: identity.name,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    formatVersion: 2,
    kind: 'model',
    paletteId: DEFAULT_PALETTE_ID,
    settings: { texelsPerUnit: 4, snap: 1, mirrorX: false },
    nodes: [],
    geometries: [],
    materials: [],
    images: [],
    mirrors: [],
  }
}
