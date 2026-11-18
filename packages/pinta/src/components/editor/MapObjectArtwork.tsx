import { type JSX, useEffect, useMemo, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTilesetKind, type TilemapObject } from '../../core/project'
import { buildStudioPayload } from '../../export/studioBridge'
import { usePintaGallery } from '../appContext'

export function MapObjectArtwork({
  object,
  source,
}: {
  object: TilemapObject
  source?: import('../../core/project').PintaAsset
}): JSX.Element | null {
  const assets = usePintaGallery((s) => s.assets)
  const asset = source ?? assets.find((a) => a.id === (object.art?.assetId ?? object.setId))
  const find = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.id, a]))
    return (id: string) => byId.get(id) ?? null
  }, [assets])
  const [image, setImage] = useState<{ dataUrl: string; width: number; height: number } | null>(
    null,
  )
  useEffect(() => {
    let active = true
    if (!asset) {
      setImage(null)
      return
    }
    const source = asset.kind === 'map-set' ? asset.map : asset
    void buildStudioPayload(source, find, { animationId: null, frameIndex: 0 })
      .then((result) => {
        if (active) setImage(result)
      })
      .catch(() => {
        if (active) setImage(null)
      })
    return () => {
      active = false
    }
  }, [asset, find])
  if (!image || !asset) return null
  const index = object.art?.tile ?? 0
  const sw =
    'frameWidth' in asset ? asset.frameWidth : isTilesetKind(asset) ? asset.tileSize : image.width
  const sh =
    'frameHeight' in asset
      ? asset.frameHeight
      : isTilesetKind(asset)
        ? asset.tileSize
        : image.height
  const columns = Math.max(1, Math.floor(image.width / sw))
  return (
    <svg
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
      viewBox={`${(index % columns) * sw} ${Math.floor(index / columns) * sh} ${sw} ${sh}`}
      overflow="hidden"
      preserveAspectRatio="none"
    >
      <title>{object.name || COPY.scene.desenhoDoObjeto}</title>
      <image
        href={image.dataUrl}
        width={image.width}
        height={image.height}
        style={{ imageRendering: 'pixelated' }}
      />
    </svg>
  )
}
