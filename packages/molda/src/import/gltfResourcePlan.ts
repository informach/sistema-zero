import { inspectGltfBufferDataUri } from './gltfBufferDataUri'
import { decodeGltfDataUri, type GltfDataUri } from './gltfDataUri'
import { inspectGltfImageDataUri } from './gltfImageDataUri'
import { checkGltfByteBudget, GLTF_INPUT_LIMITS, GltfInputError, requireGltf } from './gltfInput'
import { gltfLocalFilePath, gltfResourcePath } from './gltfResourcePath'

export interface GltfLocalFile {
  path: string
  bytes: Uint8Array
}

type Resource =
  | { kind: 'bytes'; bytes: Uint8Array; byteLength: number }
  | {
      kind: 'data'
      data: GltfDataUri
      role: 'buffer' | 'image'
      mimeType: string | null
      byteLength: number
    }
  | { kind: 'missing'; path: string; byteLength: number }

export type GltfResourceRead =
  | { status: 'missing'; paths: string[] }
  | { status: 'ready'; owned: Map<string, Uint8Array>; resourceBytes: number }

function bytesResource(bytes: Uint8Array, path: string): Resource {
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new GltfInputError(
      'unsupported',
      path,
      'O recurso precisa ter bytes sem memória compartilhada.',
    )
  checkGltfByteBudget(bytes.byteLength, path)
  return { kind: 'bytes', bytes, byteLength: bytes.byteLength }
}

/** One import's preflight. No IO, global cache or decoded/copy allocation before finish. */
export class GltfResourcePlan {
  private readonly selected = new Map<string, GltfLocalFile>()
  private readonly resources = new Map<string, Resource>()

  constructor(
    files: readonly GltfLocalFile[],
    private readonly entryPath: string,
  ) {
    gltfLocalFilePath(entryPath, 'entryPath')
    if (files.length > GLTF_INPUT_LIMITS.resources)
      throw new GltfInputError('budget', 'files', 'Há arquivos demais neste conjunto.')
    for (const file of files) {
      const path = gltfLocalFilePath(file.path)
      requireGltf(
        !this.selected.has(path),
        'files',
        'Dois arquivos têm o mesmo caminho. Escolha um conjunto sem nomes repetidos.',
      )
      this.selected.set(path, file)
    }
  }

  private checkCount(key: string): void {
    if (!this.resources.has(key) && this.resources.size >= GLTF_INPUT_LIMITS.resources)
      throw new GltfInputError('budget', 'resources', 'Há recursos demais neste conjunto.')
  }

  bin(bytes: Uint8Array, path: string): string {
    this.checkCount('bin')
    this.resources.set('bin', bytesResource(bytes, path))
    return 'bin'
  }

  uri(uri: string, path: string, role: 'buffer' | 'image', minimumBytes = 0) {
    let key: string, resource: Resource
    if (/^data:/i.test(uri)) {
      key = uri
      this.checkCount(key)
      const cached = this.resources.get(key)
      if (cached) {
        // Core image and buffer data URI media types are disjoint.
        if (cached.kind !== 'data' || cached.role !== role)
          throw new GltfInputError(
            'unsupported',
            path,
            'O tipo deste recurso não serve a essa referência.',
          )
        resource = cached
      } else {
        const parsed =
          role === 'image'
            ? inspectGltfImageDataUri(uri, path)
            : { data: inspectGltfBufferDataUri(uri, path), mimeType: null }
        resource = { kind: 'data', role, ...parsed, byteLength: parsed.data.byteLength }
      }
    } else {
      const localPath = gltfResourcePath(uri, this.entryPath, path)
      key = `file:${localPath}`
      this.checkCount(key)
      const cached = this.resources.get(key),
        file = this.selected.get(localPath)
      resource =
        cached ??
        (file
          ? bytesResource(file.bytes, localPath)
          : { kind: 'missing', path: localPath, byteLength: minimumBytes })
      if (resource.kind === 'missing')
        resource.byteLength = Math.max(resource.byteLength, minimumBytes)
    }
    requireGltf(
      resource.byteLength >= minimumBytes,
      path.replace(/\.uri$/, ''),
      'O recurso é menor que o tamanho declarado do buffer.',
    )
    this.resources.set(key, resource)
    return { key, mimeType: resource.kind === 'data' ? resource.mimeType : null }
  }

  finish(): GltfResourceRead {
    let resourceBytes = 0
    const missing: string[] = []
    for (const resource of this.resources.values()) {
      resourceBytes += resource.byteLength
      checkGltfByteBudget(resourceBytes, 'resources')
      if (resource.kind === 'missing') missing.push(resource.path)
    }
    if (missing.length) return { status: 'missing', paths: missing }
    const owned = new Map<string, Uint8Array>()
    for (const [key, resource] of this.resources) {
      if (resource.kind === 'bytes') owned.set(key, new Uint8Array(resource.bytes))
      else if (resource.kind === 'data')
        owned.set(key, decodeGltfDataUri(resource.data, 'resources'))
    }
    return { status: 'ready', owned, resourceBytes }
  }
}
