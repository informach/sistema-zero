'use client'

import { Palmtree, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'

/**
 * Proteção da sequência (ético/guilt-free): protetores de streak (1 grátis/mês +
 * compráveis) + modo férias. Copy GENTIL — nunca culpa a criança por faltar. Recebe o
 * estado atual da gamificação; as mutações chamam o BFF e dão `router.refresh()`.
 */
export function StreakProtection({
  freezesAvailable,
  onVacation,
  vacationUntil,
}: {
  freezesAvailable: number
  onVacation: boolean
  vacationUntil: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function buyFreeze() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/members/gamification/streak-freeze/buy', { method: 'POST' })
      if (res.status === 402) {
        toast.error('Você ainda não tem 80 moedas para o protetor.')
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
        toast.error(clear ? 'Não consegui cancelar.' : 'Datas inválidas — confira o período.')
        return
      }
      toast.success(clear ? 'Férias canceladas.' : 'Modo férias ativado! Bom descanso 🌴')
      setPlanning(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
      <h2 className="sz-display flex items-center gap-2 text-base">
        <ShieldCheck className="size-5 text-primary" /> Proteja sua sequência
      </h2>
      <p className="text-muted-foreground text-sm">
        Faltar um dia acontece! Protetores seguram a sua sequência — e o modo férias pausa tudo, sem
        perder nada.
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-sm">
          <ShieldCheck className="size-4 text-primary" />
          {freezesAvailable} {freezesAvailable === 1 ? 'protetor' : 'protetores'}
        </span>
        <button
          type="button"
          onClick={buyFreeze}
          disabled={busy}
          className="rounded-full border-2 border-border px-3 py-1.5 font-bold text-sm transition-colors hover:border-primary disabled:opacity-60"
        >
          Comprar (80 moedas)
        </button>
      </div>

      <div className="border-border border-t pt-3">
        {onVacation ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-sm">
              <Palmtree className="size-4 text-primary" /> De férias{' '}
              {vacationUntil ? `até ${vacationUntil}` : ''}
            </span>
            <button
              type="button"
              onClick={() => saveVacation(true)}
              disabled={busy}
              className="rounded-full border-2 border-border px-3 py-1.5 font-bold text-sm hover:border-primary disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        ) : planning ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-1">
                De
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-lg border-2 border-border px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1">
                até
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-lg border-2 border-border px-2 py-1"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveVacation(false)}
                disabled={busy || !from || !to}
                className={cn(
                  'sz-btn-gradient h-9 px-4 text-sm',
                  (busy || !from || !to) && 'opacity-60',
                )}
              >
                Ativar férias
              </button>
              <button
                type="button"
                onClick={() => setPlanning(false)}
                className="rounded-full px-3 py-1.5 font-bold text-muted-foreground text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlanning(true)}
            className="inline-flex items-center gap-1.5 font-bold text-primary text-sm hover:underline"
          >
            <Palmtree className="size-4" /> Vou viajar — ativar modo férias
          </button>
        )}
      </div>
    </section>
  )
}
