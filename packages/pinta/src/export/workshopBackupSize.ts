import { isWorkshopProjectedMap, type PintaWorkshopAsset } from '../core/assetMemory'
import type { AutomapBook } from '../tiles/automapping/book'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { automapDocumentEnvelope } from '../tiles/automapping/native'
import { galleryBackupByteLength } from './projectJson'
import type { RegionBackupSizeCache } from './regionBackupSize'
import { isLegacyWorkshopAsset, pintaWorkshopBody } from './workshopDocument'

/** One authorial envelope per native-9 map, shared by editor history and persistence admission. */
export function workshopBackupSize(
  sizing: RegionBackupSizeCache,
  assets: readonly PintaWorkshopAsset[],
) {
  const books = new Map<string, AutomapBook>()
  const bodies: PintaWorkshopAsset[] = []
  for (const asset of assets) {
    if (isWorkshopProjectedMap(asset)) bodies.push(asset)
    else {
      if (isPintaAuthoredMap(asset)) books.set(asset.id, asset.automapping)
      bodies.push(pintaWorkshopBody(asset))
    }
  }
  if (books.size || bodies.some(isWorkshopProjectedMap))
    return sizing.byteLength(bodies, (items) => automapDocumentEnvelope(items, books))
  return assets.every(isLegacyWorkshopAsset)
    ? galleryBackupByteLength(assets)
    : sizing.byteLength(assets)
}
