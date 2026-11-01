'use client'
import {
  type CoursePublicationJobView,
  CoursePublicationJobViewSchema,
  type CoursePublicationOperation,
} from '@sistemazero/core/course/publication'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Progress } from '@sistemazero/ui/progress'
import { useEffect, useId, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '@/lib/api'

const path = '/api/members/course-publications'
const labels = {
  preview: 'Confira o destino',
  queued: 'Na fila',
  preparing: 'Preparando mídias e material do Zappy',
  publishing: 'Publicando o curso',
  completed: 'Curso publicado',
  failed: 'Publicação interrompida',
  cancelled: 'Publicação cancelada',
}
const environment = { local: 'Local', staging: 'Staging', production: 'Produção' }
const quantity = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`
function acceptView(previous: CoursePublicationJobView | null, next: CoursePublicationJobView) {
  if (
    previous?.id === next.id &&
    (previous.version > next.version ||
      (previous.version === next.version && previous.tasks.completed > next.tasks.completed))
  )
    return previous
  return next
}
export function CoursePublicationDialog({
  course,
  operation = 'copy-adult',
  onClose,
  onPublished,
}: {
  operation?: CoursePublicationOperation
  course: { id: string; slug: string; title: string } | null
  onClose(): void
  onPublished(): void
}) {
  const [job, setJob] = useState<CoursePublicationJobView | null>(null)
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState(false)
  const requestKey = useRef('')
  const slugInputId = useId()
  const authority = useRef(0)
  const onPublishedRef = useRef(onPublished)
  const courseId = course?.id
  const courseSlug = course?.slug
  const jobId = job?.id
  const jobStatus = job?.status
  onPublishedRef.current = onPublished
  useEffect(() => {
    const epoch = ++authority.current
    setJob(null)
    setError('')
    setBusy(false)
    setEnabled(false)
    setSlug(courseSlug ? (operation === 'copy-adult' ? `${courseSlug}-adulto` : courseSlug) : '')
    requestKey.current = crypto.randomUUID()
    if (!courseId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void Promise.all([
      apiGet<{ copyAdult: boolean; promoteKids: boolean }>(`${path}/capabilities`, {
        signal: controller.signal,
      }),
      apiGet<{ jobs: CoursePublicationJobView[] }>(
        `${path}?sourceCourseId=${encodeURIComponent(courseId)}&operation=${operation}`,
        { signal: controller.signal },
      ),
    ])
      .then(([capabilities, history]) => {
        if (authority.current !== epoch) return
        setEnabled(operation === 'copy-adult' ? capabilities.copyAdult : capabilities.promoteKids)
        const latest = history.jobs.find(
          (item) => item.operation === operation && item.preview.source.id === courseId,
        )
        if (latest) {
          setJob(CoursePublicationJobViewSchema.parse(latest))
          setSlug(latest.preview.target.slug)
        }
      })
      .catch((cause: ApiError) => {
        if (!controller.signal.aborted && authority.current === epoch)
          setError(cause.message || 'Não foi possível consultar as publicações')
      })
      .finally(() => {
        if (authority.current === epoch) setLoading(false)
      })
    return () => {
      authority.current++
      controller.abort()
    }
  }, [courseId, courseSlug, operation])
  useEffect(() => {
    if (!jobId || !jobStatus || !['queued', 'preparing', 'publishing'].includes(jobStatus)) return
    const epoch = authority.current,
      controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      try {
        const fresh = CoursePublicationJobViewSchema.parse(
          await apiGet(`${path}/${jobId}`, { signal: controller.signal }),
        )
        if (controller.signal.aborted || authority.current !== epoch) return
        setJob((previous) => acceptView(previous, fresh))
        setError('')
        if (fresh.status === 'completed') onPublishedRef.current()
        if (!['queued', 'preparing', 'publishing'].includes(fresh.status)) return
      } catch (cause) {
        if (!controller.signal.aborted && authority.current === epoch)
          setError((cause as ApiError).message || 'Não foi possível atualizar o andamento')
      }
      if (!controller.signal.aborted)
        timer = setTimeout(() => {
          void refresh()
        }, 2500)
    }
    void refresh()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [jobId, jobStatus])
  const send = async (command?: 'approve' | 'resume' | 'cancel') => {
    if (!course || busy) return
    const epoch = authority.current
    setBusy(true)
    setError('')
    try {
      const value =
        command && job
          ? await apiSend(`${path}/${job.id}/${command}`, 'POST', {
              version: job.version,
              planHash: job.planHash,
            })
          : await apiSend(`${path}/preview`, 'POST', {
              operation,
              sourceCourseId: course.id,
              targetSlug: slug.trim(),
              requestKey: requestKey.current,
            })
      if (authority.current !== epoch) return
      const fresh = CoursePublicationJobViewSchema.parse(value)
      setJob((previous) => acceptView(previous, fresh))
    } catch (cause) {
      if (authority.current === epoch)
        setError((cause as ApiError).message || 'Não foi possível concluir o pedido')
    } finally {
      if (authority.current === epoch) setBusy(false)
    }
  }
  return (
    <Dialog
      open={Boolean(course)}
      onClose={onClose}
      title={
        operation === 'copy-adult' ? 'Publicar curso no adulto' : 'Promover Kids para produção'
      }
      description={course?.title}
    >
      <div className="min-w-0 space-y-4 text-sm">
        <p>
          {operation === 'copy-adult'
            ? 'A cópia usa o Kids deste ambiente. Vídeos, materiais e configurações são preparados antes de substituir a grade adulta.'
            : 'A promoção usa o Kids de staging e prepara vídeos, arquivos e vozes nos espaços de produção antes de substituir a grade Kids de produção.'}
        </p>
        {loading ? <p role="status">Consultando publicações</p> : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
          >
            {error}
          </p>
        ) : null}
        {!loading && !enabled ? (
          <p className="rounded-lg border border-border bg-muted p-3">
            Esta publicação ainda não está configurada neste ambiente.
          </p>
        ) : null}
        {!job ? (
          <>
            <Field
              label={
                operation === 'copy-adult'
                  ? 'Endereço do curso adulto'
                  : 'Endereço do curso Kids em produção'
              }
              htmlFor={slugInputId}
              hint="Use letras minúsculas, números e hífens."
            >
              <Input
                id={slugInputId}
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value)
                  requestKey.current = crypto.randomUUID()
                }}
                disabled={busy || loading}
              />
            </Field>
            <Button
              disabled={!enabled || busy || loading || !slug.trim()}
              onClick={() => void send()}
            >
              Conferir destino
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border p-3">
              <p className="font-semibold" role="status">
                {labels[job.status]}
              </p>
              <dl className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Origem</dt>
                  <dd className="break-words">
                    Kids · {environment[job.preview.source.environment]}
                    <br />
                    {job.preview.source.slug}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Destino</dt>
                  <dd className="break-words">
                    {job.preview.target.audience === 'adult' ? 'Adulto' : 'Kids'} ·{' '}
                    {environment[job.preview.target.environment]}
                    <br />
                    {job.preview.target.slug}
                  </dd>
                </div>
              </dl>
              <p className="mt-3">
                {quantity(job.preview.modules, 'módulo', 'módulos')} e{' '}
                {quantity(job.preview.lessons, 'aula', 'aulas')}. O curso{' '}
                {job.status === 'completed'
                  ? job.preview.target.exists
                    ? 'foi atualizado'
                    : 'foi criado'
                  : job.preview.target.exists
                    ? 'será atualizado'
                    : 'será criado'}
                .
              </p>
              <p className="mt-2 text-muted-foreground">
                {quantity(job.preview.retiredModules, 'módulo', 'módulos')} e{' '}
                {quantity(job.preview.retiredLessons, 'aula', 'aulas')}{' '}
                {job.status === 'completed' ? 'foram retirados' : 'serão retirados'} da grade ativa.
                Progresso, conclusões e conquistas dos alunos ficam preservados.
              </p>
              {job.tasks.total > 0 ? (
                <div className="mt-3">
                  <Progress
                    value={job.tasks.completed / job.tasks.total}
                    aria-label="Preparação da publicação"
                  />
                  <p className="mt-1 text-muted-foreground">
                    {job.tasks.completed} de {job.tasks.total} recursos preparados
                  </p>
                </div>
              ) : null}
              {job.error ? (
                <p role="alert" className="mt-3 text-destructive">
                  {job.error}
                </p>
              ) : null}
            </div>
            <p className="text-muted-foreground">
              Você pode fechar esta janela. O trabalho continua no servidor e aparece aqui ao
              reabrir.
            </p>
            <div className="flex flex-wrap gap-2">
              {job.status === 'preview' ? (
                <Button disabled={busy || !enabled} onClick={() => void send('approve')}>
                  Confirmar publicação
                </Button>
              ) : null}
              {job.status === 'failed' ? (
                <Button disabled={busy || !enabled} onClick={() => void send('resume')}>
                  Retomar publicação
                </Button>
              ) : null}
              {['preview', 'queued', 'preparing', 'failed'].includes(job.status) ? (
                <Button variant="outline" disabled={busy} onClick={() => void send('cancel')}>
                  Cancelar trabalho
                </Button>
              ) : null}
              {['completed', 'cancelled', 'failed', 'preview'].includes(job.status) ? (
                <Button
                  variant="outline"
                  disabled={busy || !enabled}
                  onClick={() => {
                    authority.current++
                    setJob(null)
                    setError('')
                    requestKey.current = crypto.randomUUID()
                  }}
                >
                  Preparar nova prévia
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
