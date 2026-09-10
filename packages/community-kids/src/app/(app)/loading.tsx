import { Card } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos cards-fantasma (evita usar o índice do array como key).
const CARD_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6']

/**
 * Esqueleto de carregamento das páginas do app kids — fallback de Suspense do Next
 * (aparece na navegação/carga enquanto o Server Component busca os dados), no lugar
 * de um "Carregando…" solto. Formato genérico: título + grade de cards (cobre
 * home/cursos/comunidade); some assim que o conteúdo real chega. A sidebar/top bar
 * do layout ficam fixas. Acessibilidade: região `aria-busy` + aviso sr-only.
 */
export default function AppLoading() {
  return (
    // A cor da faixa entra JÁ no esqueleto: sem ela a tela pisca branca antes de
    // a página real chegar com o creme, e o salto é bem visível.
    <KidsBand tone="creme" innerClassName="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <span aria-busy="true" className="sr-only">
        Carregando…
      </span>
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {/* Grade de cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <Card key={key} className="overflow-hidden p-0">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </KidsBand>
  )
}
