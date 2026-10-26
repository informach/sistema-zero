'use client'

import type { LearningTopicSummary } from '@sistemazero/core/learning'
import {
  creatorCurrentStage,
  creatorJourneyHint,
  creatorStageChecklist,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  BookOpenCheck,
  CircleCheck,
  CircleSlash,
  Clock,
  Gamepad2,
  Medal,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { ChecklistPills, checklistItems } from '@/components/kids/creator-journey/parts'
import { GameCardDialog } from '@/components/kids/game-card-dialog'
import { levelInfo } from '@/lib/level-info'
import type { ChildDashboardView, ChildWeekGameView } from '@/lib/types'
import { LevelChip, SECONDARY_ACTION, StatTile, StatusChip } from './parent-ui'
import { type ChildrenStats, statsFor } from './use-children-stats'

const TOOL_NAMES: Record<string, string> = {
  'estudio-completo': 'Estúdio',
  pinta: 'Pinta',
  pensa: 'Pensa',
  molda: 'Molda',
}

/** As perguntas para a conversa sobre uma criação (iguais para toda criança). */
export function ConversationCard() {
  return (
    <section
      aria-labelledby="parents-conversation"
      className="flex flex-col gap-2 rounded-(--raio-carta) bg-(--band-lilas) p-5 text-sm"
    >
      <h2 id="parents-conversation" className="flex items-center gap-2 font-extrabold">
        <MessageCircle className="size-4" aria-hidden="true" /> Para conversar sobre uma criação
      </h2>
      <p>Que ideia você quis colocar neste jogo?</p>
      <p>O que precisou testar ou mudar para funcionar?</p>
      <p>O que gostaria de experimentar na próxima versão?</p>
    </section>
  )
}

function WeekCard({ child }: { child: ChildDashboardView }) {
  const [cardGame, setCardGame] = useState<ChildWeekGameView | null>(null)
  const week = child.week
  const games = child.games ?? []
  const topics: LearningTopicSummary[] = child.learningTopics ?? []
  const submissions = week ? (week.submissionsSubmitted ?? week.projectsSubmitted) : 0
  const quiet =
    !week ||
    (week.xpEarned === 0 &&
      week.lessonsCompleted === 0 &&
      week.quizzesPassed === 0 &&
      week.badgesUnlocked === 0 &&
      submissions === 0 &&
      !games.length &&
      !topics.length)
  return (
    <section aria-label="Esta semana" className="kids-carta flex flex-col gap-4 p-6">
      <h2 className="sz-display text-xl">Esta semana</h2>
      {week && !quiet ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile icon={Star} value={`+${week.xpEarned}`} label="XP" color="var(--primary)" />
          <StatTile
            icon={BookOpenCheck}
            value={week.lessonsCompleted}
            label={week.lessonsCompleted === 1 ? 'aula concluída' : 'aulas concluídas'}
            color="var(--level-explorer)"
          />
          <StatTile
            icon={CircleCheck}
            value={week.quizzesPassed}
            label={week.quizzesPassed === 1 ? 'quiz aprovado' : 'quizzes aprovados'}
            color="var(--level-hacker)"
          />
          <StatTile
            icon={Send}
            value={submissions}
            label={submissions === 1 ? 'entrega enviada' : 'entregas enviadas'}
            color="var(--level-coder)"
          />
          <StatTile
            icon={Medal}
            value={week.badgesUnlocked}
            label={week.badgesUnlocked === 1 ? 'medalha nova' : 'medalhas novas'}
            color="var(--kids-ouro-texto)"
          />
          <StatTile
            icon={Gamepad2}
            value={games.length}
            label={games.length === 1 ? 'jogo publicado' : 'jogos publicados'}
            color="var(--level-architect)"
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Sem novidades nesta semana. Que tal criar junto?
        </p>
      )}
      {topics.length ? (
        <div className="rounded-2xl bg-background p-4">
          <p className="font-extrabold text-sm">O que explorou nas aulas</p>
          {topics.map((lesson) => (
            <div key={lesson.lessonId} className="mt-2 text-sm">
              <p>{lesson.lessonTitle}</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {lesson.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-3 text-muted-foreground text-sm">
            Para conversar: “Você pode me mostrar o que descobriu no seu jogo?”
          </p>
        </div>
      ) : null}
      {games.length ? (
        <ul className="flex flex-col gap-2">
          {games.map((game) => (
            <li
              key={`${game.playId ?? game.title}:${game.publishedAt}`}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-(--linha-carta) p-3"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-(--band-lilas)">
                <Gamepad2 className="size-5 text-(--level-elite)" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{game.title}</strong>
                <span className="text-muted-foreground text-xs">Publicado no Mural</span>
              </span>
              {game.playId ? (
                <button
                  type="button"
                  className={SECONDARY_ACTION}
                  onClick={() => setCardGame(game)}
                >
                  <QrCode className="size-4" aria-hidden="true" /> Cartão do jogo
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {cardGame?.playId ? (
        <GameCardDialog
          title={cardGame.title}
          playUrl={`/jogar/${cardGame.playId}`}
          onClose={() => setCardGame(null)}
        />
      ) : null}
    </section>
  )
}

function JourneyCard({ child }: { child: ChildDashboardView }) {
  const career = child.career
  if (!career) return null
  const level = levelInfo(career.level)
  const next = career.nextLevel ? levelInfo(career.nextLevel) : null
  return (
    <section aria-label="Jornada do Criador" className="kids-carta flex flex-col gap-4 p-6">
      <h2 className="sz-display text-xl">Jornada do Criador</h2>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Hoje:</span>
        <LevelChip label={level.label} color={level.colorVar} icon={level.icon} />
        {next ? (
          <>
            <span className="text-muted-foreground text-sm">Próxima conquista:</span>
            <LevelChip label={next.label} color={next.colorVar} icon={next.icon} />
          </>
        ) : null}
      </div>
      {career.curriculum ? (
        <CurriculumProgress view={career.curriculum} />
      ) : next ? (
        <p className="text-muted-foreground text-sm">
          A evolução considera os cursos obrigatórios concluídos e os projetos publicados no Mural.
        </p>
      ) : null}
      {!career.curriculum && career.pendingPublications.length ? (
        <div className="rounded-2xl bg-(--band-amarelo) p-4 text-sm">
          <p className="font-extrabold">Concluiu as aulas e falta publicar o projeto:</p>
          <ul className="mt-1 list-disc pl-5">
            {career.pendingPublications.map((course) => (
              <li key={course.courseSlug}>{course.title}</li>
            ))}
          </ul>
          <p className="mt-2">
            Convide a criança a mostrar o jogo e publicar no Mural, na área dela.
          </p>
        </div>
      ) : null}
    </section>
  )
}

/**
 * No currículo, o que conta para a próxima conquista nas pílulas da tela da criança (cursos da
 * trilha, missão e Poderes). A família lê os mesmos números que a criança.
 */
function CurriculumProgress({
  view,
}: {
  view: NonNullable<NonNullable<ChildDashboardView['career']>['curriculum']>
}) {
  const stage = creatorCurrentStage(view)
  if (!stage) return <p className="text-muted-foreground text-sm">{creatorJourneyHint(view)}</p>
  const list = creatorStageChecklist(stage)
  return (
    <div className="flex flex-col gap-2.5">
      <p className="font-bold text-sm">
        {list.complete
          ? 'Tudo o que conta para a próxima conquista já está feito.'
          : 'O que conta para a próxima conquista:'}
      </p>
      <ChecklistPills items={checklistItems(list, null)} />
      <p className="text-muted-foreground text-sm">
        {view.paused
          ? creatorJourneyHint(view)
          : 'Cada passo é um curso concluído. Extras e publicar no Mural são opcionais.'}
      </p>
    </div>
  )
}

function ToolsCard({ child }: { child: ChildDashboardView }) {
  const tools = child.career?.tools ?? []
  if (!tools.length) return null
  return (
    <section aria-label="Ferramentas" className="kids-carta flex flex-col gap-3 p-5">
      <h2 className="font-extrabold">Ferramentas</h2>
      {tools.map((tool) => (
        <div key={tool.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold">{TOOL_NAMES[tool.id] ?? tool.id}</span>
          {tool.state === 'available' ? (
            <StatusChip tone="ok" icon={ShieldCheck}>
              Liberado
            </StatusChip>
          ) : tool.owned ? (
            <StatusChip tone="neutral" icon={Clock}>
              {tool.requiredLevel
                ? `Libera no ${levelInfo(tool.requiredLevel).label}`
                : 'Esta ferramenta ainda não foi liberada na jornada.'}
            </StatusChip>
          ) : (
            <StatusChip tone="neutral" icon={CircleSlash}>
              Não incluído na conta
            </StatusChip>
          )}
        </div>
      ))}
    </section>
  )
}

function TotalsCard({ child }: { child: ChildDashboardView }) {
  const rows: [string, string][] = [
    ['XP', child.xp.toLocaleString('pt-BR')],
    ['Dias seguidos', `${child.streak.current} (recorde ${child.streak.best})`],
    ['Medalhas', String(child.badgesCount)],
    ['Cursos concluídos', String(child.coursesCompleted)],
    ['Cursos em andamento', String(child.coursesInProgress)],
    ['Entregas', String(child.submissionsCount ?? child.projectsCount)],
  ]
  if (child.rankingPosition !== null) rows.push(['Ranking', `${child.rankingPosition}º lugar`])
  return (
    <section aria-label="No total" className="kids-carta flex flex-col gap-2 p-5 text-sm">
      <h2 className="flex items-center gap-2 font-extrabold">
        <Trophy className="size-4 text-(--sz-hot)" aria-hidden="true" /> No total
      </h2>
      <dl className="flex flex-col divide-y divide-(--linha-carta)">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * O progresso de UMA criança: a semana, a jornada, as ferramentas e os números. É o mesmo na
 * página da criança e no Acompanhamento. `aside` recebe o que mora na coluna da direita além
 * disso (o resumo por e-mail, no Acompanhamento).
 */
export function ChildProgress({
  profileId,
  stats,
  aside,
}: {
  profileId: string
  stats: ChildrenStats
  aside?: React.ReactNode
}) {
  // O `aside` (o resumo por e-mail, no Acompanhamento) aparece em TODO estado: o e-mail manda
  // desligá-lo ali, e uma criança sem atividade ou uma consulta que falhou não podem escondê-lo.
  const child = stats.state === 'ready' ? statsFor(stats, profileId) : null
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div
        className="flex min-w-0 flex-col gap-6"
        aria-busy={stats.state === 'loading' || undefined}
      >
        {stats.state === 'loading' ? (
          <Skeleton className="h-72 rounded-(--raio-carta)" />
        ) : stats.state === 'failed' ? (
          <section role="status" className="kids-carta flex flex-col items-start gap-3 p-6">
            <h2 className="sz-display text-xl">Não conseguimos consultar o acompanhamento</h2>
            <p className="text-muted-foreground text-sm">
              Tente de novo em instantes. Se a sessão dos responsáveis tiver expirado, entre de
              novo.
            </p>
            <button
              type="button"
              className={SECONDARY_ACTION}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Tentar de novo
            </button>
          </section>
        ) : child ? (
          <>
            <WeekCard child={child} />
            <JourneyCard child={child} />
          </>
        ) : (
          <p className="kids-carta p-6 text-muted-foreground text-sm">
            O acompanhamento aparece quando a criança começa as atividades.
          </p>
        )}
      </div>
      <aside className="flex flex-col gap-4">
        {stats.state === 'loading' ? <Skeleton className="h-48 rounded-(--raio-carta)" /> : null}
        {child ? (
          <>
            <TotalsCard child={child} />
            <ToolsCard child={child} />
            <ConversationCard />
          </>
        ) : null}
        {aside}
      </aside>
    </div>
  )
}
