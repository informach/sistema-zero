import type { BbmodelAppearance } from './bbmodelAppearance'
import type { BbmodelVersion } from './bbmodelEnvelope'
import { decodeBbmodelImageDataUri, inspectBbmodelImageDataUri } from './bbmodelImageDataUri'
import { BbmodelInputError, BBMODEL_INPUT_LIMITS as limits, requireBbmodel } from './bbmodelInput'
import { bbmodelLocalFilePath, bbmodelResourcePath } from './bbmodelResourcePath'
import type { ImportDataUri } from './importDataUri'

export interface BbmodelLocalFile {
  path: string
  bytes: Uint8Array
}
export interface BbmodelResourceRequest {
  /** Same source used by the envelope/appearance readers. Used here for selected-byte preflight only. */
  bytes: Uint8Array
  entryPath: string
  version: BbmodelVersion
  appearance: BbmodelAppearance
  textureIndices: readonly number[]
  files: readonly BbmodelLocalFile[]
  sourcePreference: 'prefer-embedded' | 'prefer-files'
}
export interface BbmodelTextureResourceBinding {
  texture: number
  resource: number
  source: 'embedded' | 'file'
  alternateAvailable: boolean
  /** The separate path field is not resolved relative to the entry or accessed as an absolute path. */
  pathFieldIgnored: boolean
}
export type BbmodelResourcesRead =
  | { status: 'missing'; paths: string[] }
  | {
      status: 'ready'
      textures: BbmodelTextureResourceBinding[]
      /** Owned once per literal selected path / exact Data URI, read-only by contract. */
      resources: Array<{ path: string | null; mimeType: string | null; bytes: Uint8Array }>
      resourceBytes: number
    }

type PlannedResource =
  | { kind: 'embedded'; path: string; data: ImportDataUri; mimeType: string }
  | { kind: 'file'; path: string; bytes: Uint8Array | null }

function budget(value: number, max: number, path: string): void {
  if (value > max)
    throw new BbmodelInputError(
      'budget',
      path,
      'Os recursos deste arquivo ultrapassam o limite do Molda.',
    )
}
function checkBytes(bytes: Uint8Array, path: string): void {
  requireBbmodel(bytes instanceof Uint8Array, path, 'O arquivo precisa conter bytes.')
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new BbmodelInputError('unsupported', path, 'Escolha bytes sem memória compartilhada.')
  budget(bytes.byteLength, limits.fileBytes, path)
}

/** Metadata-only preflight shared with the complete converter BEFORE parsing its entry JSON. */
export function readBbmodelLocalFiles(
  request: Pick<BbmodelResourceRequest, 'bytes' | 'entryPath' | 'files'>,
) {
  const entryPath = bbmodelLocalFilePath(request.entryPath, 'entryPath')
  checkBytes(request.bytes, 'file')
  requireBbmodel(request.bytes.byteLength > 0, 'file', 'O arquivo está vazio.')
  requireBbmodel(Array.isArray(request.files), 'files', 'Escolha uma lista de arquivos locais.')
  budget(request.files.length, limits.resources, 'files')
  const selected = new Map<string, Uint8Array>()
  let selectedBytes = request.bytes.byteLength
  for (const file of request.files) {
    requireBbmodel(
      file !== null && typeof file === 'object',
      'files',
      'Um arquivo do conjunto é inválido.',
    )
    const path = bbmodelLocalFilePath(file.path)
    requireBbmodel(
      path !== entryPath && !selected.has(path),
      'files',
      'Dois arquivos têm o mesmo caminho. Escolha um conjunto sem duplicatas.',
    )
    checkBytes(file.bytes, path)
    selectedBytes += file.bytes.byteLength
    budget(selectedBytes, limits.selectedFileBytes, 'files')
    selected.set(path, file.bytes)
  }
  return { entryPath, selected, selectedBytes }
}

/** Pure byte-resource stage: no raster decoding, network/FS, partial result or retry fallback. */
export function readBbmodelResources(request: BbmodelResourceRequest): BbmodelResourcesRead {
  requireBbmodel(
    request.sourcePreference === 'prefer-embedded' || request.sourcePreference === 'prefer-files',
    'options.sourcePreference',
    'Escolha se prefere as imagens embutidas ou os arquivos locais.',
  )
  const { entryPath, selected } = readBbmodelLocalFiles(request)
  requireBbmodel(
    Array.isArray(request.textureIndices),
    'textures',
    'Escolha uma lista de texturas.',
  )
  budget(request.textureIndices.length, limits.textures, 'textures')
  const indices = new Set<number>()
  for (const index of request.textureIndices) {
    requireBbmodel(
      Number.isSafeInteger(index) && index >= 0 && index < request.appearance.textures.length,
      'textures',
      'A textura escolhida não existe.',
    )
    indices.add(index)
  }
  const resources: PlannedResource[] = []
  const byEmbedded = new Map<string, number>()
  const byFile = new Map<string, number>()
  const textures: BbmodelTextureResourceBinding[] = []
  let resourceBytes = 0
  for (const textureIndex of indices) {
    const texture = request.appearance.textures[textureIndex]!
    const path = `textures[${textureIndex}]`
    const hasEmbedded = texture.embedded !== null && texture.embedded !== ''
    const hasFile = texture.relativePath !== null && texture.relativePath !== ''
    if (!hasEmbedded && !hasFile)
      throw new BbmodelInputError(
        'unsupported',
        path,
        'Esta textura não tem imagem embutida nem caminho relativo. Salve uma cópia com as imagens no Blockbench.',
      )
    const embedded = hasEmbedded && (request.sourcePreference === 'prefer-embedded' || !hasFile)
    const filePath = embedded
      ? null
      : bbmodelResourcePath(
          texture.relativePath!,
          entryPath,
          request.version,
          `${path}.relative_path`,
        )
    requireBbmodel(
      filePath !== entryPath,
      `${path}.relative_path`,
      'Uma textura não pode apontar para o próprio arquivo do modelo.',
    )
    const resourcesBySource = embedded ? byEmbedded : byFile
    const key = embedded ? texture.embedded! : filePath!
    let resource = resourcesBySource.get(key)
    if (resource === undefined) {
      budget(resources.length + 1, limits.resources, 'resources')
      let planned: PlannedResource
      let bytes: number
      if (embedded) {
        const inspected = inspectBbmodelImageDataUri(texture.embedded!, `${path}.source`)
        planned = { kind: 'embedded', path: `${path}.source`, ...inspected }
        bytes = inspected.data.byteLength
      } else {
        const source = selected.get(filePath!) ?? null
        planned = { kind: 'file', path: filePath!, bytes: source }
        bytes = source?.byteLength ?? 0
      }
      resourceBytes += bytes
      budget(resourceBytes, limits.fileBytes, 'resources')
      resource = resources.length
      resourcesBySource.set(key, resource)
      resources.push(planned)
    }
    textures.push({
      texture: textureIndex,
      resource,
      source: embedded ? 'embedded' : 'file',
      alternateAvailable: hasEmbedded && hasFile,
      pathFieldIgnored: texture.path !== null && texture.path !== '',
    })
  }
  const missing = resources.flatMap((resource) =>
    resource.kind === 'file' && resource.bytes === null ? [resource.path] : [],
  )
  if (missing.length > 0) return { status: 'missing', paths: missing }
  return {
    status: 'ready',
    textures,
    resourceBytes,
    resources: resources.map((resource) => {
      if (resource.kind === 'embedded')
        return {
          path: null,
          mimeType: resource.mimeType,
          bytes: decodeBbmodelImageDataUri(resource.data, resource.path),
        }
      // All missing files were handled before any Data URI decoding or owned byte copy.
      if (resource.bytes === null) throw new Error('Missing resource escaped bbmodel preflight')
      return { path: resource.path, mimeType: null, bytes: new Uint8Array(resource.bytes) }
    }),
  }
}
