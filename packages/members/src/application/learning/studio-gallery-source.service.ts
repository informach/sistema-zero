import { gunzip } from 'node:zlib'
import { ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  GALLERY_STUDIO_SOURCE_LIMITS,
  GalleryStudioSourceSchema,
  type GallerySubmissionItem,
  galleryStudioStorageBaseURL,
  materializeStudioGallerySnapshot,
} from '@sistemazero/core/learning'
import { refinePythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { GallerySourceUnavailableError } from '../../domain/learning/gallery-source.errors'

/** Downloads only exact keys from a freshly authorized delivery plan and a configured origin.
 * Presigned URLs arrive exclusively through the member-shell HMAC endpoint, never a public body. */
export class StudioGallerySourceService {
  private readonly base?: URL
  private readonly request: typeof fetch
  constructor(
    options: { storageBaseURL?: string; allowLoopbackHttp?: boolean; request?: typeof fetch } = {},
  ) {
    this.base = options.storageBaseURL
      ? galleryStudioStorageBaseURL(options.storageBaseURL, options.allowLoopbackHttp)
      : undefined
    this.request = options.request ?? fetch
  }

  async load(raw: unknown, item: GallerySubmissionItem, ownerSignal: AbortSignal) {
    ownerSignal.throwIfAborted()
    const itemId = item.itemId
    const base = this.base
    if (!base) throw new GallerySourceUnavailableError()
    const parsed = GalleryStudioSourceSchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError('Referência inválida para a cópia do projeto.')
    const reference = parsed.data
    if (
      reference.itemId !== item.itemId ||
      reference.revision !== item.revision ||
      reference.source.storageKey !== item.storageKey ||
      reference.parts.length !== item.parts.length ||
      reference.parts.some(
        (part) =>
          !item.parts.some(
            (expected) => expected.hash === part.hash && expected.storageKey === part.storageKey,
          ),
      )
    )
      throw new ValidationError('A referência não corresponde ao projeto escolhido.')
    const approve = (location: { storageKey: string; url: string }) => {
      const expected = new URL(
        location.storageKey.split('/').map(encodeURIComponent).join('/'),
        base,
      )
      let url: URL
      try {
        url = new URL(location.url)
      } catch {
        throw new ValidationError('O endereço da cópia privada é inválido.')
      }
      if (
        url.username ||
        url.password ||
        url.hash ||
        url.origin !== base.origin ||
        url.pathname !== expected.pathname
      )
        throw new ValidationError('O endereço não corresponde à cópia privada do projeto.')
      return url.href
    }
    // Validate EVERY URL before any network operation, including currently unreferenced parts.
    const sourceURL = approve(reference.source)
    const partURLs = new Map(reference.parts.map((part) => [part.hash, approve(part)]))
    const usedParts = new Set<string>()
    const lifetime = new AbortController()
    const signal = AbortSignal.any([ownerSignal, lifetime.signal])
    const request = this.request
    let compressedBytes = 0,
      jsonBytes = 0
    let decompressQueue = Promise.resolve()
    const read = async (url: string, readingSignal: AbortSignal): Promise<Uint8Array> => {
      const response = await awaitWithSignal(
        () => request(url, { signal: readingSignal, redirect: 'error' }),
        readingSignal,
        (late) => {
          void late.body?.cancel().catch(() => {})
        },
      )
      if (!response.ok || !response.body) {
        void response.body?.cancel().catch(() => {})
        throw new GallerySourceUnavailableError()
      }
      if (response.url && response.url !== url) {
        void response.body.cancel().catch(() => {})
        throw new ValidationError('O armazenamento redirecionou a cópia do projeto.')
      }
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        for (;;) {
          const chunk = await awaitWithSignal(() => reader.read(), readingSignal)
          if (chunk.done) break
          compressedBytes += chunk.value.byteLength
          if (compressedBytes > GALLERY_STUDIO_SOURCE_LIMITS.compressedBytes)
            throw new ValidationError('A cópia comprimida excede o limite de leitura.')
          chunks.push(chunk.value)
          size += chunk.value.byteLength
        }
      } finally {
        void reader.cancel().catch(() => {})
      }
      // Download at most three parts concurrently, but inflate one at a time against the
      // aggregate remaining budget. Native asynchronous zlib does not block the event loop.
      const previous = decompressQueue
      const released = Promise.withResolvers<void>()
      decompressQueue = released.promise
      try {
        await awaitWithSignal(() => previous, readingSignal)
        const remaining = GALLERY_STUDIO_SOURCE_LIMITS.jsonBytes - jsonBytes
        if (remaining <= 0) throw new ValidationError('A cópia excede o limite de leitura.')
        const decoded = await awaitWithSignal(
          () =>
            new Promise<Buffer>((resolve, reject) => {
              gunzip(
                Buffer.concat(chunks, size),
                { maxOutputLength: remaining },
                (error, result) => {
                  if (error)
                    reject(
                      new ValidationError(
                        'A cópia comprimida está inválida ou excede o limite de leitura.',
                      ),
                    )
                  else resolve(result)
                },
              )
            }),
          readingSignal,
        )
        jsonBytes += decoded.byteLength
        return decoded
      } finally {
        released.resolve()
      }
    }
    try {
      const document = await materializeStudioGallerySnapshot({
        signal,
        readMain: (readingSignal) => read(sourceURL, readingSignal),
        readPart: (hash, readingSignal) => {
          const url = partURLs.get(hash)
          if (!url) throw new ValidationError('A cópia está sem uma imagem do projeto.')
          usedParts.add(hash)
          return read(url, readingSignal)
        },
      })
      if (usedParts.size !== partURLs.size)
        throw new ValidationError('As partes da cópia não correspondem ao manifesto do projeto.')
      const project = await awaitWithSignal(() => refinePythonProjectDocument(document), signal)
      if (project.id !== itemId) throw new ValidationError('A cópia pertence a outro projeto.')
      return project
    } catch (error) {
      if (signal.aborted) throw signal.reason
      if (error instanceof ValidationError || error instanceof GallerySourceUnavailableError)
        throw error
      // Do not log or reflect native fetch errors containing private presigned query strings.
      throw new GallerySourceUnavailableError()
    } finally {
      lifetime.abort()
    }
  }
}
