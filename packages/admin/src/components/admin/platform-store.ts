'use client'

import { useSyncExternalStore } from 'react'
import {
  DEFAULT_PLATFORM,
  PLATFORM_COOKIE,
  type Platform,
  parsePlatform,
  platformCookieString,
} from '@/lib/platform'

/**
 * Plataforma ativa (Kids × Adultos) — store singleton em escopo de MÓDULO
 * (molde do `professor-counts-store`): a sidebar e as páginas leem o MESMO
 * valor sem prop-drilling, e código não-React (o próprio counts-store) pode
 * consultar `getPlatform()`.
 *
 * Semeadura anti-mismatch de hidratação: o layout (server) lê o cookie e a
 * `AdminSidebar` chama `initPlatform(valor)` ANTES do primeiro `usePlatform()`
 * (React renderiza em ordem de árvore, e a sidebar vem antes do conteúdo) —
 * assim o HTML do SSR e o 1º render do client partem do MESMO valor. O
 * fallback lazy pro cookie em `getPlatform` é cinto-e-suspensório p/ um
 * consumidor client que rode fora dessa ordem.
 */
let current: Platform = DEFAULT_PLATFORM
let seeded = false
const listeners = new Set<() => void>()

function readCookiePlatform(): Platform | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${PLATFORM_COOKIE}=([^;]*)`))
  return match ? parsePlatform(decodeURIComponent(match[1] ?? '')) : null
}

/**
 * Semeia com o valor lido pelo SERVER. No SSR o módulo é COMPARTILHADO entre
 * requests (o processo vive) — o seed adota o valor DESTE request SEMPRE, sem
 * latch (o subtree renderiza síncrono logo após, então não há corrida com
 * outro request no meio do próprio render). No BROWSER o latch vale: a 1ª
 * hidratação semeia e cliques do operador passam a mandar.
 */
export function initPlatform(initial: Platform): void {
  if (typeof document === 'undefined') {
    current = initial
    return
  }
  if (seeded) return
  seeded = true
  current = initial
}

export function getPlatform(): Platform {
  if (!seeded) {
    const fromCookie = readCookiePlatform()
    if (fromCookie) {
      seeded = true
      current = fromCookie
    }
  }
  return current
}

export function setPlatform(next: Platform): void {
  if (next === current) {
    seeded = true
    return
  }
  seeded = true
  current = next
  if (typeof document !== 'undefined') {
    // biome-ignore lint/suspicious/noDocumentCookie: cookie de PREFERÊNCIA gravado de forma síncrona; a Cookie Store API é async e sem suporte universal
    document.cookie = platformCookieString(next, window.location.protocol === 'https:')
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Assinatura para código NÃO-React (ex.: o counts-store re-busca ao trocar de plataforma). */
export function subscribePlatform(listener: () => void): () => void {
  return subscribe(listener)
}

/** Plataforma ativa, reativa (server snapshot = valor semeado pelo layout). */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, getPlatform, getPlatform)
}
