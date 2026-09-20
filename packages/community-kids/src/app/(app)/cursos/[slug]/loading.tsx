import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'

// Chaves estáveis dos nós-fantasma da trilha.
const NODE_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5']

/** Esqueleto do cabeçalho simples e da trilha de aulas. */
export default function CourseLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="creme" innerClassName="pt-6 pb-2 md:pt-8 md:pb-2">
        <div className="mx-auto flex w-full max-w-[40rem] items-center justify-start gap-4">
          <Skeleton className="h-13 w-40 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-44 max-w-[45%] rounded-lg" />
        </div>
      </KidsBand>
      <KidsBand tone="ceu" innerClassName="pt-8 md:pt-10">
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
