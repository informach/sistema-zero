import { Card, CardContent } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'

/**
 * Esqueleto da página "Meu perfil" (fallback de Suspense do Next) — casa com o card
 * de identidade (foto + nome + ranking + botão editar), melhor que a grade genérica
 * do `(app)/loading.tsx`. `aria-busy` + sr-only.
 */
export default function ProfileLoading() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <span className="sr-only">Carregando…</span>
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-5">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
