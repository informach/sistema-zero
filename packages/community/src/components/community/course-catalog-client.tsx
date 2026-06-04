'use client'

import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CatalogCourseView } from '@/lib/types'
import { useCatalogFilters } from '@/lib/use-catalog-filters'
import { CatalogCourseCard } from './catalog-course-card'
import { CatalogFilterBar } from './catalog-filter-bar'

interface Props {
  courses: CatalogCourseView[]
  /** Fallback da página de vendas (env FUNNEL_URL), resolvido no server. */
  fallbackSalesUrl: string | null
}

/** Grid do catálogo com busca/filtros persistidos na URL (`?q=&acesso=&ordem=`). */
export function CourseCatalogClient({ courses, fallbackSalesUrl }: Props) {
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border border-dashed px-6 py-16 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum curso encontrado com esses filtros.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CatalogCourseCard
              key={course.courseSlug}
              course={course}
              salesUrl={course.salesPageUrl ?? fallbackSalesUrl}
            />
          ))}
        </div>
      )}
    </section>
  )
}
