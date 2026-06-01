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

export interface RecordedLog {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
}

/** Logger que captura as entradas emitidas (para asserir campos/níveis nos testes). */
export function recordingLogger(): { logger: Logger; entries: RecordedLog[] } {
  const entries: RecordedLog[] = []
  const make =
    (level: RecordedLog['level']) => (message: string, context?: Record<string, unknown>) => {
      entries.push({ level, message, context })
    }
  return {
    logger: { debug: make('debug'), info: make('info'), warn: make('warn'), error: make('error') },
    entries,
  }
}

export function makeContext(
  opts: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: string
    clientIp?: string
    logger?: Logger
  } = {},
): GatewayContext {
  const init: RequestInit = { method: opts.method ?? 'GET', headers: opts.headers }
  if (opts.body !== undefined) init.body = opts.body
  const request = new Request(opts.url ?? 'http://gw.local/payments', init)
  return createContext({
    request,
    clientIp: opts.clientIp ?? '127.0.0.1',
    logger: opts.logger ?? silentLogger,
  })
}

export function fakeForwarder(
  handler: (req: ForwardRequest) => Response | Promise<Response>,
): Forwarder {
  return { forward: (req) => Promise.resolve(handler(req)) }
}
