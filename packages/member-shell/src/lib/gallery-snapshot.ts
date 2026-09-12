/** Private URLs are supplied only after the teacher's access to the submission is checked. */
export interface GallerySnapshotTicket {
  url: string
  parts: { hash: string; url: string }[]
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

async function readGzip(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok || !response.body)
    throw new Error('A cópia não pôde ser aberta. Tente novamente.')
  const reader = response.body.pipeThrough(new DecompressionStream('gzip')).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.length
      if (size > 128 * 1024 * 1024) throw new Error('A cópia excede o limite de leitura.')
      chunks.push(result.value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(bytes)
}

/** Restores the exact submitted assets; missing/corrupt parts fail instead of silently disappearing. */
export async function readGallerySnapshot(
  ticket: GallerySnapshotTicket,
  signal?: AbortSignal,
): Promise<unknown> {
  const raw: unknown = JSON.parse(await readGzip(ticket.url, signal))
  if (!record(raw) || raw.format !== 'sz-studio-parts') return raw
  if (
    raw.version !== 1 ||
    !record(raw.program) ||
    !Array.isArray(raw.assets) ||
    raw.assets.length > 128 ||
    !raw.assets.every(
      (hash): hash is string => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash),
    )
  )
    throw new Error('Formato de projeto inválido.')
  const hashes = raw.assets
  const assets: unknown[] = Array.from({ length: hashes.length })
  let cursor = 0
  async function worker() {
    while (cursor < hashes.length) {
      const index = cursor++,
        hash = hashes[index]
      const part = ticket.parts.find((item) => item.hash === hash)
      if (!part) throw new Error('A cópia está sem uma imagem do projeto.')
      const json = await readGzip(part.url, signal)
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
      const actualHash = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('')
      if (actualHash !== hash) throw new Error('Uma imagem da cópia está corrompida.')
      assets[index] = JSON.parse(json)
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, hashes.length) }, worker))
  return { ...raw.program, assets }
}
