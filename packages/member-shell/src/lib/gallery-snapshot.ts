import { awaitWithSignal } from '@sistemazero/core/http'
import {
  GALLERY_STUDIO_SOURCE_LIMITS,
  materializeStudioGallerySnapshot,
} from '@sistemazero/core/learning'

/** Private URLs are supplied only after the teacher's access to the submission is checked. */
export interface GallerySnapshotTicket {
  url: string
  parts: { hash: string; url: string }[]
}

/** Uses the same exact-byte materializer as Python correction; JS/Pinta remain readable. */
export async function readGallerySnapshot(
  ticket: GallerySnapshotTicket,
  ownerSignal?: AbortSignal,
): Promise<unknown> {
  const sourceURL = ticket.url
  if (
    ticket.parts.length > GALLERY_STUDIO_SOURCE_LIMITS.parts ||
    new Set(ticket.parts.map((part) => part.hash)).size !== ticket.parts.length
  )
    throw new Error('As referências da cópia são inválidas.')
  const partURLs = new Map(ticket.parts.map((part) => [part.hash, part.url]))
  const signal = AbortSignal.any([
    AbortSignal.timeout(60000),
    ...(ownerSignal ? [ownerSignal] : []),
  ])
  const budget = { compressed: 0, json: 0 }
  async function readGzip(url: string, readingSignal: AbortSignal): Promise<Uint8Array> {
    const response = await awaitWithSignal(
      () => fetch(url, { signal: readingSignal }),
      readingSignal,
      (late) => {
        void late.body?.cancel().catch(() => {})
      },
    )
    if (!response.ok || !response.body) {
      void response.body?.cancel().catch(() => {})
      throw new Error('A cópia não pôde ser aberta. Tente novamente.')
    }
    const counted = new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
      transform(chunk, controller) {
        budget.compressed += chunk.byteLength
        if (budget.compressed > GALLERY_STUDIO_SOURCE_LIMITS.compressedBytes)
          throw new Error('A cópia comprimida excede o limite de leitura.')
        controller.enqueue(chunk)
      },
    })
    const reader = response.body
      .pipeThrough(counted)
      .pipeThrough(new DecompressionStream('gzip'))
      .getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const result = await awaitWithSignal(() => reader.read(), readingSignal)
        if (result.done) break
        budget.json += result.value.byteLength
        if (budget.json > GALLERY_STUDIO_SOURCE_LIMITS.jsonBytes)
          throw new Error('A cópia excede o limite de leitura.')
        chunks.push(result.value)
        size += result.value.byteLength
      }
    } finally {
      void reader.cancel().catch(() => {})
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return bytes
  }
  return materializeStudioGallerySnapshot({
    signal,
    readMain: (readingSignal) => readGzip(sourceURL, readingSignal),
    readPart: (hash, readingSignal) => {
      const url = partURLs.get(hash)
      if (!url) throw new Error('A cópia está sem uma imagem do projeto.')
      return readGzip(url, readingSignal)
    },
  })
}
