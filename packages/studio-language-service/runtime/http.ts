import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import {
  PYTHON_LANGUAGE_LIMITS,
  PythonLanguageProtocolError,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import type { PythonLanguageReply } from '@sistemazero/core/studio/python-language-results'
import type { PythonLanguageSession } from './pyright'

export function createPythonLanguageServer(input: {
  token: string
  session: Pick<PythonLanguageSession, 'handle' | 'dispose'>
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
  async function readCommand(request: IncomingMessage) {
    const chunks: Buffer[] = []
    let bytes = 0
    try {
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        if (bytes + chunk.length > PYTHON_LANGUAGE_LIMITS.maxRequestBytes)
          throw new PythonLanguageProtocolError('quota-exceeded', 'body-too-large')
        if (bufferedBytes + chunk.length > PYTHON_LANGUAGE_LIMITS.maxBufferedRequestBytes)
          throw new PythonLanguageProtocolError('quota-exceeded', 'busy')
        bytes += chunk.length
        bufferedBytes += chunk.length
        chunks.push(chunk)
      }
      return parsePythonLanguageCommand(JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')))
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
    input.session.dispose()
    server.close()
    server.closeAllConnections()
    input.onExpired()
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
        json(response, 200, { ready: true })
        return
      }
      if (
        request.url !== '/command' ||
        request.method !== 'POST' ||
        request.headers['content-encoding'] !== undefined ||
        !/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')
      ) {
        json(response, 404, { error: 'not-found' })
        request.resume()
        return
      }
      if (Number(request.headers['content-length']) > PYTHON_LANGUAGE_LIMITS.maxRequestBytes) {
        json(response, 413, { error: 'body-too-large' })
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
      const abort = new AbortController()
      const onClose = () => {
        if (!response.writableFinished) abort.abort()
      }
      response.on('close', onClose)
      const deadline = setTimeout(() => {
        abort.abort()
        request.destroy()
        response.destroy()
      }, PYTHON_LANGUAGE_LIMITS.requestTimeoutMs + 1500)
      let id: string | undefined
      try {
        const command = await readCommand(request)
        id = command.id
        if (command.kind !== 'cancel' && command.kind !== 'dispose') {
          clearTimeout(idle)
          idle = setTimeout(expire, idleTtl)
        }
        const result = await input.session.handle(command, abort.signal)
        json(response, 200, result)
        if (command.kind === 'dispose') {
          // Finish the acknowledgement before closing the private container listener.
          response.once('finish', expire)
          if (response.writableFinished) expire()
        }
      } catch (error) {
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
    input.session.dispose()
  })
  return server
}
