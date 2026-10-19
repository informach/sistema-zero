'use client'

import type { AdultCreatorCapability, AdultJourneyView } from '@sistemazero/core/journey'
import { apiSend } from '@sistemazero/member-shell/lib/api'
import { badgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import type { GamificationMeView, MissionsMeView } from '@sistemazero/member-shell/lib/types'
import { Input } from '@sistemazero/ui/input'
import {
  Armchair,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  Lock,
  type LucideIcon,
  Monitor,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { useAdultGamification } from '@/components/community/gamification-provider'
import { AdultMissions } from '@/components/community/missions'
import { PageBand, PageBody } from '@/components/community/page'
import { FIELD_CONTROL, ProfileField } from '@/components/community/profile/field'
import { cn } from '@/lib/cn'

const CAPABILITY_LABELS: Record<AdultCreatorCapability, string> = {
  studio: 'Estúdio',
  pinta: 'Pinta',
  molda: 'Molda',
  bridge: 'Ponte',
  pro: 'Pro',
  ai: 'IA',
  pensa: 'Pensa',
}

const numberPt = new Intl.NumberFormat('pt-BR')

/** "a, b e c" */
function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`
}

/** `YYYY-MM-DD` (data civil de São Paulo, já resolvida no servidor) → `dd/mm/aaaa`. */
function civilDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

/**
 * O que a etapa em andamento ainda pede, com o nome do curso quando a página o conhece. Sem o nome,
 * a frase conta os cursos (nunca inventa um).
 */
function missingSentence(
  missing: AdultJourneyView['stages'][number]['missing'],
  titles: Record<string, string>,
): string {
  const parts: string[] = []
  let unnamedComplete = 0
  let unnamedShowcase = 0
  for (const item of missing) {
    const title = titles[item.courseId]
    if (!title) {
      if (item.milestone === 'showcase') unnamedShowcase++
      else unnamedComplete++
      continue
    }
    parts.push(
      item.milestone === 'showcase' ? `publicar o jogo de ${title} na Mostra` : `concluir ${title}`,
    )
  }
  const more = parts.length ? 'mais ' : ''
  if (unnamedComplete)
    parts.push(
      unnamedComplete === 1
        ? `concluir ${more}um curso da etapa`
        : `concluir ${more}${unnamedComplete} cursos da etapa`,
    )
  if (unnamedShowcase)
    parts.push(
      unnamedShowcase === 1
        ? `publicar ${more}um jogo na Mostra`
        : `publicar ${more}${unnamedShowcase} jogos na Mostra`,
    )
  return `${joinPt(parts)}.`
}

export function ProgressClient({
  readOnly,
  missions,
  ranking,
  courseTitles,
}: {
  readOnly: boolean
  missions: MissionsMeView | null
  /** A colocação lida pelo servidor (a atualização do cliente não a traz). */
  ranking: GamificationMeView['ranking'] | null
  courseTitles: Record<string, string>
}) {
  const state = useAdultGamification()
  const progress = state?.progress
  const position = progress?.ranking ?? ranking

  return (
    <>
      <PageBand title="Seu progresso" lead="Atividade, conquistas e personalização na comunidade.">
        {progress ? (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={Sparkles}
              label="Experiência"
              value={`${numberPt.format(progress.xp)} XP`}
            />
            <StatTile
              icon={Flame}
              label="Sequência"
              value={`${progress.streak.current} ${progress.streak.current === 1 ? 'dia' : 'dias'}`}
            />
            {progress.coins ? (
              <StatTile
                icon={Coins}
                label="Moedas"
                value={progress.coins.unlimited ? '∞' : numberPt.format(progress.coins.balance)}
              />
            ) : null}
            <Link
              href="/ranking"
              prefetch={false}
              className="sz-card-sm flex flex-col gap-1 p-5 text-foreground no-underline transition-colors hover:border-foreground"
            >
              <TileLabel icon={Trophy} label="Ranking geral" />
              <strong className="sz-display text-[1.6rem]">
                {position ? `${position.position}º lugar` : 'Ver ranking'}
              </strong>
            </Link>
          </div>
        ) : (
          <p role="status" className="mt-3 text-muted-foreground">
            Seu progresso está indisponível agora. Tente atualizar a página.
          </p>
        )}
        {progress && state?.unavailable ? (
          <p role="status" className="text-[0.9rem] text-muted-foreground">
            Não foi possível atualizar. Exibindo o último progresso recebido.
          </p>
        ) : null}
      </PageBand>

      <PageBody className="gap-10">
        {progress?.journey?.configured ? (
          <JourneySection journey={progress.journey} titles={courseTitles} />
        ) : null}
        <AdultMissions initial={missions} readOnly={readOnly} />
        {progress ? <BadgesSection badges={progress.badges} /> : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {progress ? <StreakSection streak={progress.streak} readOnly={readOnly} /> : null}
          <MoreLinks />
        </div>
      </PageBody>
    </>
  )
}

function TileLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
      <Icon className="size-[1.1rem]" aria-hidden />
      {label}
    </span>
  )
}

function StatTile({ icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="sz-card-sm flex flex-col gap-1 p-5">
      <TileLabel icon={icon} label={label} />
      <strong className="sz-display text-[1.6rem]">{value}</strong>
    </div>
  )
}

function JourneySection({
  journey,
  titles,
}: {
  journey: AdultJourneyView
  titles: Record<string, string>
}) {
  const unlocked = journey.capabilities.map((capability) => CAPABILITY_LABELS[capability])
  return (
    <section aria-labelledby="progresso-jornada" className="sz-card flex flex-col gap-5 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-[20rem] flex-col gap-1.5">
          <h2 id="progresso-jornada" className="sz-h2">
            Sua jornada
          </h2>
          <p className="text-muted-foreground">
            Cada etapa pede cursos concluídos e jogos publicados. As etapas liberam ferramentas.
          </p>
        </div>
        {unlocked.length ? (
          <span className="sz-chip sz-chip-ok h-auto whitespace-normal py-1">
            <Check aria-hidden />
            Liberados: {joinPt(unlocked)}
          </span>
        ) : null}
      </div>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {journey.stages.map((stage, index) => {
          const step = `Etapa ${index + 1}`
          if (stage.completed)
            return (
              <li
                key={stage.id}
                className="flex flex-col gap-2.5 rounded-[0.9rem] bg-(--sucesso-tint) p-5"
              >
                <span className="flex items-center gap-2 font-bold text-(--pen-ok-texto)">
                  <CheckCircle2 className="size-5" aria-hidden />
                  {step} · Concluída
                </span>
                <strong className="sz-h3">{stage.title}</strong>
              </li>
            )
          if (stage.available)
            return (
              <li
                key={stage.id}
                className="flex flex-col gap-2.5 rounded-[0.9rem] bg-(--acao-tint) p-5 shadow-[inset_0_0_0_2px_var(--primary)]"
              >
                <span className="flex items-center gap-2 font-bold text-(--acao-texto)">
                  <ArrowRight className="size-5" aria-hidden />
                  {step} · Em andamento
                </span>
                <strong className="sz-h3">{stage.title}</strong>
                {stage.missing.length ? (
                  <p className="text-[0.9rem]">
                    <b>Falta:</b> {missingSentence(stage.missing, titles)}
                  </p>
                ) : null}
              </li>
            )
          return (
            <li key={stage.id} className="flex flex-col gap-2.5 rounded-[0.9rem] bg-background p-5">
              <span className="flex items-center gap-2 font-bold text-muted-foreground">
                <Lock className="size-5" aria-hidden />
                {step}
              </span>
              <strong className="sz-h3">{stage.title}</strong>
              <p className="text-[0.9rem] text-muted-foreground">
                Conclua a etapa anterior para avançar.
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function BadgesSection({ badges }: { badges: GamificationMeView['badges'] }) {
  // O catálogo vem na ordem do members; as conquistadas sobem, sem mudar a ordem entre elas.
  const known = badges
    .map((badge) => ({ badge, info: badgeInfo(badge.slug) }))
    .filter((entry) => entry.info !== null && entry.info !== undefined)
  const sorted = [
    ...known.filter((entry) => entry.badge.unlockedAt),
    ...known.filter((entry) => !entry.badge.unlockedAt),
  ]
  const unlocked = known.filter((entry) => entry.badge.unlockedAt).length
  return (
    <section aria-labelledby="progresso-conquistas" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="progresso-conquistas" className="sz-h2">
          Conquistas
        </h2>
        <span className="text-[0.9rem] text-muted-foreground">
          {unlocked} de {known.length}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {sorted.map(({ badge, info }) => {
          if (!info) return null
          const Icon = info.icon
          return (
            <li
              key={badge.slug}
              className={cn(
                'sz-card-sm flex min-w-0 flex-col gap-1.5 p-4 sm:p-5',
                badge.unlockedAt && 'shadow-[inset_0_0_0_2px_var(--primary)]',
              )}
            >
              <Icon
                className={cn(
                  'size-[1.3rem]',
                  badge.unlockedAt ? 'text-primary' : 'text-muted-foreground',
                )}
                aria-hidden
              />
              <strong className={badge.unlockedAt ? undefined : 'text-muted-foreground'}>
                {info.title}
              </strong>
              <span className="text-[0.9rem] text-muted-foreground">
                {badge.unlockedAt
                  ? `Conquistada em ${new Date(badge.unlockedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
                  : 'Ainda não conquistada'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StreakSection({
  streak,
  readOnly,
}: {
  streak: GamificationMeView['streak']
  readOnly: boolean
}) {
  const state = useAdultGamification()
  const [busy, setBusy] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function mutate(path: string, method: 'POST' | 'PUT', body?: unknown) {
    setBusy(true)
    try {
      await apiSend(path, method, body)
      state?.refresh()
      toast.success('Preferência atualizada.')
    } catch (error) {
      toast.error(
        error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Não foi possível atualizar. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  function vacation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void mutate('/api/members/gamification/vacation', 'PUT', { from, to })
  }

  return (
    <section
      aria-labelledby="progresso-sequencia"
      className="sz-card flex min-w-0 flex-col gap-4 p-6 md:p-8"
    >
      <h2 id="progresso-sequencia" className="sz-h3">
        Sua sequência
      </h2>
      <p>
        Melhor sequência:{' '}
        <b>
          {streak.best} {streak.best === 1 ? 'dia' : 'dias'}
        </b>
        . Protetores disponíveis: <b>{streak.freezesAvailable ?? 0}</b>.
      </p>
      <button
        type="button"
        className="sz-btn-outline max-w-full self-start whitespace-normal py-2 text-left"
        disabled={busy || readOnly}
        onClick={() => void mutate('/api/members/gamification/streak-freeze/buy', 'POST')}
      >
        <ShieldCheck aria-hidden />
        Comprar protetor com moedas
      </button>
      <form onSubmit={vacation} className="flex flex-col gap-3 border-border border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong>Programar uma pausa</strong>
          {streak.onVacation ? (
            <span className="sz-chip sz-chip-acao">
              {streak.vacationUntil
                ? `Em pausa até ${civilDate(streak.vacationUntil)}`
                : 'Em pausa'}
            </span>
          ) : null}
        </div>
        <p className="text-[0.9rem] text-muted-foreground">
          Viagem ou semana corrida: na pausa, a sequência não se perde.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileField id="vacation-from" label="Início da pausa">
            <Input
              id="vacation-from"
              required
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={FIELD_CONTROL}
            />
          </ProfileField>
          <ProfileField id="vacation-to" label="Fim da pausa">
            <Input
              id="vacation-to"
              required
              type="date"
              min={from}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={FIELD_CONTROL}
            />
          </ProfileField>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="sz-btn" disabled={busy || readOnly}>
            Programar pausa
          </button>
          <button
            type="button"
            className="sz-btn-quiet"
            disabled={busy || readOnly}
            onClick={() =>
              void mutate('/api/members/gamification/vacation', 'PUT', { from: null, to: null })
            }
          >
            Encerrar pausa
          </button>
        </div>
      </form>
    </section>
  )
}

const MORE_LINKS: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/ranking', label: 'Ranking e liga', icon: Trophy },
  { href: '/meu-avatar', label: 'Meu avatar 3D', icon: UserRound },
  { href: '/quarto', label: 'Meu espaço 3D', icon: Armchair },
  { href: '/criar', label: 'Ferramentas de criação', icon: Monitor },
]

function MoreLinks() {
  return (
    <section
      aria-labelledby="progresso-mais"
      className="sz-card flex min-w-0 flex-col gap-3 p-6 md:p-8"
    >
      <h2 id="progresso-mais" className="sz-h3">
        Mais da sua conta
      </h2>
      {MORE_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className="sz-soft flex min-h-[3.2rem] items-center gap-3.5 px-4 text-foreground no-underline transition-colors hover:bg-muted"
        >
          <Icon className="size-5 flex-none" aria-hidden />
          <strong className="flex-1">{label}</strong>
          <ChevronRight className="size-5 flex-none" aria-hidden />
        </Link>
      ))}
    </section>
  )
}
