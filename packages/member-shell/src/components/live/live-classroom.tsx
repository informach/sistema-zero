'use client'

import type { LiveActivityReport, LiveControl, LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { classroomState, mergeLiveRoomPlan } from '../../lib/live/classroom-state'
import { LiveRequestError, liveDate, liveRequest, resolveLiveDeviceId } from '../../lib/live/client'
import type {
  LiveLessonOutline,
  LiveLessonSlotProps,
  LiveLessonWorkspace,
  LiveSectionReport,
} from '../../lib/live/lesson-slot'
import { teacherSectionControl } from '../../lib/live/sections'
import { LiveLearnerRoom } from './live-learner-room'
import { LegacyCohortNotice } from './live-legacy-notice'
import { LiveMediaPanel } from './live-media-panel'
import { LiveParticipants } from './live-participants'
import { LivePreflight } from './live-preflight'
import { LiveRecordingReview } from './live-recording-review'
import { LiveRecordingStatus } from './live-recording-status'
import { LiveReplacement } from './live-replacement'
import { LiveTeacherControls } from './live-teacher-controls'

export type { LiveLessonSlotProps } from '../../lib/live/lesson-slot'

/**
 * A sala da oficina ao vivo. Desde 14/10/2026 a oficina é um CURSO ao vivo e a sala é o layout da
 * aula gravada: a aula do encontro entra pelo slot `renderLesson` (o Kids e a comunidade adulta
 * passam o player de aula de verdade, o Admin passa a prévia do documento publicado), com a
 * transmissão fixa no alto da coluna da esquerda e as partes conduzidas pela professora.
 *
 * Turma antiga do roteiro (sem `room.lesson`) não monta mais as etapas: cai no recado do formato
 * antigo (as oficinas nunca foram para produção).
 */
export function LiveClassroom({
  sessionId,
  teacher = false,
  renderLesson,
  initialRoom = null,
}: {
  sessionId: string
  teacher?: boolean
  renderLesson?: (props: LiveLessonSlotProps) => ReactNode
  /**
   * A sala lida pela página no servidor: o primeiro quadro já é a sala (sem "Abrindo seu
   * encontro…" pulando para a aula). A consulta segue igual a partir daí.
   */
  initialRoom?: LiveRoomView | null
}) {
  const [room, setRoom] = useState<LiveRoomView | null>(() =>
    initialRoom?.session.id === sessionId ? initialRoom : null,
  )
  const [deviceId, setDeviceId] = useState('')
  const [deviceInitializationFailed, setDeviceInitializationFailed] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const [takeover, setTakeover] = useState(false)
  // O relato da criança (heartbeat): a parte em que ela está, as que concluiu e o salvamento.
  const activity = useRef<LiveActivityReport>({
    stepId: null,
    saveState: 'not-open',
    sectionId: null,
    completedSectionIds: [],
  })
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  const reportSection = useCallback((info: LiveSectionReport) => {
    activity.current.sectionId = info.sectionId
    activity.current.completedSectionIds = info.completedSectionIds.slice(0, 60)
    setCurrentSection(info.sectionId)
  }, [])
  const reportSave = useCallback((saveState: LiveActivityReport['saveState']) => {
    activity.current.saveState = saveState
  }, [])
  const [outline, setOutline] = useState<LiveLessonOutline | null>(null)
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string> | undefined>(undefined)
  const [observedLearner, setObservedLearner] = useState('')
  const [refresh, setRefresh] = useState(0)
  const lastSuccess = useRef(0)
  const roomRef = useRef(room)
  roomRef.current = room
  const endpoint = `/api/live/sessions/${sessionId}`
  const occurrenceState = room?.occurrence?.state
  const acceptRoom = useCallback((next: LiveRoomView) => {
    const previous = roomRef.current
    if (
      previous?.occurrence &&
      next.occurrence?.id === previous.occurrence.id &&
      next.occurrence.version < previous.occurrence.version
    )
      return
    const merged = mergeLiveRoomPlan(previous, next)
    roomRef.current = merged
    setRoom(merged)
    lastSuccess.current = Date.now()
    setStale(false)
  }, [])
  useEffect(() => {
    let active = true
    void resolveLiveDeviceId().then(
      (id) => {
        if (active) setDeviceId(id)
      },
      () => {
        if (active) setDeviceInitializationFailed(true)
      },
    )
    return () => {
      active = false
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Moderation commands restart polling immediately with a fresh snapshot.
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let pending = false
    let failures = 0
    async function poll() {
      if (pending) return
      pending = true
      try {
        // Turma antiga do roteiro: sem plano guardado (esperou antes da liberação), não informa
        // revisão; o servidor omitiria o plano. A turma de curso não tem plano.
        const known =
          roomRef.current?.session.id === sessionId && roomRef.current.plan
            ? roomRef.current.planRevision
            : undefined
        const next = await liveRequest<LiveRoomView>(
          known ? `${endpoint}?planRevision=${encodeURIComponent(known)}` : endpoint,
          undefined,
          'GET',
          controller.signal,
        )
        if (!controller.signal.aborted) {
          failures = 0
          acceptRoom(next)
          setConnectionError(null)
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          // Uma consulta perdida não derruba a sala: só a segunda falha seguida (ou 8 s sem
          // resposta, pelo monitor abaixo) marca "Reconectando…" e desliga a mídia.
          failures += 1
          if (failures >= 2) {
            setStale(true)
            setConnectionError(
              cause instanceof Error ? cause.message : 'A conexão caiu. Seu projeto continua aqui.',
            )
          }
        }
      } finally {
        pending = false
        if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 3000)
      }
    }
    void poll()
    const monitor = setInterval(() => {
      if (lastSuccess.current && Date.now() - lastSuccess.current > 8000) setStale(true)
    }, 1000)
    return () => {
      controller.abort()
      clearTimeout(timer)
      clearInterval(monitor)
    }
  }, [endpoint, sessionId, acceptRoom, refresh])
  const previousOccurrence = useRef<string | undefined>(undefined)
  useEffect(() => {
    const current = room?.occurrence?.id
    if (previousOccurrence.current && current !== previousOccurrence.current) {
      setJoined(false)
      setTakeover(false)
    }
    previousOccurrence.current = current
  }, [room?.occurrence?.id])
  useEffect(() => {
    if (!joined || !deviceId || occurrenceState === 'ended' || occurrenceState === 'cancelled')
      return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function beat() {
      try {
        await liveRequest(
          `${endpoint}/heartbeat`,
          {
            deviceId,
            activity: roomRef.current?.role === 'learner' ? activity.current : undefined,
          },
          'POST',
          controller.signal,
        )
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStale(true)
          const participant = roomRef.current?.occurrence?.participants.find(
            (item) => item.learnerId === roomRef.current?.actorId,
          )
          if (
            cause instanceof LiveRequestError &&
            cause.status === 409 &&
            participant &&
            participant.deviceId !== deviceId
          ) {
            setJoined(false)
            setTakeover(true)
          }
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void beat(), 5000)
      }
    }
    void beat()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [joined, deviceId, endpoint, occurrenceState])
  // As anotações da professora por parte (só na sala dela; nunca chegam à criança). A rota é a da
  // versão PUBLICADA da aula, pelo BFF do Admin.
  const notesLessonId = teacher ? (room?.lesson?.lessonId ?? null) : null
  useEffect(() => {
    if (!notesLessonId) return
    const controller = new AbortController()
    liveRequest<{ notes: Record<string, string> }>(
      `/api/admin/live/lessons/${notesLessonId}/teacher-notes`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((value) => setTeacherNotes(value.notes ?? {}))
      .catch(() => {
        // Sem as anotações a sala segue: quem desenha a aula ainda pode ler as da versão
        // publicada que já tem em mãos.
        if (!controller.signal.aborted) setTeacherNotes(undefined)
      })
    return () => controller.abort()
  }, [notesLessonId])
  async function perform(path: string, body: unknown) {
    setBusy(true)
    setError(null)
    try {
      await liveRequest(`${endpoint}/${path}`, body)
      acceptRoom(await liveRequest<LiveRoomView>(endpoint))
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir.')
      const participant = roomRef.current?.occurrence?.participants.find(
        (item) => item.learnerId === roomRef.current?.actorId,
      )
      if (
        cause instanceof LiveRequestError &&
        cause.status === 409 &&
        path === 'join' &&
        participant &&
        participant.deviceId !== deviceId
      )
        setTakeover(true)
      return false
    } finally {
      setBusy(false)
    }
  }
  async function join() {
    if (await perform('join', { deviceId, takeover })) {
      setJoined(true)
      setTakeover(false)
    }
  }
  const control = (command: LiveControl) =>
    perform('control', { expectedVersion: room?.occurrence?.version, command })
  const { self, isTeacher, admitted, live, supervised, canEnter } = classroomState(
    room,
    deviceId,
    joined,
    stale,
  )
  // ⚠️⚠️ Tudo o que desce para a aula é ESTÁVEL entre as consultas (a cada 3 s a sala chega como
  // objeto novo, com o relógio do servidor e o "visto há pouco" de cada um): comparado pelo
  // conteúdo, senão a aula e o Estúdio re-renderizariam a cada consulta.
  const roomSessionId = room?.session.id
  const roomRole = room?.role
  const roomActor = room?.actorId
  const admittedKey =
    roomRole === 'teacher'
      ? (room?.occurrence?.participants ?? [])
          .filter((item) => item.admission === 'admitted')
          .map((item) => `${item.learnerId}\u0000${item.displayName}`)
          .join('\u0001')
      : ''
  const admittedLearners = useMemo(
    () =>
      admittedKey
        ? admittedKey.split('\u0001').map((item) => {
            const [id = '', name = ''] = item.split('\u0000')
            return { id, name }
          })
        : [],
    [admittedKey],
  )
  // O projeto ao vivo do bloco Estúdio da aula (o player o leva ao `LessonPlayerContextValue`).
  const liveWorkspace = useMemo<LiveLessonWorkspace | undefined>(
    () =>
      roomSessionId && roomRole && roomActor && deviceId
        ? {
            sessionId: roomSessionId,
            role: roomRole,
            actorId: roomActor,
            deviceId,
            learnerId: roomRole === 'teacher' ? observedLearner : roomActor,
            learners: roomRole === 'teacher' ? admittedLearners : undefined,
            onSelectLearner: setObservedLearner,
            onError: setError,
            onSaveStateChange: reportSave,
          }
        : undefined,
    [roomSessionId, roomRole, roomActor, deviceId, observedLearner, admittedLearners, reportSave],
  )
  // A aula da professora: o mesmo cuidado (o palco dela é um elemento só, alimentado por contexto).
  const sectionIdsKey = outline?.sections.map((section) => section.id).join(',') ?? ''
  const teacherControl = teacherSectionControl(room, sectionIdsKey ? sectionIdsKey.split(',') : [])
  const teacherControlKey = teacherControl
    ? `${teacherControl.openedIds.join(',')}|${teacherControl.currentId ?? ''}`
    : ''
  const lessonCourseId = room?.lesson?.courseId
  const lessonCourseSlug = room?.lesson?.courseSlug
  const lessonLessonId = room?.lesson?.lessonId
  const lessonAudience = room?.cohort.course?.audience
  const teacherLesson = useMemo(() => {
    if (!teacher || !renderLesson || !lessonCourseId || !lessonCourseSlug || !lessonLessonId)
      return null
    // Without the device context the shared lesson would mount its recorded-course editor.
    if (!liveWorkspace) return <p role="status">Preparando seu projeto…</p>
    const [opened = '', current = ''] = teacherControlKey ? teacherControlKey.split('|') : []
    return renderLesson({
      lesson: { courseId: lessonCourseId, courseSlug: lessonCourseSlug, lessonId: lessonLessonId },
      stage: TEACHER_STAGE,
      sectionControl: teacherControlKey
        ? { openedIds: opened ? opened.split(',') : [], currentId: current || null }
        : null,
      teacher: true,
      teacherNotes,
      onSectionReport: reportSection,
      liveWorkspace,
      onOutline: setOutline,
      audience: lessonAudience,
    })
  }, [
    teacher,
    renderLesson,
    lessonCourseId,
    lessonCourseSlug,
    lessonLessonId,
    teacherControlKey,
    teacherNotes,
    reportSection,
    liveWorkspace,
    lessonAudience,
  ])
  const teacherStage = useMemo(
    () => ({
      room,
      deviceId,
      stale,
      inside: joined && admitted,
      onError: setError,
      onUpdated: () => setRefresh((value) => value + 1),
    }),
    [room, deviceId, stale, joined, admitted],
  )
  const back = teacher ? '/admin/professor/ao-vivo' : '/oficinas'
  const displayedError = error ?? connectionError
  if (deviceInitializationFailed)
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Link
          href={back}
          className="inline-flex min-h-10 items-center gap-2 font-bold text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar às oficinas
        </Link>
        <p role="alert">
          Não foi possível preparar este aparelho. Recarregue a página para tentar novamente.
        </p>
      </div>
    )
  if (!teacher && (!room || room.role === 'learner'))
    return (
      <LiveLearnerRoom
        room={room}
        deviceId={deviceId}
        joined={joined}
        takeover={takeover}
        stale={stale}
        busy={busy}
        error={error}
        connectionError={connectionError}
        onDismissError={() => setError(null)}
        onRetry={() => setRefresh((value) => value + 1)}
        onJoin={() => void join()}
        perform={perform}
        onError={setError}
        renderLesson={renderLesson}
        liveWorkspace={liveWorkspace}
        onSectionReport={reportSection}
        currentSection={currentSection}
        outline={outline}
        onOutline={setOutline}
      />
    )
  return (
    <div className="space-y-5 p-4 md:p-6">
      <Link href={back} className="inline-flex min-h-10 items-center gap-2 font-bold text-primary">
        <ArrowLeft className="size-4" />
        Voltar às oficinas
      </Link>
      {displayedError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p>{displayedError}</p>
          {error ? (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
              Entendi
            </Button>
          ) : null}
          {!room ? (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
      {!room && !displayedError ? <p role="status">Abrindo seu encontro…</p> : null}
      {room ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary">
                {room.cohort.course?.title ? `${room.cohort.course.title} · ` : ''}
                {room.cohort.title}
              </p>
              <h1 className="sz-display text-2xl font-bold md:text-3xl">{room.session.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {liveDate(room.occurrence?.startsAt ?? room.session.startsAt, room.cohort.timeZone)}{' '}
                · {room.cohort.timeZone}
              </p>
            </div>
            <span className="rounded-full border bg-card px-3 py-1 text-sm font-bold" role="status">
              {stale
                ? 'Reconectando…'
                : live
                  ? 'Ao vivo'
                  : room.occurrence?.state === 'ended'
                    ? 'Encontro encerrado'
                    : 'Encontro marcado'}
            </span>
          </header>
          {!joined ? (
            <div className="space-y-4">
              <LivePreflight />
              {isTeacher && room.occurrence?.state === 'scheduled' ? (
                <LiveTeacherControls
                  room={room}
                  busy={busy}
                  stale={stale}
                  onControl={control}
                  sections={outline?.sections}
                />
              ) : null}
              {canEnter ? (
                <div className="rounded-2xl border bg-card p-5">
                  <p className="mb-3">
                    {takeover
                      ? 'Este encontro está aberto em outro lugar. Continuar aqui encerra a participação anterior.'
                      : 'Tudo pronto? Entre na sala com câmera e microfone desligados.'}
                  </p>
                  <Button disabled={busy || !deviceId || stale} onClick={() => void join()}>
                    {takeover
                      ? 'Continuar aqui'
                      : isTeacher
                        ? 'Entrar como professora'
                        : 'Entrar na sala'}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {joined && !admitted ? (
            <p role="status" className="rounded-xl border bg-card p-5">
              {self?.admission === 'removed'
                ? 'Sua participação foi encerrada pela professora.'
                : 'Você está na recepção. A professora já vai chamar.'}
            </p>
          ) : null}
          {joined && admitted && !supervised && !isTeacher ? (
            <p role="status" className="rounded-xl border bg-amber-50 p-4 text-amber-950">
              A professora está reconectando. Conversa e aparelhos ficam pausados.
            </p>
          ) : null}
          {joined && isTeacher && room.occurrence ? (
            <LiveTeacherControls
              room={room}
              busy={busy}
              stale={stale}
              onControl={control}
              sections={outline?.sections}
            />
          ) : null}
          {joined && isTeacher && room.occurrence ? (
            <LiveParticipants
              room={room}
              disabled={busy || stale}
              onControl={control}
              sections={outline?.sections}
              onObserve={(learnerId) => setObservedLearner(learnerId)}
            />
          ) : null}
          {isTeacher ? (
            <LiveRecordingReview room={room} onUpdated={() => setRefresh((value) => value + 1)} />
          ) : null}
          {room.lesson && room.access.canOpen ? (
            teacherLesson ? (
              <section aria-label="O conteúdo do encontro" className="space-y-4">
                <TeacherStageContext.Provider value={teacherStage}>
                  {teacherLesson}
                </TeacherStageContext.Provider>
              </section>
            ) : null
          ) : room.access.canOpen && !room.lesson ? (
            <LegacyCohortNotice />
          ) : null}
          {isTeacher &&
          room.occurrence &&
          ['ended', 'cancelled'].includes(room.occurrence.state) ? (
            <LiveReplacement room={room} onUpdated={() => setRefresh((value) => value + 1)} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** O palco da professora: o painel de mídia de sempre e o estado da gravação. */
const TeacherStageContext = createContext<{
  room: LiveRoomView | null
  deviceId: string
  stale: boolean
  inside: boolean
  onError(message: string): void
  onUpdated(): void
} | null>(null)

function TeacherStageSlot() {
  const stage = useContext(TeacherStageContext)
  if (!stage?.room || !stage.inside)
    return (
      <section className="grid aspect-video place-items-center rounded-2xl border border-dashed bg-card p-6 text-center">
        <p className="max-w-sm font-semibold text-muted-foreground">
          A transmissão aparece aqui quando você entrar na sala.
        </p>
      </section>
    )
  return (
    <div className="space-y-3">
      <LiveMediaPanel
        room={stage.room}
        deviceId={stage.deviceId}
        stale={stage.stale}
        onError={stage.onError}
      />
      <LiveRecordingStatus room={stage.room} onUpdated={stage.onUpdated} />
    </div>
  )
}
const TEACHER_STAGE = <TeacherStageSlot />
