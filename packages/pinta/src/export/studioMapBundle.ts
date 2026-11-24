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
  return root ? { ...root, ...(maps.length ? { maps } : {}) } : null
}
