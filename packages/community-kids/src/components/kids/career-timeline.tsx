import { Check, Gamepad2, Hammer } from 'lucide-react'
import Link from 'next/link'
import {
  type CatalogInput,
  careerHorizon,
  careerProgress,
  levelsBeyondHorizon,
  visibleCareerLevels,
} from '@/lib/career-horizon'
import { CAREER_REWARD_INFO } from '@/lib/career-rewards'
import { cn } from '@/lib/cn'
import { LEVEL_INFO } from '@/lib/level-info'
import { TROPHY_BADGE_SLUGS } from '@/lib/room-catalog'
import type { GamificationMeView, StudentLevelSlug } from '@/lib/types'
import { badgeInfo, badgeTone } from './badges'
import { KidsSectionHeader } from './kids-section-header'

/**
 * Badges de PRODUTO (bônus dos apps criativos vendidos à parte: Pensa/Pinta/
 * Estúdio) — apresentadas num grupo próprio DEPOIS das universais. A escada de
 * níveis é 100% universal (aulas/quizzes/publicar pelo curso); os feitos de
 * produto são bônus e NUNCA condição de subida (restrição central do produto).
 */
const isProductBadge = (slug: string) => slug.startsWith('studio-') || slug.startsWith('pensa-')

/** "A, B e C" — os nomes dos postos que ainda estão sendo construídos. */
function formatLevelNames(slugs: readonly StudentLevelSlug[]): string {
  const names = slugs.map((slug) => LEVEL_INFO[slug].label)
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
}

function formatUnlockDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

/** A etiqueta miúda ao lado do nome do posto ("Você está aqui", "Próximo nível"). */
const ETIQUETA = 'rounded-full px-2.5 py-0.5 font-extrabold text-[0.6875rem] leading-tight'

/**
 * Um feito conquistado: cartão branco com o ladrilho colorido da família do feito
 * (`badgeTone`), título em Baloo, a frase e a data. O desenho é o das telas-modelo.
 */
function FeatCard({ slug, unlockedAt }: { slug: string; unlockedAt: string }) {
  const info = badgeInfo(slug)
  if (!info) return null
  const Icon = info.icon
  const tom = badgeTone(slug)
  return (
    <li className="kids-carta flex items-start gap-3.5 rounded-[1.25rem] p-5">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-[0.75rem]"
        style={{ backgroundColor: tom.fundo, color: tom.tinta }}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="sz-display text-lg leading-tight">{info.title}</p>
        <p className="mt-1 font-medium text-[0.8125rem] text-muted-foreground leading-snug">
          {info.description}
        </p>
        <p className="mt-1.5 font-bold text-xs">{formatUnlockDate(unlockedAt)}</p>
        {TROPHY_BADGE_SLUGS.has(slug) ? (
          <Link
            href="/quarto"
            prefetch={false}
            className="mt-1.5 inline-flex min-h-8 items-center gap-1 font-extrabold text-primary text-xs underline-offset-2 hover:underline any-pointer-coarse:min-h-11"
          >
            🏆 Veja o troféu no seu quarto
          </Link>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Linha do tempo da CARREIRA no /perfil: a escada universal Faísca→Lenda (posto atual +
 * o que falta) e os FEITOS conquistados — universais primeiro, bônus dos apps criativos
 * agrupados depois. Só apresentação; os dados vêm do `getGamificationReadonly` da página.
 *
 * Desenho das telas-modelo (11/09/2026): a escada vira linhas-cartão dentro de um cartão
 * branco (o posto atual com o contorno azul e "Você está aqui", o próximo com "Próximo
 * nível", o resto que o catálogo ainda não alcança numa linha só "em construção"), e os
 * feitos saem do cartão para uma grade de cartões com ladrilho colorido.
 */
export function CareerTimeline({
  gamification,
  courses,
  showcaseStats = null,
}: {
  gamification: GamificationMeView
  /** Catálogo publicado — define até onde a escada é DESENHADA (horizonte do catálogo).
   *  `null` = busca falhou → escada inteira, sem restringir. */
  courses: CatalogInput
  showcaseStats?: { published: number; plays: number } | null
}) {
  const currentSlug = gamification.level?.slug ?? 'noob'
  // A escada mostra até onde o catálogo consegue levar; o resto vira UMA linha de
  // "está sendo construído", em vez de uma fileira de cadeados (ver `career-horizon.ts`).
  const visible = visibleCareerLevels(currentSlug, careerHorizon(courses))
  const beyond = levelsBeyondHorizon(visible)
  const currentIndex = Math.max(0, visible.indexOf(currentSlug as StudentLevelSlug))
  const progress = careerProgress(gamification.level, courses)
  const hint =
    progress.kind === 'pending'
      ? progress.hint
      : progress.kind === 'up-to-date'
        ? 'Você já fez tudo que está pronto. Novas aventuras estão sendo criadas!'
        : null

  const unlocked = gamification.badges
    .filter((b): b is { slug: string; unlockedAt: string } => b.unlockedAt !== null)
    .sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1))
  const universal = unlocked.filter((b) => !isProductBadge(b.slug))
  const product = unlocked.filter((b) => isProductBadge(b.slug))

  return (
    <section aria-labelledby="minha-carreira">
      <KidsSectionHeader
        id="minha-carreira"
        title="Minha carreira"
        subtitle="Sua jornada de criador: cada projeto concluído e publicado sobe a escada."
      />

      <div className="kids-carta p-4 md:p-6">
        {/* Escada Faísca → Lenda (universal). */}
        <ol className="flex flex-col gap-3">
          {visible.map((slug, index) => {
            const info = LEVEL_INFO[slug]
            const Icon = info.icon
            const reward = CAREER_REWARD_INFO[slug]
            const done = index < currentIndex
            const current = index === currentIndex
            const next = index === currentIndex + 1
            return (
              <li
                key={slug}
                className={cn(
                  'flex items-start gap-4 rounded-[1.25rem] p-4 md:p-5',
                  current
                    ? 'bg-[color-mix(in_oklab,var(--primary)_7%,var(--card))] ring-2 ring-primary ring-inset'
                    : 'bg-background',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-[0.875rem] md:size-14',
                    current && 'kids-marca',
                  )}
                  // O posto atual é o azul da marca; os outros, a cor do próprio nível, com a
                  // tinta do CARTÃO: branca no claro (as cores de nível são médias) e navy no
                  // escuro (onde elas clareiam), então o par vira sozinho com o tema.
                  style={
                    current ? undefined : { backgroundColor: info.colorVar, color: 'var(--card)' }
                  }
                >
                  {done ? <Check className="size-6" /> : <Icon className="size-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="sz-display text-lg md:text-xl">{info.label}</span>
                    {current ? (
                      <span className={cn(ETIQUETA, 'kids-marca')}>Você está aqui</span>
                    ) : null}
                    {next ? (
                      <span className={cn(ETIQUETA, 'bg-muted text-muted-foreground')}>
                        Próximo nível
                      </span>
                    ) : null}
                  </p>
                  {current ? (
                    <p className="mt-1 font-medium text-[0.8125rem] text-muted-foreground leading-snug">
                      {hint ?? info.blurb}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.8125rem] leading-snug">
                    <span className="font-bold">
                      {done || current ? 'Liberado: ' : 'Ao chegar aqui: '}
                    </span>
                    <span className="text-muted-foreground">{reward.title}</span>
                  </p>
                  {done || current ? (
                    <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                      {reward.description}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
          {/* Os postos que o catálogo ainda não alcança viram UMA linha. Fileira de cadeados
              aqui diria à criança que ela está devendo; o que falta é curso gravado. */}
          {beyond.length > 0 ? (
            <li className="flex items-start gap-4 rounded-[1.25rem] bg-background p-4 md:p-5">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-[0.875rem] bg-muted-foreground text-card md:size-14"
              >
                <Hammer className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="sz-display text-lg md:text-xl">
                    {beyond.length === 1
                      ? 'Mais 1 posto está sendo construído'
                      : `Mais ${beyond.length} postos estão sendo construídos`}
                  </span>
                  <span className={cn(ETIQUETA, 'bg-muted text-muted-foreground')}>
                    Em construção
                  </span>
                </p>
                <p className="mt-1 font-medium text-[0.8125rem] text-muted-foreground leading-snug">
                  {formatLevelNames(beyond)}. Eles aparecem no seu mapa quando os cursos ficarem
                  prontos!
                </p>
              </div>
            </li>
          ) : null}
        </ol>

        {showcaseStats && showcaseStats.published > 0 ? (
          <p className="mt-3 flex items-center gap-3 rounded-[1rem] bg-(--band-menta) px-4 py-3 font-bold text-[0.8125rem]">
            <Gamepad2 className="size-5 shrink-0" aria-hidden />
            <span>
              {showcaseStats.published === 1
                ? 'Você tem 1 jogo no Mural'
                : `Você tem ${showcaseStats.published} jogos no Mural`}
              {showcaseStats.plays === 1
                ? ', jogado 1 vez!'
                : `, jogados ${showcaseStats.plays} vezes!`}
            </span>
          </p>
        ) : null}
      </div>

      {/* Feitos conquistados: universais primeiro, bônus dos apps criativos depois. */}
      {universal.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Feitos da jornada
          </h3>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {universal.map((b) => (
              <FeatCard key={b.slug} slug={b.slug} unlockedAt={b.unlockedAt} />
            ))}
          </ul>
        </div>
      ) : null}
      {product.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Bônus dos apps criativos
          </h3>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:gap-6">
            {product.map((b) => (
              <FeatCard key={b.slug} slug={b.slug} unlockedAt={b.unlockedAt} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
