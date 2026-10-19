import { Skeleton } from '@sistemazero/ui/skeleton'

// Seções-fantasma do perfil (avatar, dados, cor…).
const SECTION_KEYS = ['s1', 's2', 's3']
const NAV_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5']

/**
 * Esqueleto do "Meu perfil" (fallback de Suspense do Next): a faixa com o retrato, a coluna de
 * atalhos e os cartões das seções. `aria-busy` + sr-only.
 */
export default function ProfileLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <section className="sz-band">
        <div className="sz-page flex items-center gap-6 pt-10 pb-9 md:pt-11 md:pb-10">
          <Skeleton className="size-[4.8rem] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-10 w-56 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
        </div>
      </section>
      <div className="sz-page flex flex-col gap-8 pt-10 pb-16 lg:flex-row lg:items-start">
        <div className="sz-card hidden w-[14rem] flex-none flex-col gap-2 p-3 lg:flex">
          {NAV_KEYS.map((k) => (
            <Skeleton key={k} className="h-11 w-full rounded-[0.6rem]" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {SECTION_KEYS.map((k) => (
            <div key={k} className="sz-card flex flex-col gap-5 p-6 md:p-8">
              <Skeleton className="h-7 w-48" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Skeleton className="h-14 w-full rounded-[0.6rem]" />
                <Skeleton className="h-14 w-full rounded-[0.6rem]" />
              </div>
              <Skeleton className="h-14 w-40 rounded-[0.6rem]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
