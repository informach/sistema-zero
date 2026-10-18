'use client'

import { Coins, Flame, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useAdultGamification } from './gamification-provider'

export function GamificationSummary({ compact = false }: { compact?: boolean }) {
  const state = useAdultGamification()
  if (!state?.progress)
    return compact ? null : (
      <p role="status">Seu progresso está indisponível agora. Tente atualizar a página.</p>
    )
  const { xp, coins, streak } = state.progress
  return (
    <Link
      href="/progresso"
      prefetch={false}
      className={
        compact
          ? 'inline-flex items-center gap-3 text-sm text-white'
          : 'flex flex-wrap items-center gap-5 rounded-3xl bg-card p-5 text-sm font-semibold'
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="size-4" aria-hidden />
        {xp} XP
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Flame className="size-4" aria-hidden />
        {streak.current} dias{streak.onVacation ? ' · pausa ativa' : ''}
      </span>
      {coins ? (
        <span className="inline-flex items-center gap-1.5">
          <Coins className="size-4" aria-hidden />
          {coins.unlimited ? '∞' : coins.balance} moedas
        </span>
      ) : null}
      {!compact && state.unavailable ? (
        <span role="status">Não foi possível atualizar. Exibindo o último progresso recebido.</span>
      ) : null}
    </Link>
  )
}
