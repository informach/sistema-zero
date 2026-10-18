import 'server-only'
import { StudioLiveRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation, isSupportSession } from '../lib/act'
import { type LiveRouteScope, liveUpstreamPath } from '../lib/live-route-policy'
import type { CallOpts, GatewayModule, GatewayResponse } from '../server/gateway'
import { r2PresignGetPrivate } from '../server/r2'
import type { SessionModule } from '../server/session'

const error = (status: number, code: string, message: string) =>
  NextResponse.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )

/** Shared by Kids and Admin. Authorization remains authoritative in Members on every call. */
export function createLiveRouteHandler(deps: {
  scope: LiveRouteScope
  gatewayFetch: (path: string, opts: CallOpts) => Promise<GatewayResponse>
  /** `support`: any support/impersonation session (`act`), read-only or not. */
  session: () => Promise<{ readonly: boolean; support?: boolean } | null>
  signAsset?: typeof r2PresignGetPrivate
}) {
  return async (request: Request, context: { params: Promise<{ path: string[] }> }) => {
    const path = liveUpstreamPath(deps.scope, request.method, (await context.params).path)
    if (!path) return error(404, 'NOT_FOUND', 'Este caminho não existe.')
    const user = await deps.session()
    if (!user) return error(401, 'UNAUTHORIZED', 'Entre novamente para continuar.')
    if (request.method !== 'GET' && user.support)
      return error(403, 'SUPPORT_SESSION', 'A sessão de suporte não pode agir na oficina ao vivo.')
    if (request.method !== 'GET' && user.readonly)
      return error(403, 'IMPERSONATION_READONLY', 'A sessão de suporte é somente leitura.')
    let body: unknown
    if (request.method !== 'GET') {
      if (
        path.endsWith('/runtime') &&
        (request.headers.get('content-encoding') ||
          !request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      )
        return error(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie os dados do projeto em JSON.')
      // Read with a bound even for chunked requests; Content-Length is not trusted.
      const reader = request.body?.getReader()
      if (!reader) return error(400, 'INVALID_INPUT', 'Envie os dados da ação.')
      const chunks: Uint8Array[] = []
      let length = 0
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          length += chunk.value.byteLength
          const limit =
            /\/(?:commits|accept|return|templates|runtime)$/.test(path) ||
            /\/admin\/live\/programs(?:\/[\da-f-]+)?$/.test(path)
              ? 2_000_000
              : 256_000
          if (length > limit) {
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
    if (path.endsWith('/runtime')) {
      const parsed = StudioLiveRuntimeRequestSchema.safeParse(body)
      if (
        !parsed.success ||
        !path.endsWith(`/workspaces/${parsed.data.context.workspaceId}/runtime`)
      )
        return error(400, 'INVALID_INPUT', 'Confira o contexto de execução do projeto.')
      body = parsed.data
    }
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')
    const version = url.searchParams.get('version')
    const revision = url.searchParams.get('revision')
    const planRevision = url.searchParams.get('planRevision')
    const sessionId = url.searchParams.get('sessionId')
    const occurrenceId = url.searchParams.get('occurrenceId')
    // O projeto ao vivo do BLOCO Estúdio (`workspaces?sessionId=&blockId=`; a professora acompanha
    // uma criança com `learnerId`).
    const blockId = url.searchParams.get('blockId')
    const learnerId = url.searchParams.get('learnerId')
    const cursor = url.searchParams.get('cursor'),
      limit = url.searchParams.get('limit')
    const query = {
      ...(cursor && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(cursor) ? { cursor } : {}),
      ...(limit && /^(?:[1-9]|[1-4][0-9]|50)$/.test(limit) ? { limit } : {}),
      ...(sessionId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(sessionId)
        ? { sessionId }
        : {}),
      ...(deviceId ? { deviceId } : {}),
      ...(version && /^\d{1,9}$/.test(version) ? { version } : {}),
      ...(revision && /^\d{1,9}$/.test(revision) ? { revision } : {}),
      ...(planRevision && /^[a-f0-9]{64}$/.test(planRevision) ? { planRevision } : {}),
      ...(occurrenceId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(occurrenceId)
        ? { occurrenceId }
        : {}),
      ...(blockId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(blockId)
        ? { blockId }
        : {}),
      ...(learnerId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(learnerId)
        ? { learnerId }
        : {}),
    }
    try {
      const response = await deps.gatewayFetch(path, {
        method: request.method as CallOpts['method'],
        body,
        query,
      })
      if (response.status === 200 && /\/(?:recording|materials\/[\da-f-]+\/download)$/.test(path)) {
        const asset = response.body as {
          storageKey: string
          expiresAt: string
          fileName?: string
          version?: number
        }
        const ttl = Math.min(300, Math.floor((Date.parse(asset.expiresAt) - Date.now()) / 1000))
        if (!Number.isFinite(ttl) || ttl <= 0 || !asset.storageKey)
          return error(403, 'LIVE_ACCESS_EXPIRED', 'O prazo deste encontro terminou.')
        const fileName =
          asset.fileName?.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'material'
        const url = await (deps.signAsset ?? r2PresignGetPrivate)(
          asset.storageKey.replace(/^r2priv:/, ''),
          {
            expiresInSeconds: ttl,
            responseContentDisposition: asset.fileName
              ? `attachment; filename="${fileName}"`
              : 'inline',
          },
        )
        if (asset.fileName)
          return new NextResponse(null, {
            status: 302,
            headers: {
              Location: url,
              'Cache-Control': 'private, no-store',
              'Referrer-Policy': 'no-referrer',
            },
          })
        return NextResponse.json(
          {
            url,
            expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
            version: asset.version,
          },
          { headers: { 'Cache-Control': 'private, no-store' } },
        )
      }
      if (response.status === 204)
        return new NextResponse(null, {
          status: 204,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      if (response.status >= 500)
        return error(
          response.status,
          'LIVE_UNAVAILABLE',
          'A oficina não respondeu agora. Tente novamente.',
        )
      return NextResponse.json(response.body, {
        status: response.status,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    } catch {
      return error(503, 'LIVE_UNAVAILABLE', 'A conexão com a oficina caiu. Tente novamente.')
    }
  }
}

export function createLiveRoutes({
  gateway,
  session,
}: {
  gateway: GatewayModule
  session: SessionModule
}) {
  const resolveSession = async () => {
    const user = await session.getSession()
    return user
      ? { readonly: isReadonlyImpersonation(user), support: isSupportSession(user) }
      : null
  }
  return {
    live: createLiveRouteHandler({
      scope: 'learner',
      gatewayFetch: gateway.gatewayFetch,
      session: resolveSession,
    }),
    parentLive: createLiveRouteHandler({
      scope: 'parent',
      gatewayFetch: gateway.gatewayFetch,
      session: resolveSession,
    }),
  }
}
