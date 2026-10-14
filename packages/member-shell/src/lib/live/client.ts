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
  const response = await fetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  })
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
