import { type JSX, useEffect, useMemo, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTilesetKind, type PintaAsset, type TilemapObject } from '../../core/project'
import { buildStudioPayload } from '../../export/studioBridge'
import { usePintaGallery } from '../appContext'

type ArtworkImage = { dataUrl: string; width: number; height: number } | null
/**
 * Uma imagem por DESENHO, dividida por todos os objetos que o usam: cem árvores iguais no
 * mapa montam a folha uma vez só. O desenho editado é outro objeto, então ganha entrada nova.
 */
const artworkCache = new WeakMap<PintaAsset, Promise<ArtworkImage>>()
export function artworkImage(
  asset: PintaAsset,
  find: (id: string) => PintaAsset | null,
  build: typeof buildStudioPayload = buildStudioPayload,
): Promise<ArtworkImage> {
  const cached = artworkCache.get(asset)
  if (cached) return cached
  const source = asset.kind === 'map-set' ? asset.map : asset
  const pending = build(source, find, { animationId: null, frameIndex: 0 })
    .then((result) =>
      result ? { dataUrl: result.dataUrl, width: result.width, height: result.height } : null,
    )
    .catch(() => null)
  artworkCache.set(asset, pending)
  return pending
}

export function MapObjectArtwork({
  object,
  source,
}: {
  object: TilemapObject
  source?: PintaAsset
}): JSX.Element | null {
  const assets = usePintaGallery((s) => s.assets)
  const asset = source ?? assets.find((a) => a.id === (object.art?.assetId ?? object.setId))
  const find = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.id, a]))
    return (id: string) => byId.get(id) ?? null
  }, [assets])
  const [image, setImage] = useState<ArtworkImage>(null)
  useEffect(() => {
    let active = true
    if (!asset) {
      setImage(null)
      return
    }
    void artworkImage(asset, find).then((result) => {
      if (active) setImage(result)
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
