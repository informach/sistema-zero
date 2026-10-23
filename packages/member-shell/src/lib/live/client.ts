'use client'

import { sessionFetch as fetch } from '../session-fetch'

export class LiveRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function liveRequest<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    })
  } catch (cause) {
    // Quem cancelou foi a própria tela: o erro segue como cancelamento, sem frase na tela.
    if (signal?.aborted) throw cause
    // "Failed to fetch" e "signal timed out" chegavam em inglês na tela da criança.
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError'
    throw new LiveRequestError(
      timedOut
        ? 'A oficina demorou para responder. Estamos tentando de novo.'
        : 'Sem conexão com a internet agora. Sua criação continua aqui.',
      timedOut ? 'LIVE_TIMEOUT' : 'LIVE_NETWORK',
      0,
    )
  }
  const value = await response.json().catch(() => null)
  if (!response.ok)
    throw new LiveRequestError(
      value?.error?.message ?? 'Não foi possível concluir. Tente novamente.',
      value?.error?.code ?? 'LIVE_UNAVAILABLE',
      response.status,
    )
  return value as T
}

export function liveDate(value: string, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}

/**
 * O aparelho desta aba. Recarregar a página (F5) mantém o MESMO id: antes cada recarga virava
 * "outro aparelho", a criança perdia a vez de falar e via "Use Continuar aqui". Abas duplicadas
 * copiam o sessionStorage, então o id só é reaproveitado quando esta aba consegue a trava dele
 * (`navigator.locks`); a outra aba, que ainda segura a trava, faz a duplicada nascer com id novo.
 * Sem `navigator.locks` volta ao comportamento antigo: um id por documento.
 */
export function resolveLiveDeviceId(): Promise<string> {
  // Uma resolução por documento: duas chamadas ao mesmo tempo disputariam a própria trava.
  const pending = Symbol.for('@sistemazero/live:document-device-pending')
  const registry = window as unknown as Record<symbol, Promise<string> | undefined>
  registry[pending] ??= resolveOnce()
  return registry[pending]!
}

async function resolveOnce(): Promise<string> {
  const key = Symbol.for('@sistemazero/live:document-device')
  const registry = window as unknown as Record<symbol, string | undefined>
  const existing = registry[key]
  if (existing) return existing
  const storageKey = 'sz:live-device'
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(storageKey)
  } catch {
    /* Sem storage: id novo por documento. */
  }
  const id = stored && (await holdDeviceLock(stored)) ? stored : crypto.randomUUID()
  if (id !== stored) {
    await holdDeviceLock(id)
    try {
      sessionStorage.setItem(storageKey, id)
    } catch {
      /* Opcional. */
    }
  }
  registry[key] ??= id
  return registry[key]!
}

/** Segura a trava do id enquanto este documento existir (a promessa nunca termina). */
function holdDeviceLock(id: string): Promise<boolean> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  if (!locks?.request) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    void locks
      .request(`sz-live-device:${id}`, { ifAvailable: true }, (lock) => {
        resolve(Boolean(lock))
        return lock ? new Promise<void>(() => {}) : undefined
      })
      .catch(() => resolve(false))
  })
}

/** A document nonce. Duplicate tabs copy sessionStorage, so it cannot identify a writer. */
export function liveDeviceId(): string {
  const key = Symbol.for('@sistemazero/live:document-device')
  const registry = window as unknown as Record<symbol, string | undefined>
  const existing = registry[key]
  if (existing) return existing
  const id = crypto.randomUUID()
  registry[key] = id
  return id
}
