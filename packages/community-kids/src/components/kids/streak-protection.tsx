'use client'

import { Palmtree, Shield, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { STREAK_FREEZE_PRICE } from '@/lib/gamification-prices'
import { ZappyCoin } from './zappy-coin'

/** A pílula miúda da fileira de baixo (protetores, férias). */
const CHIP =
  'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 font-bold text-[0.8125rem] any-pointer-coarse:min-h-11'

/**
 * Proteção da sequência (ético/guilt-free): protetores de streak (1 grátis/mês +
 * compráveis) + modo férias. Copy GENTIL — nunca culpa a criança por faltar. Recebe o
 * estado atual da gamificação; as mutações chamam o BFF e dão `router.refresh()`.
 *
 * Desenho das telas-modelo (11/09/2026): um cartão branco só, com o escudo num ladrilho
 * creme à esquerda, o texto, a fileira de pílulas (quantos protetores, o modo férias em
 * menta) e o "Comprar" em pílula azul à direita.
 */
export function StreakProtection({
  freezesAvailable,
  onVacation,
  vacationUntil,
  className,
}: {
  freezesAvailable: number
  onVacation: boolean
  vacationUntil: string | null
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Início depois do fim: o servidor recusa (toast genérico), mas é melhor barrar
  // ANTES p/ a criança — compara `YYYY-MM-DD` como texto (ordenação lexicográfica OK).
  const invalidRange = Boolean(from && to && from > to)

  async function buyFreeze() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/members/gamification/streak-freeze/buy', { method: 'POST' })
      if (res.status === 402) {
        toast.error(`Você ainda não tem ${STREAK_FREEZE_PRICE} moedas para o protetor.`)
        return
      }
      if (res.status === 409) {
        toast.error('Você já tem o máximo de protetores!')
        return
      }
      if (!res.ok) {
        toast.error('Não consegui comprar agora.')
        return
      }
      toast.success('Protetor de sequência comprado! 🛡️')
      router.refresh()
    } catch {
      // Falha de rede (offline/DNS/abort) — sem catch viraria unhandled rejection
      // SEM feedback p/ a criança (todos os outros mutadores já avisam por toast).
      toast.error('Não consegui agora. Tente de novo!')
    } finally {
      setBusy(false)
    }
  }

  async function saveVacation(clear: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/members/gamification/vacation', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(clear ? { from: null, to: null } : { from, to }),
      })
      if (!res.ok) {
        toast.error(clear ? 'Não consegui cancelar.' : 'Datas inválidas. Confira o período.')
        return
      }
      toast.success(clear ? 'Férias canceladas.' : 'Modo férias ativado! Bom descanso 🌴')
      setPlanning(false)
      router.refresh()
    } catch {
      toast.error('Não consegui agora. Tente de novo!')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="proteja-sua-sequencia"
      className={cn('kids-carta p-5 md:p-7', className)}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        {/* O escudo em coral sobre o creme: o creme é da faixa (troca de tom no escuro) e o
            coral é cor de fundo das oficinas, que não segue o tema. */}
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--band-creme)"
        >
          <Shield className="size-7 text-(--tool-pinta)" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="proteja-sua-sequencia" className="sz-display text-xl md:text-[1.375rem]">
            Proteja sua sequência
          </h3>
          <p className="mt-1 font-medium text-[0.9375rem] text-muted-foreground">
            Faltar um dia acontece! Protetores seguram a sua sequência, e o modo férias pausa tudo,
            sem perder nada.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className={cn(CHIP, 'bg-background')}>
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              {freezesAvailable} {freezesAvailable === 1 ? 'protetor' : 'protetores'}
            </span>
            {onVacation ? (
              <>
                <span className={cn(CHIP, 'bg-(--band-menta)')}>
                  <Palmtree className="size-4" aria-hidden /> De férias{' '}
                  {vacationUntil ? `até ${vacationUntil}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => saveVacation(true)}
                  disabled={busy}
                  className={cn(
                    CHIP,
                    'bg-card ring-1 ring-border ring-inset hover:bg-muted disabled:opacity-60',
                  )}
                >
                  Cancelar
                </button>
              </>
            ) : planning ? null : (
              <button
                type="button"
                onClick={() => setPlanning(true)}
                className={cn(
                  CHIP,
                  'bg-(--band-menta) transition-colors hover:bg-[color-mix(in_oklab,var(--band-menta)_88%,var(--foreground))]',
                )}
              >
                <Palmtree className="size-4" aria-hidden /> Vou viajar, ativar o modo férias
              </button>
            )}
          </div>
          {planning && !onVacation ? (
            <div className="mt-4 space-y-3 rounded-[1.25rem] bg-background p-4">
              <div className="flex flex-wrap items-center gap-3 font-bold text-sm">
                <label className="flex items-center gap-2">
                  De
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-11 rounded-xl border-2 border-input bg-card px-3 font-semibold"
                  />
                </label>
                <label className="flex items-center gap-2">
                  até
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-11 rounded-xl border-2 border-input bg-card px-3 font-semibold"
                  />
                </label>
              </div>
              {invalidRange ? (
                <p role="alert" className="text-muted-foreground text-xs">
                  A data de início precisa vir antes da data de fim.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveVacation(false)}
                  disabled={busy || !from || !to || invalidRange}
                  className={cn(
                    'sz-btn-gradient px-5',
                    (busy || !from || !to || invalidRange) && 'opacity-60',
                  )}
                >
                  Ativar férias
                </button>
                <button
                  type="button"
                  onClick={() => setPlanning(false)}
                  className="sz-btn-gradient sz-btn-contorno px-5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={buyFreeze}
          disabled={busy}
          className="sz-btn-gradient shrink-0 gap-2 self-start px-5 disabled:opacity-60 md:self-center"
        >
          <ZappyCoin className="size-5" />
          Comprar ({STREAK_FREEZE_PRICE} moedas)
        </button>
      </div>
    </section>
  )
}
