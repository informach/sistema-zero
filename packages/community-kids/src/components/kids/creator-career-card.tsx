import { Flame, Gamepad2, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { careerRewardInfo } from '@/lib/career-rewards'
import { cn } from '@/lib/cn'
import { levelInfo, nextLevelHint } from '@/lib/level-info'
import type { GamificationMeView } from '@/lib/types'
import { AvatarWithAura } from './avatar-with-aura'
import { LevelBadge } from './level-badge'

/**
 * Card "Carreira de Criador" da home (07/2026): UMA narrativa de progressão em
 * vez de números soltos — aura + insígnia do rank (o marco central: publicar
 * jogos no Mural), a frase do PRÓXIMO marco (`nextLevelHint`) e, como
 * secundários, o fogo do streak e o XP. Substituiu o StreakCard (a mensagem do
 * fogo do dia vive aqui agora). `gamification` nulo → placeholder gentil (a
 * home não "encolhe" em silêncio).
 */
export function CreatorCareerCard({
  gamification,
  avatarPhotoUrl = null,
  showcaseStats = null,
}: {
  gamification: GamificationMeView | null
  avatarPhotoUrl?: string | null
  /** Jogos publicados no Mural + soma das jogadas (best-effort; null = linha some). */
  showcaseStats?: { published: number; plays: number } | null
}) {
  if (!gamification) {
    return (
      <section
        aria-label="Minha carreira de criador"
        className="flex items-center gap-4 rounded-3xl border-2 border-border border-dashed bg-card p-5 md:gap-5 md:p-6"
      >
        <AvatarWithAura photoUrl={avatarPhotoUrl} size="lg" label="Seu avatar" />
        <div className="min-w-0 flex-1">
          <p className="sz-display text-xl md:text-2xl">Sua carreira está guardada!</p>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Não consegui ver o seu progresso agora, mas nada se perdeu. Pode continuar criando!
          </p>
        </div>
      </section>
    )
  }

  const { streak, xp, level, ranking } = gamification
  const info = levelInfo(level?.slug)
  const reward = careerRewardInfo(level?.slug)
  const hint = level ? nextLevelHint(level) : null
  const days = streak.current === 1 ? 'dia' : 'dias'
  const streakMessage = streak.activeToday
    ? 'Fogo de hoje garantido. Continue assim!'
    : streak.current > 0
      ? 'Crie ou aprenda algo hoje para manter o fogo aceso!'
      : 'Conclua uma aula hoje para acender o fogo!'

  return (
    <section
      aria-label="Minha carreira de criador"
      className="rounded-3xl border-2 border-border bg-card p-5 shadow-[0_4px_0_var(--border)] md:p-6"
    >
      <div className="flex items-center gap-4 md:gap-5">
        <AvatarWithAura
          photoUrl={avatarPhotoUrl}
          levelSlug={level?.slug}
          size="lg"
          label="Seu avatar"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-muted-foreground text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            Carreira de Criador
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <LevelBadge levelSlug={level?.slug} />
            {ranking ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                <Trophy className="size-3.5" />
                {ranking.position}º no ranking
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-muted-foreground text-sm">{hint ?? info.blurb}</p>
          <p className="mt-1 text-xs">
            <span className="font-bold text-primary">Você liberou:</span>{' '}
            <span className="text-muted-foreground">{reward.title}</span>
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1.5 text-sm sm:flex">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-bold [font-family:var(--font-display)]',
              streak.activeToday ? 'text-(--sz-hot)' : 'text-muted-foreground',
            )}
          >
            <Flame className={cn('size-4', streak.activeToday && 'fill-current')} />
            {streak.current} {days}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-primary [font-family:var(--font-display)]">
            <Sparkles className="size-4" />
            {xp} XP
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 text-muted-foreground text-sm">
        <Flame
          className={cn(
            'size-4 shrink-0',
            streak.activeToday ? 'fill-current text-(--sz-hot)' : 'text-muted-foreground',
          )}
        />
        {streakMessage}
      </p>
      {showcaseStats && showcaseStats.published > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <Gamepad2 className="size-4 shrink-0 text-primary" />
          <span>
            {showcaseStats.plays === 1
              ? 'Seus jogos já foram jogados 1 vez!'
              : `Seus jogos já foram jogados ${showcaseStats.plays} vezes!`}
          </span>
          <Link
            href="/perfil"
            prefetch={false}
            className="font-bold text-primary underline-offset-2 hover:underline"
          >
            Ver minha carreira
          </Link>
        </p>
      ) : null}
    </section>
  )
}
