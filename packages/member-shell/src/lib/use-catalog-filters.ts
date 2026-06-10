'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { CatalogCourseView } from './types'

export type CatalogAccessFilter = 'todos' | 'liberados' | 'bloqueados'
export type CatalogSort = 'padrao' | 'az' | 'za'

export interface CatalogFilters {
  q: string
  acesso: CatalogAccessFilter
  ordem: CatalogSort
}

const DEFAULTS: CatalogFilters = { q: '', acesso: 'todos', ordem: 'padrao' }

function parseAccess(v: string | null): CatalogAccessFilter {
  return v === 'liberados' || v === 'bloqueados' ? v : 'todos'
}

function parseSort(v: string | null): CatalogSort {
  return v === 'az' || v === 'za' ? v : 'padrao'
}

/**
 * Filtros do catálogo "Todos os cursos", persistidos na URL (`?q=&acesso=&ordem=`)
 * — sobrevivem a reload/compartilhamento. Filtragem é client-side sobre a lista
 * já carregada (o catálogo inteiro cabe em memória). Padrão do legado
 * comunidade-sistema-zero (`use-filter-catalog`), reduzido ao contrato atual.
 */
export function useCatalogFilters(courses: CatalogCourseView[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: CatalogFilters = {
    q: searchParams.get('q') ?? '',
    acesso: parseAccess(searchParams.get('acesso')),
    ordem: parseSort(searchParams.get('ordem')),
  }

  const setFilter = useCallback(
    (name: keyof CatalogFilters, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === DEFAULTS[name]) params.delete(name)
      else params.set(name, value)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const hasActiveFilters =
    filters.q !== DEFAULTS.q ||
    filters.acesso !== DEFAULTS.acesso ||
    filters.ordem !== DEFAULTS.ordem

  const filtered = useMemo(() => {
    let list = courses
    const q = filters.q.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || (c.subtitle ?? '').toLowerCase().includes(q),
      )
    }
    if (filters.acesso === 'liberados') list = list.filter((c) => c.hasAccess)
    if (filters.acesso === 'bloqueados') list = list.filter((c) => !c.hasAccess)
    if (filters.ordem === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    if (filters.ordem === 'za') list = [...list].sort((a, b) => b.title.localeCompare(a.title))
    return list
  }, [courses, filters.q, filters.acesso, filters.ordem])

  return { filters, filtered, setFilter, clearFilters, hasActiveFilters }
}
