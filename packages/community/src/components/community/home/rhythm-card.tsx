'use client'

import { badgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import { Flame, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useAdultGamification } from '../gamification-provider'

/**
 * "Seu ritmo" no Início (direção de arte de 18/10/2026): a sequência, a experiência e a última
 * conquista, da gamificação adulta (o mesmo estado do menu do perfil). Sem dados, o cartão sai.
 */
export function RhythmCard() {
  const progress = useAdultGamification()?.progress
  if (!progress) return null
  const days = progress.streak.current
  const lastBadge = progress.badges
    .filter((badge) => badge.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))[0]
  const lastBadgeTitle = lastBadge ? (badgeInfo(lastBadge.slug)?.title ?? null) : null

  return (
    <article className="sz-card flex flex-col gap-3.5 p-5 md:p-7">
      <h2 className="sz-h3">Seu ritmo</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="sz-soft flex flex-col gap-0.5 px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground">
            <Flame className="size-[1.1em]" aria-hidden />
            Sequência
          </span>
          <strong className="font-(family-name:--font-display) font-extrabold text-[1.6rem] leading-[1.1]">
            {days} {days === 1 ? 'dia' : 'dias'}
          </strong>
        </div>
        <div className="sz-soft flex flex-col gap-0.5 px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground">
            <Sparkles className="size-[1.1em]" aria-hidden />
            Experiência
          </span>
          <strong className="font-(family-name:--font-display) font-extrabold text-[1.6rem] leading-[1.1]">
            {progress.xp} XP
          </strong>
        </div>
      </div>
      {progress.streak.onVacation ? (
        <span className="text-[0.85rem] text-muted-foreground">
          Sequência em pausa: suas férias estão ativas.
        </span>
      ) : null}
      {lastBadgeTitle ? (
        <span className="text-[0.85rem] text-muted-foreground">
          Última conquista: {lastBadgeTitle}
        </span>
      ) : null}
      <Link
        href="/progresso"
        prefetch={false}
        className="sz-link -my-1.5 inline-flex min-h-[2.4rem] items-center self-start"
      >
        Ver o seu progresso
      </Link>
    </article>
  )
}
