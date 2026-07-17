'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyCatalogSort, type CatalogSort } from './catalog-sort'
import { COURSE_TIERS, type CourseTierSlug, courseTierOf } from './course-tier'
import type { CatalogCourseView } from './types'

export type CatalogAccessFilter = 'todos' | 'liberados' | 'bloqueados'
/** Ordenação do catálogo — tipo/aplicação no helper PURO `catalog-sort.ts` (testado). */
export type { CatalogSort } from './catalog-sort'
/**
 * Filtro por DEGRAU do curso (`todos` = sem filtro). Reforma 2D/3D: os 6 degraus
 * (`iniciante-2d` … `avancado-3d`); valor legado da escala de 3 numa URL
 * compartilhada antiga cai em `todos`.
 */
export type CatalogLevelFilter = 'todos' | CourseTierSlug

export interface CatalogFilters {
  q: string
  acesso: CatalogAccessFilter
  nivel: CatalogLevelFilter
  ordem: CatalogSort
}

const DEFAULTS: CatalogFilters = { q: '', acesso: 'todos', nivel: 'todos', ordem: 'antigos' }

/** Atraso do espelho da busca na URL — digitação contínua só navega ao parar. */
const Q_DEBOUNCE_MS = 350

function parseAccess(v: string | null): CatalogAccessFilter {
  return v === 'liberados' || v === 'bloqueados' ? v : 'todos'
}

function parseSort(v: string | null): CatalogSort {
  // `padrao` (legado em URL compartilhada antiga) cai no default novo (`antigos`).
  return v === 'az' || v === 'za' || v === 'recentes' || v === 'antigos' ? v : 'antigos'
}

function parseLevel(v: string | null): CatalogLevelFilter {
  return (COURSE_TIERS as readonly string[]).includes(v ?? '') ? (v as CourseTierSlug) : 'todos'
}

/**
 * Filtros do catálogo "Todos os cursos", persistidos na URL (`?q=&acesso=&ordem=`)
 * — sobrevivem a reload/compartilhamento. Filtragem é client-side sobre a lista
 * já carregada (o catálogo inteiro cabe em memória). Padrão do legado
 * comunidade-sistema-zero (`use-filter-catalog`), reduzido ao contrato atual.
 *
 * ⚠️ A busca `q` é ESTADO LOCAL (filtra/digita instantâneo) e só ESPELHA na URL
 * com debounce. Antes, cada tecla fazia `router.replace` numa rota `force-dynamic`,
 * disparando um re-fetch do catálogo inteiro no gateway + re-stream do RSC a cada
 * caractere — desperdício de banda/CPU sem ganho visível (a lista já filtra local),
 * doloroso no tablet da criança em conexão fraca. `acesso`/`ordem` (Select, não
 * por tecla) seguem escrevendo na URL na hora.
 */
export function useCatalogFilters(courses: CatalogCourseView[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Espelha um filtro na URL (lê os params ATUAIS no momento da escrita p/ o write
  // de `q` com debounce não pisar numa mudança de acesso/ordem feita no meio).
  const writeUrl = useCallback(
    (name: keyof CatalogFilters, value: string) => {
      const params = new URLSearchParams(window.location.search)
      if (!value || value === DEFAULTS[name]) params.delete(name)
      else params.set(name, value)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname],
  )

  const setFilter = useCallback(
    (name: keyof CatalogFilters, value: string) => {
      if (name === 'q') {
        setQ(value) // filtra na hora (estado local)
        if (qTimer.current) clearTimeout(qTimer.current)
        qTimer.current = setTimeout(() => writeUrl('q', value), Q_DEBOUNCE_MS)
        return
      }
      writeUrl(name, value)
    },
    [writeUrl],
  )

  // Cancela o espelho pendente ao desmontar (evita navegação após sair da tela).
  useEffect(
    () => () => {
      if (qTimer.current) clearTimeout(qTimer.current)
    },
    [],
  )

  const clearFilters = useCallback(() => {
    if (qTimer.current) clearTimeout(qTimer.current)
    setQ('')
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const filters: CatalogFilters = {
    q,
    acesso: parseAccess(searchParams.get('acesso')),
    nivel: parseLevel(searchParams.get('nivel')),
    ordem: parseSort(searchParams.get('ordem')),
  }

  const hasActiveFilters =
    filters.q !== DEFAULTS.q ||
    filters.acesso !== DEFAULTS.acesso ||
    filters.nivel !== DEFAULTS.nivel ||
    filters.ordem !== DEFAULTS.ordem

  const filtered = useMemo(() => {
    let list = courses
    const query = filters.q.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(query) || (c.subtitle ?? '').toLowerCase().includes(query),
      )
    }
    if (filters.acesso === 'liberados') list = list.filter((c) => c.hasAccess)
    if (filters.acesso === 'bloqueados') list = list.filter((c) => !c.hasAccess)
    if (filters.nivel !== 'todos')
      list = list.filter((c) => courseTierOf(c.level, c.track) === filters.nivel)
    return applyCatalogSort(list, filters.ordem)
  }, [courses, filters.q, filters.acesso, filters.nivel, filters.ordem])

  return { filters, filtered, setFilter, clearFilters, hasActiveFilters }
}
