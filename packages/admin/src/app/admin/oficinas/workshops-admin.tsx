'use client'

import type {
  LiveCatalogView,
  LiveCohort,
  LiveCreateCohort,
  LiveEnrollment,
  LiveLessonPlan,
  LiveMaterial,
  LiveProgram,
} from '@sistemazero/core/live'
import { liveDate, liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Button, Input, Textarea } from '@sistemazero/ui'
import { CalendarDays, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { EnrollmentPicker } from './enrollment-picker'
import { LiveStepsEditor } from './live-steps-editor'

type AdminCatalog = Omit<LiveCatalogView, 'programs'> & { programs: LiveProgram[] }
type DraftLesson = LiveLessonPlan & { editorId: string }
const newLesson = (): DraftLesson => ({
  editorId: crypto.randomUUID(),
  title: '',
  instructions: '',
  starterProjectId: null,
  materials: [],
})
const field = 'flex flex-col gap-1.5 text-sm font-medium'

export function LiveAdmin({ teacherId, canWrite }: { teacherId: string; canWrite: boolean }) {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null)
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<LiveProgram | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lessons, setLessons] = useState<DraftLesson[]>(() => [newLesson()])
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<LiveProgram | null>(null)
  const [cohort, setCohort] = useState<LiveCohort | null>(null)
  const [revision, setRevision] = useState(0)
  const formId = useId()
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
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.')
    } finally {
      setBusy(false)
    }
  }
  async function action(callback: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await callback()
      setNotice(success)
      setRevision((value) => value + 1)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.')
      return false
    } finally {
      setBusy(false)
    }
  }
  function edit(program: LiveProgram | null) {
    setEditing(program)
    setTitle(program?.title ?? '')
    setDescription(program?.description ?? '')
    setLessons(
      program?.lessons.map((lesson) => ({
        ...lesson,
        editorId: crypto.randomUUID(),
        materials: [...lesson.materials],
      })) ?? [newLesson()],
    )
  }
  const updateLesson = (index: number, patch: Partial<LiveLessonPlan>) =>
    setLessons((previous) =>
      previous.map((lesson, i) => (i === index ? { ...lesson, ...patch } : lesson)),
    )
  async function importProject(index: number, file: File) {
    await action(async () => {
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
    await action(async () => {
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
          i === index
            ? {
                ...lesson,
                materials: [...lesson.materials, material],
              }
            : lesson,
        ),
      )
    }, 'Material enviado. Salve a oficina para incluí-lo no roteiro.')
  }
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Oficinas ao vivo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o roteiro uma vez. Cada turma guarda suas datas, inscrições e histórico.
          </p>
        </div>
        <Link
          href="/admin/professor/ao-vivo"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
        >
          <CalendarDays className="size-4" />
          Sala do Professor
        </Link>
      </header>
      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl border bg-primary/5 p-4 text-sm">
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
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canWrite ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => edit(program)}
                        >
                          Editar roteiro
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void action(
                              () =>
                                liveRequest(
                                  `/api/admin/live/programs/${program.id}`,
                                  {
                                    expectedRevision: program.revision,
                                    status: program.status === 'published' ? 'draft' : 'published',
                                  },
                                  'PATCH',
                                ),
                              'Visibilidade atualizada.',
                            )
                          }
                        >
                          {program.status === 'published'
                            ? 'Retirar do catálogo'
                            : 'Publicar oficina'}
                        </Button>
                        <Button size="sm" disabled={busy} onClick={() => setSelected(program)}>
                          <Plus className="size-4" />
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
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Até {item.capacity} crianças · {item.accessDays} dias por encontro ·{' '}
                            {item.status === 'open'
                              ? 'Inscrições abertas'
                              : item.status === 'closed'
                                ? 'Inscrições encerradas'
                                : item.status === 'archived'
                                  ? 'Histórico'
                                  : 'Rascunho'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCohort(item)}>
                            Inscrições
                          </Button>
                          {canWrite ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void action(
                                  () =>
                                    liveRequest(
                                      `/api/admin/live/cohorts/${item.id}`,
                                      { status: item.status === 'open' ? 'closed' : 'open' },
                                      'PATCH',
                                    ),
                                  'Turma atualizada.',
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
                              <Link
                                className="font-medium text-primary underline"
                                href={`/admin/professor/ao-vivo/${session.id}`}
                              >
                                Preparar encontro
                              </Link>
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
          onSubmit={async (event) => {
            event.preventDefault()
            if (
              await action(
                () =>
                  liveRequest(
                    editing ? `/api/admin/live/programs/${editing.id}` : '/api/admin/live/programs',
                    {
                      title,
                      description,
                      lessons: lessons.map(({ editorId: _editorId, ...lesson }) => lesson),
                      ...(editing ? { expectedRevision: editing.revision } : {}),
                    },
                    editing ? 'PATCH' : 'POST',
                  ),
                editing
                  ? 'Nova versão do roteiro salva. Turmas existentes mantêm a versão original.'
                  : 'Oficina criada como rascunho.',
              )
            )
              edit(null)
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editing ? `Editar: ${editing.title}` : 'Nova oficina'}
            </h2>
            {editing ? (
              <Button variant="outline" type="button" onClick={() => edit(null)}>
                Cancelar edição
              </Button>
            ) : null}
          </div>
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
              <LiveStepsEditor
                value={lesson.steps}
                disabled={busy}
                onChange={(steps) => updateLesson(index, { steps })}
              />
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                <Upload className="size-4" />
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
                <Upload className="size-4" />
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
                  title={
                    lessons.some((item) => item.continueProjectFrom === index)
                      ? 'Altere os encontros que continuam este projeto antes de remover.'
                      : undefined
                  }
                  onClick={() => {
                    if (lessons.some((item) => item.continueProjectFrom === index)) {
                      setError('Altere os encontros que continuam este projeto antes de remover.')
                      return
                    }
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
                    )
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
          </div>
        </form>
      ) : null}
      {selected ? (
        <CohortForm
          key={selected.id}
          program={selected}
          teacherId={teacherId}
          busy={busy}
          onClose={() => setSelected(null)}
          onSave={async (input) => {
            if (
              await action(
                () => liveRequest(`/api/admin/live/programs/${selected.id}/cohorts`, input),
                'Turma criada com uma cópia do roteiro.',
              )
            )
              setSelected(null)
          }}
        />
      ) : null}
      {cohort ? (
        <EnrollmentPanel cohort={cohort} canWrite={canWrite} onClose={() => setCohort(null)} />
      ) : null}
    </div>
  )
}

function CohortForm({
  program,
  teacherId,
  busy,
  onSave,
  onClose,
}: {
  program: LiveProgram
  teacherId: string
  busy: boolean
  onSave(input: LiveCreateCohort): Promise<void>
  onClose(): void
}) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [scheduleLessons] = useState(() =>
    program.lessons.map((lesson) => ({ ...lesson, fieldId: crypto.randomUUID() })),
  )
  return (
    <form
      className="space-y-4 rounded-xl border-2 border-primary bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        void onSave({
          title: String(data.get('title')),
          timeZone: zone,
          capacity: Number(data.get('capacity')),
          accessDays: Number(data.get('days')),
          teacherIds: [teacherId],
          schedule: program.lessons.map((_, index) => ({
            startsAt: new Date(String(data.get(`start-${index}`))).toISOString(),
            endsAt: new Date(String(data.get(`end-${index}`))).toISOString(),
          })),
        })
      }}
    >
      <h2 className="text-lg font-semibold">Nova turma de {program.title}</h2>
      <p className="text-sm text-muted-foreground">
        Você será a professora responsável. Datas no fuso deste computador: {zone}. O prazo começa
        separadamente em cada encontro.
      </p>
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
      {scheduleLessons.map((lesson, index) => (
        <fieldset key={lesson.fieldId} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
          <legend className="px-2 text-sm font-medium">{lesson.title}</legend>
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
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          Criar turma
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function EnrollmentPanel({
  cohort,
  canWrite,
  onClose,
}: {
  cohort: LiveCohort
  canWrite: boolean
  onClose(): void
}) {
  const [enrollments, setEnrollments] = useState<LiveEnrollment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const [assigning, setAssigning] = useState<LiveEnrollment | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Enrollment mutations invalidate the participant list.
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<LiveEnrollment[] | { enrollments: LiveEnrollment[] }>(
      `/api/admin/live/cohorts/${cohort.id}/enrollments`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((result) => setEnrollments(Array.isArray(result) ? result : result.enrollments))
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
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4 rounded-xl border-2 border-primary bg-card p-5">
      <div className="flex justify-between gap-3">
        <h2 className="text-lg font-semibold">Inscrições · {cohort.title}</h2>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {enrollments.filter((item) => item.status === 'active').length} de {cohort.capacity} vagas
        ocupadas
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {enrollments.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <span>
              {item.learnerName || 'Aguardando perfil'} ·{' '}
              {item.status === 'revoked'
                ? 'Acesso revogado'
                : item.learnerId
                  ? 'Inscrição ativa'
                  : 'Vaga reservada'}
            </span>
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
                onClick={() => {
                  if (
                    window.confirm(
                      'Revogar apenas esta inscrição? Os outros acessos da família permanecem.',
                    )
                  )
                    void mutate(`/api/admin/live/enrollments/${item.id}/revoke`, {})
                }}
              >
                Revogar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        assigning ? (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="font-medium">Vincular a vaga de {assigning.learnerName}</p>
            <EnrollmentPicker
              busy={busy}
              accountId={assigning.accountId}
              onEnroll={async (value) => {
                if (!value.learnerId) {
                  setError('Escolha um perfil de criança para vincular a reserva.')
                  return false
                }
                const success = await mutate(`/api/admin/live/enrollments/${assigning.id}/assign`, {
                  learnerId: value.learnerId,
                })
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
            onEnroll={(value) => mutate(`/api/admin/live/cohorts/${cohort.id}/enrollments`, value)}
          />
        )
      ) : null}
    </section>
  )
}
