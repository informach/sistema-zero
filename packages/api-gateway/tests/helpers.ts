import type { Logger } from '@sistemazero/core/logging'
import { createContext } from '../src/application/pipeline/context'
import type { GatewayContext } from '../src/application/pipeline/stage.port'
import type { Forwarder, ForwardRequest } from '../src/domain/proxy/forwarder.port'

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

export function makeContext(
  opts: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string
    clientIp?: string
  } = {},
): GatewayContext {
  const init: RequestInit = { method: opts.method ?? 'GET', headers: opts.headers }
  if (opts.body !== undefined) init.body = opts.body
  const request = new Request(opts.url ?? 'http://gw.local/payments', init)
  return createContext({ request, clientIp: opts.clientIp ?? '127.0.0.1', logger: silentLogger })
}

export function fakeForwarder(
  handler: (req: ForwardRequest) => Response | Promise<Response>,
): Forwarder {
  return { forward: (req) => Promise.resolve(handler(req)) }
}
