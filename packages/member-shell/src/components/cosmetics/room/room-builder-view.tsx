'use client'
import {
  Armchair,
  Check,
  CloudOff,
  Frame,
  Hammer,
  Lightbulb,
  Loader2,
  Palette,
  PawPrint,
  ShoppingBag,
  Sofa,
  Sprout,
  Sun,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../lib/cn'
import { ZappyCoin } from '../presentation'
import type { MoradaRoomViewProps, RoomPanel } from './morada-room-view'
import type { RoomBuilderTab } from './room-builder-model'

export type { RoomBuilderTab, RoomLoadState } from './room-builder-model'

const TABS: { id: RoomBuilderTab; label: string; icon: typeof Sofa }[] = [
  { id: 'moveis', label: 'Móveis', icon: Sofa },
  { id: 'enfeites', label: 'Enfeites', icon: Frame },
  { id: 'trofeus', label: 'Troféus', icon: Trophy },
  { id: 'plantas', label: 'Plantas', icon: Sprout },
  { id: 'luzes', label: 'Luzes', icon: Lightbulb },
  // Piso e Parede foram para a aba Construir (modo construção, 26/11/2026).
  { id: 'clima', label: 'Clima', icon: Sun },
  { id: 'bichinho', label: 'Bichinho', icon: PawPrint },
  { id: 'tema', label: 'Tema', icon: Palette },
]

const PANELS = [
  { id: 'decorar', label: 'Decorar', icon: ShoppingBag },
  { id: 'construir', label: 'Construir', icon: Hammer },
  { id: 'quarto', label: 'No quarto', icon: Armchair },
] as const

/** O selo do salvar sozinho, no lugar do botão Salvar (o mesmo jeito do avatar). */
function SaveSeal({
  state,
  onRetry,
}: {
  state: NonNullable<MoradaRoomViewProps['saveState']>
  onRetry(): void
}) {
  if (state === 'error')
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-(--sz-hot) px-4 font-bold text-(--sz-hot-fg) text-sm shadow-md"
      >
        <CloudOff className="size-4" aria-hidden="true" /> Não salvou. Tentar de novo
      </button>
    )
  return (
    <span
      role="status"
      className="inline-flex h-11 items-center gap-2 rounded-full bg-(--kids-lime-tint) px-4 font-bold text-sm shadow-md"
    >
      {state === 'saving' ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Salvando…
        </>
      ) : (
        <>
          <Check className="size-4" aria-hidden="true" /> Salvo
        </>
      )}
    </span>
  )
}

/**
 * A tela Kids do quarto (26/11/2026, pedido dela: "a cena do quarto, que é o mais importante,
 * ficou pequenininha"). A partir de 45rem de editor, o quarto ocupa a coluna inteira da esquerda,
 * com o zoom e as paredes por cima dele, e TUDO o que é configuração mora no painel da direita, em
 * duas abas: **Decorar** (as dez categorias e a bandeja) e **No quarto** (as peças que já estão
 * nele e o ajuste da escolhida). A foto do avatar virou um círculo na barra de cima. No celular o
 * quarto gruda no alto e o painel vem embaixo.
 */
export function RoomBuilderView(props: MoradaRoomViewProps) {
  const [localPanel, setLocalPanel] = useState<RoomPanel>('decorar')
  const panel = props.panel ?? localPanel
  const choosePanel = (next: RoomPanel) => {
    setLocalPanel(next)
    props.onPanel?.(next)
  }
  const placed = props.placedCount ?? 0
  return (
    <div className="@container/quarto">
      <div className="flex flex-col gap-3 md:@min-[45rem]/quarto:h-[max(30rem,calc(100dvh-2rem))]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {props.header}
            {props.avatar}
            {props.wallet ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
                <ZappyCoin className="size-4" />{' '}
                {props.wallet.unlimited ? '∞' : props.wallet.balance}
              </span>
            ) : null}
          </div>
          {props.saveState ? (
            <SaveSeal state={props.saveState} onRetry={props.onSave} />
          ) : (
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.saving || !props.ready}
              className={cn(
                'sz-btn-gradient h-11 px-6 text-base',
                (props.saving || !props.ready) && 'opacity-60',
              )}
            >
              {props.saving ? 'Salvando…' : 'Salvar quarto'}
            </button>
          )}
        </div>
        {props.notice}
        <div className="flex flex-col gap-4 @min-[45rem]/quarto:grid @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:grid-cols-[minmax(0,1fr)_21.25rem] @min-[45rem]/quarto:grid-rows-[minmax(0,1fr)] @min-[62.5rem]/quarto:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="sticky top-16 z-20 w-full rounded-2xl shadow-md md:top-3 @min-[45rem]/quarto:relative @min-[45rem]/quarto:top-auto @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:min-w-0 @min-[45rem]/quarto:shadow-none">
            {props.stage}
            {props.actions}
            {props.stack ? (
              <div className="absolute top-16 right-2 z-10 max-h-[calc(100%-8.5rem)] max-w-[min(22rem,calc(100%-1rem))] overflow-y-auto rounded-2xl bg-card shadow-lg">
                {props.stack}
              </div>
            ) : null}
            {props.stageTools}
          </div>
          <div className="relative @min-[45rem]/quarto:min-h-[24rem]">
            <section
              aria-label="Itens do quarto"
              className="flex flex-col gap-3 @min-[45rem]/quarto:absolute @min-[45rem]/quarto:inset-0 @min-[45rem]/quarto:rounded-3xl @min-[45rem]/quarto:border-2 @min-[45rem]/quarto:border-border @min-[45rem]/quarto:bg-card @min-[45rem]/quarto:p-4"
            >
              <div
                role="group"
                aria-label="Partes do painel"
                className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
              >
                {PANELS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={panel === id}
                    onClick={() => choosePanel(id)}
                    className={cn(
                      'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 [font-family:var(--font-display)] font-bold text-sm transition-colors',
                      panel === id
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                    {id === 'quarto' && placed ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs">
                        {placed}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {panel === 'decorar' ? (
                <>
                  <div role="group" aria-label="Categorias" className="grid grid-cols-4 gap-1.5">
                    {TABS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => props.onTab(id)}
                        aria-pressed={props.tab === id}
                        className={cn(
                          'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 font-semibold text-xs transition-colors',
                          props.tab === id ? 'border-primary bg-primary/10' : 'border-border',
                        )}
                      >
                        <Icon className="size-5" />
                        <span className="max-w-full truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                  {/* `relative` (24/11/2026, o mesmo achado do quarto adulto): os `sr-only` dos
                      cartões (" moedas" de cada peça paga, a legenda) são `absolute`; sem um bloco
                      de contenção AQUI eles se posicionavam pela seção de fora, escapavam do recorte
                      da rolagem e esticavam a página (medido: 900px de janela viravam 4817px). */}
                  <div className="@container/bandeja relative @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-1 scrollbar-subtle">
                    {props.tray}
                  </div>
                </>
              ) : panel === 'construir' ? (
                <div className="@container/bandeja relative @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-1 scrollbar-subtle">
                  {props.build}
                </div>
              ) : (
                // `relative` no rolável pelo mesmo motivo da bandeja.
                <div className="relative flex flex-col gap-4 @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-1 scrollbar-subtle">
                  {placed ? (
                    <div
                      role="group"
                      aria-label="Peças no quarto. Escolha uma e mova com as setas do teclado (R gira, Delete tira)"
                      className="flex flex-wrap gap-1.5"
                    >
                      {props.pieces}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Seu quarto ainda está vazio. Escolha peças em Decorar.
                    </p>
                  )}
                  {props.selectedLabel && props.adjust ? (
                    <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                      <h2 className="[font-family:var(--font-display)] font-bold text-base">
                        Ajustar {props.selectedLabel}
                      </h2>
                      {props.adjust}
                    </div>
                  ) : placed ? (
                    <p className="text-muted-foreground text-sm">
                      Toque numa peça, aqui ou no quarto, para mexer nela.
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
