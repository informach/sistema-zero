'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Card } from '@sistemazero/ui/card'
import { Progress } from '@sistemazero/ui/progress'
import { Gamepad2, Lightbulb, MessagesSquare, Palette, Trophy } from 'lucide-react'
import { relativeDayLabel } from '@/lib/format'
import type { ClubeUsage, LearnerToolUsageView, MuralUsage, PensaUsage } from '@/lib/tool-usage'
import type { MemberCourseProgressView } from '@/lib/types'

/**
 * Cartões da Visão geral por TIPO de produto: curso tem BARRA de progresso;
 * ferramenta tem USO (criações/entregas + última atividade); comunidade tem
 * PARTICIPAÇÃO. Todos PUROS (recebem os dados prontos) — a ficha da conta e a
 * futura ficha da criança montam a mesma grade.
 */

function LastActivity({
  iso,
  verb = 'última atividade',
  noneLabel = 'Nunca abriu',
}: {
  iso: string | null
  verb?: string
  /** Copy do "nunca" por tipo de card ("Nunca abriu" não serve p/ comunidade). */
  noneLabel?: string
}) {
  const label = relativeDayLabel(iso)
  if (!label) return <span className="text-muted-foreground text-xs">{noneLabel}</span>
  // "hoje"/"ontem"/"há N dias" seguem cru; data curta ganha o "em".
  const when = /^\d/.test(label) ? `em ${label}` : label
  return (
    <span className="text-muted-foreground text-xs">
      {verb} {when}
    </span>
  )
}

/** Curso real: barra + "X/Y aulas · N%" + última atividade + plataforma. */
export function CourseProgressCard({ course }: { course: MemberCourseProgressView }) {
  const title = course.title ?? course.courseRef
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-sm" title={title}>
            {title}
          </div>
          <LastActivity iso={course.lastActivityAt ?? null} />
        </div>
        {course.audience ? (
          <Badge variant={course.audience === 'kids' ? 'success' : 'muted'}>
            {course.audience === 'kids' ? 'Kids' : 'Adulto'}
          </Badge>
        ) : null}
      </div>
      {/* ⚠️ O Progress do ui recebe 0–1; `percent` do members é 0–100. */}
      <Progress value={course.percent / 100} />
      <div className="text-muted-foreground text-xs">
        {course.completedLessons}/{course.totalLessons} aulas · {course.percent}%
      </div>
    </Card>
  )
}

function UsageCardShell({
  icon: Icon,
  name,
  children,
}: {
  icon: typeof Lightbulb
  name: string
  children: React.ReactNode
}) {
  return (
    <Card className="space-y-1.5 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium text-sm" title={name}>
          {name}
        </span>
      </div>
      {children}
    </Card>
  )
}

function Unavailable() {
  return <p className="text-muted-foreground text-xs">Indisponível agora — tente recarregar.</p>
}

export function PensaUsageCard({ name, usage }: { name: string; usage: PensaUsage }) {
  return (
    <UsageCardShell icon={Lightbulb} name={name}>
      <p className="text-sm">
        {usage.projects} {usage.projects === 1 ? 'plano de jogo' : 'planos de jogo'} ·{' '}
        {usage.cyclesCompleted} {usage.cyclesCompleted === 1 ? 'lançamento' : 'lançamentos'}
      </p>
      <LastActivity iso={usage.lastActivityAt} />
    </UsageCardShell>
  )
}

export function PintaUsageCard({
  name,
  usage,
}: {
  name: string
  usage: { drawings: number; deliveries: number; lastActivityAt: string | null }
}) {
  return (
    <UsageCardShell icon={Palette} name={name}>
      <p className="text-sm">
        {usage.drawings} {usage.drawings === 1 ? 'desenho na nuvem' : 'desenhos na nuvem'} ·{' '}
        {usage.deliveries} {usage.deliveries === 1 ? 'entrega' : 'entregas'}
      </p>
      <LastActivity iso={usage.lastActivityAt} />
    </UsageCardShell>
  )
}

export function EstudioUsageCard({
  name,
  usage,
}: {
  name: string
  usage: { creations: number; deliveries: number; lastActivityAt: string | null }
}) {
  return (
    <UsageCardShell icon={Gamepad2} name={name}>
      <p className="text-sm">
        {usage.creations} {usage.creations === 1 ? 'jogo na nuvem' : 'jogos na nuvem'} ·{' '}
        {usage.deliveries} {usage.deliveries === 1 ? 'entrega' : 'entregas'}
      </p>
      <LastActivity iso={usage.lastActivityAt} />
    </UsageCardShell>
  )
}

export function ClubeUsageCard({ name, usage }: { name: string; usage: ClubeUsage | null }) {
  return (
    <UsageCardShell icon={MessagesSquare} name={name}>
      {usage === null ? (
        <Unavailable />
      ) : (
        <>
          <p className="text-sm">
            {usage.posts} {usage.posts === 1 ? 'conversa' : 'conversas'} · {usage.comments}{' '}
            {usage.comments === 1 ? 'comentário' : 'comentários'}
          </p>
          <LastActivity
            iso={usage.lastActivityAt}
            verb="última participação"
            noneLabel="Nunca participou"
          />
        </>
      )}
    </UsageCardShell>
  )
}

export function MuralUsageCard({ name, usage }: { name: string; usage: MuralUsage | null }) {
  return (
    <UsageCardShell icon={Trophy} name={name}>
      {usage === null ? (
        <Unavailable />
      ) : (
        <>
          <p className="text-sm">
            {usage.published} {usage.published === 1 ? 'jogo publicado' : 'jogos publicados'} ·{' '}
            {usage.plays} {usage.plays === 1 ? 'jogada' : 'jogadas'}
          </p>
          <LastActivity
            iso={usage.lastPublishedAt}
            verb="última publicação"
            noneLabel="Nunca publicou"
          />
        </>
      )}
    </UsageCardShell>
  )
}

/** A grade de ferramentas de UM aprendiz — só os produtos que a FAMÍLIA possui. */
export function ToolUsageGrid({
  usage,
  owned,
}: {
  usage: LearnerToolUsageView
  /** Cartões a mostrar (das matrículas tool/community) com o nome do produto. */
  owned: { kind: 'pensa' | 'pinta' | 'estudio' | 'clube' | 'mural'; name: string }[]
}) {
  if (owned.length === 0) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {owned.map(({ kind, name }) => {
        if (kind === 'pensa') return <PensaUsageCard key={kind} name={name} usage={usage.pensa} />
        if (kind === 'pinta') return <PintaUsageCard key={kind} name={name} usage={usage.pinta} />
        if (kind === 'estudio')
          return <EstudioUsageCard key={kind} name={name} usage={usage.estudio} />
        if (kind === 'clube') return <ClubeUsageCard key={kind} name={name} usage={usage.clube} />
        return <MuralUsageCard key={kind} name={name} usage={usage.mural} />
      })}
    </div>
  )
}
