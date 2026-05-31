import type { UpstreamTarget } from '../load-balancing/load-balancer.port'
import type { HttpMethod } from '../routing/route'

/** Uma requisição pronta para ser encaminhada a um destino upstream. */
export interface ForwardRequest {
  readonly method: HttpMethod
  readonly target: UpstreamTarget
  readonly path: string // caminho + querystring no upstream
  readonly headers: Headers
  readonly body: RequestInit['body'] // stream (sem buffer) ou string (quando re-assinado/transformado)
  readonly signal: AbortSignal
}

/** Proxy: encaminha a requisição e devolve a Response do upstream (streamada). */
export interface Forwarder {
  forward(req: ForwardRequest): Promise<Response>
}
