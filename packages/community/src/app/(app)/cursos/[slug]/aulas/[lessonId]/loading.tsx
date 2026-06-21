import { Skeleton } from '@sistemazero/ui/skeleton'

// Linhas-fantasma do conteúdo/texto da aula.
const LINE_KEYS = ['l1', 'l2', 'l3', 'l4']

/**
 * Esqueleto do player de aula (fallback de Suspense do Next) — título + bloco
 * principal (vídeo/conteúdo) + texto. `aria-busy` + sr-only.
 */
export default function LessonLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="space-y-3">
        {LINE_KEYS.map((k) => (
          <Skeleton key={k} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
