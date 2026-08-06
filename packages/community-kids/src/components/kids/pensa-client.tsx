'use client'

import type { PensaHostAdapter, PensaTransport } from '@sistemazero/pensa'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

type PensaModule = typeof import('@sistemazero/pensa')

/** Host fino: o Pensa planeja; Pinta e Estúdio executam por deep link. */
export function PensaClient({
  pintaOwned,
  studioAvailable,
}: {
  pintaOwned: boolean
  studioAvailable: boolean
}) {
  const [mod, setMod] = useState<PensaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'

  const loadPensa = useCallback(async () => {
    setMod(null)
    setLoadError(false)
    try {
      setMod(await import('@sistemazero/pensa'))
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void loadPensa()
  }, [loadPensa])

  // Troca coordenada: remove somente chaves exclusivas dos fluxos antigos do Pensa.
  useEffect(() => {
    try {
      const removable = ['pensa:resume:', 'pensa:checks:', 'sz:pensa:', 'sz:pinta:intent']
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index)
        if (key && removable.some((prefix) => key === prefix || key.startsWith(prefix)))
          localStorage.removeItem(key)
      }
      sessionStorage.removeItem('sz:pinta:intent')
    } catch {
      // Armazenamento indisponível não impede o planejador.
    }
  }, [])

  const transport = useMemo(() => createPensaTransport(), [])
  const adapter = useMemo<PensaHostAdapter>(
    () => ({
      transport,
      mode: 'kids',
      theme,
      // O pacote chama a capability de `studioOwned`, mas o host fornece a
      // disponibilidade efetiva: produto comprado + carreira liberada.
      capabilities: { pintaOwned, studioOwned: studioAvailable },
      mascotImages: {
        happy: '/zappy/happy.webp',
        thinking: '/zappy/thinking.webp',
        celebrating: '/zappy/celebrating.webp',
        sleeping: '/zappy/sleeping.webp',
      },
      onOpenTask: ({ taskId, destination }) =>
        router.push(
          `/${destination === 'pinta' ? 'pinta' : 'estudio'}?tarefa=${encodeURIComponent(taskId)}`,
        ),
    }),
    [transport, theme, pintaOwned, studioAvailable, router],
  )

  return (
    // ⚠️ SEM card em volta: o Pensa é uma SEÇÃO da comunidade e o fundo dele já
    // é o `--background` da página (ver pensa.css). O `overflow-hidden` fica.
    <div className="flex min-h-[34rem] w-full flex-1 flex-col overflow-hidden">
      {loadError ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Pensa.</p>
            <button
              type="button"
              onClick={() => void loadPensa()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : mod ? (
        <mod.PensaApp adapter={adapter} />
      ) : (
        <div className="grid flex-1 place-items-center text-muted-foreground text-sm">
          Carregando o Pensa…
        </div>
      )}
    </div>
  )
}

/** Erro duck-typed do transport (a classe PensaApiError não atravessa o dynamic import). */
function requestError(
  message: string | undefined,
  status: number,
  code: string | undefined,
  scope?: 'day' | 'month',
) {
  const cause = new Error(message ?? 'Não deu certo agora.') as Error & {
    status: number
    code: string
    scope?: 'day' | 'month'
  }
  cause.status = status
  cause.code = code ?? 'REQUEST_FAILED'
  cause.scope = scope
  return cause
}

/**
 * Lê uma resposta SSE (blocos `event:`/`data:` separados por linha vazia;
 * comentários `: ping` são ignorados de graça, não têm `event:`). `onEvent`
 * devolve true para encerrar; resolve true quando um evento terminal chegou.
 */
async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => boolean,
): Promise<boolean> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += decoder.decode(chunk.value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const event = block
        .split('\n')
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim()
      const raw = block
        .split('\n')
        .find((line) => line.startsWith('data:'))
        ?.slice(5)
        .trim()
      if (!event || !raw) continue
      if (onEvent(event, JSON.parse(raw) as unknown)) return true
    }
  }
  return false
}

function createPensaTransport(): PensaTransport {
  return {
    async request<T>(
      path: string,
      init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown },
    ): Promise<T> {
      const response = await fetch(`/api/pensa${path}`, {
        method: init?.method ?? 'GET',
        headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      // Gerações longas respondem SSE (keepalive contra o 502 da borda): o
      // JSON de sempre chega num único evento `done` — ou `error`, que vira o
      // MESMO erro duck-typed do caminho JSON. Sniff por content-type (não por
      // path) tolera skew de deploy.
      const contentType = response.headers.get('content-type') ?? ''
      if (response.ok && response.body && contentType.includes('text/event-stream')) {
        let terminal: { event: string; data: unknown } | null = null
        try {
          await readSse(response.body, (event, data) => {
            if (event !== 'done' && event !== 'error') return false
            terminal = { event, data }
            return true
          })
        } catch {
          throw requestError('A conexão caiu no meio. Tente de novo.', 502, 'CONNECTION_LOST')
        }
        if (!terminal)
          throw requestError('A conexão caiu no meio. Tente de novo.', 502, 'CONNECTION_LOST')
        const { event, data } = terminal as { event: string; data: unknown }
        if (event === 'done') return data as T
        const value = data as {
          status?: number
          code?: string
          message?: string
          scope?: 'day' | 'month'
        }
        throw requestError(value.message, value.status ?? 502, value.code, value.scope)
      }
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string; scope?: 'day' | 'month' }
      } | null
      if (!response.ok)
        throw requestError(
          body?.error?.message,
          response.status,
          body?.error?.code,
          body?.error?.scope,
        )
      return body as T
    },
    streamChat(input, handlers) {
      const controller = new AbortController()
      void (async () => {
        let finished = false
        const fail = (message: string, code = 'PENSA_AI_UNAVAILABLE') => {
          if (finished) return
          finished = true
          const cause = new Error(message) as Error & { code: string }
          cause.code = code
          handlers.onError(cause)
        }
        try {
          const response = await fetch('/api/pensa/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(input),
            signal: controller.signal,
          })
          if (!response.ok || !response.body) {
            const body = (await response.json().catch(() => null)) as {
              error?: { code?: string; message?: string }
            } | null
            return fail(body?.error?.message ?? 'O Zappy tropeçou aqui.', body?.error?.code)
          }
          const terminal = await readSse(response.body, (event, data) => {
            if (event === 'delta' && typeof data === 'string') handlers.onDelta(data)
            else if (event === 'state') handlers.onState?.(data as Record<string, unknown>)
            else if (event === 'done') {
              finished = true
              handlers.onDone()
              return true
            } else if (event === 'error') {
              const value = data as { code?: string; message?: string }
              fail(value.message ?? 'O Zappy tropeçou aqui.', value.code)
              return true
            }
            return false
          })
          if (!terminal) fail('A conexão caiu no meio. Tente de novo.')
        } catch {
          if (!controller.signal.aborted) fail('A conexão falhou. Tente de novo.')
        }
      })()
      return () => controller.abort()
    },
  }
}
