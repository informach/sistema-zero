import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { PINTA_REGION_WORLD_BUDGET } from '@sistemazero/core/studio/pinta-region-image-limits'
import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { pintaDoorBinding } from '../../core/sceneMapClosure'
import { encodeRegionSceneWorldPng } from '../regionSceneWorldPng'
import { TiledImportError } from './errors'
import { importRegionalTiledScene, tiledXmlToJson } from './import'
import { tiledPackageSource } from './package'

/** Explicit private ZIP return. Pick one editable file per map, starting at the
 * entry map. Native backups and runtime sidecars never take precedence over it.
 */
export async function importRegionalTiledWorld(
  entries: ReadonlyMap<string, Uint8Array>,
  mapPaths: readonly string[],
) {
  if (!mapPaths.length || mapPaths.length > PINTA_IMAGE_WORLD_LIMITS.maps)
    throw new TiledImportError('Escolha de 1 a 16 mapas regionais do Tiled.')
  const scenes = new Map<string, PintaRegionSceneWire>()
  const warnings: string[] = []
  let { indexBytes, metadataBytes } = PINTA_REGION_WORLD_BUDGET
  for (const path of mapPaths) {
    const source = tiledPackageSource(entries, path)
    const raw = source.map()
    const imported = await importRegionalTiledScene(
      typeof raw === 'string' ? tiledXmlToJson(raw) : raw,
      source.resolver,
      source.name,
      indexBytes,
    )
    if (scenes.has(imported.scene.id))
      throw new TiledImportError('Escolha apenas um arquivo editado para cada mapa.')
    indexBytes -= imported.indexBytes
    metadataBytes -= imported.metadataBytes
    if (metadataBytes < 0)
      throw new TiledImportError('Os dados dos mapas excedem o limite do cenário.')
    scenes.set(imported.scene.id, imported.wire)
    warnings.push(...imported.warnings)
  }
  const catalog = new Map(
    [...scenes].map(([id, scene]) => [id, { kind: 'tilemap' as const, id, name: scene.name }]),
  )
  const targetIds = new Map<string, Set<string>>()
  for (const [id, scene] of scenes) {
    const targets = new Set<string>()
    for (const map of [scene, ...(scene.sets ?? [])])
      for (const layer of map.layers) {
        if (layer.kind !== 'objects') continue
        for (const object of layer.objects) {
          if (object.role !== 'door') continue
          const unwrap = (property: (typeof object.properties)[string]) =>
            typeof property === 'object' ? property.value : property
          const raw = unwrap(object.properties.destino) || unwrap(object.properties.destination)
          if (!raw) continue
          const binding = typeof raw === 'string' ? pintaDoorBinding(raw, catalog) : null
          if (binding?.type !== 'target')
            throw new TiledImportError(
              `O destino “${raw}” de uma porta não veio no pacote ou é ambíguo.`,
            )
          targets.add(binding.id)
        }
      }
    targetIds.set(id, targets)
  }
  const [rootId] = scenes.keys()
  if (!rootId) throw new TiledImportError('O cenário inicial não veio no pacote.')
  const reachable = new Set([rootId])
  for (const id of reachable) for (const target of targetIds.get(id)!) reachable.add(target)
  if (reachable.size !== scenes.size)
    throw new TiledImportError(
      'Os mapas escolhidos precisam estar ligados ao mapa inicial por portas.',
    )
  const { png, admitted } = await encodeRegionSceneWorldPng(rootId, scenes)
  return { png, world: admitted, warnings }
}
