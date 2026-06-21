import { Card, CardContent } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'

// Campos-fantasma do formulário (nome/telefone/…).
const FIELD_KEYS = ['f1', 'f2', 'f3']

/**
 * Esqueleto do "Meu perfil" (fallback de Suspense do Next) — casa com o card de
 * foto + formulário (nome/telefone) + botão. `aria-busy` + sr-only.
 */
export default function ProfileLoading() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <span className="sr-only">Carregando…</span>
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          {FIELD_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-32 self-start rounded-md" />
        </CardContent>
      </Card>
    </div>
  )
}
