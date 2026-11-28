import {
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import { isWorkshopProjectedMap, type PintaWorkshopAsset } from '../core/assetMemory'
import type { PintaExportedAsset } from '../core/types'
import { pintaWorkshopBody } from '../core/workshopAsset'
import { collectMapTilesets } from '../tiles/mapTilesets'
import { paintMinimap, tilemapOverview } from '../tiles/minimap'
import { prepareMapRegions } from '../tiles/regionMap'
import { exportPintaRegionScene } from './regionScene'

/** Emit the executable, bounded wire scene and a separate overview for the Studio card. */
export async function regionStudioPayload(
  source: Extract<PintaWorkshopAsset, { kind: 'tilemap' }>,
  catalog: ReadonlyMap<string, PintaWorkshopAsset>,
): Promise<Omit<PintaExportedAsset, 'maps'> | null> {
  const body = pintaWorkshopBody(source)
  if (body.kind !== 'tilemap') return null
  if (isWorkshopProjectedMap(body)) {
    const { exportPintaProjectedScene } = await import('./projectedScene')
    const exported = await exportPintaProjectedScene(body, (id) => catalog.get(id) ?? null)
    if (typeof document === 'undefined') return null
    const { loadSceneImages } = await import('./sceneDrawing')
    const { paintProjectedThumbnail } = await import('./projectedPreview')
    const images = await loadSceneImages(exported.scene)
    const canvas = document.createElement('canvas')
    if (!paintProjectedThumbnail(canvas, exported.scene, images, 128)) return null
    return {
      id: body.id,
      name: body.name,
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      scene: exported.wire,
    }
  }
  const converted = 'origin' in body ? { ok: true as const, map: body } : prepareMapRegions(body)
  if (!converted.ok) return null
  const map = converted.map,
    find = (id: string) => {
      const asset = catalog.get(id)
      return asset && !isWorkshopProjectedMap(asset) ? asset : null
    }
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
