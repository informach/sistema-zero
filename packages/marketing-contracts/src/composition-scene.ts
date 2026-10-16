import { artAssetIds } from './art'
import { compositionInputSchema, type GeneratedComposition } from './remotion-composition'
import { clipSchema, type VideoClip, type VideoProject } from './video'

export function compositionSceneError(video: VideoProject, clip: VideoClip): string | null {
  if (clip.protected) return 'Esta cena está protegida'
  if (!['text', 'image', 'art'].includes(clip.kind) && !clip.generated)
    return 'Escolha uma cena gráfica; gravações e áudio permanecem na montagem'
  if (clip.art?.composition.layers.some((layer) => layer.protected))
    return 'A cena tem camadas protegidas; ajuste sua composição existente'
  if (clip.durationInFrames * video.fps.denominator > 60 * video.fps.numerator)
    return 'Divida a cena em trechos de até 60 segundos antes de criar a animação'
  return null
}

export function compositionSceneInput(video: VideoProject, clip: VideoClip) {
  const error = compositionSceneError(video, clip)
  if (error) throw new Error(error)
  const fontAssetId =
    clip.generated?.input.fontAssetId ??
    clip.art?.composition.fontAssetId ??
    video.fontAssetId ??
    null
  const title = clip.generated?.input.title ?? clip.art?.title ?? ''
  const body =
    clip.generated?.input.body ??
    clip.art?.body ??
    (clip.listItems ? clip.listItems.map((item) => item.text).join('\n') : (clip.text ?? ''))
  const ids =
    clip.generated?.input.assetIds ??
    (clip.art
      ? artAssetIds(clip.art.composition).filter((id) => id !== clip.art?.composition.fontAssetId)
      : clip.assetId
        ? [clip.assetId]
        : [])
  return compositionInputSchema.parse({
    schemaVersion: 1,
    width: video.width,
    height: video.height,
    fps: video.fps,
    durationInFrames: clip.durationInFrames,
    title,
    body,
    requiredText: [title, body].filter((text) => text.trim()),
    assetIds: [...new Set(ids)],
    fontAssetId,
    background: video.background,
    accent: video.accent,
  })
}

/** Replace only this graphic; its original and generated source remain in revision history. */
export function compositionSceneClip(clip: VideoClip, generated: GeneratedComposition) {
  return clipSchema.parse({
    id: clip.id,
    trackId: clip.trackId,
    kind: 'video',
    assetId: generated.outputAssetId,
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
    volume: 0,
    fit: 'contain',
    protected: clip.protected,
    showCaptions: false,
    generated,
  })
}
