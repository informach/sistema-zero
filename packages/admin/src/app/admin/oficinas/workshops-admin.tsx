'use client'

import type {
  LiveCatalogView,
  LiveCohort,
  LiveCourseSummary,
  LiveCreateCohort,
  LiveEnrollment,
} from '@sistemazero/core/live'
import { liveDate, liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Badge, Button, Dialog, Input } from '@sistemazero/ui'
import { CalendarDays, Plus, Radio, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { usePlatform } from '@/components/admin/platform-provider'
import { useConfirm } from '@/components/admin/use-confirm'
import { roomHref } from '@/lib/live-agenda'
import {
  buildSchedule,
  cohortsByCourse,
  LIVE_TIME_ZONES,
  mergeById,
  timeZoneOptions,
} from '@/lib/live-schedule'
import {
  COHORT_STATUS_LABEL,
  cohortPatch,
  type FamilyAccount,
  familyLabel,
  teacherDisplayName,
  teacherSelectionPayload,
} from '@/lib/live-teachers'
import type { CourseView } from '@/lib/types'
import { CourseFormDialog } from '../membros/cursos/course-form-dialog'
import { EnrollmentPicker } from './enrollment-picker'
import { type StaffDirectory, TeacherPicker, useStaffUsers } from './teacher-picker'

const field = 'flex flex-col gap-1.5 text-sm font-medium'
const PLATFORM_NAME = { kids: 'Kids', adult: 'Adultos' } as const

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error && cause.message ? cause.message : fallback

const courseEditorHref = (courseId: string) => `/admin/membros/cursos/${courseId}`

/**
 * Oficinas ao vivo (14/10/2026): a gestão das TURMAS dos cursos ao vivo da plataforma ativa.
 * O conteúdo de cada encontro é uma aula do curso, montada no editor de cursos e aulas de sempre
 * (o roteiro próprio das oficinas saiu). Aqui: criar a turma (curso, datas por aula publicada,
 * professoras, vagas, prazo), editar, inscrições e abrir as inscrições.
 */
export function LiveAdmin({
  teacherId,
  teacherName,
  canWrite,
}: {
  teacherId: string
  teacherName: string
  canWrite: boolean
}) {
  const platform = usePlatform()
  const platformRef = useRef(platform)
  platformRef.current = platform
  const [catalog, setCatalog] = useState<LiveCatalogView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [createdCourse, setCreatedCourse] = useState<CourseView | null>(null)
  const [busy, setBusy] = useState(false)
  const [creatingFor, setCreatingFor] = useState<LiveCourseSummary | null>(null)
  const [settingsFor, setSettingsFor] = useState<LiveCohort | null>(null)
  const [enrollmentsFor, setEnrollmentsFor] = useState<LiveCohort | null>(null)
  const [courseFormOpen, setCourseFormOpen] = useState(false)
  const [revision, setRevision] = useState(0)
  const staff = useStaffUsers(canWrite)

  // Trocar de plataforma troca a lista: diálogos e recados abertos eram da outra.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reinicia ao trocar de plataforma.
  useEffect(() => {
    setCatalog(null)
    setCreatingFor(null)
    setSettingsFor(null)
    setEnrollmentsFor(null)
    setCourseFormOpen(false)
    setNotice(null)
    setCreatedCourse(null)
  }, [platform])
  // ⚠️ Estável: o formulário do curso reinicia sempre que o `prefill` muda de identidade, e um
  // objeto novo a cada render apagaria o que a autora digita.
  const livePrefill = useMemo(() => ({ audience: platform, modality: 'live' as const }), [platform])

  // biome-ignore lint/correctness/useExhaustiveDependencies: uma mutação invalida o catálogo.
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    liveRequest<LiveCatalogView>(
      `/api/admin/live/catalog?audience=${platform}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then(setCatalog)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause, 'Não foi possível carregar.'))
      })
    return () => controller.abort()
  }, [revision, platform])

  async function loadMore() {
    if (!catalog?.nextCursor || busy) return
    setBusy(true)
    const requested = platform
    try {
      const next = await liveRequest<LiveCatalogView>(
        `/api/admin/live/catalog?audience=${requested}&cursor=${catalog.nextCursor}`,
      )
      // A página que chegou depois de trocar a plataforma é da OUTRA lista.
      if (platformRef.current !== requested) return
      setCatalog((previous) =>
        previous
          ? {
              ...next,
              courses: mergeById(previous.courses ?? [], next.courses ?? []),
              cohorts: mergeById(previous.cohorts, next.cohorts),
              sessions: mergeById(previous.sessions, next.sessions),
              enrollments: mergeById(previous.enrollments, next.enrollments),
            }
          : next,
      )
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível carregar o histórico.'))
    } finally {
      setBusy(false)
    }
  }

  async function listAction(callback: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    setCreatedCourse(null)
    try {
      await callback()
      setNotice(success)
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar.'))
    } finally {
      setBusy(false)
    }
  }

  const teacherNames = (cohort: LiveCohort) =>
    cohort.teacherIds
      .map((id) => {
        if (id === teacherId) return 'você'
        const known = cohort.teacherNames?.[id]
        if (known) return known
        const user = staff.users.find((item) => item.id === id)
        return user ? teacherDisplayName(user) : null
      })
      .filter(Boolean)
      .join(', ')

  const courses = catalog?.courses ?? []
  const { byCourse, others } = cohortsByCourse(courses, catalog?.cohorts ?? [])

  function cohortCard(item: LiveCohort) {
    const names = teacherNames(item)
    return (
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
              Até {item.capacity} vagas · {item.accessDays} dias de acesso por encontro ·{' '}
              {names ? `Professoras: ${names}` : `${item.teacherIds.length} professora(s)`}
            </p>
            {item.status === 'draft' ? (
              <p className="text-xs text-muted-foreground">
                Rascunho: as famílias só conseguem se inscrever depois de Abrir inscrições.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEnrollmentsFor(item)}>
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
          {(catalog?.sessions ?? [])
            .filter((session) => session.cohortId === item.id)
            .sort((a, b) => a.order - b.order)
            .map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {session.title} ·{' '}
                  {liveDate(session.occurrenceStartsAt ?? session.startsAt, item.timeZone)}
                </span>
                {/* ⚠️ `<a href>`, nunca `<Link>`: a sala precisa de navegação completa para
                    receber os cabeçalhos dela (ver `roomHref`). */}
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
    )
  }

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Oficinas ao vivo"
        description={`As turmas dos cursos ao vivo de ${PLATFORM_NAME[platform]}. Cada aula publicada do curso vira um encontro da turma; o conteúdo se monta no editor de cursos e aulas.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/professor/ao-vivo"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium"
            >
              <CalendarDays className="size-4" aria-hidden />
              Agenda ao vivo
            </Link>
            {canWrite ? (
              <Button onClick={() => setCourseFormOpen(true)}>
                <Radio className="size-4" aria-hidden />
                Criar curso ao vivo
              </Button>
            ) : null}
          </div>
        }
      />
      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-success/15 p-4 text-sm text-success-foreground">
          {notice}{' '}
          {createdCourse ? (
            <Link
              className="font-medium underline underline-offset-2"
              href={courseEditorHref(createdCourse.id)}
            >
              Montar as aulas de {createdCourse.title}
            </Link>
          ) : null}
        </p>
      ) : null}
      {catalog?.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void loadMore()}>
          Carregar mais turmas e histórico
        </Button>
      )}
      {!catalog ? (
        error ? null : (
          <p role="status">Carregando oficinas…</p>
        )
      ) : (
        <section className="space-y-3" aria-label="Cursos ao vivo">
          {courses.length === 0 ? (
            <div className="space-y-2 rounded-xl border p-5 text-sm text-muted-foreground">
              <p>Ainda não há curso ao vivo em {PLATFORM_NAME[platform]}.</p>
              <p>
                Um curso ao vivo se monta como qualquer curso, no editor de cursos e aulas. Cada
                aula publicada vira um encontro das turmas, e o curso só aparece para as famílias em
                Oficinas.
              </p>
            </div>
          ) : (
            courses.map((course) => (
              <article key={course.id} className="space-y-4 rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{course.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {course.lessons.length === 0
                        ? 'Nenhuma aula publicada ainda'
                        : course.lessons.length === 1
                          ? '1 aula publicada: 1 encontro por turma'
                          : `${course.lessons.length} aulas publicadas: ${course.lessons.length} encontros por turma`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={courseEditorHref(course.id)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
                    >
                      <SquarePen className="size-4" aria-hidden />
                      Editar aulas
                    </Link>
                    {canWrite ? (
                      <Button size="sm" disabled={busy} onClick={() => setCreatingFor(course)}>
                        <Plus className="size-4" aria-hidden />
                        Nova turma
                      </Button>
                    ) : null}
                  </div>
                </div>
                {(byCourse.get(course.id) ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma turma deste curso ainda.</p>
                ) : (
                  (byCourse.get(course.id) ?? []).map(cohortCard)
                )}
              </article>
            ))
          )}
          {others.length > 0 ? (
            <article className="space-y-4 rounded-xl border bg-card p-5">
              <div>
                <h2 className="text-lg font-semibold">Outras turmas</h2>
                <p className="text-sm text-muted-foreground">
                  Turmas que não são de um curso ao vivo listado aqui (como as do roteiro antigo).
                </p>
              </div>
              {others.map(cohortCard)}
            </article>
          ) : null}
        </section>
      )}
      {canWrite ? (
        <CourseFormDialog
          open={courseFormOpen}
          onClose={() => setCourseFormOpen(false)}
          editing={null}
          prefill={livePrefill}
          onSaved={(saved) => {
            setError(null)
            setNotice(
              'Curso ao vivo criado. Monte as aulas no editor: cada aula publicada vira um encontro da turma.',
            )
            setCreatedCourse(saved ?? null)
            setRevision((value) => value + 1)
          }}
        />
      ) : null}
      {creatingFor ? (
        <CohortCreateDialog
          key={creatingFor.id}
          course={creatingFor}
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
            setCreatedCourse(null)
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
    </div>
  )
}

/**
 * Turma nova de um curso ao vivo: um par início/fim por AULA PUBLICADA, no fuso da turma. Curso
 * sem aula publicada não tem encontro para marcar: o diálogo diz o que falta e leva ao editor.
 */
function CohortCreateDialog({
  course,
  currentUser,
  staff,
  onClose,
  onChanged,
}: {
  course: LiveCourseSummary
  currentUser: { id: string; name: string }
  staff: StaffDirectory
  onClose(): void
  onChanged(): void
}) {
  const [zones] = useState(() => timeZoneOptions(Intl.DateTimeFormat().resolvedOptions().timeZone))
  // O fuso do computador só vira o padrão quando é um do Brasil: a turma é de crianças daqui,
  // e um computador em outro fuso marcaria os encontros fora de hora sem ninguém perceber.
  const [timeZone, setTimeZone] = useState(() => {
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
    return LIVE_TIME_ZONES.some((zone) => zone.value === browser) ? browser : 'America/Sao_Paulo'
  })
  const formId = useId()
  const [teacherIds, setTeacherIds] = useState<string[]>(() =>
    currentUser.id ? [currentUser.id] : [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<LiveCohort | null>(null)
  const [opened, setOpened] = useState(false)

  if (course.lessons.length === 0)
    return (
      <Dialog
        open
        onClose={onClose}
        title={`Nova turma de ${course.title}`}
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Link
              href={courseEditorHref(course.id)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Abrir o curso no editor
            </Link>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p role="status">Este curso ainda não tem aula publicada.</p>
          <p className="text-muted-foreground">
            Cada aula publicada vira um encontro da turma, com a data e a hora que você marca aqui.
            Monte e publique as aulas no editor do curso e volte para criar a turma.
          </p>
        </div>
      </Dialog>
    )

  async function submit(data: FormData) {
    const selection = teacherSelectionPayload(teacherIds, staff.users, {
      [currentUser.id]: currentUser.name,
    })
    if (!selection.ok) {
      setError(selection.error)
      return
    }
    const schedule = buildSchedule(
      course.lessons.map((_, index) => ({
        start: String(data.get(`start-${index}`) ?? ''),
        end: String(data.get(`end-${index}`) ?? ''),
      })),
      timeZone,
    )
    if (!schedule.ok) {
      setError(schedule.error)
      return
    }
    // Corpo `LiveCreateCohort` SEM `courseId`: o curso vai na rota.
    const body: Omit<LiveCreateCohort, 'courseId'> = {
      title: String(data.get('title')),
      timeZone,
      capacity: Number(data.get('capacity')),
      accessDays: Number(data.get('days')),
      teacherIds: selection.teacherIds,
      teacherNames: selection.teacherNames,
      schedule: schedule.schedule,
    }
    setBusy(true)
    setError(null)
    try {
      const result = await liveRequest<{ cohort: LiveCohort }>(
        `/api/admin/live/courses/${course.id}/cohorts`,
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
                A turma {created.title} foi criada com um encontro para cada aula publicada do curso
                e ainda é um rascunho.
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
      title={`Nova turma de ${course.title}`}
      description="Uma data e hora para cada aula publicada, no fuso da turma. O prazo de acesso conta a partir de cada encontro."
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
        <label className={field}>
          Fuso da turma
          <select
            name="timeZone"
            className="min-h-10 rounded-lg border bg-background p-2"
            value={timeZone}
            disabled={busy}
            onChange={(event) => setTimeZone(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted-foreground">
            As datas abaixo são lidas neste fuso.
          </span>
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
        {course.lessons.map((lesson, index) => (
          <fieldset
            key={lesson.id}
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
      ...cohort.teacherNames,
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
                audience={cohort.course?.audience}
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
              audience={cohort.course?.audience}
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
