import { Card } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos módulos/aulas-fantasma.
const MODULE_KEYS = ['m1', 'm2']
const LESSON_KEYS = ['a', 'b', 'c']

/**
 * Esqueleto do detalhe do curso (fallback de Suspense do Next) — casa com o layout:
 * cabeçalho (capa + título/progresso/botão) + lista de módulos com aulas. Melhor
 * que a grade genérica do `(app)/loading.tsx`. `aria-busy` + sr-only.
 */
export default function CourseLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Carregando…</span>
      {/* Cabeçalho do curso */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Skeleton className="aspect-video w-full shrink-0 rounded-lg md:w-80" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="mt-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
          <Skeleton className="mt-2 h-10 w-44 rounded-md" />
        </div>
      </div>

      <hr className="sz-divider" />

      {/* Módulos e aulas */}
      <div className="flex flex-col gap-6">
        {MODULE_KEYS.map((m) => (
          <Card key={m} className="overflow-hidden p-0">
            <div className="border-border border-b bg-muted/40 px-5 py-3">
              <Skeleton className="h-4 w-48" />
            </div>
            <ul>
              {LESSON_KEYS.map((l) => (
                <li
                  key={l}
                  className="flex items-center gap-3 border-border border-b px-5 py-3 last:border-b-0"
                >
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-full max-w-xs" />
                  <Skeleton className="h-3 w-12" />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
