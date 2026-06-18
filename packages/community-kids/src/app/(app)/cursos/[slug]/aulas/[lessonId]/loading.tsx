import { Skeleton } from '@sistemazero/ui/skeleton'

// Linhas-fantasma do enunciado/texto da aula.
const LINE_KEYS = ['l1', 'l2', 'l3']

/**
 * Esqueleto do player de aula (fallback de Suspense do Next) — casa com o header da
 * lição (voltar em círculo + barra de progresso + chip "AULA N DE M") e o bloco
 * principal (vídeo/atividade) + texto. `aria-busy` + sr-only.
 */
export default function LessonLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Carregando…</span>
      {/* Header da lição */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="h-2.5 flex-1 rounded-full" />
        <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
      </div>
      {/* Bloco principal (vídeo/atividade) */}
      <Skeleton className="aspect-video w-full rounded-2xl" />
      {/* Texto/enunciado */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        {LINE_KEYS.map((k) => (
          <Skeleton key={k} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}
