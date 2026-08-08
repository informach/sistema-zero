import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos nós-fantasma da trilha.
const NODE_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5']

/**
 * Esqueleto do detalhe do curso (fallback de Suspense do Next) — casa com o layout:
 * cabeçalho (capa + título/progresso/botão) + trilha de aulas (aproximada por uma
 * coluna de nós circulares). Melhor que a grade genérica do `(app)/loading.tsx`.
 */
export default function CourseLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Carregando…</span>
      {/* Voltar (círculo + rótulo) */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Cabeçalho do curso */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Skeleton className="aspect-video w-full shrink-0 rounded-2xl md:w-80" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-5/6 max-w-md" />
          <div className="mt-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
          <Skeleton className="mt-2 h-10 w-44 rounded-full" />
        </div>
      </div>

      <hr className="sz-divider" />

      {/* Trilha de aulas (coluna de nós) */}
      <div className="flex flex-col items-center gap-5 py-4">
        {NODE_KEYS.map((k) => (
          <Skeleton key={k} className="size-16 rounded-full" />
        ))}
      </div>
    </div>
  )
}
