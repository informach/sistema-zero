import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos blocos-fantasma (evita usar o índice do array como key).
const LINHAS = ['l1', 'l2', 'l3', 'l4']
const CARTOES = ['c1', 'c2', 'c3']

/**
 * O esqueleto imita a página que vai chegar (telas-modelo de 11/09/2026): o cabeçalho
 * com a seta e as abas no creme, o cartão do pódio com as linhas no menta e os cartões
 * de XP no lilás. As faixas já vêm na cor certa: sem elas a tela piscava branca até a
 * página real, e o salto de cor é bem visível.
 */
export default function RankingLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando ranking…
      </span>
      <KidsBand tone="creme">
        <Skeleton className="mb-5 h-13 w-56 rounded-full" />
        <Skeleton className="h-[1.875rem] w-52 rounded-full" />
        <Skeleton className="mt-3 h-12 w-96 max-w-full" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <Skeleton className="mt-7 h-14 w-full rounded-full sm:w-[22rem]" />
      </KidsBand>
      <KidsBand tone="menta">
        <div className="kids-carta rounded-[2rem] px-4 py-6 md:p-8">
          <div className="grid grid-cols-3 items-end gap-2 md:gap-5">
            <Skeleton className="h-44 rounded-t-[1.5rem] rounded-b-none md:h-60" />
            <Skeleton className="h-52 rounded-t-[1.5rem] rounded-b-none md:h-72" />
            <Skeleton className="h-40 rounded-t-[1.5rem] rounded-b-none md:h-56" />
          </div>
          <div className="mt-7 space-y-2 border-border border-t pt-7">
            {LINHAS.map((k) => (
              <Skeleton key={k} className="h-[3.75rem] rounded-2xl" />
            ))}
          </div>
        </div>
      </KidsBand>
      <KidsBand tone="lilas">
        <div className="pt-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARTOES.map((k) => (
              <Skeleton key={k} className="h-32 rounded-[1.5rem]" />
            ))}
          </div>
        </div>
      </KidsBand>
    </div>
  )
}
