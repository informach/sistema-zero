import type { GatewayStore } from '../../domain/ports/gateway-store.port'
import type { AuthStrategy } from './auth-strategy.port'

interface SessionData {
  subject: string
  scopes?: string[]
}

export interface SessionStrategyOptions {
  headerName?: string
  cookieName?: string
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

/**
 * Strategy de sessão: token opaco (header ou cookie) resolvido no GatewayStore
 * (cache/Redis compartilhado). Dormente até existir um emissor de sessões.
 */
export function createSessionStrategy(
  store: GatewayStore,
  opts: SessionStrategyOptions = {},
): AuthStrategy {
  const headerName = (opts.headerName ?? 'x-session-token').toLowerCase()
  const cookieName = opts.cookieName ?? 'sid'
  return {
    name: 'session',
    async authenticate(ctx) {
      const token =
        ctx.request.headers.get(headerName) ??
        readCookie(ctx.request.headers.get('cookie'), cookieName)
      if (!token) return { ok: 'skip' }
      const data = await store.get<SessionData>(`session:${token}`)
      if (!data)
        return {
          ok: false,
          status: 401,
          code: 'INVALID_SESSION',
          message: 'Sessão inválida ou expirada',
        }
      return {
        ok: true,
        principal: { kind: 'session', subject: data.subject, scopes: data.scopes },
      }
    },
  }
}
