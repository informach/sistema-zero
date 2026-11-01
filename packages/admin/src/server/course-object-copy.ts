import { createHash } from 'node:crypto'

export interface CourseObjectVersion {
  bucket: string
  key: string
  etag: string
  bytes: number
}
export interface StoredCourseObject {
  etag: string
  bytes: number
  metadata: Record<string, string>
  contentType?: string
  cacheControl?: string
  contentDisposition?: string
  contentEncoding?: string
}
export interface CourseObjectCopyInput {
  source: CourseObjectVersion
  destination: { bucket: string; kind: 'file' | 'module-animation' | 'animation-poster' }
}
export interface CourseObjectStorage {
  head(bucket: string, key: string): Promise<StoredCourseObject | null>
  copy(input: {
    source: CourseObjectVersion
    destination: { bucket: string; key: string }
    fingerprint: string
    headers: StoredCourseObject
  }): Promise<{ etag: string }>
}

/** Versioned keys make two different preparations disjoint, including simultaneous copies. */
export function courseObjectDestination(input: CourseObjectCopyInput) {
  const { source, destination } = input
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        'course-object-v1',
        source.bucket,
        source.key,
        source.etag,
        source.bytes,
        destination.bucket,
        destination.kind,
      ]),
    )
    .digest('hex')
  const uuid = `${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-5${fingerprint.slice(13, 16)}-a${fingerprint.slice(17, 20)}-${fingerprint.slice(20, 32)}`
  const extension = /(\.[a-z0-9]{1,12})$/i.exec(source.key)?.[1]?.toLowerCase() ?? '.bin'
  const key =
    destination.kind === 'file'
      ? `admin/course-publication/${fingerprint}/file${extension}`
      : `admin/module-animation/${uuid}/${destination.kind === 'module-animation' ? 'animation.edi-animation.json' : extension === '.webp' ? 'poster.webp' : 'poster.png'}`
  return { fingerprint, bucket: destination.bucket, key }
}

/** Caller supplies only configured buckets and a destination reserved by the durable job. */
export function createCourseObjectCopier(storage: CourseObjectStorage) {
  return async (input: CourseObjectCopyInput) => {
    const { source } = input
    if (!['file', 'module-animation', 'animation-poster'].includes(input.destination.kind))
      throw new Error('Tipo de destino inválido')
    const { fingerprint, ...destination } = courseObjectDestination(input)
    if (
      !source.bucket ||
      !source.key ||
      !source.etag ||
      /[\r\n]/.test(source.etag) ||
      source.etag.length > 256 ||
      new TextEncoder().encode(source.key).byteLength > 1024 ||
      source.key.includes('\0') ||
      !destination.bucket ||
      !destination.key ||
      !Number.isSafeInteger(source.bytes) ||
      source.bytes < 0 ||
      source.bytes > 200_000_000
    )
      throw new Error('Versão do arquivo inválida ou acima de 200 MB')
    if (source.bucket === destination.bucket && source.key === destination.key)
      throw new Error('A cópia não pode sobrescrever a origem')
    const valid = (object: StoredCourseObject | null) =>
      object?.metadata['course-source'] === fingerprint && object.bytes === source.bytes
    const previous = await storage.head(destination.bucket, destination.key)
    if (previous) {
      if (!valid(previous)) throw new Error('O destino já pertence a outra versão do arquivo')
      return { ...destination, etag: previous.etag, bytes: previous.bytes, reused: true }
    }
    const current = await storage.head(source.bucket, source.key)
    if (!current || current.etag !== source.etag || current.bytes !== source.bytes)
      throw new Error('O arquivo de origem mudou desde a preparação')
    let response: { etag: string }
    try {
      response = await storage.copy({ source, destination, fingerprint, headers: current })
    } catch (error) {
      // A lost acknowledgement is not a failed copy. Confirm the atomic object before retrying.
      const recovered = await storage.head(destination.bucket, destination.key)
      if (!valid(recovered)) throw error
      return { ...destination, etag: recovered!.etag, bytes: recovered!.bytes, reused: true }
    }
    const saved = await storage.head(destination.bucket, destination.key)
    if (!valid(saved) || saved!.etag !== response.etag)
      throw new Error('O armazenamento ainda não confirmou a cópia íntegra')
    return { ...destination, etag: saved!.etag, bytes: saved!.bytes, reused: false }
  }
}
