import {
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaMemoryAsset } from '../core/assetMemory'
import type { PintaExportedAsset } from '../core/types'
import { pintaWorkshopBody } from '../core/workshopAsset'
import { collectMapTilesets } from '../tiles/mapTilesets'
import { paintMinimap, tilemapOverview } from '../tiles/minimap'
import { prepareMapRegions } from '../tiles/regionMap'
import { exportPintaRegionScene } from './regionScene'

/** Emit the executable, bounded wire scene and a separate overview for the Studio card. */
export async function regionStudioPayload(
  source: Extract<PintaMemoryAsset, { kind: 'tilemap' }>,
  catalog: ReadonlyMap<string, PintaMemoryAsset>,
): Promise<Omit<PintaExportedAsset, 'maps'> | null> {
  const body = pintaWorkshopBody(source)
  if (body.kind !== 'tilemap') return null
  const converted = 'origin' in body ? { ok: true as const, map: body } : prepareMapRegions(body)
  if (!converted.ok) return null
  const map = converted.map,
    find = (id: string) => catalog.get(id) ?? null
  const exported = await exportPintaRegionScene(map, find)
  // A mesma admissão de cabeçalhos, orçamento e células da raiz; só então o wire sai.
  if (!readPintaRegionScene(exported.json)) return null
  const scene = JSON.parse(exported.json) as PintaRegionSceneWire
  const preview = tilemapOverview(map, collectMapTilesets(map, find))
  if (!preview || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  if (!paintMinimap(canvas, preview.width, preview.height, preview.colors)) return null
  return {
    id: map.id,
    name: map.name,
    dataUrl: canvas.toDataURL('image/png'),
    width: preview.width,
    height: preview.height,
    scene,
  }
}
