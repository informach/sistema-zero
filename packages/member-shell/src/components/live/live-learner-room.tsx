'use client'

import type { LiveActivityReport, LiveRoomView } from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CameraOff,
  Download,
  Hand,
  Headphones,
  LifeBuoy,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { canShareLiveTab } from '../../lib/live/device-errors'
import { LIVE_CAMERA_EFFECTS, type LiveCameraEffect } from '../../lib/live/media-camera-effects'
import {
  countdown,
  durationLabel,
  friendlyDay,
  friendlyWhen,
  liveHour,
} from '../../lib/live/schedule'
import { sessionFetch } from '../../lib/session-fetch'
import { LiveGuidancePointer } from './live-guidance'
import { LiveLearningActivities } from './live-learning-activities'
import { type LiveMedia, Stream, useLiveMedia } from './live-media-panel'
import { LivePreflight } from './live-preflight'
import { LiveReplay } from './live-replay'
import { LiveWorkspace } from './live-workspace'

/** Campos que o servidor passou a mandar (opcionais: o cliente tolera servidor antigo). */
type RoomExtras = {
  cohort: { teacherNames?: Record<string, string> }
}

export function teacherNameOf(room: LiveRoomView): string | null {
  const names = (room.cohort as RoomExtras['cohort']).teacherNames ?? {}
  for (const id of room.cohort.teacherIds) if (names[id]) return names[id]!
  const fromChat = room.occurrence?.messages.find((message) => message.role === 'teacher')
  return fromChat?.authorName ?? null
}

/**
 * A sala da criança (redesenho do full review de 14/10/2026). A professora fica no centro, como o
 * vídeo da aula gravada; os controles moram numa barra só; a conversa e os materiais abrem num
 * painel ao lado; e nada de fuso, prazo ou estado de gravação no caminho dela.
 */
export function LiveLearnerRoom({
  room,
  deviceId,
  joined,
  takeover,
  stale,
  busy,
  error,
  connectionError,
  onDismissError,
  onRetry,
  onJoin,
  perform,
  onError,
  onReportStep,
  onReportSave,
}: {
  room: LiveRoomView | null
  deviceId: string
  joined: boolean
  takeover: boolean
  stale: boolean
  busy: boolean
  error: string | null
  connectionError: string | null
  onDismissError(): void
  onRetry(): void
  onJoin(): void
  perform(path: string, body: unknown): Promise<boolean>
  onError(message: string): void
  onReportStep(stepId: string | null): void
  onReportSave(state: LiveActivityReport['saveState']): void
}) {
  const [mobileView, setMobileView] = useState<'lesson' | 'studio'>('lesson')
  const [wide, setWide] = useState(false)
  const [panel, setPanel] = useState<'chat' | 'materials' | null>(null)
  if (!room)
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <BackLink />
        {error || connectionError ? (
          <div role="alert" className="kids-carta space-y-3 p-6">
            <p className="font-semibold">{error ?? connectionError}</p>
            <Button className="min-h-11" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <p role="status" className="kids-carta p-6 font-semibold">
            Abrindo seu encontro…
          </p>
        )}
      </div>
    )
  const self = room.occurrence?.participants.find((item) => item.learnerId === room.actorId)
  const admitted = joined && self?.admission === 'admitted' && self.deviceId === deviceId
  const state = room.occurrence?.state
  const live = state === 'live'
  const teacherName = teacherNameOf(room)
  const ended = state === 'ended' || state === 'cancelled'
  const showError = error ?? connectionError
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 pb-40 md:p-6 md:pb-32">
      <LiveGuidancePointer
        guidance={room.occurrence?.guidance}
        actorId={room.actorId}
        serverTime={room.serverTime}
        onReveal={(target) => {
          if (target.startsWith('studio-')) setMobileView('studio')
        }}
      />
      <BackLink />
      <RoomHeader room={room} teacherName={teacherName} stale={stale} />
      {showError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="font-semibold">{showError}</p>
          {error ? (
            <Button variant="outline" className="min-h-11" onClick={onDismissError}>
              Entendi
            </Button>
          ) : null}
        </div>
      ) : null}
      {room.access.status === 'scheduled' ? (
        <FutureMeeting room={room} teacherName={teacherName} />
      ) : !room.access.canOpen ? (
        <ExpiredMeeting room={room} />
      ) : (
        <>
          {ended ? <MeetingEnd room={room} /> : null}
          {!joined && !ended ? (
            <Door
              room={room}
              teacherName={teacherName}
              takeover={takeover}
              busy={busy || stale || !deviceId}
              onJoin={onJoin}
            />
          ) : null}
          <div
            className="sticky top-0 z-20 flex gap-2 rounded-2xl bg-background/95 p-1.5 backdrop-blur lg:hidden"
            role="group"
            aria-label="Escolher o que ver"
          >
            <Button
              className="min-h-11 flex-1"
              variant={mobileView === 'lesson' ? 'default' : 'outline'}
              aria-pressed={mobileView === 'lesson'}
              onClick={() => setMobileView('lesson')}
            >
              Ver a professora
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
          <AdmittedRoom
            room={room}
            deviceId={deviceId}
            joined={joined}
            admitted={admitted}
            stale={stale}
            busy={busy}
            live={live}
            ended={ended}
            wide={wide}
            onWide={setWide}
            mobileView={mobileView}
            onMobileView={setMobileView}
            panel={panel}
            onPanel={setPanel}
            teacherName={teacherName}
            perform={perform}
            onError={onError}
            onReportStep={onReportStep}
            onReportSave={onReportSave}
          />
        </>
      )}
    </div>
  )
}

/**
 * Navegação COMPLETA de propósito: a câmera só é liberada pela política da rota da sala, e o
 * cabeçalho vale para o documento carregado. Saindo por `<Link>` a aba seguiria com a câmera
 * liberada nas outras telas.
 */
function BackLink() {
  return (
    <a
      href="/oficinas"
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="size-5" aria-hidden />
      Voltar às oficinas
    </a>
  )
}

function StatusPill({ tone, children }: { tone: 'live' | 'calm' | 'warn'; children: ReactNode }) {
  const styles = {
    live: 'bg-destructive text-white',
    calm: 'border bg-card text-foreground',
    warn: 'bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)',
  }
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-extrabold text-sm ${styles[tone]}`}
    >
      {tone === 'live' ? (
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-white" />
        </span>
      ) : null}
      {children}
    </span>
  )
}

function RoomHeader({
  room,
  teacherName,
  stale,
}: {
  room: LiveRoomView
  teacherName: string | null
  stale: boolean
}) {
  const zone = room.cohort.timeZone
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const duration = durationLabel(start, room.occurrence?.endsAt ?? room.session.endsAt)
  const state = room.occurrence?.state
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="font-extrabold text-primary text-sm uppercase tracking-wide">
          {room.cohort.title}
        </p>
        <h1 className="sz-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
          {room.session.title}
        </h1>
        <p className="mt-1 font-medium text-muted-foreground">
          {friendlyWhen(start, zone)}
          {duration ? ` · ${duration}` : ''}
          {teacherName ? ` · com a professora ${teacherName}` : ''}
        </p>
      </div>
      <div className="shrink-0">
        {stale ? (
          <StatusPill tone="warn">Reconectando…</StatusPill>
        ) : state === 'live' ? (
          <StatusPill tone="live">Ao vivo</StatusPill>
        ) : state === 'lobby' ? (
          <StatusPill tone="calm">A sala está abrindo</StatusPill>
        ) : state === 'ended' ? (
          <StatusPill tone="calm">Encontro encerrado</StatusPill>
        ) : state === 'cancelled' ? (
          <StatusPill tone="warn">Encontro cancelado</StatusPill>
        ) : (
          <StatusPill tone="calm">Encontro marcado</StatusPill>
        )}
      </div>
    </header>
  )
}

/** Antes do dia: expectativa, contagem e o que preparar. Nada do conteúdo é antecipado. */
function FutureMeeting({ room, teacherName }: { room: LiveRoomView; teacherName: string | null }) {
  const zone = room.cohort.timeZone
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const left = countdown(start, zone)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="kids-marca flex flex-col justify-between gap-6 rounded-[1.75rem] p-7 md:p-9">
        <div>
          <p className="inline-flex items-center gap-2 font-extrabold text-sm uppercase tracking-wide opacity-90">
            <CalendarDays className="size-4" aria-hidden />
            {left ?? 'Falta pouco'}
          </p>
          <p className="sz-display mt-3 text-[clamp(1.75rem,3vw,2.6rem)] leading-tight">
            {friendlyWhen(start, zone)}
          </p>
        </div>
        <p className="max-w-md font-medium text-lg">
          {teacherName ? `A professora ${teacherName} e a turma` : 'A professora e a turma'} vão
          criar juntas em “{room.session.title}”. A sala abre 15 minutos antes.
        </p>
      </section>
      <section className="kids-carta space-y-4 p-6">
        <h2 className="sz-display text-2xl">Para o dia chegar tranquilo</h2>
        <ol className="space-y-3">
          <ChecklistItem icon={<Sparkles className="size-5" aria-hidden />}>
            Use um computador com o Chrome ou o Edge.
          </ChecklistItem>
          <ChecklistItem icon={<Headphones className="size-5" aria-hidden />}>
            Separe um fone de ouvido: assim o som da turma não volta pelo microfone.
          </ChecklistItem>
          <ChecklistItem icon={<Mic className="size-5" aria-hidden />}>
            Teste a câmera e o microfone aqui embaixo. Nada é enviado para ninguém.
          </ChecklistItem>
        </ol>
        <LivePreflight open />
      </section>
    </div>
  )
}

function ChecklistItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="pt-1.5 font-medium">{children}</span>
    </li>
  )
}

function ExpiredMeeting({ room }: { room: LiveRoomView }) {
  return (
    <section className="kids-carta mx-auto max-w-2xl space-y-3 p-7 text-center">
      <h2 className="sz-display text-2xl">O prazo deste encontro terminou</h2>
      <p className="font-medium text-muted-foreground">
        Dava para rever e continuar até {friendlyDay(room.access.endsAt, room.cohort.timeZone)}.
        Suas criações continuam guardadas em Criar.
      </p>
      <a
        href="/criar"
        className="sz-btn-gradient mx-auto inline-flex min-h-11 items-center justify-center px-6"
      >
        Ir para Criar
      </a>
    </section>
  )
}

/** A porta da sala: o único botão grande enquanto a criança ainda não entrou. */
function Door({
  room,
  teacherName,
  takeover,
  busy,
  onJoin,
}: {
  room: LiveRoomView
  teacherName: string | null
  takeover: boolean
  busy: boolean
  onJoin(): void
}) {
  const state = room.occurrence?.state
  const open = state === 'lobby' || state === 'live'
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const [testing, setTesting] = useState(false)
  const professora = teacherName ? `A professora ${teacherName}` : 'A professora'
  return (
    <section
      aria-labelledby="live-door-title"
      className="kids-carta flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7"
    >
      <div className="min-w-0 space-y-1.5">
        <h2 id="live-door-title" className="sz-display text-2xl md:text-[1.75rem]">
          {takeover
            ? 'Esta oficina está aberta em outro computador'
            : open
              ? state === 'live'
                ? `${professora} já está na sala!`
                : `${professora} abriu a sala`
              : Date.now() < Date.parse(start)
                ? `A sala abre às ${liveHour(new Date(start), room.cohort.timeZone)}`
                : `${professora} ainda vai abrir a sala`}
        </h2>
        <p className="font-medium text-muted-foreground">
          {takeover
            ? 'Se continuar aqui, a outra janela sai da sala. Seu projeto continua o mesmo.'
            : open
              ? 'Você entra com a câmera e o microfone desligados.'
              : 'Enquanto isso, você já pode começar a criar aqui embaixo.'}
        </p>
        {testing ? <LivePreflight open /> : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
        {open || takeover ? (
          <Button
            className="min-h-12 px-7 text-base"
            disabled={busy}
            onClick={onJoin}
            data-live-target="room-join"
          >
            {takeover ? 'Continuar aqui' : 'Entrar na sala'}
          </Button>
        ) : null}
        {!testing ? (
          <Button variant="outline" className="min-h-12" onClick={() => setTesting(true)}>
            Testar meu computador
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function MeetingEnd({ room }: { room: LiveRoomView }) {
  const cancelled = room.occurrence?.state === 'cancelled'
  const recording = room.occurrence?.recording.state
  return (
    <section className="kids-carta space-y-4 p-6 md:p-7" aria-labelledby="live-end-title">
      <h2 id="live-end-title" className="sz-display text-2xl md:text-[1.75rem]">
        {cancelled ? 'Este encontro foi cancelado' : 'O encontro terminou. Que criação!'}
      </h2>
      <p className="font-medium text-muted-foreground">
        {cancelled
          ? 'A equipe vai combinar uma nova data com a sua família. Seu projeto continua guardado.'
          : `Seu projeto ficou guardado. Você pode continuar criando aqui até ${friendlyDay(room.access.endsAt, room.cohort.timeZone)}.`}
      </p>
      {cancelled ? null : room.access.canWatchRecording ? (
        <LiveReplay sessionId={room.session.id} />
      ) : (
        <p className="rounded-2xl bg-(--band-creme) p-4 font-medium">
          {recording === 'failed'
            ? 'A gravação da explicação deste encontro não ficou pronta. O passo a passo continua aqui.'
            : 'A gravação da explicação fica pronta em breve e aparece aqui.'}
        </p>
      )}
    </section>
  )
}

function AdmittedRoom({
  room,
  deviceId,
  joined,
  admitted,
  stale,
  busy,
  live,
  ended,
  wide,
  onWide,
  mobileView,
  onMobileView,
  panel,
  onPanel,
  teacherName,
  perform,
  onError,
  onReportStep,
  onReportSave,
}: {
  room: LiveRoomView
  deviceId: string
  joined: boolean
  admitted: boolean
  stale: boolean
  busy: boolean
  live: boolean
  ended: boolean
  wide: boolean
  onWide(value: boolean): void
  mobileView: 'lesson' | 'studio'
  onMobileView(view: 'lesson' | 'studio'): void
  panel: 'chat' | 'materials' | null
  onPanel(panel: 'chat' | 'materials' | null): void
  teacherName: string | null
  perform(path: string, body: unknown): Promise<boolean>
  onError(message: string): void
  onReportStep(stepId: string | null): void
  onReportSave(state: LiveActivityReport['saveState']): void
}) {
  const media = useLiveMedia({
    room,
    deviceId,
    stale,
    onError,
    enabled: admitted,
    autoConnect: true,
  })
  const unread = useUnread(room, panel === 'chat')
  return (
    <>
      <div
        className={`grid items-start gap-5 ${wide ? '' : 'lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.75fr)]'}`}
      >
        <div
          className={`${mobileView === 'lesson' ? 'block' : 'hidden'} min-w-0 space-y-5 lg:block ${wide ? 'lg:fixed lg:right-5 lg:bottom-28 lg:z-20 lg:w-72 lg:space-y-0' : ''}`}
        >
          {joined && !ended ? (
            <LiveStage
              room={room}
              media={media}
              admitted={admitted}
              teacherName={teacherName}
              compact={wide}
            />
          ) : null}
          {!wide ? (
            <>
              <section className="kids-carta space-y-3 p-6">
                <h2 className="sz-display text-xl md:text-2xl">Vamos criar</h2>
                <p className="whitespace-pre-wrap font-medium">{room.plan?.instructions}</p>
              </section>
              {room.plan?.steps?.length ? (
                <LiveLearningActivities
                  key={room.session.id}
                  room={room}
                  onStepChange={onReportStep}
                  onControl={async () => false}
                  disabled={busy || stale || !live}
                />
              ) : null}
            </>
          ) : null}
        </div>
        <div className={`${mobileView === 'studio' ? 'block' : 'hidden'} min-w-0 lg:block`}>
          <LiveWorkspace
            room={room}
            deviceId={deviceId}
            onError={onError}
            onSaveStateChange={onReportSave}
            wide={wide}
            onWideChange={onWide}
            onNeedsAttention={() => onMobileView('studio')}
          />
        </div>
      </div>
      {joined && admitted && !ended ? (
        <ControlBar
          room={room}
          media={media}
          busy={busy}
          stale={stale}
          perform={perform}
          deviceId={deviceId}
          panel={panel}
          unread={unread}
          onPanel={onPanel}
        />
      ) : null}
      <SidePanel
        room={room}
        panel={panel}
        onPanel={onPanel}
        canSendChat={joined && admitted && live && !stale && room.supervision === 'present'}
        busy={busy}
        perform={perform}
        deviceId={deviceId}
        admitted={joined && admitted}
      />
    </>
  )
}

/** O palco: a professora (ou a demonstração dela) grande, numa moldura de tela. */
function LiveStage({
  room,
  media,
  admitted,
  teacherName,
  compact,
}: {
  room: LiveRoomView
  media: LiveMedia
  admitted: boolean
  teacherName: string | null
  compact: boolean
}) {
  const remote = Object.values(media.remote)
  const teacherCam = remote.find(
    ({ publication }) => publication.role === 'teacher' && publication.kind === 'camera',
  )
  const demo = remote.find(
    ({ publication }) => publication.role === 'teacher' && publication.kind === 'demo',
  )
  const voices = remote.filter(({ publication }) => publication.kind === 'microphone')
  const classmates = remote.filter(
    ({ publication }) => publication.role === 'learner' && publication.kind === 'camera',
  )
  const main = demo ?? teacherCam
  const pip = demo && teacherCam ? teacherCam : null
  const recording = room.occurrence?.recording.state === 'recording'
  const name = teacherName ? `Professora ${teacherName}` : 'Professora'
  const self = media.self
  const message = !admitted
    ? self?.admission === 'removed'
      ? 'A professora encerrou sua participação neste encontro. Seu projeto continua aqui.'
      : 'Você está na recepção. A professora já vai chamar você.'
    : room.supervision !== 'present'
      ? 'A professora está reconectando. Você pode continuar criando.'
      : media.reconnecting
        ? 'A internet oscilou. Reconectando o som da professora…'
        : !media.sessionReady
          ? 'Conectando o som e a imagem…'
          : !main
            ? 'A professora está com a câmera desligada. Você ouve a voz dela.'
            : null
  return (
    <section
      aria-label={`${name} ao vivo`}
      className={`overflow-hidden rounded-[1.5rem] bg-(--menu) shadow-lg ${compact ? '' : ''}`}
    >
      <div className="relative aspect-video w-full">
        {main ? (
          <Stream
            bare
            stream={main.stream}
            title={demo ? `Demonstração da ${name.toLowerCase()}` : name}
            className="size-full bg-black object-contain"
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center text-white">
            <div className="space-y-3">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/15 font-extrabold text-2xl">
                {(teacherName ?? 'P').charAt(0).toUpperCase()}
              </span>
              {message ? <p className="max-w-xs font-semibold">{message}</p> : null}
            </div>
          </div>
        )}
        {pip ? (
          <div className="absolute right-3 bottom-3 w-1/4 min-w-24 overflow-hidden rounded-xl border-2 border-white/70 shadow-lg">
            <Stream
              bare
              stream={pip.stream}
              title={name}
              className="aspect-video w-full bg-black object-cover"
            />
          </div>
        ) : null}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/55 px-3 py-1 font-bold text-white text-xs">
            {name}
          </span>
          {recording ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 font-bold text-white text-xs">
              <span className="size-2 rounded-full bg-red-500" aria-hidden />
              Gravando a explicação
            </span>
          ) : null}
        </div>
        {main && message ? (
          <p
            role="status"
            className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 px-3 py-2 text-center font-semibold text-sm text-white"
          >
            {message}
          </p>
        ) : null}
      </div>
      {voices.map(({ publication, stream }) => (
        <Stream key={publication.id} stream={stream} title={media.label(publication)} audioOnly />
      ))}
      {!compact && (classmates.length > 0 || media.local.camera) ? (
        <ul className="flex gap-2 overflow-x-auto bg-black/30 p-2" aria-label="Câmeras da turma">
          {media.local.camera ? (
            <li className="relative w-28 shrink-0 overflow-hidden rounded-lg">
              <Stream
                bare
                muted
                stream={media.local.camera}
                title="Você"
                className="aspect-video w-full bg-black object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 font-bold text-[0.7rem] text-white">
                Você
              </span>
            </li>
          ) : null}
          {classmates.map(({ publication, stream }) => (
            <li key={publication.id} className="relative w-28 shrink-0 overflow-hidden rounded-lg">
              <Stream
                bare
                stream={stream}
                title={media.label(publication)}
                className="aspect-video w-full bg-black object-cover"
              />
              <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/60 px-1.5 font-bold text-[0.7rem] text-white">
                {media.label(publication)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/** A frase do microfone: diz o porquê, nunca só um botão apagado. */
function microphoneHint(room: LiveRoomView, media: LiveMedia): string | null {
  const self = media.self
  if (!media.sessionReady || !self) return null
  if (self.microphoneLocked) return 'A professora fechou seu microfone por enquanto.'
  const mode = room.occurrence?.speakingMode
  if (mode === 'listen') return 'Hora de ouvir. Levante a mão se quiser falar.'
  if (mode === 'turns')
    return self.turnGranted ? 'É a sua vez de falar!' : 'A professora vai chamar sua vez.'
  return null
}

function ControlBar({
  room,
  media,
  busy,
  stale,
  perform,
  deviceId,
  panel,
  unread,
  onPanel,
}: {
  room: LiveRoomView
  media: LiveMedia
  busy: boolean
  stale: boolean
  perform(path: string, body: unknown): Promise<boolean>
  deviceId: string
  panel: 'chat' | 'materials' | null
  unread: number
  onPanel(panel: 'chat' | 'materials' | null): void
}) {
  const self = media.self
  const canInteract = room.occurrence?.state === 'live' && room.supervision === 'present' && !stale
  const hint = microphoneHint(room, media)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [shareSupported, setShareSupported] = useState(false)
  useEffect(() => setShareSupported(canShareLiveTab()), [])
  const turn = hint === 'É a sua vez de falar!'
  return (
    <div
      className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-5xl md:bottom-4"
      data-live-controls
    >
      {hint || media.local.screen ? (
        <p
          role="status"
          aria-live="polite"
          className={`mx-auto mb-2 w-fit rounded-full px-4 py-1.5 text-center font-bold text-sm shadow ${turn ? 'bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)' : 'bg-card text-foreground'}`}
        >
          {media.local.screen ? 'A professora está vendo esta aba. ' : ''}
          {hint ?? ''}
        </p>
      ) : null}
      <nav
        aria-label="Controles da sala"
        className="flex items-center justify-between gap-1 rounded-[1.25rem] border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:justify-center sm:gap-2 sm:p-2.5"
      >
        <BarButton
          active={Boolean(media.local.microphone)}
          disabled={busy || media.busy || !media.microphoneAllowed}
          onClick={() => void media.toggle('microphone')}
          icon={media.local.microphone ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          label="Microfone"
          name={media.local.microphone ? 'Desligar o microfone' : 'Ligar o microfone'}
        />
        <BarButton
          active={Boolean(media.local.camera)}
          disabled={busy || media.busy || (!media.local.camera && !media.cameraAllowed)}
          onClick={() => (media.local.camera ? media.stop('camera') : setCameraOpen(true))}
          icon={
            media.local.camera ? <Camera className="size-5" /> : <CameraOff className="size-5" />
          }
          label="Câmera"
          name={media.local.camera ? 'Desligar a câmera' : 'Ligar a câmera'}
        />
        <BarButton
          target="room-hand"
          active={Boolean(self?.handAt)}
          disabled={!canInteract || busy}
          onClick={() =>
            void perform('requests', { deviceId, kind: 'hand', raised: !self?.handAt })
          }
          icon={<Hand className="size-5" />}
          label={self?.handAt ? 'Baixar a mão' : 'Quero falar'}
          short={self?.handAt ? 'Baixar' : 'Falar'}
        />
        <BarButton
          target="room-help"
          active={Boolean(self?.helpAt)}
          disabled={!canInteract || busy}
          onClick={() =>
            void perform('requests', { deviceId, kind: 'help', raised: !self?.helpAt })
          }
          icon={<LifeBuoy className="size-5" />}
          label={self?.helpAt ? 'Já consegui' : 'Pedir ajuda'}
          short={self?.helpAt ? 'Consegui' : 'Ajuda'}
        />
        {shareSupported ? (
          <BarButton
            active={Boolean(media.local.screen)}
            disabled={busy || media.busy || !media.available}
            onClick={() => void media.toggle('screen')}
            icon={<MonitorUp className="size-5" />}
            label={media.local.screen ? 'Parar de mostrar' : 'Mostrar tela'}
            short="Tela"
            name={
              media.local.screen
                ? 'Parar de mostrar a tela à professora'
                : 'Mostrar tela à professora'
            }
          />
        ) : null}
        <span className="mx-0.5 hidden h-8 w-px bg-border sm:block" aria-hidden />
        <BarButton
          active={panel === 'chat'}
          onClick={() => onPanel(panel === 'chat' ? null : 'chat')}
          icon={<MessageCircle className="size-5" />}
          label="Conversa"
          short="Chat"
          name="Conversa da turma"
          badge={unread}
        />
        <BarButton
          active={panel === 'materials'}
          onClick={() => onPanel(panel === 'materials' ? null : 'materials')}
          icon={<Paperclip className="size-5" />}
          label="Materiais"
          short="Arquivos"
        />
      </nav>
      <CameraPreview open={cameraOpen} onClose={() => setCameraOpen(false)} media={media} />
    </div>
  )
}

/**
 * Um botão da barra. No celular: ícone com uma palavra curta embaixo, para os sete caberem numa
 * linha só (com rótulos inteiros a barra virava quatro linhas por cima da professora).
 */
function BarButton({
  icon,
  label,
  short,
  name,
  onClick,
  active = false,
  disabled = false,
  badge = 0,
  target,
}: {
  icon: ReactNode
  label: string
  /** A palavra do celular (sem ela, o próprio rótulo). */
  short?: string
  /** O nome para o leitor de tela, quando o rótulo visível é curto demais para dizer o estado. */
  name?: string
  onClick(): void
  active?: boolean
  disabled?: boolean
  badge?: number
  target?: string
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      aria-pressed={active}
      aria-label={name}
      disabled={disabled}
      onClick={onClick}
      data-live-target={target}
      className="relative h-auto min-h-12 min-w-12 flex-1 flex-col gap-0.5 px-1.5 py-1.5 sm:flex-none sm:flex-row sm:gap-2 sm:px-3.5"
    >
      {icon}
      <span className="text-[0.6875rem] leading-tight sm:hidden">{short ?? label}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 grid min-w-6 place-items-center rounded-full bg-destructive px-1.5 font-extrabold text-white text-xs">
          {badge}
          <span className="sr-only"> mensagens novas</span>
        </span>
      ) : null}
    </Button>
  )
}

/** "Só você está vendo": o fundo é escolhido antes de a turma ver a câmera. */
function CameraPreview({
  open,
  onClose,
  media,
}: {
  open: boolean
  onClose(): void
  media: LiveMedia
}) {
  const [preview, setPreview] = useState<MediaStream | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const previewRef = useRef<MediaStream | null>(null)
  const { capture, stop, cameraEffect } = media
  // A limpeza precisa saber se a câmera já foi para a turma, sem refazer a captura quando muda.
  const cameraLive = useRef(media.local.camera)
  cameraLive.current = media.local.camera
  // biome-ignore lint/correctness/useExhaustiveDependencies: trocar o fundo pede outra captura (ele sai aplicado na prévia).
  useEffect(() => {
    if (!open) return
    let active = true
    setProblem(null)
    capture('camera')
      .then((stream) => {
        if (!active) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        previewRef.current = stream
        setPreview(stream)
      })
      .catch((cause) => {
        if (active) setProblem(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      active = false
      if (previewRef.current && !cameraLive.current) {
        for (const track of previewRef.current.getTracks()) track.stop()
        stop('camera')
      }
      previewRef.current = null
      setPreview(null)
    }
  }, [open, cameraEffect, capture, stop])
  async function send() {
    if (!preview) return
    setSending(true)
    try {
      await media.publish('camera', preview)
      previewRef.current = null
      onClose()
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'Não foi possível ligar a câmera.')
    } finally {
      setSending(false)
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sua câmera"
      description="Só você está vendo. Escolha o fundo e, quando quiser, mostre para a turma."
    >
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
          {preview ? (
            <Stream
              bare
              muted
              stream={preview}
              title="Prévia da sua câmera"
              className="size-full object-cover"
            />
          ) : (
            <p className="grid size-full place-items-center p-4 text-center font-semibold text-white">
              {problem ?? 'Abrindo a câmera…'}
            </p>
          )}
        </div>
        <fieldset className="space-y-2">
          <legend className="font-bold">Fundo</legend>
          <div className="flex flex-wrap gap-2">
            {LIVE_CAMERA_EFFECTS.map((effect) => (
              <Button
                key={effect.value}
                variant={cameraEffect === effect.value ? 'default' : 'outline'}
                aria-pressed={cameraEffect === effect.value}
                className="min-h-11"
                onClick={() => media.setCameraEffect(effect.value as 'none' | LiveCameraEffect)}
              >
                {effect.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Agora não
          </Button>
          <Button className="min-h-11" disabled={!preview || sending} onClick={() => void send()}>
            Mostrar para a turma
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/** Mensagens da turma que chegaram enquanto a conversa estava fechada. */
function useUnread(room: LiveRoomView, open: boolean): number {
  const seen = useRef<Set<string> | null>(null)
  const messages = (room.occurrence?.messages ?? []).filter(
    (item) => !item.removed && item.authorId !== room.actorId,
  )
  if (seen.current === null) seen.current = new Set(messages.map((item) => item.id))
  if (open) for (const item of messages) seen.current.add(item.id)
  return messages.filter((item) => !seen.current!.has(item.id)).length
}

function SidePanel({
  room,
  panel,
  onPanel,
  canSendChat,
  busy,
  perform,
  deviceId,
  admitted,
}: {
  room: LiveRoomView
  panel: 'chat' | 'materials' | null
  onPanel(panel: 'chat' | 'materials' | null): void
  canSendChat: boolean
  busy: boolean
  perform(path: string, body: unknown): Promise<boolean>
  deviceId: string
  admitted: boolean
}) {
  const titleId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (panel) heading.current?.focus()
  }, [panel])
  useEffect(() => {
    if (!panel) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onPanel(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [panel, onPanel])
  if (!panel) return null
  return (
    <aside
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] flex-col rounded-t-[1.5rem] border bg-card shadow-2xl md:inset-y-4 md:right-4 md:left-auto md:max-h-none md:w-[24rem] md:rounded-[1.5rem]"
    >
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <h2 id={titleId} ref={heading} tabIndex={-1} className="sz-display text-xl outline-none">
          {panel === 'chat' ? 'Conversa da turma' : 'Materiais'}
        </h2>
        <Button
          variant="ghost"
          className="min-h-11 min-w-11"
          aria-label="Fechar"
          onClick={() => onPanel(null)}
        >
          <X className="size-5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {panel === 'chat' ? (
          <Chat
            room={room}
            canSend={canSendChat}
            busy={busy}
            perform={perform}
            deviceId={deviceId}
            admitted={admitted}
          />
        ) : (
          <Materials room={room} />
        )}
      </div>
    </aside>
  )
}

function Chat({
  room,
  canSend,
  busy,
  perform,
  deviceId,
  admitted,
}: {
  room: LiveRoomView
  canSend: boolean
  busy: boolean
  perform(path: string, body: unknown): Promise<boolean>
  deviceId: string
  admitted: boolean
}) {
  const [message, setMessage] = useState('')
  const end = useRef<HTMLLIElement>(null)
  const messages = (room.occurrence?.messages ?? []).filter((item) => !item.removed)
  const pinned = messages.filter((item) => item.pinned)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rola até o fim quando chega mensagem nova.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])
  if (!admitted)
    return (
      <p className="font-medium text-muted-foreground">
        A conversa aparece quando a professora receber você na sala.
      </p>
    )
  return (
    <div className="flex h-full flex-col gap-3">
      {pinned.length ? (
        <div className="space-y-2 rounded-2xl bg-(--band-creme) p-3">
          <p className="font-extrabold text-xs uppercase tracking-wide">Recado fixado</p>
          {pinned.map((item) => (
            <p key={item.id} className="whitespace-pre-wrap break-words font-semibold">
              {item.text}
            </p>
          ))}
        </div>
      ) : null}
      <ol className="space-y-2.5" aria-label="Mensagens da turma">
        {messages.length === 0 ? (
          <li className="font-medium text-muted-foreground">Ainda não há mensagens.</li>
        ) : null}
        {messages.map((item) => {
          const mine = item.authorId === room.actorId
          return (
            <li
              key={item.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${mine ? 'ml-auto bg-primary text-primary-foreground' : item.role === 'teacher' ? 'bg-(--band-menta)' : 'bg-muted'}`}
            >
              <p className="font-extrabold text-xs">
                {mine
                  ? 'Você'
                  : item.role === 'teacher'
                    ? `Professora ${item.authorName}`
                    : item.authorName}
              </p>
              <p className="whitespace-pre-wrap break-words">{item.text}</p>
            </li>
          )
        })}
        <li ref={end} aria-hidden />
      </ol>
      <form
        className="mt-auto space-y-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (message.trim() && (await perform('chat', { deviceId, text: message.trim() })))
            setMessage('')
        }}
      >
        <label htmlFor="live-message" className="sr-only">
          Mensagem para a turma
        </label>
        <textarea
          id="live-message"
          maxLength={500}
          rows={2}
          placeholder={
            room.occurrence?.chatEnabled === false
              ? 'A conversa está pausada pela professora.'
              : 'Escreva para a turma…'
          }
          className="w-full rounded-xl border bg-background p-3 font-medium"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!canSend || busy || room.occurrence?.chatEnabled === false}
        />
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={!canSend || busy || !message.trim() || room.occurrence?.chatEnabled === false}
        >
          <Send className="size-4" />
          Enviar
        </Button>
      </form>
    </div>
  )
}

/** Baixa pelo `fetch`: um erro vira recado aqui, em vez de trocar a página da sala por um JSON. */
function Materials({ room }: { room: LiveRoomView }) {
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const materials = room.plan?.materials ?? []
  if (!materials.length)
    return (
      <p className="font-medium text-muted-foreground">Tudo o que você precisa está na sala.</p>
    )
  async function download(id: string, title: string) {
    setPending(id)
    setProblem(null)
    try {
      const response = await sessionFetch(
        `/api/live/sessions/${room.session.id}/materials/${id}/download`,
      )
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Não foi possível baixar agora. Tente de novo.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = title
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setProblem(
        cause instanceof Error && !/fetch/i.test(cause.message)
          ? cause.message
          : 'Não foi possível baixar agora. Tente de novo.',
      )
    } finally {
      setPending(null)
    }
  }
  return (
    <div className="space-y-3">
      {problem ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 font-semibold text-sm">
          {problem}
        </p>
      ) : null}
      <ul className="space-y-2">
        {materials.map((material) => (
          <li key={material.id}>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void download(material.id, material.title)}
              className="kids-3d kids-3d--carta flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left font-bold disabled:opacity-60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Download className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate">{material.title}</span>
              <span className="text-primary text-sm">
                {pending === material.id ? 'Baixando…' : 'Baixar'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
