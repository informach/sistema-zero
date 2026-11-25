import { readPngDataUrl } from '@sistemazero/core/studio/pinta-png-binary'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from '@sistemazero/core/studio/pinta-region-image-limits'
import { readPintaRegionImageWorld } from '@sistemazero/core/studio/pinta-region-image-world'
import type { ActiveFrameRef } from '../core/assetEdit'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { COPY } from '../core/copy'
import { sceneMapClosure } from '../core/sceneMapClosure'
import type { PintaExportedAsset } from '../core/types'
import { isLegacyWorkshopAsset, isWorkshopRegion, pintaWorkshopBody } from '../core/workshopAsset'
import { buildStudioPayload, validateStudioPayloadSize } from './studioBridge'

export class StudioMapBundleError extends Error {
  constructor(readonly reason: 'asset-too-big' | 'sheet-too-big') {
    super(COPY.sendToStudio.tooBig)
    this.name = 'StudioMapBundleError'
  }
}

/** One structured export for push, pull and the playable project. Never returns a partial world. */
export async function buildStudioMapBundle(
  source: PintaMemoryAsset,
  assets: readonly PintaMemoryAsset[],
  frame: ActiveFrameRef = { animationId: null, frameIndex: 0 },
  options: { includeSceneMaps?: boolean } = {},
): Promise<PintaExportedAsset | null> {
  const closure =
    source.kind === 'tilemap' && options.includeSceneMaps !== false
      ? sceneMapClosure(source, assets)
      : null
  const byId = new Map((closure?.assets ?? assets).map((a) => [a.id, pintaWorkshopBody(a)]))
  byId.set(source.id, pintaWorkshopBody(source))
  const regional = (closure?.assets ?? [source]).some(isWorkshopRegion)
  const targets = closure?.maps ?? [source]
  const prepared: Array<Omit<PintaExportedAsset, 'maps'>> = []
  for (const target of targets) {
    const body = pintaWorkshopBody(target)
    const payload =
      regional && body.kind === 'tilemap'
        ? await (await import('./regionStudioPayload')).regionStudioPayload(body, byId)
        : isLegacyWorkshopAsset(body)
          ? await buildStudioPayload(
              body,
              (id) => {
                const asset = byId.get(id)
                return asset && isLegacyWorkshopAsset(asset) ? asset : null
              },
              target.id === source.id ? frame : { animationId: null, frameIndex: 0 },
            )
          : null
    if (!payload) return null
    const size = validateStudioPayloadSize(payload)
    if (size !== 'ok') throw new StudioMapBundleError(size)
    prepared.push({ ...payload, id: target.id, name: target.name })
  }
  const [root, ...maps] = prepared
  if (root && regional) {
    const { embedPintaRegionImage } = await import('./regionImage')
    const url = (bytes: Uint8Array) => {
      const parts: string[] = []
      for (let at = 0; at < bytes.length; at += 4096)
        parts.push(String.fromCharCode(...bytes.subarray(at, at + 4096)))
      return `data:image/png;base64,${btoa(parts.join(''))}`
    }
    const embed = (
      payload: Omit<PintaExportedAsset, 'maps'>,
      world?: import('@sistemazero/core/studio/pinta-image').PintaImageWorld,
    ) =>
      embedPintaRegionImage(
        readPngDataUrl(payload.dataUrl, PINTA_REGION_IMAGE_PNG_LIMITS).bytes,
        JSON.stringify(payload.scene),
        { world },
      )
    const children = []
    for (const map of maps)
      children.push({ id: map.id, name: map.name, png: url((await embed(map)).png) })
    const original = await embed(
      root,
      children.length ? { version: 1, rootId: root.id, maps: children } : undefined,
    )
    const world = readPintaRegionImageWorld(original.png)
    if (world.rootId !== root.id) return null
    const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(original.png))
    const dataUrl = url(original.png)
    const payload = {
      id: root.id,
      name: root.name,
      dataUrl,
      width: original.width,
      height: original.height,
      regional: {
        dataVersion: 5 as const,
        sourceId: root.id,
        sha256: Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join(''),
      },
    }
    if (validateStudioPayloadSize(payload) !== 'ok') throw new StudioMapBundleError('asset-too-big')
    return payload
  }
  return root ? { ...root, ...(maps.length ? { maps } : {}) } : null
}
