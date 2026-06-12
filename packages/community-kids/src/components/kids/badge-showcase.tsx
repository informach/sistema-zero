import { Lock, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { GamificationMeView } from '@/lib/types'
import { badgeInfo } from './badges'

const UNLOCK_DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/**
 * Vitrine de conquistas do perfil: o catálogo COMPLETO (na ordem da API),
 * bloqueada = acinzentada com cadeado; desbloqueada = cor da marca + data.
 * Slug desconhecido (backend mais novo) é ignorado.
 */
export function BadgeShowcase({ gamification }: { gamification: GamificationMeView }) {
  const badges = gamification.badges
    .map((b) => ({ ...b, info: badgeInfo(b.slug) }))
    .filter((b): b is typeof b & { info: NonNullable<ReturnType<typeof badgeInfo>> } =>
      Boolean(b.info),
    )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="sz-display text-xl">Minhas conquistas</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Continue estudando para desbloquear todas!
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-primary [font-family:var(--font-display)]">
            <Sparkles className="size-4" />
            {gamification.xp} XP
          </span>
          {gamification.streak.best > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="size-4" />
              Recorde: {gamification.streak.best} {gamification.streak.best === 1 ? 'dia' : 'dias'}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {badges.map(({ slug, unlockedAt, info }) => {
          const Icon = info.icon
          const unlocked = unlockedAt !== null
          return (
            <li
              key={slug}
              className={cn(
                'flex flex-col items-center gap-2 rounded-3xl border-2 p-4 text-center',
                unlocked
                  ? 'border-primary bg-(--kids-cyan-tint)'
                  : 'border-border border-dashed opacity-70',
              )}
            >
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-full',
                  unlocked
                    ? '[background-image:var(--sz-gradient)] text-(--sz-primary-fg)'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {unlocked ? <Icon className="size-6" /> : <Lock className="size-5" />}
              </span>
              <div>
                <p className="font-bold text-sm [font-family:var(--font-display)]">{info.title}</p>
                <p className="mt-0.5 text-muted-foreground text-xs">{info.description}</p>
              </div>
              {unlocked ? (
                <p className="text-muted-foreground text-xs">
                  Conquistada em {UNLOCK_DATE.format(new Date(unlockedAt))}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
