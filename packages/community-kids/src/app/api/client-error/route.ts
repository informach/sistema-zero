import { NextResponse } from 'next/server'
import { captureServerException } from '@/server/sentry'

/**
 * Beacon de erro de RENDER no cliente (error boundaries). O `onRequestError` da
 * instrumentation só captura erros de SERVIDOR (Route Handler/RSC) — um throw em
 * render NO CLIENTE (canvas/WebGL perdido, snapshot legado do player, hidratação)
 * escaparia inteiro da telemetria. As boundaries (`app/(app)/error.tsx`,
 * `global-error.tsx`, `jogar/[id]/error.tsx`) POSTam aqui e o servidor espelha para
 * o Sentry com a MESMA redação de PII do `captureServerException`
 * (e-mail/UUID-do-perfil/número longo na mensagem, no stack e no `path`). Sem
 * `SENTRY_DSN` é no-op — fica armado para quando o projeto Sentry do kids ligar.
 *
 * Anti-abuso: same-origin é garantido pelo proxy (anti-CSRF da borda — esta rota
 * está DENTRO do matcher); um teto GLOBAL in-process protege a cota do Sentry contra
 * spam (réplica única → `globalThis`). Responde 204 SEMPRE: telemetria não dá
 * feedback ao cliente nem deixa a recuperação da criança depender deste POST.
 */

/** Teto do corpo (mensagem + stack já são grandes; acima disto é abuso). */
const MAX_BODY_CHARS = 16_000
const RATE_WINDOW_MS = 60_000
/** Eventos/min no PROCESSO inteiro: amostra o bastante p/ alertar num incidente amplo sem queimar a cota. */
const RATE_MAX = 60

const RL_KEY = Symbol.for('sz.kids.clientError.rl')
function rateLimited(now: number): boolean {
  const g = globalThis as { [RL_KEY]?: { count: number; resetAt: number } }
  const e = g[RL_KEY]
  if (!e || e.resetAt <= now) {
    g[RL_KEY] = { count: 1, resetAt: now + RATE_WINDOW_MS }
    return false
  }
  if (e.count >= RATE_MAX) return true
  e.count += 1
  return false
}

const noContent = () => new NextResponse(null, { status: 204 })

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(Date.now())) return noContent()

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return noContent()
  }
  if (!raw || raw.length > MAX_BODY_CHARS) return noContent()

  let payload: {
    name?: unknown
    message?: unknown
    stack?: unknown
    digest?: unknown
    path?: unknown
  }
  try {
    payload = JSON.parse(raw)
  } catch {
    return noContent()
  }

  const message = typeof payload.message === 'string' ? payload.message : ''
  if (!message) return noContent()
  const name =
    typeof payload.name === 'string' && payload.name ? payload.name.slice(0, 100) : 'Error'
  const stack = typeof payload.stack === 'string' ? payload.stack : undefined
  const digest = typeof payload.digest === 'string' ? payload.digest.slice(0, 64) : undefined
  const path = typeof payload.path === 'string' ? payload.path : undefined

  // Reconstrói um Error p/ reusar a captura (tipo+mensagem+stack agrupam por
  // tipo+mensagem no Sentry). A redação de PII (mensagem/stack/path) é feita lá dentro.
  const err = new Error(message)
  err.name = name
  if (stack) err.stack = stack
  captureServerException(err, {
    source: 'client-error-boundary',
    ...(digest ? { digest } : {}),
    ...(path ? { path } : {}),
  })
  return noContent()
}
