import type { SceneRgba } from '../scene/composite'
import * as v from '../scene/validation'

export function readSceneWorkerPalette(raw: unknown): SceneRgba[] {
  const palette = v
    .list(raw, 'palette', 256)
    .map(
      (raw, i) =>
        v.tuple(raw, 4, `palette[${i}]`).map((n) => v.number(n, 'color', 0, 1)) as SceneRgba,
    )
  v.requireScene(
    palette.length > 0 && palette[0]!.every((c) => c === 0),
    'palette',
    'A primeira cor deve ser transparente.',
  )
  return palette
}
