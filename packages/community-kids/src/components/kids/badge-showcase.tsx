import { Flame, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { GamificationMeView } from '@/lib/types'
import { badgeInfo } from './badges'
import { KidsSectionHeader } from './kids-section-header'

const UNLOCK_DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** As pílulas brancas à direita do título (XP e recorde). */
const PILULA =
  'inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 font-extrabold text-sm tabular-nums'

/**
 * Vitrine de conquistas do perfil: o catálogo COMPLETO (na ordem da API). Slug
 * desconhecido (backend mais novo) é ignorado.
 *
 * Desenho das telas-modelo (11/09/2026, medido a 1440px): grade de cinco colunas de
 * ~196px, a conquistada com o contorno azul da marca sobre um azul bem clarinho e o
 * ícone num círculo azul cheio, a travada num cartão branco comum com o cadeado num
 * círculo cinza (sem tracejado nem transparência, que liam como "quebrado"). O XP e o
 * recorde de dias viram pílulas brancas à direita do título.
 */
export function BadgeShowcase({ gamification }: { gamification: GamificationMeView }) {
  const badges = gamification.badges
    .map((b) => ({ ...b, info: badgeInfo(b.slug) }))
    .filter((b): b is typeof b & { info: NonNullable<ReturnType<typeof badgeInfo>> } =>
      Boolean(b.info),
    )

  return (
    <section aria-labelledby="minhas-conquistas">
      <KidsSectionHeader
        id="minhas-conquistas"
        title="Minhas conquistas"
        subtitle="Continue estudando para desbloquear todas!"
        actions={
          <>
            <span className={PILULA}>
              <Sparkles className="size-4 text-primary" aria-hidden />
              {gamification.xp} XP
            </span>
            {gamification.streak.best > 0 ? (
              <span className={PILULA}>
                <Flame className="size-4 text-(--sz-kids-laranja-texto)" aria-hidden />
                Recorde: {gamification.streak.best}{' '}
                {gamification.streak.best === 1 ? 'dia' : 'dias'}
              </span>
            ) : null}
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {badges.map(({ slug, unlockedAt, info }) => {
          const Icon = info.icon
          const unlocked = unlockedAt !== null
          return (
            <li
              key={slug}
              className={cn(
                'flex flex-col items-center rounded-[1.5rem] px-3.5 py-5 text-center',
                unlocked
                  ? 'bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))] ring-2 ring-primary ring-inset'
                  : 'kids-carta',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-11 place-items-center rounded-full',
                  unlocked ? 'kids-marca' : 'bg-muted text-muted-foreground',
                )}
              >
                {unlocked ? <Icon className="size-5" /> : <Lock className="size-5" />}
              </span>
              <p
                className={cn(
                  'mt-3 font-extrabold text-sm leading-tight',
                  !unlocked && 'text-muted-foreground',
                )}
              >
                {info.title}
              </p>
              <p className="mt-1.5 font-medium text-muted-foreground text-xs leading-snug">
                {info.description}
              </p>
              {unlocked ? (
                <p className="mt-2 font-extrabold text-[0.6875rem] text-primary">
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
