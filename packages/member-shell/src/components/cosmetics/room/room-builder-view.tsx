'use client'
import {
  Frame,
  LayoutGrid,
  Lightbulb,
  Paintbrush,
  Palette,
  PawPrint,
  Sofa,
  Sprout,
  Sun,
  Trophy,
} from 'lucide-react'
import { cn } from '../../../lib/cn'
import { ZappyCoin } from '../presentation'
import type { MoradaRoomViewProps } from './morada-room-view'
import type { RoomBuilderTab } from './room-builder-model'

export type { RoomBuilderTab, RoomLoadState } from './room-builder-model'

const TABS: { id: RoomBuilderTab; label: string; icon: typeof Sofa }[] = [
  { id: 'moveis', label: 'Móveis', icon: Sofa },
  { id: 'enfeites', label: 'Enfeites', icon: Frame },
  { id: 'trofeus', label: 'Troféus', icon: Trophy },
  { id: 'plantas', label: 'Plantas', icon: Sprout },
  { id: 'luzes', label: 'Luzes', icon: Lightbulb },
  { id: 'piso', label: 'Piso', icon: LayoutGrid },
  { id: 'parede', label: 'Parede', icon: Paintbrush },
  { id: 'clima', label: 'Clima', icon: Sun },
  { id: 'bichinho', label: 'Bichinho', icon: PawPrint },
  { id: 'tema', label: 'Tema', icon: Palette },
]

/** Mesma pele Kids: cabeçalho, pílula de moedas, quarto e bandeja lateral nas medidas aprovadas. */
export function RoomBuilderView(props: MoradaRoomViewProps) {
  return (
    <div className="@container/quarto">
      <div className="flex flex-col gap-4 md:@min-[45rem]/quarto:h-[max(30rem,calc(100dvh-2rem))]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {props.header}
            {props.wallet ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
                <ZappyCoin className="size-4" />{' '}
                {props.wallet.unlimited ? '∞' : props.wallet.balance}
              </span>
            ) : null}
          </div>
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
        </div>
        {props.notice}
        <div className="flex flex-col gap-4 @min-[45rem]/quarto:grid @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:grid-cols-[minmax(0,1fr)_21.25rem] @min-[45rem]/quarto:grid-rows-[minmax(0,1fr)] @min-[62.5rem]/quarto:grid-cols-[minmax(0,1fr)_26.25rem]">
          <div className="contents @min-[45rem]/quarto:flex @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:min-w-0 @min-[45rem]/quarto:flex-col @min-[45rem]/quarto:gap-4">
            <div className="sticky top-16 z-20 w-full rounded-2xl shadow-md md:top-3 @min-[45rem]/quarto:relative @min-[45rem]/quarto:top-auto @min-[45rem]/quarto:min-h-[16rem] @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:shadow-none">
              {props.stage}
              {props.actions}
            </div>
            {props.extras}
            <div
              role="group"
              aria-label="Peças no quarto. Escolha uma e mova com as setas do teclado (R gira, Delete tira)"
              className="flex flex-wrap gap-1.5 @min-[45rem]/quarto:max-h-[6.5rem] @min-[45rem]/quarto:shrink-0 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-0.5"
            >
              {props.pieces}
            </div>
          </div>
          <div className="relative @min-[45rem]/quarto:min-h-[24rem]">
            <section
              aria-label="Itens do quarto"
              className="flex flex-col gap-3 @min-[45rem]/quarto:absolute @min-[45rem]/quarto:inset-0 @min-[45rem]/quarto:rounded-3xl @min-[45rem]/quarto:border-2 @min-[45rem]/quarto:border-border @min-[45rem]/quarto:bg-card @min-[45rem]/quarto:p-4"
            >
              <div className="grid grid-cols-5 gap-1.5">
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
              <div className="@container/bandeja @min-[45rem]/quarto:min-h-0 @min-[45rem]/quarto:flex-1 @min-[45rem]/quarto:overflow-y-auto @min-[45rem]/quarto:p-1 scrollbar-subtle">
                {props.tray}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
