'use client'

import type { CreatorJourneyCurriculum } from '@sistemazero/core/journey'
import { Card } from '@sistemazero/ui/card'
import { CheckCircle2, CircleDashed, Plus, SquarePen, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  CREATOR_GRID_STATE_LABEL,
  type CreatorGridCourse,
  type CreatorGridPower,
  type CreatorGridStage,
  creatorJourneyEditorHref,
  creatorJourneyGrid,
} from '@/lib/creator-journey-grid'
import type { CourseView } from '@/lib/types'

/** Quantos Poderes cada cartão mostra antes do "Ver os outros". */
const POWERS_VISIBLE = 3

const STATE_TONE: Record<CreatorGridCourse['state'], string> = {
  published: 'text-success-foreground',
  draft: 'text-warning',
  archived: 'text-warning',
  missing: 'text-destructive',
}

/**
 * A Jornada do Criador em Cursos (lentes Kids e Adultos): um cartão por posto com as vagas fixas
 * (cursos da trilha 2D e 3D, missão) e as listas que crescem (Poderes e Extras). Clicar num curso
 * abre a edição dele; "Adicionar", "Editar posto" e um vínculo sem curso levam ao editor da
 * jornada já naquele posto. Nada aqui grava: o vínculo é da política publicada.
 */
export function CreatorJourneyGrid({
  curriculum,
  courses,
  loading,
  audience,
  canWrite,
  onEditCourse,
}: {
  curriculum: CreatorJourneyCurriculum
  courses: readonly CourseView[]
  loading: boolean
  audience: string
  canWrite: boolean
  onEditCourse: (course: CourseView) => void
}) {
  const grid = creatorJourneyGrid(curriculum, courses)
  const done = grid.ready === grid.total
  return (
    <Card className="space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl space-y-1">
          <h2 className="font-display font-semibold text-lg">Jornada do Criador</h2>
          <p className="text-muted-foreground text-sm">
            Um cartão por posto. Os cursos da trilha (2D e 3D) e a missão têm vagas fixas; Poderes e
            Extras são listas que crescem. A grade só lê a política publicada:
            {canWrite
              ? ' clique num curso para editá-lo, ou em "Editar posto" para mudar os vínculos.'
              : ' os vínculos mudam no editor da jornada.'}
          </p>
        </div>
        <span
          role="status"
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3 font-semibold text-sm',
            loading
              ? 'bg-muted text-muted-foreground'
              : done
                ? 'bg-success/15 text-success-foreground'
                : 'bg-warning-tint text-warning',
          )}
        >
          {loading
            ? 'Conferindo os cursos…'
            : `${grid.ready} de ${grid.total} ${grid.total === 1 ? 'posto pronto' : 'postos prontos'}`}
        </span>
      </div>

      <ol className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
        {grid.stages.map((stage) => (
          <li key={stage.level}>
            <StageCard
              stage={stage}
              audience={audience}
              canWrite={canWrite}
              loading={loading}
              onEditCourse={onEditCourse}
            />
          </li>
        ))}
      </ol>

      {curriculum.masteries.length ? (
        <section aria-labelledby="grade-maestrias" className="space-y-2 border-t pt-4">
          <h3 id="grade-maestrias" className="font-semibold text-sm">
            Maestrias · depois dos postos
          </h3>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {curriculum.masteries.map((area) => (
              <li key={area.id}>
                <Link
                  href={creatorJourneyEditorHref(audience, area.id)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-background px-3 text-sm hover:border-primary"
                >
                  {area.title}
                  <span className="text-muted-foreground text-xs">
                    · {area.levels.length} níveis
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  )
}

function StageCard({
  stage,
  audience,
  canWrite,
  loading,
  onEditCourse,
}: {
  stage: CreatorGridStage
  audience: string
  canWrite: boolean
  loading: boolean
  onEditCourse: (course: CourseView) => void
}) {
  const editor = creatorJourneyEditorHref(audience, stage.level)
  const row = (tag: string, item: CreatorGridCourse, extra?: ReactNode) => (
    <CourseRow
      key={item.courseId}
      tag={tag}
      item={item}
      editor={editor}
      canWrite={canWrite}
      loading={loading}
      onEditCourse={onEditCourse}
      extra={extra}
    />
  )
  const powerRow = (power: CreatorGridPower) => (
    <PowerRow
      key={power.mechanicId}
      power={power}
      editor={editor}
      canWrite={canWrite}
      loading={loading}
      onEditCourse={onEditCourse}
    />
  )
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border bg-card p-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2.5 font-semibold">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs"
          >
            {stage.position}
          </span>
          <span className="truncate">{stage.title}</span>
        </h3>
        {loading ? null : stage.ready ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-success-foreground text-xs">
            <CheckCircle2 aria-hidden className="size-3.5" /> Pronto
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <CircleDashed aria-hidden className="size-3.5" /> Falta completar
          </span>
        )}
      </header>

      {!loading && stage.warnings.length ? (
        <ul className="m-0 list-none space-y-1.5 p-0">
          {stage.warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive text-xs"
            >
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <Group title="Cursos da trilha">
        {row('2D', stage.base2d)}
        {row('3D', stage.base3d)}
      </Group>
      <Group title="Missão">{row('M', stage.mission)}</Group>
      <Group
        title="Poderes"
        aside={`${stage.minimumPowers} ${stage.minimumPowers === 1 ? 'exigido' : 'exigidos'} · ${stage.publishedPowers} ${stage.publishedPowers === 1 ? 'publicado' : 'publicados'}`}
      >
        {stage.powers.length ? (
          stage.powers.slice(0, POWERS_VISIBLE).map(powerRow)
        ) : (
          <p className="px-1 text-muted-foreground text-xs">Nenhum Poder neste posto ainda.</p>
        )}
        {stage.powers.length > POWERS_VISIBLE ? (
          <details className="group/poderes">
            <summary className="flex min-h-9 cursor-pointer list-none items-center px-1 text-primary text-xs underline-offset-4 hover:underline group-open/poderes:hidden">
              {stage.powers.length - POWERS_VISIBLE === 1
                ? 'Ver o outro Poder'
                : `Ver os outros ${stage.powers.length - POWERS_VISIBLE} Poderes`}
            </summary>
            <div className="space-y-1.5">{stage.powers.slice(POWERS_VISIBLE).map(powerRow)}</div>
          </details>
        ) : null}
        {canWrite ? <AddLink href={editor}>Adicionar Poder</AddLink> : null}
      </Group>
      <Group title="Extras" aside="não contam para subir">
        {stage.extras.length ? (
          stage.extras.map((extra) => row('E', extra))
        ) : (
          <p className="px-1 text-muted-foreground text-xs">Nenhum extra neste posto.</p>
        )}
        {canWrite ? <AddLink href={editor}>Adicionar extra</AddLink> : null}
      </Group>

      <footer className="mt-auto border-t pt-3">
        <Link
          href={editor}
          className="inline-flex min-h-10 items-center gap-1.5 font-medium text-primary text-sm underline-offset-4 hover:underline"
        >
          <SquarePen aria-hidden className="size-4" />
          {canWrite ? 'Editar posto' : 'Ver o posto no editor'}
        </Link>
      </footer>
    </article>
  )
}

function Group({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
        {aside ? <span className="text-muted-foreground text-xs">{aside}</span> : null}
      </div>
      {children}
    </section>
  )
}

function AddLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1 px-1 font-medium text-primary text-xs underline-offset-4 hover:underline"
    >
      <Plus aria-hidden className="size-3.5" />
      {children}
    </Link>
  )
}

const ROW =
  'flex w-full min-w-0 items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-left text-xs'

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-5 min-w-6 shrink-0 place-items-center rounded-md bg-background px-1 font-bold font-mono text-[10px]">
      {children}
    </span>
  )
}

function StateText({ state, loading }: { state: CreatorGridCourse['state']; loading: boolean }) {
  if (loading) return <span className="shrink-0 text-muted-foreground">…</span>
  return (
    <span className={cn('shrink-0', STATE_TONE[state])}>{CREATOR_GRID_STATE_LABEL[state]}</span>
  )
}

function CourseRow({
  tag,
  item,
  editor,
  canWrite,
  loading,
  onEditCourse,
  extra,
}: {
  tag: string
  item: CreatorGridCourse
  editor: string
  canWrite: boolean
  loading: boolean
  onEditCourse: (course: CourseView) => void
  extra?: ReactNode
}) {
  const inner = (
    <>
      <Tag>{tag}</Tag>
      <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
      {extra}
      <StateText state={item.state} loading={loading} />
    </>
  )
  if (item.course && canWrite)
    return (
      <button
        type="button"
        onClick={() => item.course && onEditCourse(item.course)}
        className={cn(ROW, 'min-h-9 transition-colors hover:bg-muted')}
        title={`Editar ${item.title}`}
      >
        {inner}
      </button>
    )
  if (!item.course && !loading)
    return (
      <Link
        href={editor}
        className={cn(ROW, 'min-h-9 transition-colors hover:bg-muted')}
        title="Escolher outro curso no editor da jornada"
      >
        {inner}
      </Link>
    )
  return <div className={cn(ROW, 'min-h-9')}>{inner}</div>
}

function PowerRow({
  power,
  editor,
  canWrite,
  loading,
  onEditCourse,
}: {
  power: CreatorGridPower
  editor: string
  canWrite: boolean
  loading: boolean
  onEditCourse: (course: CourseView) => void
}) {
  // A versão que representa o Poder: a publicada, senão a primeira. As outras viram etiquetas.
  const primary = power.courses.find((item) => item.state === 'published') ?? power.courses[0]
  const tracks = [
    ...new Set(power.courses.flatMap((item) => (item.course?.track ? [item.course.track] : []))),
  ]
    .sort()
    .map((track) => track.toUpperCase())
  const state = power.published ? 'published' : (primary?.state ?? 'missing')
  const extra = (
    <>
      {tracks.length ? (
        <span className="shrink-0 text-muted-foreground">{tracks.join(' e ')}</span>
      ) : null}
      {power.courses.length > 1 ? (
        <span className="shrink-0 text-muted-foreground">{power.courses.length} versões</span>
      ) : null}
    </>
  )
  if (!primary)
    return (
      <Link href={editor} className={cn(ROW, 'min-h-9 hover:bg-muted')}>
        <Tag>P</Tag>
        <span className="min-w-0 flex-1 truncate text-foreground">{power.title}</span>
        <span className="shrink-0 text-destructive">Sem curso</span>
      </Link>
    )
  return (
    <CourseRow
      tag="P"
      item={{ ...primary, title: power.title, state }}
      editor={editor}
      canWrite={canWrite}
      loading={loading}
      onEditCourse={onEditCourse}
      extra={extra}
    />
  )
}
