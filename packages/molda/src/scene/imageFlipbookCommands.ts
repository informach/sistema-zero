import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import { finishSceneCommand } from './commandContext'
import type { MoldaSceneDocument, SceneImageFlipbook } from './document'
import { readSceneImageFlipbook } from './imageFlipbook'
import * as v from './validation'

/** Metadata only; cells stay in one canonical image and undo retains exact layer references. */
export function setSceneImageFlipbook(
  document: MoldaSceneDocument,
  imageId: string,
  input: SceneImageFlipbook | null,
) {
  const usage = sceneAppearanceUsage(document)
  const source = usage.index.images.get(imageId)
  v.requireScene(source, 'image', 'Essa imagem não existe mais.')
  requireEditableAppearance(usage, usage.images.get(imageId) ?? [])
  const next = input === null ? undefined : readSceneImageFlipbook(input, source)
  const previous = source.flipbook
  if (
    (!next && !previous) ||
    (next &&
      previous &&
      next.frameWidth === previous.frameWidth &&
      next.frameHeight === previous.frameHeight &&
      next.fps === previous.fps &&
      next.loop === previous.loop &&
      next.frames.length === previous.frames.length &&
      next.frames.every((n, i) => previous.frames[i] === n))
  )
    return document
  const image = { ...source }
  if (next) image.flipbook = next
  else delete image.flipbook
  return finishSceneCommand({
    ...document,
    images: document.images.map((entry) => (entry === source ? image : entry)),
  })
}
