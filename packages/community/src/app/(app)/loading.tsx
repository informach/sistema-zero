import { Skeleton } from '@sistemazero/ui/skeleton'

// Chaves estáveis dos cards-fantasma (evita usar o índice do array como key).
const CARD_KEYS = ['s1', 's2', 's3']

/**
 * Esqueleto de carregamento das páginas da área do aluno — fallback de Suspense do Next (aparece
 * enquanto o Server Component busca os dados). Na forma das páginas adultas (direção de arte de
 * 18/10/2026): a faixa do topo de ponta a ponta e a grade de cartões dentro da largura da página.
 * `aria-busy` + aviso sr-only.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <div className="sz-band">
        <div className="sz-page flex flex-col gap-3 pt-10 pb-9 md:pt-12 md:pb-11">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-11 w-96 max-w-full" />
          <Skeleton className="h-6 w-[28rem] max-w-full" />
        </div>
      </div>
      <div className="sz-page grid gap-5 pt-10 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <div key={key} className="sz-card-sm overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
