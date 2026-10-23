import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js'
export function endpointUrl(value: string) {
  const url = new URL(value)
  const loopback = url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (
    url.username ||
    url.password ||
    url.hash ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
  )
    throw new Error(
      'MCP requires HTTPS or an explicit loopback HTTP endpoint, without URL credentials',
    )
  return url
}
export function boundedFetch(endpoint: string, authorizationOrigins: string[] = []): FetchLike {
  const allowed = new Set([
    endpointUrl(endpoint).origin,
    ...authorizationOrigins.map((origin) => endpointUrl(origin).origin),
  ])
  return async (url, init = {}) => {
    const target = endpointUrl(String(url))
    if (!allowed.has(target.origin))
      throw new Error(`OAuth origin is not configured: ${target.origin}`)
    const response = await fetch(target, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(120000)]),
    })
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel()
      throw new Error('MCP redirects require configuring the final endpoint')
    }
    if (!response.body) return response
    let bytes = 0
    let frame = 0
    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength
          if (bytes > 16_000_000) throw new Error('MCP HTTP stream exceeds limit')
          for (const byte of chunk) {
            if (byte === 10) frame = 0
            else if (++frame > 1_000_000) throw new Error('MCP HTTP frame exceeds limit')
          }
          controller.enqueue(chunk)
        },
      }),
    )
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
