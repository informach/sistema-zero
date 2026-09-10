import type { SceneImage } from '../../../scene/document'
import { readSceneImageFlipbook } from '../../../scene/imageFlipbook'
import { requireScene } from '../../../scene/validation'

/** UI numbering is one-based; native sheet cells are zero-based. Blank means every validated cell. */
export function readSceneFlipbookForm(data: FormData, image: SceneImage) {
  const initial = readSceneImageFlipbook(
    {
      frameWidth: Number(data.get('frameWidth')),
      frameHeight: Number(data.get('frameHeight')),
      frames: [0],
      fps: Number(data.get('frameFps')),
      loop: data.get('frameLoop') === 'on',
    },
    image,
  )
  const text = String(data.get('frameSequence') ?? '').trim()
  const frames = text
    ? text.split(/[\s,;]+/).map((token) => {
        requireScene(
          /^[1-9]\d*$/.test(token),
          'frames',
          'Use números de quadros a partir de 1, separados por vírgulas ou espaços.',
        )
        return Number(token) - 1
      })
    : Array.from(
        { length: (image.width / initial.frameWidth) * (image.height / initial.frameHeight) },
        (_, i) => i,
      )
  return readSceneImageFlipbook({ ...initial, frames }, image)
}
