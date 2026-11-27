import type { PintaProjectedScene } from '@sistemazero/core/studio/pinta-projected-scene'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PintaWorkshopAsset } from '../../core/assetMemory'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import {
  projectedEditorScene,
  sameProjectedSceneResources,
} from '../../export/projectedEditorScene'
import { exportPintaProjectedScene } from '../../export/projectedScene'
import { loadSceneImages } from '../../export/sceneDrawing'

/** The gallery and editing stage share portable resource admission, retaining prepared
 * images across canonical cell edits instead of encoding the whole world per stroke. */
export function useProjectedScene(
  map: WorkshopProjectedMap,
  catalog: readonly PintaWorkshopAsset[],
) {
  const previous = useRef({ map, catalog })
  const source = useMemo(() => {
    if (!sameProjectedSceneResources(previous.current.map, map, previous.current.catalog, catalog))
      previous.current = { map, catalog }
    return previous.current
  }, [map, catalog])
  const [value, setValue] = useState<{
    source: typeof source
    scene: PintaProjectedScene
    images: Map<string, HTMLImageElement>
  } | null>(null)
  const [failure, setFailure] = useState<{ source: typeof source; message: string } | null>(null)
  useEffect(() => {
    let active = true
    const assets = new Map(source.catalog.map((asset) => [asset.id, asset]))
    assets.set(source.map.id, source.map)
    void exportPintaProjectedScene(source.map, (id) => assets.get(id) ?? null)
      .then(async ({ scene }) => ({ source, scene, images: await loadSceneImages(scene) }))
      .then((next) => {
        if (active) {
          setValue(next)
          setFailure(null)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setValue(null)
          setFailure({
            source,
            message:
              cause instanceof Error
                ? cause.message
                : 'Não foi possível abrir as imagens do cenário.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [source])
  const rendered = useMemo(
    () =>
      value?.source === source
        ? { scene: projectedEditorScene(value.scene, map), images: value.images }
        : null,
    [value, source, map],
  )
  return { value: rendered, error: failure?.source === source ? failure.message : null }
}
