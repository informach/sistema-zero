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
    <div className="flex min-h-[34rem] w-full flex-1 flex-col overflow-hidden rounded-2xl border-2 border-border bg-card">
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
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string; scope?: 'day' | 'month' }
      } | null
      if (!response.ok) {
        const cause = new Error(body?.error?.message ?? 'Não deu certo agora.') as Error & {
          status: number
          code: string
          scope?: 'day' | 'month'
        }
        cause.status = response.status
        cause.code = body?.error?.code ?? 'REQUEST_FAILED'
        cause.scope = body?.error?.scope
        throw cause
      }
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
          const reader = response.body.getReader()
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
              const data = JSON.parse(raw) as unknown
              if (event === 'delta' && typeof data === 'string') handlers.onDelta(data)
              else if (event === 'state') handlers.onState?.(data as Record<string, unknown>)
              else if (event === 'done') {
                finished = true
                handlers.onDone()
                return
              } else if (event === 'error') {
                const value = data as { code?: string; message?: string }
                return fail(value.message ?? 'O Zappy tropeçou aqui.', value.code)
              }
            }
          }
          fail('A conexão caiu no meio. Tente de novo.')
        } catch {
          if (!controller.signal.aborted) fail('A conexão falhou. Tente de novo.')
        }
      })()
      return () => controller.abort()
    },
  }
}
