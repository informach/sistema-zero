import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos módulos/aulas-fantasma.
const MODULE_KEYS = ['m1', 'm2']
const LESSON_KEYS = ['a', 'b', 'c']

/**
 * Esqueleto do curso (fallback de Suspense do Next), na forma da página (direção de arte de
 * 18/10/2026): a faixa com a capa, o título, o progresso e o botão; os módulos como cartões e a
 * coluna de apoio ao lado. `aria-busy` + sr-only.
 */
export default function CourseLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <div className="sz-band">
        <div className="sz-page flex flex-col gap-5 pt-7 pb-9 md:pb-12">
          <Skeleton className="h-6 w-40" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
            <Skeleton className="aspect-video w-full rounded-[1rem] lg:w-[26rem] lg:flex-none" />
            <div className="flex flex-1 flex-col gap-3.5">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-11 w-3/4" />
              <Skeleton className="h-6 w-full max-w-lg" />
              <Skeleton className="mt-1 h-3 w-full max-w-[28rem] rounded-full" />
              <Skeleton className="mt-2 h-[2.8rem] w-64 rounded-[0.6rem]" />
            </div>
          </div>
        </div>
      </div>
      <div className="sz-page flex flex-col items-start gap-8 pt-10 pb-16 lg:flex-row">
        <div className="flex w-full flex-1 flex-col gap-6">
          <Skeleton className="h-8 w-32" />
          {MODULE_KEYS.map((m) => (
            <div key={m} className="sz-card overflow-hidden">
              <div className="flex flex-col gap-2 border-border border-b bg-background p-6">
                <Skeleton className="h-6 w-60" />
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
              <ul>
                {LESSON_KEYS.map((l) => (
                  <li
                    key={l}
                    className="flex items-center gap-4 border-border border-b px-6 py-4 last:border-b-0"
                  >
                    <Skeleton className="size-[2.2rem] shrink-0 rounded-[0.6rem]" />
                    <Skeleton className="h-5 w-full max-w-xs" />
                    <Skeleton className="ml-auto h-5 w-16" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex w-full flex-col gap-5 lg:w-[19rem] lg:flex-none">
          <div className="sz-card flex flex-col gap-3 p-7">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
