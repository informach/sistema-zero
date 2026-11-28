import { type JSX, useEffect, useMemo, useState } from 'react'
import { useAnimationPlayer } from '../../animation/player'
import { isPintaMemoryAsset, type PintaMemoryAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import type { MapResourceSource } from '../../core/mapResourceVersions'
import {
  isTilesetKind,
  type PintaAsset,
  pintaAssetDependencyIds,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  type TilemapObject,
} from '../../core/project'
import { exportPintaRegionScene } from '../../export/regionScene'
import { scenePng } from '../../export/sceneDrawing'
import { buildStudioPayload } from '../../export/studioBridge'
import { isLocalRegionAsset } from '../../state/localRegionAssetAuthority'
import { usePintaGallery } from '../appContext'
import { useEditor } from './editorContext'

type ArtworkImage = { dataUrl: string; width: number; height: number } | null
/**
 * Uma imagem por DESENHO, dividida por todos os objetos que o usam: cem árvores iguais no
 * mapa montam a folha uma vez só. O desenho editado é outro objeto, então ganha entrada nova.
 */
const artworkCache = new WeakMap<
  PintaMemoryAsset,
  {
    dependencies: Map<string, PintaMemoryAsset | null>
    image: Promise<ArtworkImage>
  }
>()
function artworkDependencies(
  asset: PintaMemoryAsset,
  find: (id: string) => PintaMemoryAsset | null,
): Map<string, PintaMemoryAsset | null> {
  const dependencies = new Map<string, PintaMemoryAsset | null>(),
    pending = [asset]
  const seen = new Set([asset.id])
  while (pending.length)
    for (const id of pintaAssetDependencyIds(pending.pop()!)) {
      if (seen.has(id)) continue
      seen.add(id)
      const dependency = find(id)
      dependencies.set(id, dependency)
      if (dependency) pending.push(dependency)
    }
  return dependencies
}
function cachedArtwork(
  asset: PintaMemoryAsset,
  find: (id: string) => PintaMemoryAsset | null,
  render: () => Promise<ArtworkImage>,
): Promise<ArtworkImage> {
  const cached = artworkCache.get(asset)
  const dependencies = artworkDependencies(asset, find)
  if (
    cached &&
    cached.dependencies.size === dependencies.size &&
    [...dependencies].every(([id, dependency]) => cached.dependencies.get(id) === dependency)
  )
    return cached.image
  const pending = render().catch(() => null)
  artworkCache.set(asset, { dependencies, image: pending })
  return pending
}

export function artworkImage(
  asset: PintaAsset,
  find: (id: string) => PintaAsset | null,
  build: typeof buildStudioPayload = buildStudioPayload,
): Promise<ArtworkImage> {
  const source = asset.kind === 'map-set' ? asset.map : asset
  return cachedArtwork(asset, find, () =>
    build(source, find, { animationId: null, frameIndex: 0 }).then((result) =>
      result ? { dataUrl: result.dataUrl, width: result.width, height: result.height } : null,
    ),
  )
}

function regionArtworkImage(
  asset: RegionTilemapAsset | RegionMapSetAsset,
  find: (id: string) => PintaMemoryAsset | null,
): Promise<ArtworkImage> {
  return cachedArtwork(asset, find, async () => {
    const map = asset.kind === 'map-set' ? asset.map : asset
    const { scene } = await exportPintaRegionScene(map, find)
    return scenePng(scene, 1, 512)
  })
}

export function MapObjectArtwork({
  object,
  source,
  resourceSource,
}: {
  object: TilemapObject
  source?: PintaAsset
  /** The displayed snapshot may be a gesture preview rather than the saved editor value. */
  resourceSource?: MapResourceSource
}): JSX.Element | null {
  const assets = usePintaGallery((s) => s.assets)
  const map = useEditor((state) => state.asset)
  const resources = resourceSource
    ? resourceSource.resources
    : map.kind === 'tilemap'
      ? map.resources
      : map.kind === 'map-set'
        ? map.map.resources
        : undefined
  return (
    <CatalogMapObjectArtwork
      object={object}
      source={source}
      assets={assets.filter(isPintaMemoryAsset)}
      resources={resources}
    />
  )
}

export function CatalogMapObjectArtwork({
  object,
  source,
  assets,
  resources,
}: {
  object: TilemapObject
  source?: PintaMemoryAsset
  assets: readonly PintaMemoryAsset[]
  resources: MapResourceSource['resources']
}): JSX.Element | null {
  const find = useMemo(() => {
    const byId = new Map(assets.map((a) => [a.id, a]))
    for (const version of resources ?? []) byId.set(version.asset.id, version.asset)
    return (id: string) => byId.get(id) ?? null
  }, [assets, resources])
  const asset = source ?? find(object.art?.assetId ?? object.setId ?? '')
  const [image, setImage] = useState<ArtworkImage>(null)
  useEffect(() => {
    let active = true
    if (!asset) {
      setImage(null)
      return
    }
    const pending = isLocalRegionAsset(asset)
      ? regionArtworkImage(asset, find)
      : artworkImage(asset, (id) => {
          const target = find(id)
          return target && !isLocalRegionAsset(target) ? target : null
        })
    void pending.then((result) => {
      if (active) setImage(result)
    })
    return () => {
      active = false
    }
  }, [asset, find])
  if (!image || !asset) return null
  return (
    <ArtworkFrame
      key={`${asset.id}:${object.art?.animationId ?? ''}`}
      object={object}
      asset={asset}
      image={image}
    />
  )
}

function ArtworkFrame({
  object,
  asset,
  image,
}: {
  object: TilemapObject
  asset: PintaMemoryAsset
  image: NonNullable<ArtworkImage>
}): JSX.Element {
  const animations =
    asset.kind === 'pixel-sprite' || asset.kind === 'vector-sprite' ? asset.animations : []
  const selected = animations.findIndex((animation) => animation.id === object.art?.animationId)
  const animation = animations[selected]
  const frame = useAnimationPlayer({
    playing: !!animation,
    frameCount: animation?.frames.length ?? 1,
    fps: animation?.fps ?? 1,
    loop: animation?.loop ?? false,
    easing: animation?.easing,
  })
  const sw =
    'frameWidth' in asset ? asset.frameWidth : isTilesetKind(asset) ? asset.tileSize : image.width
  const sh =
    'frameHeight' in asset
      ? asset.frameHeight
      : isTilesetKind(asset)
        ? asset.tileSize
        : image.height
  const columns = Math.max(1, Math.floor(image.width / sw))
  const index = animation ? selected * columns + frame : (object.art?.tile ?? 0)
  return (
    <svg
      role="img"
      aria-label={object.name || COPY.scene.desenhoDoObjeto}
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
