'use client'

import type {
  LiveCatalogView,
  LiveCohort,
  LiveEnrollment,
  LiveMaterial,
  LiveProgram,
} from '@sistemazero/core/live'
import { LiveRequestError, liveDate, liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Badge, Button, Dialog, Input, Textarea } from '@sistemazero/ui'
import { CalendarDays, Plus, Upload } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { useConfirm } from '@/components/admin/use-confirm'
import { roomHref } from '@/lib/live-agenda'
import {
  defaultLiveStudio,
  type LiveLessonPlanWithStudio,
  type LiveStudioCuration,
} from '@/lib/live-studio-curation'
import {
  COHORT_STATUS_LABEL,
  type CohortCreateBody,
  cohortPatch,
  type FamilyAccount,
  familyLabel,
  teacherDisplayName,
  teacherSelectionPayload,
} from '@/lib/live-teachers'
import { EnrollmentPicker } from './enrollment-picker'
import { LiveStepsEditor } from './live-steps-editor'
import { type StaffDirectory, TeacherPicker, useStaffUsers } from './teacher-picker'

// O catálogo de blocos do Estúdio puxa o Blockly: a curadoria só carrega quando o roteiro abre.
const LiveStudioEditor = dynamic(
  () => import('./live-studio-editor').then((module) => module.LiveStudioEditor),
  { loading: () => <p className="text-sm text-muted-foreground">Carregando o Estúdio…</p> },
)

type AdminCatalog = Omit<LiveCatalogView, 'programs'> & { programs: LiveProgram[] }
type DraftLesson = LiveLessonPlanWithStudio & { editorId: string }
const newLesson = (): DraftLesson => ({
  editorId: crypto.randomUUID(),
  title: '',
  instructions: '',
  starterProjectId: null,
  materials: [],
  studio: defaultLiveStudio(),
})
const field = 'flex flex-col gap-1.5 text-sm font-medium'

/** A forma do rascunho que importa para "tem mudança sem salvar?" (sem os ids de tela). */
export function draftSnapshot(
  title: string,
  description: string,
  lessons: readonly DraftLesson[],
): string {
  return JSON.stringify({
    title,
    description,
    lessons: lessons.map(({ editorId: _editorId, ...lesson }) => lesson),
  })
}

export const REVISION_CONFLICT_MESSAGE =
  'Alguém salvou ou publicou esta oficina enquanto você editava. O seu rascunho continua aqui, sem perder nada. Confira a versão nova na lista acima: ao salvar de novo, o seu rascunho vira a versão mais nova.'

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error && cause.message ? cause.message : fallback

const toDraft = (program: LiveProgram | null): DraftLesson[] =>
  program?.lessons.map((lesson) => ({
    ...lesson,
    editorId: crypto.randomUUID(),
    materials: [...lesson.materials],
  })) ?? [newLesson()]

export function LiveAdmin({
  teacherId,
  teacherName,
  canWrite,
}: {
  teacherId: string
  teacherName: string
  canWrite: boolean
}) {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null)
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<LiveProgram | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lessons, setLessons] = useState<DraftLesson[]>(() => [newLesson()])
  const [baseline, setBaseline] = useState(() => draftSnapshot('', '', [newLesson()]))
  const [busy, setBusy] = useState(false)
  const [creatingFor, setCreatingFor] = useState<LiveProgram | null>(null)
  const [settingsFor, setSettingsFor] = useState<LiveCohort | null>(null)
  const [enrollmentsFor, setEnrollmentsFor] = useState<LiveCohort | null>(null)
  const [revision, setRevision] = useState(0)
  const formId = useId()
  const formHeading = useRef<HTMLHeadingElement>(null)
  const staff = useStaffUsers(canWrite)
  const { confirm, confirmDialog } = useConfirm()
  const dirty = draftSnapshot(title, description, lessons) !== baseline
  // biome-ignore lint/correctness/useExhaustiveDependencies: A successful mutation invalidates the catalog explicitly.
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<AdminCatalog>('/api/admin/live/catalog', undefined, 'GET', controller.signal)
      .then(setCatalog)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [revision])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Importing a template invalidates its selectable list.
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<{ id: string; title: string }[]>(
      '/api/admin/live/templates',
      undefined,
      'GET',
      controller.signal,
    )
      .then(setTemplates)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [revision])
  async function loadMore() {
    if (!catalog?.nextCursor || busy) return
    setBusy(true)
    try {
      const next = await liveRequest<AdminCatalog>(
        `/api/admin/live/catalog?cursor=${catalog.nextCursor}`,
      )
      setCatalog((previous) =>
        previous
          ? {
              ...next,
              cohorts: [
                ...new Map(
                  [...previous.cohorts, ...next.cohorts].map((item) => [item.id, item]),
                ).values(),
              ],
              sessions: [
                ...new Map(
                  [...previous.sessions, ...next.sessions].map((item) => [item.id, item]),
                ).values(),
              ],
              enrollments: [
                ...new Map(
                  [...previous.enrollments, ...next.enrollments].map((item) => [item.id, item]),
                ).values(),
              ],
            }
          : next,
      )
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível carregar o histórico.'))
    } finally {
      setBusy(false)
    }
  }
  /** Ações da LISTA: o recado aparece no topo, junto da lista. */
  async function listAction(callback: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await callback()
      setNotice(success)
      setRevision((value) => value + 1)
      return true
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar.'))
      return false
    } finally {
      setBusy(false)
    }
  }
  /** Ações do ROTEIRO (envio de material, projeto inicial): o recado aparece no formulário. */
  async function formAction(callback: () => Promise<unknown>, success: string) {
    setBusy(true)
    setFormError(null)
    setFormNotice(null)
    try {
      await callback()
      setFormNotice(success)
      return true
    } catch (cause) {
      setFormError(errorMessage(cause, 'Não foi possível salvar.'))
      return false
    } finally {
      setBusy(false)
    }
  }
  function load(program: LiveProgram | null) {
    const nextTitle = program?.title ?? ''
    const nextDescription = program?.description ?? ''
    const nextLessons = toDraft(program)
    setEditing(program)
    setTitle(nextTitle)
    setDescription(nextDescription)
    setLessons(nextLessons)
    setBaseline(draftSnapshot(nextTitle, nextDescription, nextLessons))
    setFormError(null)
  }
  /** O formulário fica no fim da página: abrir a edição rola até ele e leva o foco ao título. */
  function revealForm() {
    requestAnimationFrame(() => {
      const heading = formHeading.current
      heading?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      heading?.focus({ preventScroll: true })
    })
  }
  /** Abrir outro roteiro (ou cancelar a edição) com mudanças sem salvar pede confirmação. */
  function requestEdit(program: LiveProgram | null) {
    if (program && editing?.id === program.id) {
      revealForm()
      return
    }
    const go = () => {
      load(program)
      setFormNotice(null)
      if (program) revealForm()
    }
    if (!dirty) {
      go()
      return
    }
    confirm({
      title: 'Descartar as mudanças sem salvar?',
      message: editing
        ? `As mudanças no roteiro de "${editing.title}" ainda não foram salvas e serão perdidas.`
        : 'A oficina nova ainda não foi salva e será perdida.',
      confirmText: 'Descartar mudanças',
      cancelText: 'Continuar editando',
      confirmVariant: 'destructive',
      onConfirm: go,
    })
  }
  const updateLesson = (index: number, patch: Partial<LiveLessonPlanWithStudio>) =>
    setLessons((previous) =>
      previous.map((lesson, i) => (i === index ? { ...lesson, ...patch } : lesson)),
    )
  async function importProject(index: number, file: File) {
    await formAction(async () => {
      if (file.size > 1_900_000) throw new Error('O projeto inicial deve ter até 1,9 MB.')
      const project = JSON.parse(await file.text())
      const template = await liveRequest<{ id: string; title: string }>(
        '/api/admin/live/templates',
        { project },
      )
      setTemplates((previous) => [...previous, template])
      updateLesson(index, { starterProjectId: template.id })
    }, 'Projeto inicial importado. Salve o roteiro para usá-lo na oficina.')
  }
  async function upload(index: number, file: File) {
    await formAction(async () => {
      if (file.size > 8 * 1024 * 1024) throw new Error('O material deve ter até 8 MB.')
      const body = new FormData()
      body.set('file', file)
      body.set('title', file.name)
      const response = await fetch('/api/media/live-materials', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(120_000),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(result?.error?.message ?? 'O arquivo não foi enviado. Tente novamente.')
      const material = result as LiveMaterial
      setLessons((previous) =>
        previous.map((lesson, i) =>
          i === index ? { ...lesson, materials: [...lesson.materials, material] } : lesson,
        ),
      )
    }, 'Material enviado. Salve a oficina para incluí-lo no roteiro.')
  }
  async function saveProgram() {
    setBusy(true)
    setFormError(null)
    setFormNotice(null)
    const current = editing
    try {
      await liveRequest(
        current ? `/api/admin/live/programs/${current.id}` : '/api/admin/live/programs',
        {
          title,
          description,
          lessons: lessons.map(({ editorId: _editorId, ...lesson }) => lesson),
          ...(current ? { expectedRevision: current.revision } : {}),
        },
        current ? 'PATCH' : 'POST',
      )
      load(null)
      setFormNotice(
        current
          ? 'Nova versão do roteiro salva. Turmas existentes mantêm a versão delas.'
          : 'Oficina criada como rascunho. Use Publicar oficina quando ela estiver pronta para o catálogo.',
      )
      setRevision((value) => value + 1)
    } catch (cause) {
      // ⚠️ Conflito de versão NUNCA descarta o rascunho: relê a versão nova da oficina, mantém o
      // que está na tela e passa a salvar em cima dela. Antes, o rascunho ficava preso para sempre.
      if (current && cause instanceof LiveRequestError && cause.status === 409) {
        const fresh = await liveRequest<AdminCatalog>('/api/admin/live/catalog')
          .then((result) => result.programs.find((program) => program.id === current.id) ?? null)
          .catch(() => null)
        if (fresh && fresh.revision !== current.revision) {
          setEditing(fresh)
          setFormError(REVISION_CONFLICT_MESSAGE)
          setRevision((value) => value + 1)
          return
        }
      }
      setFormError(errorMessage(cause, 'Não foi possível salvar o roteiro.'))
    } finally {
      setBusy(false)
    }
  }
  async function togglePublished(program: LiveProgram) {
    await listAction(async () => {
      const result = await liveRequest<Partial<LiveProgram> | null>(
        `/api/admin/live/programs/${program.id}`,
        {
          expectedRevision: program.revision,
          status: program.status === 'published' ? 'draft' : 'published',
        },
        'PATCH',
      )
      // Publicar só muda a visibilidade: o rascunho aberto passa a salvar sobre a versão nova.
      if (typeof result?.revision === 'number') {
        const nextRevision = result.revision
        setEditing((previous) =>
          previous && previous.id === program.id
            ? { ...previous, revision: nextRevision, status: result.status ?? previous.status }
            : previous,
        )
      }
    }, 'Visibilidade atualizada.')
  }
  const teacherNames = (cohort: LiveCohort) =>
    cohort.teacherIds
      .map((id) => {
        if (id === teacherId) return 'você'
        const user = staff.users.find((item) => item.id === id)
        return user ? teacherDisplayName(user) : null
      })
      .filter(Boolean)
      .join(', ')
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Oficinas ao vivo"
        description="Cadastre o roteiro uma vez. Cada turma guarda suas datas, professoras, inscrições e histórico."
        action={
          <Link
            href="/admin/professor/ao-vivo"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
          >
            <CalendarDays className="size-4" aria-hidden />
            Agenda ao vivo
          </Link>
        }
      />
      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-success/15 p-4 text-sm text-success-foreground">
          {notice}
        </p>
      ) : null}
      {catalog?.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void loadMore()}>
          Carregar mais turmas e histórico
        </Button>
      )}
      {!catalog ? (
        <p role="status">Carregando oficinas…</p>
      ) : (
        <section className="space-y-3" aria-label="Oficinas cadastradas">
          {catalog.programs.length === 0 ? (
            <p className="rounded-xl border p-5 text-muted-foreground">
              Crie a primeira oficina para organizar suas turmas.
            </p>
          ) : (
            catalog.programs.map((program) => (
              <article key={program.id} className="space-y-4 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{program.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {program.lessons.length} encontros ·{' '}
                      {program.status === 'published'
                        ? 'Publicada'
                        : program.status === 'archived'
                          ? 'Arquivada'
                          : 'Rascunho'}{' '}
                      · versão {program.revision}
                      {editing?.id === program.id ? ' · em edição' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canWrite ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => requestEdit(program)}
                        >
                          Editar roteiro
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void togglePublished(program)}
                        >
                          {program.status === 'published'
                            ? 'Retirar do catálogo'
                            : 'Publicar oficina'}
                        </Button>
                        <Button size="sm" disabled={busy} onClick={() => setCreatingFor(program)}>
                          <Plus className="size-4" aria-hidden />
                          Nova turma
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                {catalog.cohorts
                  .filter((item) => item.programId === program.id)
                  .map((item) => (
                    <div key={item.id} className="rounded-lg bg-muted/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="flex flex-wrap items-center gap-2 font-medium">
                            {item.title}
                            <Badge variant={item.status === 'open' ? 'success' : 'muted'}>
                              {COHORT_STATUS_LABEL[item.status]}
                            </Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Até {item.capacity} crianças · {item.accessDays} dias por encontro ·{' '}
                            {teacherNames(item)
                              ? `Professoras: ${teacherNames(item)}`
                              : `${item.teacherIds.length} professora(s)`}
                          </p>
                          {item.status === 'draft' ? (
                            <p className="text-xs text-muted-foreground">
                              Rascunho: as famílias só conseguem se inscrever depois de Abrir
                              inscrições.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEnrollmentsFor(item)}
                          >
                            Inscrições
                          </Button>
                          {canWrite ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => setSettingsFor(item)}
                            >
                              Editar turma
                            </Button>
                          ) : null}
                          {canWrite && item.status !== 'archived' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void listAction(
                                  () =>
                                    liveRequest(
                                      `/api/admin/live/cohorts/${item.id}`,
                                      { status: item.status === 'open' ? 'closed' : 'open' },
                                      'PATCH',
                                    ),
                                  item.status === 'open'
                                    ? 'Inscrições encerradas.'
                                    : 'Inscrições abertas. As famílias já podem se inscrever.',
                                )
                              }
                            >
                              {item.status === 'open' ? 'Encerrar inscrições' : 'Abrir inscrições'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {catalog.sessions
                          .filter((session) => session.cohortId === item.id)
                          .sort((a, b) => a.order - b.order)
                          .map((session) => (
                            <li
                              key={session.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm"
                            >
                              <span>
                                {session.title} ·{' '}
                                {liveDate(
                                  session.occurrenceStartsAt ?? session.startsAt,
                                  item.timeZone,
                                )}
                              </span>
                              {/* ⚠️ `<a href>`, nunca `<Link>`: a sala precisa de navegação
                                  completa para receber os cabeçalhos dela (ver `roomHref`). */}
                              <a
                                className="inline-flex min-h-10 items-center font-medium text-primary underline"
                                href={roomHref(session.id)}
                              >
                                Preparar encontro
                              </a>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </article>
            ))
          )}
        </section>
      )}
      {canWrite ? (
        <form
          className="space-y-4 rounded-xl border bg-card p-5"
          aria-labelledby={`${formId}-heading`}
          onSubmit={(event) => {
            event.preventDefault()
            void saveProgram()
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`${formId}-heading`}
              ref={formHeading}
              tabIndex={-1}
              className="text-lg font-semibold outline-none"
            >
              {editing ? `Editar: ${editing.title}` : 'Nova oficina'}
            </h2>
            {editing ? (
              <Button variant="outline" type="button" onClick={() => requestEdit(null)}>
                Cancelar edição
              </Button>
            ) : null}
          </div>
          {formError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              {formError}
            </p>
          ) : null}
          {formNotice ? (
            <p
              role="status"
              className="rounded-lg bg-success/15 p-3 text-sm text-success-foreground"
            >
              {formNotice}
            </p>
          ) : null}
          <label className={field} htmlFor={`${formId}-title`}>
            Nome da oficina
            <Input
              id={`${formId}-title`}
              required
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className={field} htmlFor={`${formId}-description`}>
            O que a criança vai criar
            <Textarea
              id={`${formId}-description`}
              required
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {lessons.map((lesson, index) => (
            <fieldset
              key={lesson.editorId}
              disabled={busy}
              className="space-y-3 rounded-lg border p-4"
            >
              <legend className="px-2 font-medium">Encontro {index + 1}</legend>
              <label className={field}>
                Nome
                <Input
                  required
                  maxLength={160}
                  value={lesson.title}
                  onChange={(event) => updateLesson(index, { title: event.target.value })}
                />
              </label>
              <label className={field}>
                Passo a passo para criar (também para quem faltar)
                <Textarea
                  required
                  rows={5}
                  maxLength={20000}
                  value={lesson.instructions}
                  onChange={(event) => updateLesson(index, { instructions: event.target.value })}
                />
              </label>
              <label className={field}>
                Projeto deste encontro
                <select
                  className="min-h-10 rounded-lg border bg-background p-2"
                  value={lesson.continueProjectFrom ?? ''}
                  onChange={(event) =>
                    updateLesson(index, {
                      continueProjectFrom:
                        event.target.value === '' ? null : Number(event.target.value),
                      starterProjectId: null,
                    })
                  }
                >
                  <option value="">Criar um projeto independente</option>
                  {lessons.slice(0, index).map((previous, i) => (
                    <option key={previous.editorId} value={i}>
                      Continuar o projeto do encontro {i + 1}: {previous.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={field}>
                Projeto inicial (opcional)
                <select
                  className="min-h-10 rounded-lg border bg-background p-2"
                  disabled={lesson.continueProjectFrom != null}
                  value={lesson.starterProjectId ?? ''}
                  onChange={(event) =>
                    updateLesson(index, { starterProjectId: event.target.value.trim() || null })
                  }
                >
                  <option value="">Começar com um projeto novo</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                <Upload className="size-4" aria-hidden />
                Importar projeto do Estúdio
                <input
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  disabled={lesson.continueProjectFrom != null}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void importProject(index, file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <LiveStudioEditor
                value={lesson.studio}
                onChange={(studio: LiveStudioCuration) => updateLesson(index, { studio })}
              />
              <LiveStepsEditor
                value={lesson.steps}
                disabled={busy}
                onChange={(steps) => updateLesson(index, { steps })}
              />
              <ul className="space-y-2">
                {lesson.materials.map((material) => (
                  <li
                    key={material.id}
                    className="flex items-center justify-between gap-3 rounded border p-2 text-sm"
                  >
                    <span>{material.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() =>
                        updateLesson(index, {
                          materials: lesson.materials.filter((item) => item.id !== material.id),
                        })
                      }
                    >
                      Remover do roteiro
                    </Button>
                  </li>
                ))}
              </ul>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                <Upload className="size-4" aria-hidden />
                Adicionar material
                <input
                  type="file"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void upload(index, file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              {lessons.length > 1 ? (
                <Button
                  variant="outline"
                  type="button"
                  className="ml-2"
                  onClick={() => {
                    if (lessons.some((item) => item.continueProjectFrom === index)) {
                      setFormError(
                        'Altere os encontros que continuam este projeto antes de remover.',
                      )
                      return
                    }
                    confirm({
                      title: `Remover o encontro ${index + 1}?`,
                      message: `"${lesson.title || 'Encontro sem nome'}" sai do roteiro com as etapas, atividades e materiais dele. Turmas já criadas mantêm a cópia delas. A mudança só vale depois que você salvar o roteiro.`,
                      confirmText: 'Remover encontro',
                      confirmVariant: 'destructive',
                      onConfirm: () =>
                        setLessons((previous) =>
                          previous
                            .filter((_, i) => i !== index)
                            .map((item) => ({
                              ...item,
                              continueProjectFrom:
                                item.continueProjectFrom != null && item.continueProjectFrom > index
                                  ? item.continueProjectFrom - 1
                                  : item.continueProjectFrom,
                            })),
                        ),
                    })
                  }}
                >
                  Remover encontro
                </Button>
              ) : null}
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy || lessons.length >= 24}
              onClick={() => setLessons((previous) => [...previous, newLesson()])}
            >
              Adicionar encontro
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar roteiro'}
            </Button>
            {dirty ? (
              <span className="self-center text-sm text-muted-foreground">
                Há mudanças sem salvar.
              </span>
            ) : null}
          </div>
        </form>
      ) : null}
      {creatingFor ? (
        <CohortCreateDialog
          key={creatingFor.id}
          program={creatingFor}
          currentUser={{ id: teacherId, name: teacherName }}
          staff={staff}
          onClose={() => setCreatingFor(null)}
          onChanged={() => setRevision((value) => value + 1)}
        />
      ) : null}
      {settingsFor ? (
        <CohortSettingsDialog
          key={settingsFor.id}
          cohort={settingsFor}
          currentUser={{ id: teacherId, name: teacherName }}
          staff={staff}
          onClose={() => setSettingsFor(null)}
          onSaved={(message) => {
            setSettingsFor(null)
            setNotice(message)
            setRevision((value) => value + 1)
          }}
        />
      ) : null}
      {enrollmentsFor ? (
        <EnrollmentDialog
          cohort={enrollmentsFor}
          canWrite={canWrite}
          onClose={() => setEnrollmentsFor(null)}
        />
      ) : null}
      {confirmDialog}
    </div>
  )
}

function CohortCreateDialog({
  program,
  currentUser,
  staff,
  onClose,
  onChanged,
}: {
  program: LiveProgram
  currentUser: { id: string; name: string }
  staff: StaffDirectory
  onClose(): void
  onChanged(): void
}) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const formId = useId()
  const [teacherIds, setTeacherIds] = useState<string[]>(() =>
    currentUser.id ? [currentUser.id] : [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<LiveCohort | null>(null)
  const [opened, setOpened] = useState(false)
  const [scheduleLessons] = useState(() =>
    program.lessons.map((lesson) => ({ ...lesson, fieldId: crypto.randomUUID() })),
  )
  async function submit(data: FormData) {
    const selection = teacherSelectionPayload(teacherIds, staff.users, {
      [currentUser.id]: currentUser.name,
    })
    if (!selection.ok) {
      setError(selection.error)
      return
    }
    const schedule = program.lessons.map((_, index) => ({
      startsAt: new Date(String(data.get(`start-${index}`))).toISOString(),
      endsAt: new Date(String(data.get(`end-${index}`))).toISOString(),
    }))
    const wrong = schedule.findIndex((item) => Date.parse(item.endsAt) <= Date.parse(item.startsAt))
    if (wrong >= 0) {
      setError(`No encontro ${wrong + 1}, o fim da chamada precisa ser depois do início.`)
      return
    }
    const body: CohortCreateBody = {
      title: String(data.get('title')),
      timeZone: zone,
      capacity: Number(data.get('capacity')),
      accessDays: Number(data.get('days')),
      teacherIds: selection.teacherIds,
      teacherNames: selection.teacherNames,
      schedule,
    }
    setBusy(true)
    setError(null)
    try {
      const result = await liveRequest<{ cohort: LiveCohort }>(
        `/api/admin/live/programs/${program.id}/cohorts`,
        body,
      )
      setCreated(result.cohort)
      onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível criar a turma.'))
    } finally {
      setBusy(false)
    }
  }
  async function openEnrollments() {
    if (!created) return
    setBusy(true)
    setError(null)
    try {
      await liveRequest(`/api/admin/live/cohorts/${created.id}`, { status: 'open' }, 'PATCH')
      setOpened(true)
      onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível abrir as inscrições.'))
    } finally {
      setBusy(false)
    }
  }
  if (created)
    return (
      <Dialog
        open
        onClose={onClose}
        title={opened ? 'Inscrições abertas' : 'Turma criada como rascunho'}
        className="max-w-lg"
        footer={
          opened ? (
            <Button onClick={onClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Agora não
              </Button>
              <Button disabled={busy} onClick={() => void openEnrollments()}>
                {busy ? 'Abrindo…' : 'Abrir inscrições'}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-3 text-sm">
          {opened ? (
            <p role="status">
              A turma {created.title} já aceita inscrições. As famílias encontram a oficina na área
              dos pais.
            </p>
          ) : (
            <>
              <p role="status">
                A turma {created.title} foi criada com uma cópia do roteiro e ainda é um rascunho.
              </p>
              <p className="text-muted-foreground">
                Enquanto for rascunho, as famílias não conseguem se inscrever. Abra as inscrições
                agora ou, se preferir, depois pelo botão Abrir inscrições da turma.
              </p>
            </>
          )}
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    )
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Nova turma de ${program.title}`}
      description={`Datas no fuso deste computador (${zone}). O prazo de acesso conta a partir de cada encontro.`}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy ? 'Criando…' : 'Criar turma'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(new FormData(event.currentTarget))
        }}
      >
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            {error}
          </p>
        ) : null}
        <label className={field}>
          Nome da turma
          <Input name="title" required maxLength={160} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}>
            Vagas
            <Input name="capacity" type="number" min={1} max={8} defaultValue={8} required />
          </label>
          <label className={field}>
            Dias de acesso por encontro
            <Input name="days" type="number" min={1} max={366} defaultValue={30} required />
          </label>
        </div>
        <TeacherPicker
          value={teacherIds}
          onChange={setTeacherIds}
          staff={staff}
          currentUserId={currentUser.id}
          disabled={busy}
        />
        {scheduleLessons.map((lesson, index) => (
          <fieldset
            key={lesson.fieldId}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
            disabled={busy}
          >
            <legend className="px-2 text-sm font-medium">
              Encontro {index + 1}: {lesson.title}
            </legend>
            <label className={field}>
              Início
              <Input name={`start-${index}`} type="datetime-local" required />
            </label>
            <label className={field}>
              Fim da chamada
              <Input name={`end-${index}`} type="datetime-local" required />
            </label>
          </fieldset>
        ))}
      </form>
    </Dialog>
  )
}

function CohortSettingsDialog({
  cohort,
  currentUser,
  staff,
  onClose,
  onSaved,
}: {
  cohort: LiveCohort
  currentUser: { id: string; name: string }
  staff: StaffDirectory
  onClose(): void
  onSaved(message: string): void
}) {
  const formId = useId()
  const [status, setStatus] = useState<LiveCohort['status']>(cohort.status)
  const [teacherIds, setTeacherIds] = useState<string[]>(() => [...cohort.teacherIds])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()
  const archived = cohort.status === 'archived'
  async function save() {
    const selection = teacherSelectionPayload(teacherIds, staff.users, {
      [currentUser.id]: currentUser.name,
    })
    if (!selection.ok) {
      setError(selection.error)
      return
    }
    const body = cohortPatch(cohort, { status, selection })
    if (!body) {
      onClose()
      return
    }
    const send = async () => {
      setBusy(true)
      setError(null)
      try {
        await liveRequest(`/api/admin/live/cohorts/${cohort.id}`, body, 'PATCH')
        onSaved('Turma atualizada.')
      } catch (cause) {
        setError(errorMessage(cause, 'Não foi possível salvar a turma.'))
      } finally {
        setBusy(false)
      }
    }
    if (body.status === 'archived')
      confirm({
        title: 'Arquivar esta turma?',
        message:
          'A turma vira histórico e não pode ser reaberta. Para outra rodada, crie uma turma nova.',
        confirmText: 'Arquivar turma',
        confirmVariant: 'destructive',
        onConfirm: send,
      })
    else await send()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Editar turma ${cohort.title}`}
      className="max-w-xl"
      footer={
        <>
          <Button variant="outline" type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar turma'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            {error}
          </p>
        ) : null}
        <label className={field}>
          Situação
          <select
            className="min-h-10 rounded-lg border bg-background p-2"
            value={status}
            disabled={archived || busy}
            onChange={(event) => setStatus(event.target.value as LiveCohort['status'])}
          >
            <option value="draft">Rascunho (as famílias ainda não veem)</option>
            <option value="open">Inscrições abertas</option>
            <option value="closed">Inscrições encerradas</option>
            <option value="archived">Histórico (arquivada)</option>
          </select>
          {archived ? (
            <span className="text-xs font-normal text-muted-foreground">
              Turma arquivada: o histórico não pode ser reaberto.
            </span>
          ) : null}
        </label>
        <TeacherPicker
          value={teacherIds}
          onChange={setTeacherIds}
          staff={staff}
          currentUserId={currentUser.id}
          disabled={busy}
        />
      </form>
      {confirmDialog}
    </Dialog>
  )
}

function EnrollmentDialog({
  cohort,
  canWrite,
  onClose,
}: {
  cohort: LiveCohort
  canWrite: boolean
  onClose(): void
}) {
  const [enrollments, setEnrollments] = useState<LiveEnrollment[]>([])
  const [families, setFamilies] = useState<Record<string, FamilyAccount>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)
  const [assigning, setAssigning] = useState<LiveEnrollment | null>(null)
  const { confirm, confirmDialog } = useConfirm()
  // biome-ignore lint/correctness/useExhaustiveDependencies: Enrollment mutations invalidate the participant list.
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<LiveEnrollment[] | { enrollments: LiveEnrollment[] }>(
      `/api/admin/live/cohorts/${cohort.id}/enrollments`,
      undefined,
      'GET',
      controller.signal,
    )
      .then(async (result) => {
        const list = Array.isArray(result) ? result : result.enrollments
        setEnrollments(list)
        setLoaded(true)
        const ids = [...new Set(list.map((item) => item.accountId))].slice(0, 100)
        if (!ids.length) return
        // A família é complemento: sem ela, a lista continua com o nome da criança.
        const accounts = await liveRequest<{ accounts: FamilyAccount[] }>(
          '/api/admin/accounts/batch',
          { ids },
          'POST',
          controller.signal,
        ).catch(() => null)
        if (accounts && !controller.signal.aborted)
          setFamilies(Object.fromEntries(accounts.accounts.map((account) => [account.id, account])))
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [cohort.id, version])
  async function mutate(path: string, body: unknown) {
    setBusy(true)
    setError(null)
    try {
      await liveRequest(path, body)
      setVersion((value) => value + 1)
      return true
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar.'))
      return false
    } finally {
      setBusy(false)
    }
  }
  const active = enrollments.filter((item) => item.status === 'active').length
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Inscrições · ${cohort.title}`}
      description={`${active} de ${cohort.capacity} vagas ocupadas · ${COHORT_STATUS_LABEL[cohort.status]}`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {cohort.status === 'draft' ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            A turma ainda é um rascunho: as famílias só conseguem se inscrever depois de Abrir
            inscrições. A equipe pode inscrever crianças por aqui desde já.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!loaded && !error ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando inscrições…
          </p>
        ) : null}
        {loaded && enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma inscrição ainda.</p>
        ) : null}
        <ul className="space-y-2">
          {enrollments.map((item) => {
            const family = familyLabel(families[item.accountId])
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {item.learnerName || 'Aguardando perfil'}{' '}
                    <span className="font-normal text-muted-foreground">
                      ·{' '}
                      {item.status === 'revoked'
                        ? 'Acesso revogado'
                        : item.learnerId
                          ? 'Inscrição ativa'
                          : 'Vaga reservada'}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Família: {family ?? 'responsável não encontrado agora'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canWrite && item.status === 'active' && !item.learnerId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setAssigning(item)}
                    >
                      Vincular criança
                    </Button>
                  ) : null}
                  {canWrite && item.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        confirm({
                          title: `Revogar a inscrição de ${item.learnerName || 'esta vaga'}?`,
                          message:
                            'Só esta inscrição perde o acesso à turma. Os outros acessos da família continuam.',
                          confirmText: 'Revogar inscrição',
                          confirmVariant: 'destructive',
                          onConfirm: async () => {
                            await mutate(`/api/admin/live/enrollments/${item.id}/revoke`, {})
                          },
                        })
                      }
                    >
                      Revogar
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
        {canWrite ? (
          assigning ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">Vincular a vaga de {assigning.learnerName}</p>
              {families[assigning.accountId] ? (
                <p className="text-sm text-muted-foreground">
                  Família: {familyLabel(families[assigning.accountId])}
                </p>
              ) : null}
              <EnrollmentPicker
                key={`${assigning.id}:${families[assigning.accountId]?.email ?? ''}`}
                busy={busy}
                accountId={assigning.accountId}
                accountEmail={families[assigning.accountId]?.email}
                onEnroll={async (value) => {
                  if (!value.learnerId) {
                    setError('Escolha um perfil de criança para vincular a reserva.')
                    return false
                  }
                  const success = await mutate(
                    `/api/admin/live/enrollments/${assigning.id}/assign`,
                    { learnerId: value.learnerId },
                  )
                  if (success) setAssigning(null)
                  return success
                }}
              />
              <Button variant="outline" onClick={() => setAssigning(null)}>
                Cancelar vínculo
              </Button>
            </div>
          ) : (
            <EnrollmentPicker
              busy={busy}
              onEnroll={(value) =>
                mutate(`/api/admin/live/cohorts/${cohort.id}/enrollments`, value)
              }
            />
          )
        ) : null}
      </div>
      {confirmDialog}
    </Dialog>
  )
}
