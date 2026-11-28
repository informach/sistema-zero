import type { PintaMemoryAsset, PintaWorkshopAsset } from '../core/assetMemory'
import type {
  PintaAsset,
  RegionTilemapAsset,
  TilemapAsset,
  VersionablePintaAsset,
} from '../core/project'
import type { ProjectedTilemapAsset } from '../core/projectedDocument'
import { sceneMapClosure } from '../core/sceneMapClosure'
import type { ProjectedSceneAsset } from './projectedScene'
export type ScenePackageTarget = 'tiled' | 'phaser' | 'pygame' | 'godot'
export function buildScenePackage(
  root: TilemapAsset,
  assets: readonly PintaAsset[],
  target: ScenePackageTarget,
  options?: { imageOf?: (asset: PintaAsset) => Promise<string | null> },
): Promise<Record<string, Uint8Array | string>>
export function buildScenePackage(
  root: Extract<PintaWorkshopAsset, { kind: 'tilemap' }>,
  assets: readonly PintaWorkshopAsset[],
  target: ScenePackageTarget,
  options?: { imageOf?: (asset: VersionablePintaAsset) => Promise<string | null> },
): Promise<Record<string, Uint8Array | string>>
export function buildScenePackage(
  root: RegionTilemapAsset | ProjectedTilemapAsset,
  assets: readonly ProjectedSceneAsset[],
  target: ScenePackageTarget,
  options?: { imageOf?: (asset: VersionablePintaAsset) => Promise<string | null> },
): Promise<Record<string, Uint8Array | string>>
export async function buildScenePackage(
  root: TilemapAsset | RegionTilemapAsset | ProjectedTilemapAsset,
  inventory: readonly ProjectedSceneAsset[],
  target: ScenePackageTarget,
  options: {
    imageOf?: (asset: VersionablePintaAsset) => Promise<string | null>
  } = {},
): Promise<Record<string, Uint8Array | string>> {
  const captured = structuredClone(
    sceneMapClosure(
      root as Extract<PintaMemoryAsset, { kind: 'tilemap' }>,
      inventory as readonly PintaMemoryAsset[],
    ),
  )
  const { buildRegionScenePackage } = await import('./regionScenePackage')
  return buildRegionScenePackage(captured, target, options.imageOf)
}

export async function scenePackageBlob(files: Record<string, string | Uint8Array>): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate')
  return new Blob(
    [
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v]),
        ),
        { level: 6 },
      ),
    ],
    { type: 'application/zip' },
  )
}
