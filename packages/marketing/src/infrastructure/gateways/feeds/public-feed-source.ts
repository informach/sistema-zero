import type { LookupAddress } from 'node:dns'
import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import ipaddr from 'ipaddr.js'
import { FeedError, type FeedResult, type FeedSource } from '../../../domain/intelligence/feed'
import { parseFeed } from './parse-feed'

export function publicAddress(value: string) {
  try {
    const address = ipaddr.process(value)
    return (
      address.range() === 'unicast' &&
      (address.kind() === 'ipv4' || address.match(ipaddr.parseCIDR('2000::/3')))
    )
  } catch {
    return false
  }
}
export function publicFeedUrl(value: string) {
  const url = new URL(value)
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    url.hash ||
    (isIP(host) && !publicAddress(host))
  )
    throw new FeedError(
      'Use um endereço HTTPS público, sem credenciais, fragmento ou porta alternativa',
      false,
    )
  return url
}
export function pinPublicAddresses(addresses: LookupAddress[]): LookupFunction {
  if (!addresses.length || addresses.some((row) => !publicAddress(row.address)))
    throw new FeedError('O endereço da fonte não pertence a uma rede pública permitida', false)
  const pinned = addresses.map((row) => ({ ...row }))
  return (_hostname, options, callback) => {
    const eligible = options.family
      ? pinned.filter((row) => row.family === Number(options.family))
      : pinned
    const first = eligible.find((row) => row.family === 4) ?? eligible[0]
    if (!first) {
      callback(
        Object.assign(new Error('Família de endereço não disponível'), { code: 'EAI_ADDRFAMILY' }),
        [],
      )
      return
    }
    if (options.all)
      callback(
        null,
        eligible.map((row) => ({ ...row })),
      )
    else callback(null, first.address, first.family)
  }
}
/** DNS is checked once and pinned to the socket; redirects/proxies/cookies are not followed.
 * Identity encoding, bounded bytes, headers and elapsed time also cover streaming responses. */
export class PublicFeedSource implements FeedSource {
  async collect(
    input: { url: string; etag: string | null },
    outerSignal: AbortSignal,
  ): Promise<FeedResult> {
    const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(15000)])
    const url = publicFeedUrl(input.url),
      host = url.hostname.replace(/^\[|\]$/g, '')
    let removeAbort = () => {}
    try {
      const addresses = await Promise.race([
        lookup(host, { all: true }),
        new Promise<never>((_, reject) => {
          const abort = () => reject(new FeedError('A consulta da fonte foi interrompida', true))
          signal.addEventListener('abort', abort, { once: true })
          removeAbort = () => signal.removeEventListener('abort', abort)
          if (signal.aborted) abort()
        }),
      ])
      const pinnedLookup = pinPublicAddresses(addresses)
      signal.throwIfAborted()
      return await new Promise<FeedResult>((resolve, reject) => {
        const req = request(
          url,
          {
            method: 'GET',
            agent: false,
            signal,
            maxHeaderSize: 16384,
            lookup: pinnedLookup,
            headers: {
              accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
              'accept-encoding': 'identity',
              'user-agent': 'SistemaZero-Marketing/0.1 FeedReader',
              ...(input.etag ? { 'if-none-match': input.etag } : {}),
            },
          },
          (response) => {
            response.on('error', reject)
            const status = response.statusCode ?? 0
            const rawEtag = response.headers.etag
            const etag =
              typeof rawEtag === 'string' && rawEtag.length <= 1000 && !/[\r\n]/.test(rawEtag)
                ? rawEtag
                : null
            if (status === 304) {
              response.destroy()
              resolve({
                entries: [],
                notModified: true,
                etag: etag ?? input.etag,
                observedEntries: 0,
                truncated: false,
              })
              return
            }
            if (status !== 200) {
              response.destroy()
              const retryable = status === 429 || status === 408 || status >= 500
              const retry = response.headers['retry-after'],
                parsed =
                  retry && /^\d+$/.test(retry)
                    ? Number(retry) * 1000
                    : retry
                      ? Date.parse(retry) - Date.now()
                      : 0
              reject(
                new FeedError(
                  status >= 300 && status < 400
                    ? 'O feed mudou de endereço. Confira a URL definitiva antes de retomar.'
                    : `A fonte respondeu HTTP ${status}`,
                  retryable,
                  Number.isFinite(parsed) ? Math.min(86_400_000, Math.max(0, parsed)) : 0,
                ),
              )
              return
            }
            if (
              (response.headers['content-encoding'] &&
                response.headers['content-encoding'] !== 'identity') ||
              Number(response.headers['content-length'] ?? 0) > 1_048_576
            ) {
              response.destroy()
              reject(
                new FeedError(
                  'A fonte excedeu o limite de resposta ou enviou compressão não solicitada',
                  false,
                ),
              )
              return
            }
            const chunks: Buffer[] = []
            let bytes = 0
            response.on('data', (chunk: Buffer) => {
              bytes += chunk.length
              if (bytes > 1_048_576) {
                response.destroy()
                reject(new FeedError('O feed excede 1 MB', false))
                return
              }
              chunks.push(chunk)
            })
            response.on('end', () => {
              try {
                const xml = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
                resolve({ ...parseFeed(xml, url.href), notModified: false, etag })
              } catch (error) {
                reject(
                  error instanceof FeedError
                    ? error
                    : new FeedError('O feed deve conter XML em UTF-8 válido', false),
                )
              }
            })
          },
        )
        req.on('error', (cause) =>
          reject(
            new FeedError(
              signal.aborted
                ? 'A consulta da fonte foi interrompida ou excedeu 15 segundos'
                : 'Não foi possível consultar a fonte',
              true,
              0,
              cause,
            ),
          ),
        )
        req.end()
      })
    } finally {
      removeAbort()
    }
  }
}
