'use client'

import type { LiveActivityReport, LiveControl, LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ArrowLeft, Download, Hand, LifeBuoy, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { classroomState, mergeLiveRoomPlan } from '../../lib/live/classroom-state'
import { LiveRequestError, liveDate, liveDeviceId, liveRequest } from '../../lib/live/client'
import { LiveGuidancePointer } from './live-guidance'
import { LiveLearningActivities } from './live-learning-activities'
import { LiveMediaPanel } from './live-media-panel'
import { LiveParticipants } from './live-participants'
import { LivePreflight } from './live-preflight'
import { LiveRecordingReview } from './live-recording-review'
import { LiveRecordingStatus } from './live-recording-status'
import { LiveReplacement } from './live-replacement'
import { LiveReplay } from './live-replay'
import { LiveWorkspace } from './live-workspace'

export function LiveClassroom({
  sessionId,
  teacher = false,
}: {
  sessionId: string
  teacher?: boolean
}) {
  const [room, setRoom] = useState<LiveRoomView | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const [takeover, setTakeover] = useState(false)
  const [message, setMessage] = useState('')
  const [panel, setPanel] = useState<'chat' | 'materials'>('chat')
  const [mobileView, setMobileView] = useState<'lesson' | 'studio'>('lesson')
  const activity = useRef<LiveActivityReport>({ stepId: null, saveState: 'not-open' })
  const reportStep = useCallback((stepId: string | null) => {
    activity.current.stepId = stepId
  }, [])
  const reportSave = useCallback((saveState: LiveActivityReport['saveState']) => {
    activity.current.saveState = saveState
  }, [])
  const [observedLearner, setObservedLearner] = useState('')
  const workspaceArea = useRef<HTMLDivElement>(null)
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
    setDeviceId(liveDeviceId())
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Moderation commands restart polling immediately with a fresh snapshot.
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let pending = false
    async function poll() {
      if (pending) return
      pending = true
      try {
        const known =
          roomRef.current?.session.id === sessionId ? roomRef.current.planRevision : undefined
        const next = await liveRequest<LiveRoomView>(
          known ? `${endpoint}?planRevision=${encodeURIComponent(known)}` : endpoint,
          undefined,
          'GET',
          controller.signal,
        )
        if (!controller.signal.aborted) {
          acceptRoom(next)
          setConnectionError(null)
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setStale(true)
          setConnectionError(
            cause instanceof Error ? cause.message : 'A conexão caiu. Seu projeto continua aqui.',
          )
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
  const { self, isTeacher, admitted, live, supervised, canInteract, canEnter, canSendChat } =
    classroomState(room, deviceId, joined, stale)
  const back = teacher ? '/admin/professor/ao-vivo' : '/oficinas'
  const displayedError = error ?? connectionError
  return (
    <div className="space-y-5 p-4 md:p-6">
      {room?.role === 'learner' ? (
        <LiveGuidancePointer
          guidance={room.occurrence?.guidance}
          actorId={room.actorId}
          serverTime={room.serverTime}
          onReveal={(target) => {
            if (target.startsWith('studio-')) setMobileView('studio')
          }}
        />
      ) : null}
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
              <p className="text-sm font-bold text-primary">{room.cohort.title}</p>
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
          <p className="text-sm text-muted-foreground">
            {room.access.status === 'scheduled'
              ? `As atividades abrem em ${liveDate(room.access.startsAt, room.cohort.timeZone)}.`
              : room.access.status === 'expired' || room.access.status === 'revoked'
                ? 'O acesso a este encontro terminou. As suas criações continuam no seu espaço, conforme o acesso da sua conta.'
                : `Atividades e gravação disponíveis até ${liveDate(room.access.endsAt, room.cohort.timeZone)}.`}
          </p>
          {!joined ? (
            <div className="space-y-4">
              <LivePreflight />
              {isTeacher && room.occurrence?.state === 'scheduled' ? (
                <div className="space-y-3 rounded-2xl border bg-card p-5">
                  <p>A recepção pode abrir quinze minutos antes do encontro.</p>
                  <Button
                    disabled={busy || stale}
                    onClick={() => void control({ kind: 'open-lobby' })}
                  >
                    Abrir recepção
                  </Button>
                </div>
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
              A professora está reconectando. Conversa e aparelhos ficam pausados; você pode
              continuar sua criação.
            </p>
          ) : null}
          {joined && isTeacher && room.occurrence ? (
            <section
              className="space-y-3 rounded-2xl border bg-card p-4"
              aria-label="Organização da sala"
            >
              <div className="flex flex-wrap items-center gap-2">
                {room.occurrence.state === 'lobby' ? (
                  <Button disabled={busy || stale} onClick={() => void control({ kind: 'start' })}>
                    Começar encontro
                  </Button>
                ) : null}
                {live ? (
                  <Button
                    variant="outline"
                    disabled={busy || stale}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Encerrar a chamada para toda a turma? As atividades permanecem disponíveis pelo prazo de cada encontro.',
                        )
                      )
                        void control({ kind: 'end' })
                    }}
                  >
                    Encerrar encontro
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  disabled={busy || stale}
                  onClick={() => void control({ kind: 'mute', learnerId: null })}
                >
                  Silenciar todos agora
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || stale}
                  onClick={() => void control({ kind: 'lower-hands', learnerId: null })}
                >
                  Abaixar todas as mãos
                </Button>
                <label className="flex items-center gap-2 text-sm font-bold">
                  Microfones
                  <select
                    className="min-h-10 rounded-lg border bg-background p-2"
                    value={room.occurrence.speakingMode}
                    disabled={busy || stale}
                    onChange={(event) =>
                      void control({
                        kind: 'speaking-mode',
                        mode: event.target.value as 'open' | 'turns' | 'listen',
                      })
                    }
                  >
                    <option value="open">Conversa aberta</option>
                    <option value="turns">Uma pessoa por vez</option>
                    <option value="listen">Ouvir a explicação</option>
                  </select>
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Liberar o microfone permite que a criança o ligue. Não liga o aparelho por ela.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-sm font-bold">Apontar para a turma:</span>
                {(
                  [
                    ['studio-run', 'Executar projeto'],
                    ['studio-stop', 'Parar projeto'],
                    ['studio-blocks', 'Blocos'],
                    ['studio-code', 'Código'],
                    ['studio-save', 'Guardar projeto'],
                    ['room-hand', 'Levantar a mão'],
                    ['room-help', 'Pedir ajuda'],
                  ] as const
                ).map(([target, label]) => (
                  <Button
                    key={target}
                    size="sm"
                    variant="outline"
                    disabled={busy || stale || !live}
                    onClick={() => void control({ kind: 'guide', target, learnerId: null })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
          {joined && isTeacher && room.occurrence ? (
            <LiveParticipants
              room={room}
              disabled={busy || stale || !live}
              onControl={control}
              onObserve={(learnerId) => {
                setObservedLearner(learnerId)
                setMobileView('studio')
                requestAnimationFrame(() =>
                  workspaceArea.current?.scrollIntoView({ block: 'start', behavior: 'auto' }),
                )
              }}
            />
          ) : null}
          {room.plan && room.access.canOpen ? (
            <section aria-label="Atividade do encontro" className="space-y-4">
              <div
                className="sticky top-0 z-20 flex gap-2 rounded-xl bg-background/95 p-2 lg:hidden"
                role="group"
                aria-label="Escolher área da oficina"
              >
                <Button
                  className="min-h-11 flex-1"
                  variant={mobileView === 'lesson' ? 'default' : 'outline'}
                  aria-pressed={mobileView === 'lesson'}
                  onClick={() => setMobileView('lesson')}
                >
                  Ver professora e atividades
                </Button>
                <Button
                  className="min-h-11 flex-1"
                  variant={mobileView === 'studio' ? 'default' : 'outline'}
                  aria-pressed={mobileView === 'studio'}
                  onClick={() => setMobileView('studio')}
                >
                  Criar
                </Button>
              </div>
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
                <div className="min-w-0 space-y-5">
                  {joined && admitted ? (
                    <LiveMediaPanel
                      room={room}
                      deviceId={deviceId}
                      stale={stale}
                      onError={setError}
                      compactOnMobile={mobileView === 'studio'}
                    />
                  ) : null}
                  <div
                    className={`${mobileView === 'lesson' ? 'block' : 'hidden'} space-y-5 lg:block`}
                  >
                    {joined && admitted ? (
                      <LiveRecordingStatus
                        room={room}
                        onUpdated={() => setRefresh((value) => value + 1)}
                      />
                    ) : null}
                    <section className="rounded-2xl border bg-card p-5">
                      <h2 className="sz-display text-xl font-bold">Vamos criar</h2>
                      <p className="mt-3 whitespace-pre-wrap">{room.plan.instructions}</p>
                    </section>
                    {room.plan.steps?.length ? (
                      <LiveLearningActivities
                        key={sessionId}
                        room={room}
                        onStepChange={reportStep}
                        onControl={control}
                        disabled={busy || stale || !live}
                      />
                    ) : null}
                    {isTeacher ? (
                      <LiveRecordingReview
                        room={room}
                        onUpdated={() => setRefresh((value) => value + 1)}
                      />
                    ) : room.access.canWatchRecording ? (
                      <LiveReplay sessionId={sessionId} />
                    ) : room.occurrence?.state === 'ended' ? (
                      <p className="rounded-xl border bg-card p-4 text-sm">
                        {room.occurrence.recording.state === 'failed'
                          ? 'A gravação deste encontro não ficou disponível. Você pode seguir o passo a passo e continuar sua criação.'
                          : 'A gravação está sendo preparada. Ela aparecerá aqui quando estiver revisada.'}
                      </p>
                    ) : null}
                    <details className="rounded-2xl border bg-card p-4">
                      <summary className="min-h-11 cursor-pointer font-bold">
                        Conversa e materiais
                      </summary>
                      <aside className="space-y-3">
                        <div
                          className="flex gap-2"
                          role="tablist"
                          aria-label="Conversa e materiais"
                        >
                          <Button
                            id="live-chat-tab"
                            role="tab"
                            aria-controls="live-chat-panel"
                            aria-selected={panel === 'chat'}
                            variant={panel === 'chat' ? 'default' : 'outline'}
                            onClick={() => setPanel('chat')}
                          >
                            <MessageCircle className="size-4" />
                            Conversa
                          </Button>
                          <Button
                            id="live-materials-tab"
                            role="tab"
                            aria-controls="live-materials-panel"
                            aria-selected={panel === 'materials'}
                            variant={panel === 'materials' ? 'default' : 'outline'}
                            onClick={() => setPanel('materials')}
                          >
                            Materiais
                          </Button>
                        </div>
                        {panel === 'materials' ? (
                          <section
                            id="live-materials-panel"
                            role="tabpanel"
                            aria-labelledby="live-materials-tab"
                            className="rounded-2xl border bg-card p-4"
                          >
                            {room.plan.materials.length ? (
                              <ul className="space-y-3">
                                {room.plan.materials.map((material) => (
                                  <li key={material.id}>
                                    <a
                                      className="flex min-h-11 items-center gap-2 rounded-lg p-2 font-bold text-primary hover:bg-primary/5"
                                      href={`${endpoint}/materials/${material.id}/download`}
                                    >
                                      <Download className="size-4 shrink-0" />
                                      {material.title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Tudo que você precisa está na atividade.
                              </p>
                            )}
                          </section>
                        ) : (
                          <section
                            id="live-chat-panel"
                            role="tabpanel"
                            aria-labelledby="live-chat-tab"
                            className="space-y-3 rounded-2xl border bg-card p-4"
                          >
                            {isTeacher ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy || stale}
                                onClick={() =>
                                  void control({
                                    kind: 'chat',
                                    enabled: !room.occurrence?.chatEnabled,
                                  })
                                }
                              >
                                {room.occurrence?.chatEnabled
                                  ? 'Pausar conversa'
                                  : 'Abrir conversa'}
                              </Button>
                            ) : null}
                            {admitted && joined ? (
                              <>
                                <ol
                                  className="max-h-80 space-y-3 overflow-y-auto"
                                  aria-label="Mensagens da turma"
                                >
                                  {room.occurrence?.messages
                                    .filter((item) => !item.removed)
                                    .map((item) => (
                                      <li key={item.id} className="rounded-lg bg-muted/50 p-2">
                                        <p className="text-xs font-bold">
                                          {item.authorName}
                                          {item.role === 'teacher' ? ' · Professora' : ''}
                                          {item.pinned ? ' · Fixada' : ''}
                                        </p>
                                        <p className="whitespace-pre-wrap break-words text-sm">
                                          {item.text}
                                        </p>
                                        {isTeacher ? (
                                          <div className="mt-1 flex gap-3">
                                            <button
                                              type="button"
                                              className="min-h-8 text-xs underline"
                                              disabled={busy || stale}
                                              onClick={() =>
                                                void control({
                                                  kind: 'pin-message',
                                                  messageId: item.id,
                                                })
                                              }
                                            >
                                              Fixar
                                            </button>
                                            <button
                                              type="button"
                                              className="min-h-8 text-xs underline"
                                              disabled={busy || stale}
                                              onClick={() =>
                                                void control({
                                                  kind: 'remove-message',
                                                  messageId: item.id,
                                                })
                                              }
                                            >
                                              Remover
                                            </button>
                                          </div>
                                        ) : null}
                                      </li>
                                    ))}
                                </ol>
                                <form
                                  onSubmit={async (event) => {
                                    event.preventDefault()
                                    if (
                                      message.trim() &&
                                      (await perform('chat', { deviceId, text: message.trim() }))
                                    )
                                      setMessage('')
                                  }}
                                >
                                  <label htmlFor="live-message" className="text-sm font-bold">
                                    Mensagem para a turma
                                  </label>
                                  <textarea
                                    id="live-message"
                                    maxLength={500}
                                    className="mt-1 min-h-20 w-full rounded-lg border bg-background p-2 text-sm"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    disabled={!canSendChat || busy}
                                  />
                                  <Button
                                    className="mt-2"
                                    size="sm"
                                    type="submit"
                                    disabled={!canSendChat || busy || !message.trim()}
                                  >
                                    <Send className="size-4" />
                                    Enviar
                                  </Button>
                                </form>
                                {!room.occurrence?.chatEnabled ? (
                                  <p className="text-sm text-muted-foreground">
                                    A conversa está pausada.
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                A conversa aparece quando a professora receber você na sala.
                              </p>
                            )}
                          </section>
                        )}
                      </aside>
                    </details>
                  </div>
                </div>
                <div className={`${mobileView === 'studio' ? 'block' : 'hidden'} min-w-0 lg:block`}>
                  <div ref={workspaceArea}>
                    <LiveWorkspace
                      room={room}
                      deviceId={deviceId}
                      onError={setError}
                      selectedLearnerId={observedLearner}
                      onSelectedLearnerChange={setObservedLearner}
                      onSaveStateChange={reportSave}
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          {isTeacher &&
          room.occurrence &&
          ['ended', 'cancelled'].includes(room.occurrence.state) ? (
            <LiveReplacement room={room} onUpdated={() => setRefresh((value) => value + 1)} />
          ) : null}
          {joined && !isTeacher && admitted ? (
            <div
              className="sticky bottom-3 z-30 flex flex-wrap justify-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur"
              data-live-controls
            >
              <Button
                data-live-target="room-hand"
                className="min-h-11"
                variant={self?.handAt ? 'default' : 'outline'}
                disabled={!canInteract || busy}
                onClick={() =>
                  void perform('requests', { deviceId, kind: 'hand', raised: !self?.handAt })
                }
              >
                <Hand className="size-5" />
                {self?.handAt ? 'Abaixar minha mão' : 'Quero falar'}
              </Button>
              <Button
                data-live-target="room-help"
                className="min-h-11"
                variant={self?.helpAt ? 'default' : 'outline'}
                disabled={!canInteract || busy}
                onClick={() =>
                  void perform('requests', { deviceId, kind: 'help', raised: !self?.helpAt })
                }
              >
                <LifeBuoy className="size-5" />
                {self?.helpAt ? 'Já consegui' : 'Preciso de ajuda'}
              </Button>
              <Link
                href="/como-fazer"
                target="_blank"
                className="inline-flex min-h-10 items-center px-3 font-bold text-primary underline"
              >
                Como fazer
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
