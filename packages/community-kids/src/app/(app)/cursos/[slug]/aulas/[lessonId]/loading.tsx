import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos blocos-fantasma.
const LINE_KEYS = ['l1', 'l2', 'l3']
const OUTLINE_KEYS = ['o1', 'o2', 'o3', 'o4', 'o5']

/**
 * Esqueleto do player de aula (fallback de Suspense do Next), no desenho da aula (telas-modelo
 * de 11/09/2026): a barra de cima num cartão branco (o voltar, a barra e o número), o chip
 * "AULA N DE M" e o título, os blocos em cartões brancos e, no computador, o índice da aula
 * num cartão à direita. O fundo azul-claro é o do `<main>` da aula (`kids-aula`).
 */
export default function LessonLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-(--borda-carta) bg-card px-3 py-2.5 md:gap-4 md:px-4">
          {/* size-11 = o tamanho REAL do KidsBackButton (senão a barra pula ao carregar). */}
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <Skeleton className="h-2.5 flex-1 rounded-full" />
          <Skeleton className="h-5 w-10 shrink-0" />
        </div>
        <div className="mb-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="mt-3 h-10 w-2/3" />
        </div>
        <div className="kids-carta flex flex-col gap-4 p-5 md:p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
        </div>
        <div className="kids-carta space-y-3 p-5 md:p-6">
          <Skeleton className="h-6 w-1/2" />
          {LINE_KEYS.map((k) => (
            <Skeleton key={k} className="h-4 w-full" />
          ))}
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
      <div className="kids-carta hidden w-72 shrink-0 space-y-3 p-5 lg:block">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11 w-full rounded-full" />
        {OUTLINE_KEYS.map((k) => (
          <Skeleton key={k} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
