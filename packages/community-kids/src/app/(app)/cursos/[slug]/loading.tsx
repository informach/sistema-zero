import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos nós-fantasma da trilha.
const NODE_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5']

/**
 * Esqueleto do detalhe do curso (fallback de Suspense do Next), no desenho da página que vem
 * (telas-modelo de 11/09/2026): no creme a pílula "← Voltar ao mapa", a capa, o título, a
 * barra e o botão; no azul-claro a trilha de aulas, com a faixa da unidade e os nós.
 */
export default function CourseLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="creme">
        {/* A pílula de voltar com o rótulo (a mesma altura do KidsBackButton com `showLabel`). */}
        <Skeleton className="mb-6 h-13 w-48 rounded-full" />
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Skeleton className="aspect-video w-full shrink-0 rounded-[1.5rem] md:w-80" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-5/6 max-w-md" />
            <Skeleton className="mt-2 h-3 w-full max-w-md rounded-full" />
            <Skeleton className="mt-2 h-12 w-48 rounded-full" />
          </div>
        </div>
      </KidsBand>
      <KidsBand tone="ceu">
        <div className="flex flex-col items-center gap-5 py-2">
          <Skeleton className="h-16 w-full max-w-md rounded-[1.5rem]" />
          {NODE_KEYS.map((k) => (
            <Skeleton key={k} className="size-16 rounded-full" />
          ))}
        </div>
      </KidsBand>
    </div>
  )
}
