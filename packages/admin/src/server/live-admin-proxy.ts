import 'server-only'
import { NextResponse } from 'next/server'
import { ADMIN_LIVE_BODY_LIMIT, adminLiveUpstream } from '@/lib/live-admin-route-policy'
import { normalizeUpstreamError } from '@/lib/upstream'
import type { CallOpts, GatewayResponse } from './gateway'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status, headers: NO_STORE })

/**
 * O BFF das oficinas ao vivo do painel (`/api/admin/live/[...path]`). Era o
 * `createLiveRouteHandler` do member-shell com `scope: 'admin'`; desde os cursos ao vivo
 * (14/10/2026) a lista de rotas é DO PAINEL (`lib/live-admin-route-policy.ts`), porque só o
 * painel a usa e ela mudou junto com a gestão das turmas. A autorização de verdade continua no
 * gateway e no members, a cada chamada.
 */
export function createAdminLiveHandler(deps: {
  gatewayFetch: (path: string, opts: CallOpts) => Promise<GatewayResponse>
  /** Equipe ativa do painel; `null` = sem sessão válida. */
  session: () => Promise<{ active: boolean } | null>
}) {
  return async (request: Request, context: { params: Promise<{ path: string[] }> }) => {
    const url = new URL(request.url)
    const upstream = adminLiveUpstream(
      request.method,
      (await context.params).path,
      url.searchParams,
    )
    if (!upstream) return error(404, 'NOT_FOUND', 'Este caminho não existe.')
    const user = await deps.session()
    if (!user?.active) return error(401, 'UNAUTHORIZED', 'Entre novamente para continuar.')
    let body: unknown
    if (request.method !== 'GET') {
      // Lido com teto mesmo sem Content-Length (corpo chunked): o cabeçalho não é confiável.
      const reader = request.body?.getReader()
      if (!reader) return error(400, 'INVALID_INPUT', 'Envie os dados da ação.')
      const chunks: Uint8Array[] = []
      let length = 0
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          length += chunk.value.byteLength
          if (length > ADMIN_LIVE_BODY_LIMIT) {
            await reader.cancel()
            return error(413, 'BODY_TOO_LARGE', 'Os dados ultrapassam o tamanho permitido.')
          }
          chunks.push(chunk.value)
        }
        const bytes = new Uint8Array(length)
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.byteLength
        }
        body = JSON.parse(new TextDecoder().decode(bytes))
      } catch {
        return error(400, 'INVALID_INPUT', 'Confira os dados enviados.')
      }
    }
    try {
      const response = await deps.gatewayFetch(upstream.path, {
        method: request.method as CallOpts['method'],
        body,
        query: upstream.query,
      })
      if (response.status === 204) return new NextResponse(null, { status: 204, headers: NO_STORE })
      if (response.status >= 500)
        return error(
          response.status,
          'LIVE_UNAVAILABLE',
          'A oficina não respondeu agora. Tente novamente.',
        )
      return NextResponse.json(
        response.status >= 400 ? normalizeUpstreamError(response.body) : response.body,
        { status: response.status, headers: NO_STORE },
      )
    } catch {
      return error(503, 'LIVE_UNAVAILABLE', 'A conexão com a oficina caiu. Tente novamente.')
    }
  }
}
