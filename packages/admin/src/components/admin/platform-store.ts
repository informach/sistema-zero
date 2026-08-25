'use client'

import {
  DEFAULT_PLATFORM,
  PLATFORM_COOKIE,
  type Platform,
  parsePlatform,
  platformCookieString,
} from '@/lib/platform'

/**
 * Store imperativo da plataforma, exclusivo do NAVEGADOR. React recebe o
 * snapshot SSR isolado por requisição via `PlatformProvider`; este módulo fica
 * responsável pelo cookie e por consumidores não React, como os contadores da
 * sidebar.
 */
const listeners = new Set<() => void>()

function readCookiePlatform(): Platform | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${PLATFORM_COOKIE}=([^;]*)`))
  return match ? parsePlatform(decodeURIComponent(match[1] ?? '')) : null
}

// O bundle do navegador lê o cookie uma vez ao ser avaliado, fora do render do
// React. O módulo avaliado no servidor permanece no default e nunca é mutado.
let current: Platform =
  typeof document === 'undefined' ? DEFAULT_PLATFORM : (readCookiePlatform() ?? DEFAULT_PLATFORM)

export function getPlatform(): Platform {
  if (typeof document === 'undefined') return DEFAULT_PLATFORM
  return current
}

export function setPlatform(next: Platform): void {
  if (typeof document === 'undefined') return
  if (next === current) return
  current = next
  if (typeof document !== 'undefined') {
    // biome-ignore lint/suspicious/noDocumentCookie: cookie de PREFERÊNCIA gravado de forma síncrona; a Cookie Store API é async e sem suporte universal
    document.cookie = platformCookieString(next, window.location.protocol === 'https:')
  }
  for (const listener of listeners) listener()
}

export function subscribePlatform(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
