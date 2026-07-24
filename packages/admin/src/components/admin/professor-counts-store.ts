'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { apiGet } from '@/lib/api'
import type { StudioSubmissionQueueRow, TeacherThreadRow } from '@/lib/types'

/**
 * Contadores de pendências da Sala do Professor (badges da sidebar + Home) —
 * store singleton em escopo de MÓDULO com TTL + single-flight: a sidebar renderiza
 * os NavGroups DUAS vezes (coluna desktop + drawer mobile) e a Home usa os mesmos
 * dados; sem o single-flight cada consumidor dispararia o próprio fetch. Sem
 * polling em background: revalida no mount, ao voltar à aba (visibilitychange) e
 * na navegação — no-op dentro do TTL. Ações que mudam pendências (responder,
 * marcar lida, moderar, fechar o viewer) chamam `refreshProfessorCounts()` p/ o
 * badge não ficar 60s defasado depois do PRÓPRIO professor agir.
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
  const revalidate = useCallback(() => {
    void ensureProfessorCounts()
  }, [])
  useEffect(() => {
    revalidate()
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [revalidate])
  return overview
}
