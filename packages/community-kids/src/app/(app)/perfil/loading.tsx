import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos blocos-fantasma (evita usar o índice do array como key).
const POSTOS = ['p1', 'p2', 'p3']
const CONQUISTAS = ['c1', 'c2', 'c3', 'c4', 'c5']

/**
 * Esqueleto da página "Meu perfil" (fallback de Suspense do Next). Imita a página que vem
 * (telas-modelo de 11/09/2026): o cabeçalho e o herói azul no creme, a carreira no menta
 * e as conquistas no lilás, com as faixas já na cor certa para a tela não "pular".
 */
export default function ProfileLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="creme">
        <Skeleton className="h-[1.875rem] w-36 rounded-full" />
        <Skeleton className="mt-3 h-12 w-64 max-w-full" />
        <Skeleton className="mt-3 h-5 w-72 max-w-full" />
        <Skeleton className="mt-7 h-56 w-full rounded-[1.75rem] md:h-48" />
      </KidsBand>
      <KidsBand tone="menta">
        <div className="pt-3">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="mt-3 h-5 w-full max-w-lg" />
        </div>
        <div className="kids-carta mt-6 space-y-3 p-4 md:p-6">
          {POSTOS.map((k) => (
            <Skeleton key={k} className="h-24 rounded-[1.25rem]" />
          ))}
        </div>
      </KidsBand>
      <KidsBand tone="lilas">
        <div className="pt-3">
          <Skeleton className="h-9 w-60 max-w-full" />
          <Skeleton className="mt-3 h-5 w-72 max-w-full" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {CONQUISTAS.map((k) => (
            <Skeleton key={k} className="h-44 rounded-[1.5rem]" />
          ))}
        </div>
      </KidsBand>
    </div>
  )
}
