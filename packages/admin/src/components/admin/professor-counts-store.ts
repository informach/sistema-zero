'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { apiGet } from '@/lib/api'
import type { StudioSubmissionQueueRow, TeacherThreadRow } from '@/lib/types'

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
}

let state: StoreState = { overview: null, fetchedAt: 0 }
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

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
  try {
    const overview = await apiGet<ProfessorOverview>('/api/admin/professor-overview')
    setState({ overview, fetchedAt: Date.now() })
  } catch {
    // Best-effort: mantém o snapshot anterior (badge velho > badge sumindo);
    // carimba o fetchedAt p/ não re-tentar em loop a cada navegação.
    setState({ ...state, fetchedAt: Date.now() })
  }
}

/** Revalida se o TTL venceu (single-flight). `force` ignora o TTL (pós-ação). */
export function ensureProfessorCounts(force = false): Promise<void> {
  if (inflight) return inflight
  if (!force && Date.now() - state.fetchedAt < TTL_MS) return Promise.resolve()
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
