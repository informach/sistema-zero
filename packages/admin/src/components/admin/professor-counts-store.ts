'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { apiGet } from '@/lib/api'
import type { Platform } from '@/lib/platform'
import type { StudioSubmissionQueueRow, TeacherThreadRow } from '@/lib/types'
import { getPlatform, subscribePlatform } from './platform-store'

/**
 * Contadores de pendências da Sala do Professor (badges da sidebar + Home) —
 * store singleton em escopo de MÓDULO com TTL + single-flight: a sidebar renderiza
 * os NavGroups DUAS vezes (coluna desktop + drawer mobile) e a Home usa os mesmos
 * dados; sem o single-flight cada consumidor dispararia o próprio fetch. A
 * revalidação no mount/navegação respeita o TTL; ao voltar à janela e a cada
 * intervalo enquanto a aba está visível força uma consulta. Isso inclui ações
 * de OUTROS usuários (uma nova entrega do aluno), que não têm como invalidar o
 * browser do professor. Ações locais continuam chamando refreshProfessorCounts.
 */
export interface ProfessorCounts {
  pendingSubmissions: number | null
  unreadThreads: number | null
  moderationPending: number | null
  openReports: number | null
}

export interface ProfessorOverview {
  counts: ProfessorCounts
  recent: {
    submissions: StudioSubmissionQueueRow[]
    threads: TeacherThreadRow[]
  }
}

const TTL_MS = 60_000
const VISIBLE_REFRESH_MS = 15_000

interface StoreState {
  overview: ProfessorOverview | null
  fetchedAt: number
  /** Plataforma do snapshot — mudou o seletor global → o snapshot é STALE. */
  platform: Platform | null
}

let state: StoreState = { overview: null, fetchedAt: 0, platform: null }
let inflight: Promise<void> | null = null
let queuedRefresh: Promise<void> | null = null
const listeners = new Set<() => void>()

// Trocar de plataforma re-busca NA HORA (o badge da sidebar conta a plataforma
// ativa — Entregas, Recados e Moderação usam a mesma audiência no BFF).
subscribePlatform(() => {
  void ensureProfessorCounts(true)
})

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ProfessorOverview | null {
  return state.overview
}

function getServerSnapshot(): ProfessorOverview | null {
  return null
}

function setState(next: StoreState): void {
  state = next
  for (const listener of listeners) listener()
}

async function fetchOverview(): Promise<void> {
  const platform = getPlatform()
  try {
    const overview = await apiGet<ProfessorOverview>(
      `/api/admin/professor-overview?platform=${platform}`,
    )
    // A plataforma mudou durante o await: o refresh enfileirado publicará o
    // snapshot correto; o antigo nunca pisca na sidebar.
    if (platform !== getPlatform()) return
    setState({ overview, fetchedAt: Date.now(), platform })
  } catch {
    // Best-effort: mantém o snapshot anterior (badge velho > badge sumindo);
    // carimba o fetchedAt p/ não re-tentar em loop a cada navegação.
    if (platform === getPlatform()) setState({ ...state, fetchedAt: Date.now(), platform })
  }
}

/** Revalida se o TTL venceu (single-flight). `force` ignora o TTL (pós-ação). */
export function ensureProfessorCounts(force = false): Promise<void> {
  if (inflight) {
    if (!force) return inflight
    // Um force é uma exigência de NOVA leitura, mesmo na mesma plataforma. Todos
    // os callers compartilham a mesma leitura enfileirada e a aguardam.
    if (!queuedRefresh) {
      const current = inflight
      queuedRefresh = current.then(() => {
        queuedRefresh = null
        return ensureProfessorCounts(true)
      })
    }
    return queuedRefresh
  }
  const fresh = state.platform === getPlatform() && Date.now() - state.fetchedAt < TTL_MS
  if (!force && fresh) return Promise.resolve()
  inflight = fetchOverview().finally(() => {
    inflight = null
  })
  return inflight
}

/** Pós-ação (responder/ler/moderar): re-busca já, sem esperar o TTL. */
export function refreshProfessorCounts(): void {
  void ensureProfessorCounts(true)
}

/** Contadores compartilhados (sidebar + Home). `null` = fonte indisponível/1ª carga. */
export function useProfessorOverview(): ProfessorOverview | null {
  const overview = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const revalidate = useCallback((force = false) => {
    void ensureProfessorCounts(force)
  }, [])
  useEffect(() => {
    revalidate()
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidate(true)
    }
    const onFocus = () => revalidate(true)
    const interval = window.setInterval(onVisible, VISIBLE_REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [revalidate])
  return overview
}
