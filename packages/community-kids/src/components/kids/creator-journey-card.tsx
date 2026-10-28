import {
  creatorCurrentStage,
  creatorEntryCard,
  creatorJourneyHint,
  creatorStageChecklist,
  creatorStageTodo,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import {
  isKidsStaffPreview,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { Flame, Gamepad2, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { canonicalJourneyProgress } from '@/lib/journey-presentation'
import { journeyEarnedRewardInfo } from '@/lib/journey-rewards'
import type { GamificationMeView, MyCourseView } from '@/lib/types'
import { AvatarWithAura } from './avatar-with-aura'
import { ChecklistPills, checklistItems } from './creator-journey/parts'
import { LevelBadge } from './level-badge'

/** A pílula dos números à direita (fogo, XP): a mesma fileira do rodapé do menu. */
const PILULA =
  'inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 font-extrabold text-sm tabular-nums'

/**
 * O avatar da jornada: sem foto, a inicial em AZUL sobre o azul bem clarinho (o
 * desenho das telas-modelo), e não o círculo azul cheio do menu, que aqui brigaria com
 * o selo amarelo do nível logo ao lado.
 */
const AVATAR_CLARO = 'bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))] text-primary'

/**
 * Card "Jornada do Criador" da home (07/2026): UMA narrativa de progressão em
 * vez de números soltos — o selo do posto (o marco central: publicar jogos no Mural), a
 * frase do PRÓXIMO marco (estados da view canônica) e, como secundários,
 * o fogo do streak e o XP. Substituiu o StreakCard (a mensagem do fogo do dia vive aqui
 * agora). `gamification` nulo → placeholder gentil (a home não "encolhe" em silêncio).
 *
 * Desenho das telas-modelo (11/09/2026): cartão branco, o avatar redondo à esquerda,
 * sobretítulo em caixa alta, o selo AMARELO do nível real, a frase em negrito, "Você
 * liberou" e as linhas com ícone; o fogo e o XP em pílulas à direita, visíveis também
 * no celular (antes sumiam abaixo de 640px).
 */
export function CreatorJourneyCard({
  gamification,
  avatarPhotoUrl = null,
  name = null,
  showcaseStats = null,
  courses = [],
}: {
  gamification: GamificationMeView | null
  courses?: MyCourseView[]
  avatarPhotoUrl?: string | null
  /** Nome da criança: a inicial vira o avatar enquanto não há foto. */
  name?: string | null
  /** Jogos publicados no Mural + soma das jogadas (best-effort; null = linha some). */
  showcaseStats?: { published: number; plays: number } | null
}) {
  const journey = kidsJourneyAccess(gamification)
  if (!gamification || !journey || isKidsStaffPreview(journey)) {
    return (
      <section
        aria-label="Minha jornada de criador"
        className="kids-carta flex items-center gap-4 p-5 md:gap-6 md:px-7 md:py-6"
      >
        <AvatarWithAura
          photoUrl={avatarPhotoUrl}
          name={name}
          size="lg"
          className={cn('md:size-[4.5rem]', AVATAR_CLARO)}
          label="Seu avatar"
        />
        <div className="min-w-0 flex-1">
          <p className="sz-display text-xl md:text-2xl">
            {journey ? 'Prévia da equipe' : 'Sua jornada está guardada!'}
          </p>
          <p className="mt-1 font-medium text-[0.9375rem] text-muted-foreground">
            {journey
              ? 'Ferramentas da equipe, sem simular o posto ou as conquistas de uma criança.'
              : 'Não foi possível consultar sua jornada agora. Suas conquistas continuam guardadas.'}
          </p>
        </div>
      </section>
    )
  }

  const { streak, xp, ranking } = gamification
  const reward = journeyEarnedRewardInfo(journey)
  // No currículo, a frase e as pílulas vêm do posto atual: "Para virar X: termine a missão…".
  const curriculum = journey.curriculum ?? null
  const stage = curriculum ? creatorCurrentStage(curriculum) : null
  const nextTitle =
    curriculum && stage
      ? (curriculum.stages[curriculum.stages.indexOf(stage) + 1]?.title ?? 'Lenda')
      : null
  const todo = stage ? creatorStageTodo(stage, 'kids') : null
  const hint = curriculum
    ? curriculum.paused
      ? creatorJourneyHint(curriculum)
      : !stage
        ? 'Você chegou ao topo da jornada! Agora é hora das Maestrias.'
        : todo
          ? `Para virar ${nextTitle}: ${todo}.`
          : creatorJourneyHint(curriculum)
    : canonicalJourneyProgress(journey).hint
  const pills = stage
    ? checklistItems(
        creatorStageChecklist(stage),
        creatorEntryCard(stage.mission, [], courses).lessons,
      )
    : null
  const days = streak.current === 1 ? 'dia' : 'dias'
  const streakMessage = streak.activeToday
    ? 'Fogo de hoje garantido. Continue assim!'
    : streak.current > 0
      ? 'Crie ou aprenda algo hoje para manter o fogo aceso!'
      : 'Conclua uma aula hoje para acender o fogo!'
  // Apagado = o traço azul; aceso = o laranja da marca, cheio (a régua do menu).
  const flameClass = streak.activeToday
    ? 'fill-current text-(--sz-kids-laranja-texto)'
    : 'text-primary'

  return (
    <section
      aria-label="Minha jornada de criador"
      className="kids-carta flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 md:px-7 md:py-6"
    >
      <AvatarWithAura
        photoUrl={avatarPhotoUrl}
        name={name}
        levelSlug={journey.earned.level}
        size="lg"
        className={cn('md:size-[4.5rem]', AVATAR_CLARO)}
        label="Seu avatar"
      />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          Jornada do Criador
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <LevelBadge levelSlug={journey.earned.level} size="sm" variant="destaque" />
          {ranking ? (
            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-xs">
              <Trophy className="size-3.5" aria-hidden />
              {ranking.position}º no ranking
            </span>
          ) : null}
        </div>
        <p className="mt-2.5 font-extrabold text-[0.9375rem] leading-snug">
          {hint ?? 'Seu posto e suas conquistas continuam com você.'}
        </p>
        {pills ? (
          <div className="mt-2.5">
            <ChecklistPills items={pills} />
          </div>
        ) : reward.title ? (
          <p className="mt-1.5 text-[0.8125rem]">
            <span className="font-extrabold text-primary">Conquistas guardadas:</span>{' '}
            <span className="text-muted-foreground">{reward.title}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-muted-foreground text-[0.8125rem]">
            Sua jornada começa nos cursos.
          </p>
        )}
        <p className="mt-2.5 flex items-center gap-2 font-medium text-[0.8125rem] text-muted-foreground">
          <Flame className={cn('size-4 shrink-0', flameClass)} aria-hidden />
          {streakMessage}
        </p>
        {showcaseStats && showcaseStats.published > 0 ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-[0.8125rem] text-muted-foreground">
            <Gamepad2 className="size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {showcaseStats.plays === 1
                ? 'Seus jogos já foram jogados 1 vez!'
                : `Seus jogos já foram jogados ${showcaseStats.plays} vezes!`}
            </span>
            <Link
              href="/perfil"
              prefetch={false}
              className="inline-flex min-h-8 items-center font-extrabold text-primary underline-offset-2 hover:underline any-pointer-coarse:min-h-11"
            >
              Ver minha jornada
            </Link>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 md:w-32 md:flex-col">
        <span className={cn(PILULA, 'bg-(--band-creme)')}>
          <Flame className={cn('size-4 shrink-0', flameClass)} aria-hidden />
          {streak.current} {days}
        </span>
        <span className={cn(PILULA, 'bg-(--band-ceu)')}>
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          {xp} XP
        </span>
      </div>
    </section>
  )
}
