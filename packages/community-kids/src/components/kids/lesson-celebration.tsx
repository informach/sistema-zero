'use client'

import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Flame, Gift, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { CourseProgressView, GamificationDelta } from '@/lib/types'
import { badgeInfo } from './badges'
import { KidsMascot } from './mascot'

interface LessonCelebrationProps {
  /** Snapshot do progresso ANTES do router.refresh() (as props mudam depois). */
  progressBefore: CourseProgressView
  /** Delta de XP/streak/badges vindo NA resposta do complete; `null` = sem gamificação. */
  gamification: GamificationDelta | null
  nextHref: string | null
  courseHref: string
  onClose: () => void
}

const CONFETTI_COLORS = ['var(--kids-cyan)', 'var(--kids-lime)', 'var(--sz-hot)'] as const
const CONFETTI_COUNT = 24
/** Cleanup por TEMPO: reduced-motion zera a animação (animationend não dispara). */
const CONFETTI_LIFETIME_MS = 3600

interface ConfettiPiece {
  id: number
  left: number
  duration: number
  delay: number
  color: (typeof CONFETTI_COLORS)[number]
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
  const [confetti, setConfetti] = useState(true)

  // Anima a barra antes→depois após a entrada do modal (transition no CSS).
  useEffect(() => {
    const t = setTimeout(() => setPercent(percentAfter), 350)
    return () => clearTimeout(t)
  }, [percentAfter])

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), CONFETTI_LIFETIME_MS)
    return () => clearTimeout(t)
  }, [])

  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 2 + Math.random() * 1.2,
        delay: Math.random() * 0.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] as ConfettiPiece['color'],
      })),
    [],
  )

  return (
    <div
      className="sz-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Aula concluída"
    >
      {confetti ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {pieces.map((piece) => (
            <span
              key={piece.id}
              className="kids-confetti-piece"
              style={
                {
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  '--confetti-duration': `${piece.duration}s`,
                  '--confetti-delay': `${piece.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}

      <div className="sz-modal w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-xl md:p-8">
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
            {nextHref ? 'Próxima aula' : 'Voltar à trilha'}
          </Link>
          {nextHref ? (
            <Link
              href={courseHref}
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Voltar à trilha
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Ficar nesta aula
          </button>
        </div>
      </div>
    </div>
  )
}

/** Seção de recompensas REAIS do backend: +XP, fogo do streak, baú e badges. */
function GamificationDeltaPanel({ gamification }: { gamification: GamificationDelta }) {
  const { xpAwarded, streak, unitCompleted, badgesUnlocked } = gamification
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
    </div>
  )
}
