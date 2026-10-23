import 'server-only'
import { createHash } from 'node:crypto'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import {
  PYTHON_LANGUAGE_LIMITS,
  PythonLanguageProtocolError,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import {
  STUDIO_PYTHON_ANALYSIS_CONTEXT_MAX_BYTES,
  type StudioPythonAnalysisAuthorization,
  StudioPythonAnalysisAuthorizationSchema,
  studioPythonAnalysisBinding,
} from '@sistemazero/core/studio/python-language-authorization'
import { assertPythonLanguageBootstrapSize } from '@sistemazero/core/studio/python-language-bootstrap'
import {
  createStudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { type Env, getEnv } from '../lib/env'
import type { SessionUser } from '../lib/types'
import type { MembersClient } from '../server/clients'
import type { MediaModule } from '../server/media'
import { validatePythonAnalysisDecision } from '../server/python-analysis-decision'

const authorizationBody = z.strictObject({ authorization: StudioPythonAnalysisAuthorizationSchema })
const commandBody = authorizationBody.extend({ command: z.unknown() })

/** Scope includes the authenticated account and learner. Browser-supplied owner IDs are never used. */
export function pythonLanguageOwner(user: SessionUser) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        'python-language-v1',
        user.activeProfile?.accountId ?? user.id,
        user.id,
        user.kids?.sessionId ?? 'account',
      ]),
    )
    .digest('hex')
}
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
const unavailable = () =>
  json(
    {
      error: {
        code: 'PYTHON_ANALYSIS_UNAVAILABLE',
        message:
          'A análise Python está indisponível. Você pode continuar editando e executando o projeto.',
      },
    },
    503,
  )

export function createStudioPythonLanguageRoutes(
  media: Pick<MediaModule, 'requireUploadSession'>,
  options: {
    audience?: 'kids' | 'adult'
    /** Host-owned boundary. Omitted keeps the Member Shell's existing contextual routes. */
    contextKinds?: readonly StudioPythonAnalysisAuthorization['context']['kind'][]
    environment?: () => Pick<
      Env,
      'STUDIO_PYTHON_LANGUAGE_URL' | 'STUDIO_PYTHON_LANGUAGE_TOKEN' | 'NODE_ENV'
    >
    request?: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>
    members?: Pick<MembersClient, 'authorizePythonAnalysis'>
  } = {},
) {
  async function route(request: Request, sessionId?: string, start = false) {
    const user = await media.requireUploadSession(request)
    if (user instanceof NextResponse) return user
    const env = (options.environment ?? getEnv)()
    if (!env.STUDIO_PYTHON_LANGUAGE_URL || !env.STUDIO_PYTHON_LANGUAGE_TOKEN) return unavailable()
    if (sessionId !== undefined && !/^[a-f0-9]{32}$/.test(sessionId))
      return json({ error: { code: 'INVALID_INPUT' } }, 400)
    if (
      request.method !== 'DELETE' &&
      (request.headers.has('content-encoding') ||
        !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? ''))
    )
      return json({ error: { code: 'INVALID_INPUT' } }, 400)
    const base = new URL(env.STUDIO_PYTHON_LANGUAGE_URL)
    if (
      base.protocol !== 'https:' &&
      !(
        env.NODE_ENV !== 'production' &&
        base.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(base.hostname)
      )
    )
      return unavailable()
    if (base.username || base.password || base.search || base.hash) return unavailable()
    const url = `${base.href.replace(/\/$/, '')}/v1/python-language/${pythonLanguageOwner(user)}/${sessionId ?? 'open'}${start ? '/start' : ''}`
    let body: string | undefined
    let binding: string | undefined
    let commandKind: string | undefined
    const transport = new AbortController()
    try {
      if (request.method !== 'DELETE') {
        const raw = await readJsonBodyWithLimit(
          request,
          STUDIO_PYTHON_ANALYSIS_CONTEXT_MAX_BYTES +
            (sessionId && !start ? PYTHON_LANGUAGE_LIMITS.maxRequestBytes : 0) +
            1024,
        )
        const input = sessionId && !start ? commandBody.parse(raw) : authorizationBody.parse(raw)
        const authorization = input.authorization
        if (options.contextKinds && !options.contextKinds.includes(authorization.context.kind))
          return json({ error: { code: 'ACCESS_DENIED' } }, 403)
        if (
          authorization.context.kind === 'free' &&
          authorization.context.audience !== (options.audience ?? 'kids')
        )
          return json({ error: { code: 'ACCESS_DENIED' } }, 403)
        if (
          new TextEncoder().encode(JSON.stringify(authorization)).byteLength >
          STUDIO_PYTHON_ANALYSIS_CONTEXT_MAX_BYTES
        )
          return json({ error: { code: 'PAYLOAD_TOO_LARGE' } }, 413)
        // Validate the command before spending a policy read or touching a container.
        const command = 'command' in input ? parsePythonLanguageCommand(input.command) : undefined
        commandKind = command?.kind
        if (command?.kind === 'cancel' || command?.kind === 'dispose') {
          binding = await studioPythonAnalysisBinding(pythonLanguageOwner(user), authorization)
          body = JSON.stringify(command)
        } else {
          if (!options.members) return unavailable()
          const response = await options.members.authorizePythonAnalysis(authorization, {
            signal: request.signal,
          })
          if (response.status !== 200) return json(response.body, response.status)
          const decision = await validatePythonAnalysisDecision(response.body, authorization, {
            userId: user.id,
            accountId: user.activeProfile?.accountId ?? user.id,
          })
          if (!decision) return unavailable()
          request.signal.throwIfAborted()
          binding = await studioPythonAnalysisBinding(pythonLanguageOwner(user), authorization)
          if (start) body = JSON.stringify({ binding })
          else if (command) body = JSON.stringify(command)
          else {
            const catalog = await createStudioRuntimeCatalog(decision.catalog)
            const runtimeRelease = selectStudioRuntimeRelease(catalog, decision.runtime)
            if (!runtimeRelease) return unavailable()
            body = JSON.stringify({ projectId: authorization.subject.id, binding, runtimeRelease })
            assertPythonLanguageBootstrapSize(body)
          }
        }
      }
    } catch (error) {
      if (
        !(error instanceof RequestBodyTooLargeError) &&
        !(error instanceof InvalidJsonBodyError) &&
        !(error instanceof PythonLanguageProtocolError) &&
        !(error instanceof z.ZodError)
      )
        return unavailable()
      return json(
        {
          error: {
            code: error instanceof RequestBodyTooLargeError ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
          },
        },
        error instanceof RequestBodyTooLargeError ? 413 : 400,
      )
    }
    async function forward() {
      try {
        request.signal.throwIfAborted()
        transport.signal.throwIfAborted()
        const upstream = await (options.request ?? globalThis.fetch)(url, {
          method: request.method,
          headers: {
            authorization: `Bearer ${env.STUDIO_PYTHON_LANGUAGE_TOKEN}`,
            'content-type': 'application/json',
            ...(binding ? { 'x-studio-python-binding': binding } : {}),
            ...(commandKind ? { 'x-studio-python-operation': commandKind } : {}),
          },
          body,
          signal: AbortSignal.any([
            request.signal,
            transport.signal,
            AbortSignal.timeout(
              start
                ? PYTHON_LANGUAGE_LIMITS.startupTimeoutMs
                : sessionId
                  ? PYTHON_LANGUAGE_LIMITS.requestTimeoutMs + 3000
                  : 5000,
            ),
          ]),
          cache: 'no-store',
          redirect: 'error',
        })
        const result = await readJsonBodyWithLimit(
          upstream,
          sessionId ? PYTHON_LANGUAGE_LIMITS.maxResponseBytes : 4096,
        )
        if (!upstream.ok) {
          const status = upstream.status === 429 ? 429 : upstream.status === 410 ? 410 : 503
          return {
            status,
            body: {
              error: {
                code:
                  status === 429
                    ? 'RATE_LIMITED'
                    : status === 410
                      ? 'PYTHON_ANALYSIS_EXPIRED'
                      : 'PYTHON_ANALYSIS_UNAVAILABLE',
                message:
                  status === 429
                    ? 'Aguarde um momento antes de tentar a análise Python novamente.'
                    : 'Reconecte a análise Python para continuar recebendo sugestões.',
              },
            },
          }
        }
        return { status: 200, body: result }
      } catch {
        return {
          status: 503,
          body: {
            error: {
              code: 'PYTHON_ANALYSIS_UNAVAILABLE',
              message: 'Reconecte a análise Python para continuar recebendo sugestões.',
            },
          },
        }
      }
    }
    if (request.method === 'DELETE') {
      const result = await forward()
      return json(result.body, result.status)
    }
    const encoder = new TextEncoder()
    let closed = false
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          // Flush the authorization acknowledgement now. The room journal waits
          // for these headers, not for a cold language container or Pyright query.
          controller.enqueue(encoder.encode('{"transportVersion":1,'))
          void forward()
            .then((result) => {
              if (closed) return
              controller.enqueue(encoder.encode(`${JSON.stringify(result).slice(1)}`))
              controller.close()
              closed = true
            })
            .catch((error) => {
              if (!closed) {
                closed = true
                controller.error(error)
              }
            })
        },
        cancel() {
          closed = true
          transport.abort()
        },
      }),
      {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'private, no-store, no-transform',
          'x-content-type-options': 'nosniff',
        },
      },
    )
  }
  return {
    studioPythonLanguage: { POST: (request: Request) => route(request) },
    studioPythonLanguageStart: {
      POST: async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
        route(request, (await params).id, true),
    },
    studioPythonLanguageSession: {
      POST: async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
        route(request, (await params).id),
      DELETE: async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
        route(request, (await params).id),
    },
  }
}
