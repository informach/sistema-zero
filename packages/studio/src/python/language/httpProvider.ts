import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import type { PythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'
import {
  type StudioPythonAnalysisAuthorization,
  StudioPythonAnalysisAuthorizationSchema,
} from '@sistemazero/core/studio/python-language-authorization'
import type {
  PythonLanguageProvider,
  PythonLanguageReply,
} from '@sistemazero/core/studio/python-language-results'
import { StudioPythonLanguageTransportSchema } from '@sistemazero/core/studio/python-language-transport'

/** The same-origin BFF derives the learner identity. No runtime token is sent to the browser. */
export function createPythonLanguageHttpProvider(options: {
  basePath?: string
  request?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  authorization(projectId: string, signal: AbortSignal): Promise<StudioPythonAnalysisAuthorization>
  signal?: AbortSignal
  /** Serializes only authorization and the HTTP acknowledgement, never native work. */
  schedule?(operation: () => Promise<Response>): Promise<Response>
}): PythonLanguageProvider {
  const basePath = options.basePath ?? '/api/studio/python-language'
  const fetch = options.request ?? globalThis.fetch
  if (!/^\/(?!\/)[A-Za-z0-9/_-]+$/.test(basePath))
    throw new Error('Python analysis requires a same-origin route')
  async function authorization(projectId: string, signal: AbortSignal) {
    signal.throwIfAborted()
    const input = StudioPythonAnalysisAuthorizationSchema.parse(
      await options.authorization(projectId, signal),
    )
    signal.throwIfAborted()
    if (input.subject.id !== projectId) throw new Error('O projeto da análise Python mudou.')
    return input
  }
  const ownedSignal = (signal: AbortSignal) =>
    options.signal ? AbortSignal.any([signal, options.signal]) : signal
  async function sendAuthorized(
    url: string,
    projectId: string,
    signal: AbortSignal,
    timeoutMs: number,
    command?: PythonLanguageCommand,
    reserve = false,
  ) {
    const joined = ownedSignal(signal)
    const operation = async () => {
      const current = await authorization(projectId, joined)
      return fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
        body: JSON.stringify({ authorization: current, ...(command ? { command } : {}) }),
        // Finish a cheap reservation even after leaving, so its returned ID can be closed.
        signal: reserve
          ? AbortSignal.timeout(timeoutMs)
          : AbortSignal.any([joined, AbortSignal.timeout(timeoutMs)]),
      })
    }
    return options.schedule && command?.kind !== 'cancel' && command?.kind !== 'dispose'
      ? options.schedule(operation)
      : operation()
  }
  async function readTransport(response: Response, limit: number) {
    const raw = await readJsonBodyWithLimit(response, limit + 512)
    if (!response.ok) throw new Error('A análise Python não está disponível neste contexto.')
    const reply = StudioPythonLanguageTransportSchema.parse(raw)
    return { ok: reply.status >= 200 && reply.status < 300, body: reply.body }
  }
  return {
    async open({ projectId }, signal) {
      const lifetime = ownedSignal(signal)
      lifetime.throwIfAborted()
      const response = await sendAuthorized(basePath, projectId, lifetime, 5000, undefined, true)
      const transport = await readTransport(response, 4096)
      const data = transport.body as {
        version?: unknown
        sessionId?: unknown
        projectId?: unknown
        message?: unknown
      }
      if (
        !transport.ok ||
        data?.version !== 1 ||
        typeof data.sessionId !== 'string' ||
        !/^[a-f0-9]{32}$/.test(data.sessionId) ||
        data.projectId !== projectId
      )
        throw new Error('Não foi possível conectar a análise Python. Tente novamente.')
      const url = `${basePath}/${data.sessionId}`
      let closed = false
      function close() {
        if (closed) return
        closed = true
        signal.removeEventListener('abort', close)
        options.signal?.removeEventListener('abort', close)
        void fetch(url, {
          method: 'DELETE',
          credentials: 'same-origin',
          redirect: 'error',
          cache: 'no-store',
          keepalive: true,
        })
          .then((response) => response.body?.cancel())
          .catch(() => {})
      }
      signal.addEventListener('abort', close, { once: true })
      options.signal?.addEventListener('abort', close, { once: true })
      try {
        lifetime.throwIfAborted()
        const response = await sendAuthorized(
          `${url}/start`,
          projectId,
          lifetime,
          PYTHON_LANGUAGE_LIMITS.startupTimeoutMs,
        )
        const reply = await readTransport(response, 4096)
        const result = reply.body
        if (
          !reply.ok ||
          !result ||
          typeof result !== 'object' ||
          !('ready' in result) ||
          result.ready !== true
        )
          throw new Error('Não foi possível iniciar a análise Python. Tente novamente.')
        lifetime.throwIfAborted()
      } catch (error) {
        close()
        throw error
      }
      signal.removeEventListener('abort', close)
      return {
        async send(command, signal) {
          if (closed) throw new Error('A análise Python foi encerrada.')
          const response = await sendAuthorized(
            url,
            projectId,
            signal,
            PYTHON_LANGUAGE_LIMITS.requestTimeoutMs,
            command,
          )
          const transport = await readTransport(response, PYTHON_LANGUAGE_LIMITS.maxResponseBytes)
          ownedSignal(signal).throwIfAborted()
          if (closed) throw new Error('A análise Python foi encerrada.')
          const reply = transport.body as PythonLanguageReply
          if (!transport.ok || !reply || reply.version !== 1 || reply.id !== command.id)
            throw new Error('A análise Python precisa ser reconectada.')
          return reply
        },
        close,
      }
    },
  }
}
