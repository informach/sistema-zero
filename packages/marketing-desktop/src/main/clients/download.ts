import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'
import type { ClientRelease } from './catalog'

const downloadHosts = new Set([
  'github.com',
  'release-assets.githubusercontent.com',
  'downloads.claude.ai',
])
export function validateDownloadUrl(value: string) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !downloadHosts.has(url.hostname)
  )
    throw new Error('Endereço de download fora dos distribuidores oficiais.')
  return url
}

/** Validate every redirect before contacting its destination; never inherit API credentials. */
export async function downloadClient(
  release: Pick<ClientRelease, 'url' | 'bytes' | 'sha256'>,
  file: string,
  signal: AbortSignal,
  progress: (percent: number) => void,
  request: (url: URL, options: RequestInit) => Promise<Response> = fetch,
) {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(10 * 60 * 1000)])
  let url = validateDownloadUrl(release.url)
  let response: Response | undefined
  for (let redirects = 0; redirects <= 5; redirects++) {
    deadline.throwIfAborted()
    response = await request(url, { signal: deadline, redirect: 'manual', credentials: 'omit' })
    if (![301, 302, 303, 307, 308].includes(response.status)) break
    await response.body?.cancel()
    const location = response.headers.get('location')
    if (!location || redirects === 5) throw new Error('Redirecionamento de download inválido.')
    url = validateDownloadUrl(new URL(location, url).href)
  }
  if (!response?.ok || !response.body) throw new Error('Não foi possível baixar o cliente oficial.')
  const length = response.headers.get('content-length')
  if (length !== null && Number(length) !== release.bytes) {
    await response.body.cancel()
    throw new Error('O tamanho do download difere da versão verificada.')
  }
  const handle = await open(file, 'wx')
  const reader = response.body.getReader()
  const hash = createHash('sha256')
  let received = 0
  let lastPercent = -1
  try {
    while (true) {
      deadline.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      received += chunk.value.length
      if (received > release.bytes) throw new Error('O download excedeu o tamanho verificado.')
      hash.update(chunk.value)
      let offset = 0
      while (offset < chunk.value.length) {
        const written = await handle.write(chunk.value, offset, chunk.value.length - offset)
        if (!written.bytesWritten) throw new Error('Não foi possível gravar o cliente.')
        offset += written.bytesWritten
      }
      const percent = Math.floor((received / release.bytes) * 100)
      if (percent !== lastPercent) progress(percent)
      lastPercent = percent
    }
    deadline.throwIfAborted()
    if (received !== release.bytes || hash.digest('hex') !== release.sha256)
      throw new Error('O download não corresponde ao cliente oficial verificado.')
    await handle.sync()
  } finally {
    try {
      await reader.cancel()
    } finally {
      await handle.close()
    }
  }
}
