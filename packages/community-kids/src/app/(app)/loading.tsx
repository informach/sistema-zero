import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos cartões-fantasma (evita usar o índice do array como key).
const CARD_KEYS = ['s1', 's2', 's3', 's4']

/**
 * Esqueleto das páginas do app kids que não têm um próprio (Início, Criar, Comunidade,
 * Carreira, Trilha, Recados...): fallback de Suspense do Next enquanto o Server Component
 * busca os dados, no lugar de um "Carregando…" solto.
 *
 * Imita a régua das telas-modelo (11/09/2026), que todas elas seguem: o cabeçalho (chip,
 * título e frase) com o bloco do herói no creme, uma faixa de cartões e o cartão de
 * fechamento no lilás. As faixas já chegam na cor certa, para a tela não piscar branca nem
 * "pular" quando a página real chega. A sidebar e a top bar do layout ficam fixas.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="creme">
        <Skeleton className="h-[1.875rem] w-40 rounded-full" />
        <Skeleton className="mt-3 h-12 w-72 max-w-full" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />
        <Skeleton className="mt-7 h-44 w-full rounded-[1.75rem] md:h-40" />
      </KidsBand>
      <KidsBand tone="menta">
        <div className="pt-3">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="mt-3 h-5 w-80 max-w-full" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARD_KEYS.map((key) => (
            <Skeleton key={key} className="h-52 rounded-[1.5rem]" />
          ))}
        </div>
      </KidsBand>
      <KidsBand tone="lilas">
        <Skeleton className="h-28 w-full rounded-[1.5rem]" />
      </KidsBand>
    </div>
  )
}
