import { useEffect, useMemo, useRef } from 'react'
import type { PintaWorkshopAsset } from '../../core/assetMemory'
import { pintaAssetDependencyIds } from '../../core/project'
import type { WorkshopProjectedMap } from '../../core/projectedDocument'
import { paintProjectedThumbnail } from '../../export/projectedPreview'
import { useProjectedScene } from '../editor/useProjectedScene'

export function ProjectedMapThumb({
  asset,
  findAsset,
}: {
  asset: WorkshopProjectedMap
  findAsset?: (id: string) => PintaWorkshopAsset | null
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const catalog = useMemo(() => {
    const assets = new Map<string, PintaWorkshopAsset>([[asset.id, asset]])
    const pending: PintaWorkshopAsset[] = [asset]
    for (const item of pending)
      for (const id of pintaAssetDependencyIds(item)) {
        if (assets.has(id)) continue
        const next = findAsset?.(id)
        if (next) {
          assets.set(id, next)
          pending.push(next)
        }
      }
    return [...assets.values()]
  }, [asset, findAsset])
  const { value } = useProjectedScene(asset, catalog)
  useEffect(() => {
    if (canvas.current && value) paintProjectedThumbnail(canvas.current, value.scene, value.images)
  }, [value])
  return (
    <span aria-hidden="true" className="relative h-full w-full">
      <canvas
        ref={canvas}
        width={192}
        height={192}
        className="relative h-full w-full object-contain"
      />
    </span>
  )
}
