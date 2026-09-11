import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsMascot } from '@/components/kids/mascot'
import { QuartoHeader } from './quarto-header'

// Chaves estáveis dos placeholders (evita usar o índice do array como key).
const PIECE_KEYS = ['p1', 'p2', 'p3']
const CATEGORY_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5']
const ITEM_KEYS = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']

/**
 * Esqueleto do "Meu quarto": fallback de Suspense do Next enquanto o Server Component
 * busca o avatar (`getAvatarReadonly`). Espelha a página REAL: o MESMO cabeçalho no creme
 * (com a seta) e, no lilás, a cena `aspect-[3/2]` + a faixa de peças + moeda/salvar + a
 * grade de itens. O placeholder da cena é o MESMO que o `RoomBuilder` mostra enquanto a cena
 * 3D (three.js) carrega: a transição esqueleto → quarto é contínua, sem salto.
 */
export default function QuartoLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="creme">
        <QuartoHeader />
      </KidsBand>
      <KidsBand tone="lilas">
        <div className="flex w-full flex-col gap-4">
          {/* Cena: mesmo placeholder do RoomBuilder enquanto a cena 3D carrega */}
          <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted">
            <KidsMascot expression="thinking" className="size-20" />
          </div>
          {/* Faixa de peças posicionadas */}
          <div className="flex flex-wrap gap-1.5">
            {PIECE_KEYS.map((key) => (
              <Skeleton key={key} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          {/* Moeda (esquerda) + botão salvar (direita) */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
          {/* Abas de categorias (rolagem horizontal) */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {CATEGORY_KEYS.map((key) => (
              <Skeleton key={key} className="size-16 shrink-0 rounded-2xl" />
            ))}
          </div>
          {/* Grade de itens do catálogo */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ITEM_KEYS.map((key) => (
              <Skeleton key={key} className="aspect-square w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </KidsBand>
    </div>
  )
}
