'use client'

import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Flame, Gift, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { TROPHY_BADGE_SLUGS } from '@/lib/room-catalog'
import type { CourseProgressView, GamificationDelta } from '@/lib/types'
import { badgeInfo } from './badges'
import { KidsConfetti } from './kids-confetti'
import { KidsMascot } from './mascot'
import { ZappyCoin } from './zappy-coin'

interface LessonCelebrationProps {
  /** Snapshot do progresso ANTES do router.refresh() (as props mudam depois). */
  progressBefore: CourseProgressView
  /** Delta de XP/streak/badges vindo NA resposta do complete; `null` = sem gamificação. */
  gamification: GamificationDelta | null
  nextHref: string | null
  courseHref: string
  onClose: () => void
}

/**
 * Overlay de celebração ao concluir uma aula (estilo Duolingo): mascote
 * comemorando, confete em CSS puro (zero dependência — burst único não
 * justifica lib), a barra animando do progresso ANTES → DEPOIS e o delta
 * REAL de gamificação (+XP, fogo do streak, baú da unidade, badges) vindo
 * do backend na resposta do complete. `xpAwarded: 0` (re-complete) ou
 * `gamification: null` (award falhou, fail-open) → overlay sem a seção.
 * A navegação vira decisão do aluno (próxima aula / trilha / ficar).
 */
export function LessonCelebration({
  progressBefore,
  gamification,
  nextHref,
  courseHref,
  onClose,
}: LessonCelebrationProps) {
  const percentAfter =
    progressBefore.totalLessons > 0
      ? Math.min(
          100,
          Math.round(((progressBefore.completedLessons + 1) / progressBefore.totalLessons) * 100),
        )
      : progressBefore.percent

  const [percent, setPercent] = useState(progressBefore.percent)
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })

  // Anima a barra antes→depois após a entrada do modal (transition no CSS).
  useEffect(() => {
    const t = setTimeout(() => setPercent(percentAfter), 350)
    return () => clearTimeout(t)
  }, [percentAfter])

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <KidsConfetti />

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Aula concluída"
        onClick={(e) => e.stopPropagation()}
        className="sz-modal w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl outline-none md:p-8"
      >
        <KidsMascot expression="celebrating" className="kid-wiggle mx-auto size-24" />
        <h2 className="sz-display mt-3 text-2xl">Aula concluída!</h2>
        <p className="mt-1 text-muted-foreground text-sm">Mandou muito bem!</p>

        {gamification && gamification.xpAwarded > 0 ? (
          <GamificationDeltaPanel gamification={gamification} />
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <ProgressBar value={percent} className="flex-1" />
          <span className="sz-display text-sm">{percent}%</span>
        </div>

        <div className="mt-7 flex flex-col items-stretch gap-3">
          <Link href={nextHref ?? courseHref} className="sz-btn-gradient h-12 text-base">
            {nextHref ? 'Próxima aula' : 'Voltar ao curso'}
          </Link>
          {nextHref ? (
            <Link
              href={courseHref}
              // min-h-11: alvo de toque de mão pequena (a régua da casa) — era um
              // link de texto puro de ~20px num modal que abre a cada aula concluída.
              className="inline-flex min-h-11 items-center justify-center px-4 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Voltar ao curso
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center px-4 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Ficar nesta aula
          </button>
        </div>
      </div>
    </div>
  )
}

/** Seção de recompensas REAIS do backend: +XP, +moedas, fogo do streak, baú e badges. */
function GamificationDeltaPanel({ gamification }: { gamification: GamificationDelta }) {
  const { xpAwarded, streak, unitCompleted, badgesUnlocked } = gamification
  const coinsAwarded = gamification.coinsAwarded ?? 0
  const badges = badgesUnlocked
    .map((b) => ({ slug: b.slug, info: badgeInfo(b.slug) }))
    .filter((b): b is { slug: string; info: NonNullable<ReturnType<typeof badgeInfo>> } =>
      Boolean(b.info),
    )

  return (
    <div className="mt-5 flex flex-col items-center gap-2.5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="kid-pop inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 [background-image:var(--sz-gradient)] [font-family:var(--font-display)] font-bold text-(--sz-primary-fg) text-base">
          <Sparkles className="size-4" />+{xpAwarded} XP
        </span>
        {coinsAwarded > 0 ? (
          <span className="kid-pop inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-4 py-1.5 [font-family:var(--font-display)] font-bold text-base text-foreground">
            <ZappyCoin className="size-4" />+{coinsAwarded}
          </span>
        ) : null}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 [font-family:var(--font-display)] font-bold text-sm',
            streak.extended
              ? 'kid-pop border-(--sz-hot) text-(--sz-hot)'
              : 'border-border text-muted-foreground',
          )}
        >
          <Flame className={cn('size-4', streak.extended && 'fill-current')} />
          {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      {gamification.coinsCapped ? (
        <p className="text-muted-foreground text-xs">
          Você já pegou o máximo de moedas de hoje. Amanhã tem mais! 😄
        </p>
      ) : null}

      {unitCompleted ? (
        <p className="inline-flex items-center gap-1.5 font-semibold text-sm">
          <Gift className="size-4 text-primary" />
          Você abriu o baú da unidade!
        </p>
      ) : null}

      {badges.map(({ slug, info }) => {
        const Icon = info.icon
        return (
          <p
            key={slug}
            className="inline-flex items-center gap-1.5 rounded-xl bg-(--kids-lime-tint) px-3 py-1.5 font-semibold text-sm"
          >
            <Icon className="size-4" />
            Conquista desbloqueada: {info.title}!
          </p>
        )
      })}

      {/* 🏆 Conquista com troféu mapeado = objeto novo no quarto (07/2026). */}
      {badges.some(({ slug }) => TROPHY_BADGE_SLUGS.has(slug)) ? (
        <Link
          href="/quarto"
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-(--kids-lime) px-3 py-1.5 font-bold text-sm"
        >
          🏆 Um troféu novo apareceu no seu quarto! Ver
        </Link>
      ) : null}
    </div>
  )
}
