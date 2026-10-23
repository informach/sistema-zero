import { z } from 'zod'
import { artAssetIds, artSchema } from './art'
import type { AssetManifest } from './assets'
import { canonicalJson, hashSchema, idSchema } from './common'
import type { Revision } from './editorial'
import { renderEngineSchema } from './render-engine'
import { videoAssetIds } from './video'

export { renderEngineSchema } from './render-engine'
export const renderReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceRevisionId: idSchema,
    inputSha256: hashSchema,
    engine: renderEngineSchema,
    outputAssetId: idSchema,
    outputSha256: hashSchema,
  })
  .strict()
export type RenderReceipt = z.infer<typeof renderReceiptSchema>

/** A conversion recipe, not an editable reconstruction of text or layers in a flattened image. */
export function rasterExport(source: Revision, manifests: AssetManifest[], sourceAssetId?: string) {
  const document = source.document
  if (document.kind !== 'component' || document.composition)
    throw new Error('Selecione uma arte sem montagem para converter')
  const candidates = manifests.filter(
    (asset) => document.assetIds.includes(asset.id) && asset.mime.startsWith('image/'),
  )
  const asset = sourceAssetId
    ? candidates.find((asset) => asset.id === sourceAssetId)
    : candidates.length === 1
      ? candidates[0]
      : undefined
  if (!asset?.width || !asset.height || (asset.rotation !== null && asset.rotation !== 0))
    throw new Error(
      'Selecione uma única imagem confirmada, com dimensões e orientação normalizadas',
    )
  const composition = artSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-art-v1',
    width: asset.width,
    height: asset.height,
    background: '#ffffff',
    fontAssetId: null,
    layers: [
      {
        id: asset.id,
        kind: 'image',
        assetId: asset.id,
        frame: { x: 0, y: 0, width: asset.width, height: asset.height },
        fit: 'contain',
        radius: 0,
        opacity: 1,
        protected: true,
      },
    ],
  })
  return { asset, composition }
}

/** Hash only durable inputs. Local paths, signed URLs and the previous final are not inputs. */
export async function renderInputHash(
  source: Revision,
  manifests: AssetManifest[],
  imageFormat?: 'png' | 'jpeg',
  sourceAssetId?: string,
) {
  const document = source.document
  const raster =
    document.kind === 'component' && !document.composition && imageFormat === 'jpeg'
      ? rasterExport(source, manifests, sourceAssetId)
      : null
  const input =
    document.kind === 'video'
      ? { kind: 'video', timeline: document.timeline }
      : document.kind === 'component' && document.composition
        ? {
            kind: 'art',
            composition: document.composition,
            title: document.title,
            body: document.body,
          }
        : raster
          ? { kind: 'raster-jpeg', composition: raster.composition }
          : undefined
  if (!input) throw new Error('Esta revisão não contém uma montagem para renderizar')
  const ids =
    document.kind === 'video'
      ? videoAssetIds(document.timeline)
      : document.kind === 'component' && document.composition
        ? artAssetIds(document.composition)
        : raster
          ? [raster.asset.id]
          : []
  const assets = ids.sort().map((id) => {
    const asset = manifests.find((asset) => asset.id === id)
    if (!asset) throw new Error('A identidade do render exige todas as mídias confirmadas')
    return { id, sha256: asset.sha256, size: asset.size, mime: asset.mime }
  })
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      canonicalJson({
        input,
        assets,
        // Omitted encoding retains the identity of already queued PNG requests.
        ...(imageFormat
          ? {
              encoding: { format: imageFormat, ...(imageFormat === 'jpeg' ? { quality: 95 } : {}) },
            }
          : {}),
      }),
    ),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
