import type { PublicationBucket } from '../src/publications'

export function memoryArtifactBucket() {
  const objects = new Map<string, Uint8Array<ArrayBuffer>>()
  const etags = new Map<string, string>()
  const uploaded = new Map<string, Date>()
  const bucket = {
    async list(options: { prefix: string; limit: number; cursor?: string }) {
      const keys = [...objects.keys()]
        .filter(
          (key) => key.startsWith(options.prefix) && (!options.cursor || key > options.cursor),
        )
        .sort()
      const page = keys.slice(0, options.limit)
      return {
        objects: page.map((key) => ({ key, uploaded: uploaded.get(key) ?? new Date() })),
        truncated: keys.length > page.length,
        cursor: page.at(-1),
      }
    },
    async put(
      key: string,
      value: Uint8Array | string,
      options?: { sha256?: string; onlyIf?: Headers },
    ) {
      const match = options?.onlyIf?.get('if-match')
      if (match && etags.get(key) !== match) return null
      if (options?.onlyIf?.get('if-none-match') === '*' && objects.has(key)) return null
      objects.set(
        key,
        typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value),
      )
      const etag = crypto.randomUUID()
      etags.set(key, etag)
      uploaded.set(key, new Date())
      return { etag }
    },
    async get(key: string) {
      const bytes = objects.get(key)
      return bytes
        ? {
            size: bytes.length,
            etag: etags.get(key) ?? 'test-object',
            body: new Blob([bytes]).stream(),
            text: async () => new TextDecoder().decode(bytes),
          }
        : null
    },
    async delete(keys: string[]) {
      for (const key of keys) {
        objects.delete(key)
        etags.delete(key)
        uploaded.delete(key)
      }
    },
  } satisfies PublicationBucket
  return { bucket, objects, uploaded }
}
