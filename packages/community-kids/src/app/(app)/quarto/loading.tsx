import { Skeleton } from '@sistemazero/ui/skeleton'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsMascot } from '@/components/kids/mascot'
import { QUARTO_FAIXA, QuartoHeader } from './quarto-header'

// Chaves estáveis dos placeholders (evita usar o índice do array como key).
const PIECE_KEYS = ['p1', 'p2', 'p3']
const CATEGORY_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5']
const ITEM_KEYS = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']

/**
 * Esqueleto do "Meu quarto": fallback de Suspense do Next enquanto o Server Component
 * busca o avatar (`getAvatarReadonly`). Espelha a página REAL: a MESMA barra de cima (a seta e
 * o título, as moedas e o salvar) e a cena `aspect-[3/2]` + a faixa de peças + a grade de itens. O placeholder da cena é o MESMO que o `RoomBuilder` mostra enquanto a cena
 * 3D (three.js) carrega: a transição esqueleto → quarto é contínua, sem salto.
 *
 * ⚠️ A faixa usa a MESMA `QUARTO_FAIXA` da página (largura toda, respiro curto): com outra, a
 * página saltaria de largura e de altura no primeiro quadro em que os dados chegam.
 */
export default function QuartoLoading() {
  return (
    <div aria-busy="true" className="contents">
      <span role="status" className="sr-only">
        Carregando…
      </span>
      <KidsBand tone="lilas" innerClassName={QUARTO_FAIXA}>
        {/* As MESMAS réguas do editor (`room-builder-view.tsx` do member-shell): no celular tudo
            empilhado; ao lado, a altura da janela, o quarto enchendo a esquerda e o painel à
            direita. Sem isso a página saltaria quando os dados chegam. */}
        <div className="@container/quarto">
          <div className="flex flex-col gap-4 md:@min-[45rem]/quarto:h-[max(30rem,calc(100dvh-2rem))]">
            {/* A barra de cima: seta e título, moedas (esquerda) + salvar (direita) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <QuartoHeader />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
            <div className="flex flex-col gap-4 @min-[45rem]/quarto:grid @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:grid-cols-[minmax(0,1fr)_21.25rem] @min-[45rem]/quarto:grid-rows-[minmax(0,1fr)] @min-[62.5rem]/quarto:grid-cols-[minmax(0,1fr)_26.25rem]">
              <div className="flex min-h-0 min-w-0 flex-col gap-4">
                {/* Cena: mesmo placeholder do RoomBuilder enquanto a cena 3D carrega */}
                <div className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-border bg-muted @min-[45rem]/quarto:aspect-auto @min-[45rem]/quarto:min-h-[16rem] @min-[45rem]/quarto:flex-1">
                  <KidsMascot expression="thinking" className="size-20" />
                </div>
                {/* Faixa de peças posicionadas */}
                <div className="flex flex-wrap gap-1.5">
                  {PIECE_KEYS.map((key) => (
                    <Skeleton key={key} className="h-9 w-24 rounded-full" />
                  ))}
                </div>
              </div>
              {/* O painel dos itens: as abas e a grade */}
              <div className="flex flex-col gap-3 @min-[45rem]/quarto:min-h-[24rem] @min-[45rem]/quarto:rounded-3xl @min-[45rem]/quarto:border-2 @min-[45rem]/quarto:border-border @min-[45rem]/quarto:bg-card @min-[45rem]/quarto:p-4">
                <div className="grid grid-cols-5 gap-1.5">
                  {CATEGORY_KEYS.map((key) => (
                    <Skeleton key={key} className="h-16 rounded-2xl" />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ITEM_KEYS.map((key) => (
                    <Skeleton key={key} className="aspect-square w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </KidsBand>
    </div>
  )
}
