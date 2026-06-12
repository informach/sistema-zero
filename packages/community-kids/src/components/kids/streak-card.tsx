import { Flame, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { GamificationMeView } from '@/lib/types'

/**
 * Card de streak da home: fogo grande + mensagem do dia. Aceso (vermelho da
 * marca) quando já houve atividade hoje; apagado vira convite a estudar.
 */
export function StreakCard({ gamification }: { gamification: GamificationMeView }) {
  const { streak, xp } = gamification
  const days = streak.current === 1 ? 'dia' : 'dias'

  const message = streak.activeToday
    ? 'Fogo de hoje garantido. Continue assim!'
    : streak.current > 0
      ? 'Faça uma aula hoje para manter o fogo aceso!'
      : 'Conclua uma aula hoje para acender o fogo!'

  return (
    <section
      aria-label="Minha sequência de estudos"
      className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 shadow-[0_4px_0_var(--border)] md:gap-5 md:p-6"
    >
      <span
        className={cn(
          'grid size-14 shrink-0 place-items-center rounded-full md:size-16',
          streak.activeToday
            ? 'bg-[color-mix(in_oklch,var(--sz-hot)_14%,transparent)] text-(--sz-hot)'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Flame className={cn('size-8 md:size-9', streak.activeToday && 'fill-current kid-pop')} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="sz-display text-xl md:text-2xl">
          {streak.current > 0 ? `Sequência de ${streak.current} ${days}!` : 'Comece uma sequência!'}
        </p>
        <p className="mt-0.5 text-muted-foreground text-sm">{message}</p>
      </div>
      <div className="hidden flex-col items-end gap-1.5 text-sm sm:flex">
        <span className="inline-flex items-center gap-1.5 font-bold text-primary [font-family:var(--font-display)]">
          <Sparkles className="size-4" />
          {xp} XP
        </span>
        {streak.best > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
            <Trophy className="size-3.5" />
            Recorde: {streak.best} {streak.best === 1 ? 'dia' : 'dias'}
          </span>
        ) : null}
      </div>
    </section>
  )
}
