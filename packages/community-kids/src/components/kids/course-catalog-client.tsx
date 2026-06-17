'use client'

import { Button } from '@sistemazero/ui/button'
import type { CatalogCourseView } from '@/lib/types'
import { useCatalogFilters } from '@/lib/use-catalog-filters'
import { CatalogCourseCard } from './catalog-course-card'
import { CatalogFilterBar } from './catalog-filter-bar'
import { KidsMascot } from './mascot'
import { unitThemeAt } from './unit-theme'

interface Props {
  courses: CatalogCourseView[]
}

/** Grid do catálogo com busca/filtros persistidos na URL (`?q=&acesso=&ordem=`). */
export function CourseCatalogClient({ courses }: Props) {
  const { filters, filtered, setFilter, clearFilters, hasActiveFilters } =
    useCatalogFilters(courses)

  return (
    <section className="flex flex-col gap-5">
      <CatalogFilterBar
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed px-6 py-16 text-center">
          <KidsMascot expression="thinking" className="size-16" />
          <p className="text-muted-foreground text-sm">
            Nenhum curso encontrado com esses filtros.
          </p>
          <Button variant="outline" onClick={clearFilters} className="rounded-full">
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, i) => (
            <CatalogCourseCard
              key={course.courseSlug}
              course={course}
              salesUrl={course.salesPageUrl}
              theme={unitThemeAt(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
