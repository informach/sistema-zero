import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from './kids-band'

// Chaves estáveis dos blocos-fantasma (evita usar o índice do array como key).
const CHANNEL_KEYS = ['c1', 'c2']
const WALL_KEYS = ['w1', 'w2', 'w3']
const THREAD_KEYS = ['t1', 't2', 't3']

/**
 * Esqueleto do espaço (Clube = fórum / Mural = parede). REUTILIZADO nos DOIS pontos de
 * carregamento p/ um ÚNICO tipo de esqueleto: (1) o `loading.tsx` da rota (fallback de
 * Suspense do Next, enquanto o Server Component carrega) e (2) o estado de fetch do
 * `kids-space-view-client`. Idêntico nos dois → a transição é contínua, sem o "pisca"
 * de dois esqueletos diferentes. Markup puro → server-safe (sem 'use client').
 *
 * Imita a página que vem (telas-modelo de 11/09/2026): o cabeçalho no creme (com os
 * filtros no Mural e o herói azul no Clube) e o conteúdo na faixa da porta, para a cor
 * não pular quando os dados chegam.
 */
export function KidsSpaceSkeleton({ isWall }: { isWall: boolean }) {
  return (
    <div aria-busy="true" className="contents">
      <span className="sr-only">Carregando…</span>
      <KidsBand tone="creme">
        <Skeleton className="mb-5 h-13 w-56 rounded-full" />
        <Skeleton className="h-[1.875rem] w-64 rounded-full" />
        {isWall ? (
          <>
            <Skeleton className="mt-3 h-12 w-80 max-w-full" />
            <Skeleton className="mt-3 h-5 w-full max-w-xl" />
            <div className="mt-6 flex gap-2.5">
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-28 rounded-full" />
            </div>
          </>
        ) : (
          <Skeleton className="mt-6 h-36 w-full rounded-[1.75rem]" />
        )}
      </KidsBand>
      <KidsBand tone={isWall ? 'menta' : 'ceu'}>
        {isWall ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {WALL_KEYS.map((k) => (
              <div key={k} className="kids-carta overflow-hidden">
                <Skeleton className="aspect-[2/1] w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-11 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
            <div className="kids-carta space-y-2 p-5 md:p-6">
              <Skeleton className="mb-3 h-3 w-16" />
              {CHANNEL_KEYS.map((k) => (
                <Skeleton key={k} className="h-14 w-full rounded-[0.75rem]" />
              ))}
            </div>
            <div className="kids-carta space-y-3 p-5 md:p-7">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              {THREAD_KEYS.map((k) => (
                <Skeleton key={k} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        )}
      </KidsBand>
    </div>
  )
}
