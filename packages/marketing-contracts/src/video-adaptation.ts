import type { AssetManifest } from './assets'
import type { Revision } from './editorial'
import { stableEditorialId } from './stable-id'
import { videoSchema } from './video'

/** An editable art scene when available; a raster remains an explicitly raster scene. */
export async function videoAdaptationSeed(
  source: Revision,
  assets: AssetManifest[],
  sourceAssetId?: string,
) {
  const document = source.document
  if (document.kind !== 'component') throw new Error('Selecione uma arte para transformar em vídeo')
  const images = assets.filter(
    (asset) => document.assetIds.includes(asset.id) && asset.mime.startsWith('image/'),
  )
  const image = sourceAssetId
    ? images.find((asset) => asset.id === sourceAssetId)
    : images.length === 1
      ? images[0]
      : undefined
  if (!document.composition && !image)
    throw new Error(
      'Selecione um arquivo final de imagem ou crie a montagem da arte antes de animar',
    )
  const width = document.composition?.width ?? image?.width,
    height = document.composition?.height ?? image?.height
  if (!width || !height)
    throw new Error('A imagem precisa de dimensões confirmadas antes de animar')
  const trackId = await stableEditorialId(`${source.id}:animation-track`),
    clipId = await stableEditorialId(`${source.id}:animation-scene`)
  return videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: Math.ceil(width / 2) * 2,
    height: Math.ceil(height / 2) * 2,
    fps: { numerator: 30, denominator: 1 },
    durationInFrames: 150,
    tracks: [{ id: trackId, kind: 'visual' }],
    captions: [],
    background: document.composition?.background ?? '#172a46',
    accent: '#ffdb56',
    clips: [
      {
        id: clipId,
        trackId,
        kind: document.composition ? 'art' : 'image',
        ...(document.composition
          ? {
              art: {
                composition: document.composition,
                title: document.title,
                body: document.body,
                protectedText: document.protectedText,
                sourceRevisionId: source.id,
              },
            }
          : { assetId: image?.id }),
        startFrame: 0,
        durationInFrames: 150,
        fit: 'contain',
        effect: 'fade',
      },
    ],
  })
}
