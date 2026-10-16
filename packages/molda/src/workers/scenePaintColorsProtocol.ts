import { isMoldaAssetId } from '../core/id'
import type { SceneRgba } from '../scene/composite'
import type { ScenePaintColorJob } from '../scene/paintIndicators'
import { readSceneImage } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readSceneWorkerPalette } from './scenePaletteProtocol'
import type { TaskReply } from './workerTask'

export interface ScenePaintColorsRequest extends ScenePaintColorJob {
  documentId: string
  revision: number
}
export function readScenePaintColorsRequest(raw: unknown): ScenePaintColorsRequest {
  const row = v.record(raw, 'request', ['documentId', 'revision', 'image', 'palette', 'base'])
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  const palette = readSceneWorkerPalette(row.palette)
  return {
    documentId: row.documentId,
    revision: v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true),
    image: readSceneImage(row.image, 'image', { pixels: 0, layers: 0 }, palette.length),
    palette,
    base: v.tuple(row.base, 4, 'base').map((n) => v.number(n, 'base', 0, 1)) as SceneRgba,
  }
}
export function readScenePaintColorsReply(
  raw: unknown,
  expected: ScenePaintColorsRequest,
): TaskReply<readonly string[], never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === expected.documentId &&
      row.revision === expected.revision &&
      row.imageId === expected.image.id,
    'reply',
    'As cores pertencem a outra imagem, criação ou revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'reply.type')
  if (type === 'error') {
    v.record(row, 'reply', ['documentId', 'revision', 'imageId', 'type', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['documentId', 'revision', 'imageId', 'type', 'colors'])
  const colors = v.list(row.colors, 'colors', 3).map((value) => {
    const color = v.text(value, 'color', 7)
    v.requireScene(/^#[0-9a-f]{6}$/.test(color), 'color', 'Cor inválida.')
    return color
  })
  v.requireScene(new Set(colors).size === colors.length, 'colors', 'Cores repetidas.')
  return { type, result: colors }
}
