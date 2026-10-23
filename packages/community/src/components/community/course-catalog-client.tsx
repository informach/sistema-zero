'use client'

import { SearchX } from 'lucide-react'
import { lockedCourseLink } from '@/lib/continuity'
import type { CatalogCourseView, CourseProgress } from '@/lib/types'
import { useCatalogFilters } from '@/lib/use-catalog-filters'
import { CatalogCourseCard } from './catalog-course-card'
import { CatalogFilterBar } from './catalog-filter-bar'

interface Props {
  courses: CatalogCourseView[]
  /** Aulas feitas por curso, de Meus cursos (a barra do cartão). */
  progressBySlug: Record<string, CourseProgress>
}

/**
 * "Todos os cursos" (direção de arte de 18/10/2026): título com a contagem, a barra de filtros e a
 * grade de cartões deitados. Busca e filtros persistidos na URL (`?q=&acesso=&ordem=`).
 */
export function CourseCatalogClient({ courses, progressBySlug }: Props) {
  const { filters, filtered, setFilter, clearFilters, hasActiveFilters } =
    useCatalogFilters(courses)
  const count = hasActiveFilters
    ? `${filtered.length} de ${courses.length} ${courses.length === 1 ? 'curso' : 'cursos'}`
    : `${courses.length} ${courses.length === 1 ? 'curso' : 'cursos'}`

  return (
    <section aria-labelledby="todos-os-cursos" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="todos-os-cursos" className="sz-h2">
          Todos os cursos
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-live="polite" className="text-[0.85rem] text-muted-foreground">
            {count}
          </span>
          {hasActiveFilters && filtered.length > 0 ? (
            <button type="button" onClick={clearFilters} className="sz-btn-quiet sz-btn-sm">
              Limpar filtros
            </button>
          ) : null}
        </div>
      </div>
      <CatalogFilterBar filters={filters} onChange={setFilter} />
      {filtered.length === 0 ? (
        <div className="sz-card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <SearchX className="size-9 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">Nenhum curso encontrado com esses filtros.</p>
          <button type="button" onClick={clearFilters} className="sz-btn-outline sz-btn-sm">
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {filtered.map((course) => (
            <li key={course.courseSlug}>
              <CatalogCourseCard
                course={course}
                progress={progressBySlug[course.courseSlug] ?? null}
                locked={lockedCourseLink(course.salesPageUrl)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
