import type { Forwarder, ForwardRequest } from '../../domain/proxy/forwarder.port'

type FetchInit = RequestInit & { duplex?: 'half' }

/**
 * Proxy via `fetch` nativo do Bun: STREAMA a resposta do upstream de volta (sem
 * bufferizar o corpo → baixa latência). `redirect: 'manual'` para não seguir
 * redirects do upstream silenciosamente.
 */
export function createFetchForwarder(): Forwarder {
  return {
    async forward(req: ForwardRequest): Promise<Response> {
      const url = `${req.target.baseUrl.replace(/\/$/, '')}${req.path}`
      const init: FetchInit = {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: req.signal,
        redirect: 'manual',
      }
      // Corpo em stream exige duplex 'half' no fetch.
      if (req.body && typeof req.body !== 'string') init.duplex = 'half'
      return fetch(url, init)
    },
  }
}
