import { Flame, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { GamificationMeView } from '@/lib/types'

/**
 * Widget de streak + XP (sidebar do desktop e top bar do mobile). Sem hooks —
 * funciona dentro de Server e Client Components. Fogo ACESO (vermelho da
 * marca) = já houve atividade hoje; apagado = cinza, convite a estudar.
 */
export function StreakWidget({
  gamification,
  compact = false,
}: {
  gamification: GamificationMeView
  compact?: boolean
}) {
  const { streak, xp } = gamification
  const streakLabel = `Sequência de ${streak.current} ${streak.current === 1 ? 'dia' : 'dias'}${streak.activeToday ? ' — atividade de hoje feita' : ''}`

  if (compact) {
    return (
      <span
        role="group"
        className="flex items-center gap-2.5 text-sm"
        aria-label={`${streakLabel}. ${xp} pontos de experiência.`}
      >
        <span className="inline-flex items-center gap-1 [font-family:var(--font-display)] font-bold">
          <Flame
            className={cn(
              'size-4',
              streak.activeToday ? 'fill-current text-(--sz-hot)' : 'text-muted-foreground',
            )}
          />
          {streak.current}
        </span>
        <span className="inline-flex items-center gap-1 [font-family:var(--font-display)] font-bold text-primary">
          <Sparkles className="size-4" />
          {xp}
        </span>
      </span>
    )
  }

  return (
    <div
      role="group"
      className="flex items-center justify-around gap-2 rounded-2xl border-2 border-border px-3 py-2.5"
      aria-label={`${streakLabel}. ${xp} pontos de experiência.`}
    >
      <span className="flex items-center gap-1.5">
        <Flame
          className={cn(
            'size-5',
            streak.activeToday ? 'fill-current text-(--sz-hot)' : 'text-muted-foreground',
          )}
        />
        <span className="[font-family:var(--font-display)] font-bold text-sm">
          {streak.current}
        </span>
      </span>
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      <span className="flex items-center gap-1.5 text-primary">
        <Sparkles className="size-5" />
        <span className="[font-family:var(--font-display)] font-bold text-sm">{xp} XP</span>
      </span>
    </div>
  )
}
