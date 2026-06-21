import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos blocos-fantasma (evita usar o índice do array como key).
const CHANNEL_KEYS = ['c1', 'c2', 'c3', 'c4']
const WALL_KEYS = ['w1', 'w2', 'w3', 'w4']
const THREAD_KEYS = ['t1', 't2', 't3', 't4', 't5']

/**
 * Esqueleto do espaço (Clube = fórum / Mural = parede). REUTILIZADO nos DOIS pontos de
 * carregamento p/ um ÚNICO tipo de esqueleto: (1) o `loading.tsx` da rota (fallback de
 * Suspense do Next, enquanto o Server Component carrega) e (2) o estado de fetch do
 * `kids-space-view-client`. Idêntico nos dois → a transição é contínua, sem o "pisca"
 * de dois esqueletos diferentes (antes o genérico `(app)/loading.tsx` — grade de cards
 * de curso — aparecia primeiro, depois este). Markup puro → server-safe (sem 'use client').
 */
export function KidsSpaceSkeleton({ isWall }: { isWall: boolean }) {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-4xl px-4 py-6">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-4 h-4 w-64 max-w-full" />
      <div className={`grid gap-4 ${isWall ? '' : 'md:grid-cols-[200px_1fr]'}`}>
        {!isWall ? (
          <aside className="flex gap-2 overflow-x-auto md:flex-col md:gap-1.5">
            {CHANNEL_KEYS.map((k) => (
              <Skeleton key={k} className="h-10 w-32 shrink-0 rounded-2xl md:w-full" />
            ))}
          </aside>
        ) : null}
        <main className="min-w-0">
          {isWall ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {WALL_KEYS.map((k) => (
                <div key={k} className="overflow-hidden rounded-2xl border-2 border-border">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {THREAD_KEYS.map((k) => (
                <div key={k} className="space-y-2 rounded-2xl border-2 border-border p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
