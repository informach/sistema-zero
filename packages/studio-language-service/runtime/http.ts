import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import {
  PYTHON_LANGUAGE_LIMITS,
  PythonLanguageProtocolError,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import {
  createPythonLanguageBootstrap,
  STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES,
  type StudioPythonLanguageBootstrap,
} from '@sistemazero/core/studio/python-language-bootstrap'
import type { PythonLanguageReply } from '@sistemazero/core/studio/python-language-results'
import type { PythonLanguageSession } from './pyright'

type LanguageSession = Pick<PythonLanguageSession, 'handle'> & { dispose(): void | Promise<void> }

export function createPythonLanguageServer(input: {
  token: string
  createSession(
    bootstrap: StudioPythonLanguageBootstrap,
    signal: AbortSignal,
  ): Promise<LanguageSession>
  onExpired(): void
  idleTtlMs?: number
  maxLifetimeMs?: number
}) {
  if (!/^[a-f0-9]{64}$/.test(input.token))
    throw new Error('A private language service token is required')
  const authorization = Buffer.from(`Bearer ${input.token}`)
  const idleTtl = input.idleTtlMs ?? PYTHON_LANGUAGE_LIMITS.idleTtlMs
  const lifetime = input.maxLifetimeMs ?? PYTHON_LANGUAGE_LIMITS.maxLifetimeMs
  let active = 0,
    expired = false
  let bufferedBytes = 0
  let session: LanguageSession | undefined
  let configuring = false
  let preparation: Promise<void> | undefined
  let cleanup: Promise<void> | undefined
  const lifetimeController = new AbortController()
  const dispose = () => {
    lifetimeController.abort()
    cleanup ??= (async () => {
      await preparation?.catch(() => {})
      await session?.dispose()
    })()
    return cleanup
  }
  async function readBody(request: IncomingMessage, limit: number) {
    const chunks: Buffer[] = []
    let bytes = 0
    try {
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        if (bytes + chunk.length > limit)
          throw new PythonLanguageProtocolError('quota-exceeded', 'body-too-large')
        if (bufferedBytes + chunk.length > PYTHON_LANGUAGE_LIMITS.maxBufferedRequestBytes)
          throw new PythonLanguageProtocolError('quota-exceeded', 'busy')
        bytes += chunk.length
        bufferedBytes += chunk.length
        chunks.push(chunk)
      }
      return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')) as unknown
    } finally {
      bufferedBytes -= bytes
      chunks.length = 0
    }
  }
  const authorized = (request: IncomingMessage) => {
    const provided = Buffer.from(request.headers.authorization ?? '')
    return provided.length === authorization.length && timingSafeEqual(provided, authorization)
  }
  const json = (response: ServerResponse, status: number, data: unknown) => {
    if (response.destroyed) return
    response.writeHead(status, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    response.end(JSON.stringify(data))
  }
  const expire = () => {
    if (expired) return
    expired = true
    clearTimeout(idle)
    clearTimeout(hard)
    void dispose()
      .finally(input.onExpired)
      .catch(() => {})
    server.close()
    server.closeAllConnections()
  }
  let idle = setTimeout(expire, idleTtl)
  const hard = setTimeout(expire, lifetime)
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 15_000, headersTimeout: 10_000 },
    async (request, response) => {
      if (!authorized(request)) {
        json(response, 401, { error: 'unauthorized' })
        request.resume()
        return
      }
      if (expired) {
        json(response, 410, { error: 'expired' })
        return
      }
      if (request.url === '/healthz' && request.method === 'GET') {
        json(response, session ? 200 : 503, { ready: !!session })
        return
      }
      if (
        !['/command', '/configure'].includes(request.url ?? '') ||
        request.method !== 'POST' ||
        request.headers['content-encoding'] !== undefined ||
        !/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')
      ) {
        json(response, 404, { error: 'not-found' })
        request.resume()
        return
      }
      const configure = request.url === '/configure'
      const limit = configure
        ? STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES
        : PYTHON_LANGUAGE_LIMITS.maxRequestBytes
      if (Number(request.headers['content-length']) > limit) {
        json(response, 413, { error: 'body-too-large' })
        request.resume()
        return
      }
      if (configure ? configuring || !!session : !session) {
        json(response, configure ? 409 : 503, {
          error: configure ? 'already-configured' : 'not-ready',
        })
        request.resume()
        return
      }
      // Includes requests still receiving a body; reserves capacity for cancellation/disposal.
      if (active >= PYTHON_LANGUAGE_LIMITS.maxPendingRequests + 2) {
        json(response, 429, { error: 'busy' })
        request.resume()
        return
      }
      active++
      if (configure) configuring = true
      const abort = new AbortController()
      const signal = AbortSignal.any([abort.signal, lifetimeController.signal])
      const onClose = () => {
        if (!response.writableFinished) abort.abort()
      }
      response.on('close', onClose)
      const deadline = setTimeout(
        () => {
          abort.abort()
          request.destroy()
          response.destroy()
        },
        configure ? 5000 : PYTHON_LANGUAGE_LIMITS.requestTimeoutMs + 1500,
      )
      let id: string | undefined
      try {
        if (configure) {
          preparation = (async () => {
            const bootstrap = await createPythonLanguageBootstrap(await readBody(request, limit))
            signal.throwIfAborted()
            const created = await input.createSession(bootstrap, signal)
            if (signal.aborted || expired) {
              await created.dispose()
              signal.throwIfAborted()
              throw new Error('Language configuration expired')
            }
            session = created
          })()
          await preparation
          json(response, 200, { protocolVersion: 1, ready: true })
          return
        }
        const command = parsePythonLanguageCommand(await readBody(request, limit))
        id = command.id
        if (command.kind !== 'cancel' && command.kind !== 'dispose') {
          clearTimeout(idle)
          idle = setTimeout(expire, idleTtl)
        }
        signal.throwIfAborted()
        const result = await session!.handle(command, signal)
        json(response, 200, result)
        if (command.kind === 'dispose') {
          // Finish the acknowledgement before closing the private container listener.
          response.once('finish', expire)
          if (response.destroyed || response.writableFinished) expire()
        }
      } catch (error) {
        if (configure) {
          json(
            response,
            error instanceof PythonLanguageProtocolError && error.code === 'quota-exceeded'
              ? 413
              : 400,
            { error: 'invalid-configuration' },
          )
          // A failed declared configuration never falls back to a legacy session.
          response.once('finish', expire)
          if (response.destroyed || response.writableFinished) expire()
          request.resume()
          return
        }
        if (
          error instanceof PythonLanguageProtocolError &&
          error.code === 'quota-exceeded' &&
          !id
        ) {
          response.setHeader('connection', 'close')
          json(response, error.message === 'body-too-large' ? 413 : 429, {
            error: 'quota-exceeded',
          })
          request.resume()
          return
        }
        if (error instanceof PythonLanguageProtocolError && id) {
          const result: PythonLanguageReply = {
            version: 1,
            id,
            kind: 'error',
            code: error.code,
            message: error.message,
          }
          json(response, 400, result)
        } else json(response, 400, { error: 'invalid-request' })
      } finally {
        active--
        clearTimeout(deadline)
        response.removeListener('close', onClose)
      }
    },
  )
  server.on('close', () => {
    clearTimeout(idle)
    clearTimeout(hard)
    void dispose().catch(() => {})
  })
  return server
}
