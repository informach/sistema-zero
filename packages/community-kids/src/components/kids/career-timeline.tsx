import { Check, Gamepad2, Lock } from 'lucide-react'
import Link from 'next/link'
import { CAREER_REWARD_INFO } from '@/lib/career-rewards'
import { cn } from '@/lib/cn'
import { LEVEL_INFO, LEVEL_ORDER, nextLevelHint } from '@/lib/level-info'
import { TROPHY_BADGE_SLUGS } from '@/lib/room-catalog'
import type { GamificationMeView } from '@/lib/types'
import { badgeInfo } from './badges'

/**
 * Badges de PRODUTO (bônus dos apps criativos vendidos à parte: Pensa/Pinta/
 * Estúdio) — apresentadas num grupo próprio DEPOIS das universais. A escada de
 * níveis é 100% universal (aulas/quizzes/publicar pelo curso); os feitos de
 * produto são bônus e NUNCA condição de subida (restrição central do produto).
 */
const isProductBadge = (slug: string) => slug.startsWith('studio-') || slug.startsWith('pensa-')

function formatUnlockDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

function FeatCard({ slug, unlockedAt }: { slug: string; unlockedAt: string }) {
  const info = badgeInfo(slug)
  if (!info) return null
  const Icon = info.icon
  return (
    <li className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm [font-family:var(--font-display)]">{info.title}</p>
        <p className="text-muted-foreground text-xs leading-snug">{info.description}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <span>{formatUnlockDate(unlockedAt)}</span>
          {TROPHY_BADGE_SLUGS.has(slug) ? (
            <Link
              href="/quarto"
              prefetch={false}
              className="font-bold text-primary underline-offset-2 hover:underline"
            >
              🏆 Veja o troféu no seu quarto
            </Link>
          ) : null}
        </p>
      </div>
    </li>
  )
}

/**
 * Linha do tempo da CARREIRA no /perfil (07/2026): a escada universal
 * Faísca→Lenda (rung atual + o que falta) e os FEITOS conquistados como
 * cartões — universais primeiro, bônus dos apps criativos agrupados depois.
 * Só apresentação; os dados vêm do `getGamificationReadonly` da página.
 */
export function CareerTimeline({
  gamification,
  showcaseStats = null,
}: {
  gamification: GamificationMeView
  showcaseStats?: { published: number; plays: number } | null
}) {
  const currentSlug = gamification.level?.slug ?? 'noob'
  const currentIndex = Math.max(0, LEVEL_ORDER.indexOf(currentSlug))
  const hint = gamification.level ? nextLevelHint(gamification.level) : null

  const unlocked = gamification.badges
    .filter((b): b is { slug: string; unlockedAt: string } => b.unlockedAt !== null)
    .sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1))
  const universal = unlocked.filter((b) => !isProductBadge(b.slug))
  const product = unlocked.filter((b) => isProductBadge(b.slug))

  return (
    <section
      aria-label="Minha carreira"
      className="rounded-3xl border-2 border-border bg-card p-5 md:p-6"
    >
      <h2 className="sz-display text-xl">Minha carreira</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        Sua jornada de criador: cada projeto concluído e publicado sobe a escada.
      </p>

      {/* Escada Faísca → Lenda (universal). */}
      <ol className="mt-4 flex flex-col gap-0.5">
        {LEVEL_ORDER.map((slug, index) => {
          const info = LEVEL_INFO[slug]
          const Icon = info.icon
          const reward = CAREER_REWARD_INFO[slug]
          const done = index < currentIndex
          const current = index === currentIndex
          return (
            <li key={slug} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full border-2',
                    current
                      ? 'border-transparent text-white'
                      : done
                        ? 'border-transparent bg-primary/15 text-primary'
                        : 'border-border border-dashed text-muted-foreground',
                  )}
                  style={current ? { backgroundColor: info.colorVar } : undefined}
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                {index < LEVEL_ORDER.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn('w-0.5 flex-1', done ? 'bg-primary/40' : 'bg-border')}
                  />
                ) : null}
              </div>
              <div className={cn('pb-4', !current && !done && 'opacity-60')}>
                <p className="flex flex-wrap items-center gap-2 font-bold text-sm [font-family:var(--font-display)]">
                  {info.label}
                  {current ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                      Você está aqui
                    </span>
                  ) : null}
                  {!current && !done ? <Lock className="size-3.5" /> : null}
                </p>
                {current ? (
                  <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                    {hint ?? info.blurb}
                  </p>
                ) : null}
                <p className="mt-1 text-xs leading-snug">
                  <span className="font-bold text-primary">
                    {done || current ? 'Liberado: ' : 'Ao chegar aqui: '}
                  </span>
                  <span className="text-muted-foreground">{reward.title}</span>
                </p>
                {(done || current) && (
                  <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                    {reward.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {showcaseStats && showcaseStats.published > 0 ? (
        <p className="mt-1 flex items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 text-sm">
          <Gamepad2 className="size-4 shrink-0 text-primary" />
          {showcaseStats.published === 1
            ? 'Você tem 1 jogo no Mural'
            : `Você tem ${showcaseStats.published} jogos no Mural`}
          {showcaseStats.plays === 1
            ? ', jogado 1 vez!'
            : `, jogados ${showcaseStats.plays} vezes!`}
        </p>
      ) : null}

      {/* Feitos conquistados: universais primeiro, bônus dos apps criativos depois. */}
      {universal.length > 0 ? (
        <div className="mt-5">
          <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            Feitos da jornada
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {universal.map((b) => (
              <FeatCard key={b.slug} slug={b.slug} unlockedAt={b.unlockedAt} />
            ))}
          </ul>
        </div>
      ) : null}
      {product.length > 0 ? (
        <div className="mt-5">
          <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wide [font-family:var(--font-display)]">
            Bônus dos apps criativos
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {product.map((b) => (
              <FeatCard key={b.slug} slug={b.slug} unlockedAt={b.unlockedAt} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
