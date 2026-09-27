import type { GltfAccessor } from './gltfAccessors'
import type { GltfBufferView } from './gltfBufferViews'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import { gltfName } from './gltfMetadata'

export type GltfImage = { name: string | null } & (
  | { kind: 'uri'; uri: string; mimeType: string | null }
  | { kind: 'bufferView'; bufferView: number; mimeType: string }
)

/** References only: no resource resolution, image decoder or pixel allocation. */
export function readGltfImages(
  input: unknown,
  views: readonly GltfBufferView[],
  accessors: readonly GltfAccessor[],
): GltfImage[] {
  let numericViews: Set<number> | null = null
  return gltfList(input, 'images', GLTF_INPUT_LIMITS.appearanceItems).map((value, i) => {
    const path = `images[${i}]`,
      row = gltfRecord(value, path)
    requireGltf(
      (row.uri === undefined) !== (row.bufferView === undefined),
      path,
      'A imagem precisa de URI ou bufferView, não ambos.',
    )
    const name = gltfName(row.name, `${path}.name`)
    const mimeType = gltfName(row.mimeType, `${path}.mimeType`)
    if (row.uri !== undefined) {
      requireGltf(
        typeof row.uri === 'string',
        `${path}.uri`,
        'A referência da imagem precisa ser texto.',
      )
      if (row.uri.length > GLTF_INPUT_LIMITS.fileBytes)
        throw new GltfInputError('budget', `${path}.uri`, 'A referência da imagem é grande demais.')
      return { kind: 'uri', name, uri: row.uri, mimeType }
    }
    requireGltf(
      mimeType !== null,
      `${path}.mimeType`,
      'A imagem em bufferView precisa declarar MIME.',
    )
    const bufferView = gltfInteger(row.bufferView, `${path}.bufferView`, 0, views.length - 1),
      view = views[bufferView]!
    if (numericViews === null) {
      numericViews = new Set<number>()
      for (const { layout, sparseViews } of accessors) {
        if (layout) numericViews.add(layout.bufferView)
        if (sparseViews) {
          numericViews.add(sparseViews.indices)
          numericViews.add(sparseViews.values)
        }
      }
    }
    requireGltf(
      view.target === null && view.byteStride === null && !numericViews.has(bufferView),
      `${path}.bufferView`,
      'Bytes de imagem não podem compartilhar uma view numérica, target ou stride.',
    )
    return { kind: 'bufferView', name, bufferView, mimeType }
  })
}
