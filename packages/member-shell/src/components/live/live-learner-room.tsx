'use client'

import type { LiveRecordingChapter, LiveRecordingVimeo, LiveRoomView } from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CameraOff,
  Download,
  Expand,
  Hand,
  Headphones,
  LifeBuoy,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { canShareLiveTab } from '../../lib/live/device-errors'
import type {
  LiveLessonOutline,
  LiveLessonSlotProps,
  LiveLessonWorkspace,
  LiveSectionReport,
} from '../../lib/live/lesson-slot'
import { LIVE_CAMERA_EFFECTS, type LiveCameraEffect } from '../../lib/live/media-camera-effects'
import {
  countdown,
  durationLabel,
  friendlyDay,
  friendlyWhen,
  liveHour,
} from '../../lib/live/schedule'
import { learnerSectionControl } from '../../lib/live/sections'
import { sessionFetch } from '../../lib/session-fetch'
import { LiveGuidancePointer } from './live-guidance'
import { LegacyCohortNotice } from './live-legacy-notice'
import { type LiveMedia, Stream, useLiveMedia } from './live-media-panel'
import { LivePreflight } from './live-preflight'

export function teacherNameOf(room: LiveRoomView): string | null {
  const names = room.cohort.teacherNames ?? {}
  for (const id of room.cohort.teacherIds) if (names[id]) return names[id]!
  const fromChat = room.occurrence?.messages.find((message) => message.role === 'teacher')
  return fromChat?.authorName ?? null
}

/**
 * A pele dos cartões da sala: a carta do Kids ou o cartão sóbrio da comunidade adulta (que não
 * tem as classes do Kids). A plataforma vem do curso da turma.
 */
function skin(room: LiveRoomView | null) {
  const adult = room?.cohort.course?.audience === 'adult'
  return {
    adult,
    card: adult ? 'rounded-2xl border bg-card' : 'kids-carta',
    hero: adult ? 'rounded-[1.75rem] bg-primary text-primary-foreground' : 'kids-marca',
  }
}

/**
 * A sala da criança. Desde 14/10/2026 (cursos ao vivo) é o LAYOUT DA AULA GRAVADA: a aula do
 * encontro entra pelo slot `renderLesson` (o player de aula de verdade), com a transmissão fixa no
 * alto da coluna da esquerda e a atividade da parte na direita. As partes são conduzidas pela
 * professora durante o encontro; fora dele, a gravação ocupa o lugar da transmissão e tudo abre.
 * A barra da chamada (microfone, câmera, falar, ajuda, conversa, materiais) fica no rodapé, acima
 * dos botões da aula.
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
  renderLesson,
  liveWorkspace,
  onSectionReport,
  currentSection,
  outline,
  onOutline,
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
  renderLesson?: (props: LiveLessonSlotProps) => ReactNode
  liveWorkspace?: LiveLessonWorkspace
  onSectionReport(info: LiveSectionReport): void
  /** A parte aberta na aula agora (os capítulos da gravação). */
  currentSection: string | null
  outline: LiveLessonOutline | null
  onOutline(outline: LiveLessonOutline): void
}) {
  const [panel, setPanel] = useState<'chat' | 'materials' | null>(null)
  const { card } = skin(room)
  if (!room)
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <BackLink />
        {error || connectionError ? (
          <div role="alert" className={`${card} space-y-3 p-6`}>
            <p className="font-semibold">{error ?? connectionError}</p>
            <Button className="min-h-11" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <p role="status" className={`${card} p-6 font-semibold`}>
            Abrindo seu encontro…
          </p>
        )}
      </div>
    )
  const self = room.occurrence?.participants.find((item) => item.learnerId === room.actorId)
  const admitted = joined && self?.admission === 'admitted' && self.deviceId === deviceId
  const state = room.occurrence?.state
  const teacherName = teacherNameOf(room)
  const ended = state === 'ended' || state === 'cancelled'
  const showError = error ?? connectionError
  return (
    <div className="sz-live-room mx-auto w-full max-w-[1600px] space-y-5">
      <LiveGuidancePointer
        guidance={room.occurrence?.guidance}
        actorId={room.actorId}
        serverTime={room.serverTime}
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
      {room.access.status === 'scheduled' && !room.access.canEnterLobby ? (
        <FutureMeeting room={room} teacherName={teacherName} />
      ) : room.access.status === 'scheduled' ? (
        // Os 15 minutos antes: só a recepção abre (o conteúdo e a câmera da turma, no horário).
        joined ? (
          <EarlyReception room={room} admitted={admitted} />
        ) : (
          <Door
            room={room}
            teacherName={teacherName}
            takeover={takeover}
            busy={busy || stale || !deviceId}
            onJoin={onJoin}
            early
          />
        )
      ) : !room.access.canOpen ? (
        <ExpiredMeeting room={room} />
      ) : (
        <>
          {ended ? <MeetingEnd room={room} /> : null}
          {/* A porta da sala mora DENTRO do palco (16:9): entrar troca o que está no palco, sem
              nada pular na página. */}
          <LessonRoom
            room={room}
            deviceId={deviceId}
            joined={joined}
            admitted={admitted}
            stale={stale}
            busy={busy}
            ended={ended}
            panel={panel}
            onPanel={setPanel}
            teacherName={teacherName}
            perform={perform}
            onError={onError}
            door={{
              ...doorCopy(room, teacherName, takeover, false),
              busy: busy || stale || !deviceId,
              takeover,
              onJoin,
            }}
            renderLesson={renderLesson}
            liveWorkspace={liveWorkspace}
            onSectionReport={onSectionReport}
            currentSection={currentSection}
            outline={outline}
            onOutline={onOutline}
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
  const { card, hero } = skin(room)
  const zone = room.cohort.timeZone
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const left = countdown(start, zone)
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section
        className={`${hero} flex flex-col justify-between gap-6 rounded-[1.75rem] p-7 md:p-9`}
      >
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
      <section className={`${card} space-y-4 p-6`}>
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
  const { adult, card } = skin(room)
  return (
    <section className={`${card} mx-auto max-w-2xl space-y-3 p-7 text-center`}>
      <h2 className="sz-display text-2xl">O prazo deste encontro terminou</h2>
      <p className="font-medium text-muted-foreground">
        Dava para rever e continuar até {friendlyDay(room.access.endsAt, room.cohort.timeZone)}.
        {adult ? '' : ' Suas criações continuam guardadas em Criar.'}
      </p>
      {adult ? (
        <a
          href="/oficinas"
          className="mx-auto inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 font-bold text-primary-foreground"
        >
          Voltar às oficinas
        </a>
      ) : (
        <a
          href="/criar"
          className="sz-btn-gradient mx-auto inline-flex min-h-11 items-center justify-center px-6"
        >
          Ir para Criar
        </a>
      )}
    </section>
  )
}

/** A porta da sala: o único botão grande enquanto a criança ainda não entrou. */
/** O que a porta da sala diz (o cartão da recepção e a porta dentro do palco). */
function doorCopy(
  room: LiveRoomView,
  teacherName: string | null,
  takeover: boolean,
  early: boolean,
): { title: string; text: string; canJoin: boolean } {
  const state = room.occurrence?.state
  const open = state === 'lobby' || state === 'live'
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const hour = liveHour(new Date(start), room.cohort.timeZone)
  const professora = teacherName ? `A professora ${teacherName}` : 'A professora'
  return {
    title: takeover
      ? 'Esta oficina está aberta em outro computador'
      : open
        ? state === 'live'
          ? `${professora} já está na sala!`
          : `${professora} abriu a sala`
        : early || Date.now() >= Date.parse(start)
          ? `${professora} ainda vai abrir a sala`
          : `A sala abre às ${hour}`,
    text: takeover
      ? 'Se continuar aqui, a outra janela sai da sala. Seu projeto continua o mesmo.'
      : open
        ? early
          ? `Você entra com a câmera e o microfone desligados. O encontro começa às ${hour}.`
          : 'Você entra com a câmera e o microfone desligados.'
        : early
          ? `O encontro começa às ${hour}. Quando ela abrir a sala, o botão para entrar aparece aqui.`
          : 'Enquanto isso, você já pode ver a primeira parte aqui do lado.',
    canJoin: open || takeover,
  }
}

function Door({
  room,
  teacherName,
  takeover,
  busy,
  onJoin,
  early = false,
}: {
  room: LiveRoomView
  teacherName: string | null
  takeover: boolean
  busy: boolean
  onJoin(): void
  /** Antes do horário: a criança só espera na recepção (nada para criar ainda). */
  early?: boolean
}) {
  const [testing, setTesting] = useState(false)
  const { card } = skin(room)
  const copy = doorCopy(room, teacherName, takeover, early)
  const open = copy.canJoin
  return (
    <section
      aria-labelledby="live-door-title"
      className={`${card} flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7`}
    >
      <div className="min-w-0 space-y-1.5">
        <h2 id="live-door-title" className="sz-display text-2xl md:text-[1.75rem]">
          {copy.title}
        </h2>
        <p className="font-medium text-muted-foreground">{copy.text}</p>
        {testing ? <LivePreflight open /> : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
        {open ? (
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

/** Já na recepção, antes do horário: o que acontece agora, em uma frase. */
function EarlyReception({ room, admitted }: { room: LiveRoomView; admitted: boolean }) {
  const self = room.occurrence?.participants.find((item) => item.learnerId === room.actorId)
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const hour = liveHour(new Date(start), room.cohort.timeZone)
  const { card } = skin(room)
  return (
    <section role="status" className={`${card} space-y-2 p-6 md:p-7`}>
      <h2 className="sz-display text-2xl md:text-[1.75rem]">
        {self?.admission === 'removed'
          ? 'A professora encerrou sua participação'
          : admitted
            ? 'Você já está na sala!'
            : 'Você está na recepção'}
      </h2>
      <p className="font-medium text-muted-foreground">
        {self?.admission === 'removed'
          ? 'Ela precisa permitir para você voltar.'
          : admitted
            ? `O encontro começa às ${hour}. A professora e a turma aparecem aqui.`
            : `A professora já vai chamar você. O encontro começa às ${hour}.`}
      </p>
    </section>
  )
}

function MeetingEnd({ room }: { room: LiveRoomView }) {
  const cancelled = room.occurrence?.state === 'cancelled'
  const recording = room.occurrence?.recording.state
  const { card } = skin(room)
  return (
    <section className={`${card} space-y-2 p-6 md:p-7`} aria-labelledby="live-end-title">
      <h2 id="live-end-title" className="sz-display text-2xl md:text-[1.75rem]">
        {cancelled ? 'Este encontro foi cancelado' : 'O encontro terminou. Que criação!'}
      </h2>
      <p className="font-medium text-muted-foreground">
        {cancelled
          ? 'A equipe vai combinar uma nova data com a sua família. Seu projeto continua guardado.'
          : `Seu projeto ficou guardado. Agora cada um segue no próprio ritmo, até ${friendlyDay(room.access.endsAt, room.cohort.timeZone)}.`}
      </p>
      {cancelled || room.access.canWatchRecording ? null : (
        <p className="font-medium">
          {recording === 'failed' || recording === 'empty'
            ? 'A gravação da explicação deste encontro não ficou pronta.'
            : 'A gravação da explicação fica pronta em breve e aparece no lugar da transmissão.'}
        </p>
      )}
    </section>
  )
}

/**
 * O que o palco mostra, em valores ESTÁVEIS: só muda quando muda o que ele desenha (o modo, quem
 * está na tela, as faixas e os fluxos de mídia). A consulta da sala a cada 3 s traz um objeto novo
 * de sala (o relógio do servidor, o "visto há pouco" de cada um), e nada disso pode re-renderizar
 * a transmissão, a aula ou o Estúdio (pedido dela: "criança não tem paciência de esperar e repara
 * tudo").
 */
interface StageDoor {
  title: string
  text: string
  canJoin: boolean
  busy: boolean
  takeover: boolean
}
interface StageModel {
  recordingVersion: number
  mode: 'call' | 'recording' | 'placeholder' | 'door'
  door: (StageDoor & { onJoin(): void }) | null
  admitted: boolean
  removed: boolean
  teacherName: string | null
  recordingState: string | undefined
  supervised: boolean
  reconnecting: boolean
  sessionReady: boolean
  remote: LiveMedia['remote']
  localCamera: MediaStream | undefined
  label: LiveMedia['label']
  ended: boolean
  sessionId: string
  occurrenceId: string | undefined
  sectionId: string | null
  chapters: LiveRecordingChapter[] | undefined
  vimeo: LiveRecordingVimeo | null | undefined
}
const StageContext = createContext<StageModel | null>(null)

/**
 * A gravação só é carregada quando há gravação (depois do encontro): o player do Vimeo e o MP4 não
 * pesam na entrada da sala, e o lugar dela já está reservado em 16:9.
 */
const LiveRecordingStage = dynamic(
  () => import('./live-recording-stage').then((module) => module.LiveRecordingStage),
  { ssr: false, loading: () => <StageBox label="Gravação" /> },
)

/** O lugar da transmissão em 16:9 desde o primeiro quadro (nada pula quando ela conecta). */
export function StageBox({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="grid aspect-video w-full place-items-center overflow-hidden rounded-[1.5rem] bg-(--menu,#1e293b) p-6 text-center text-white shadow-lg"
    >
      {children}
    </section>
  )
}

/** O palco que a aula guarda: um elemento só, que lê o que desenhar do contexto. */
function StageSlot() {
  const model = useContext(StageContext)
  if (!model) return <StageBox label="Transmissão" />
  if (model.mode === 'call') return <LiveStage model={model} />
  if (model.mode === 'door' && model.door) return <DoorStage door={model.door} />
  if (model.mode === 'recording')
    return (
      <LiveRecordingStage
        version={model.recordingVersion}
        sessionId={model.sessionId}
        occurrenceId={model.occurrenceId}
        chapters={model.chapters}
        vimeo={model.vimeo}
        sectionId={model.sectionId}
      />
    )
  return <StagePlaceholder model={model} />
}
const STAGE_ELEMENT = <StageSlot />

/**
 * A AULA do encontro, montada pelo slot do app (o player de aula de sempre), com a transmissão no
 * lugar do vídeo, a barra da chamada e a conversa.
 *
 * ⚠️⚠️ O elemento da aula é MEMORIZADO com propriedades estáveis (a aula, as partes abertas, o
 * projeto ao vivo, os relatos) e o palco é um elemento só, alimentado pelo `StageContext`: a
 * consulta da sala re-renderiza esta função e a barra da chamada, mas o React reaproveita a aula
 * inteira (o mesmo elemento) e só o palco, quando o que ele desenha muda.
 */
function LessonRoom({
  room,
  deviceId,
  joined,
  admitted,
  stale,
  busy,
  ended,
  panel,
  onPanel,
  teacherName,
  perform,
  onError,
  door,
  renderLesson,
  liveWorkspace,
  onSectionReport,
  currentSection,
  outline,
  onOutline,
}: {
  room: LiveRoomView
  deviceId: string
  joined: boolean
  admitted: boolean
  stale: boolean
  busy: boolean
  ended: boolean
  panel: 'chat' | 'materials' | null
  onPanel(panel: 'chat' | 'materials' | null): void
  teacherName: string | null
  perform(path: string, body: unknown): Promise<boolean>
  onError(message: string): void
  door: StageDoor & { onJoin(): void }
  renderLesson?: (props: LiveLessonSlotProps) => ReactNode
  liveWorkspace?: LiveLessonWorkspace
  onSectionReport(info: LiveSectionReport): void
  currentSection: string | null
  outline: LiveLessonOutline | null
  onOutline(outline: LiveLessonOutline): void
}) {
  // A entrada pelo palco, com uma função ESTÁVEL (a da sala é nova a cada render).
  const joinRef = useRef(door.onJoin)
  joinRef.current = door.onJoin
  const join = useCallback(() => joinRef.current(), [])
  const media = useLiveMedia({
    room,
    deviceId,
    stale,
    onError,
    enabled: admitted,
    autoConnect: true,
  })
  const unread = useUnread(room, panel === 'chat')
  const live = room.occurrence?.state === 'live'
  const inCall = joined && !ended
  const [selectedReplay, setSelectedReplay] = useState<string | null>(null)
  const replayLabelId = useId()
  const recordings = room.access.canWatchRecording
    ? (room.recordings ?? []).filter(
        (item) => item.recording.published && item.recording.state === 'ready',
      )
    : []
  const replayChoice = selectedReplay ?? (ended ? recordings[0]?.occurrenceId : null) ?? 'current'
  const selected = recordings.find((item) => item.occurrenceId === replayChoice)
  const recording = selected?.recording
  const recordingState = recording?.state ?? room.occurrence?.recording.state
  const mode: StageModel['mode'] = inCall
    ? 'call'
    : selected
      ? 'recording'
      : !joined && !ended
        ? 'door'
        : 'placeholder'
  // Listas que chegam com identidade nova a cada consulta: comparadas pelo conteúdo.
  const chaptersKey = JSON.stringify(recording?.chapters ?? null)
  const vimeoKey = JSON.stringify(recording?.vimeo ?? null)
  const chapters = useMemo(
    () => (JSON.parse(chaptersKey) as LiveRecordingChapter[] | null) ?? undefined,
    [chaptersKey],
  )
  const vimeo = useMemo(() => JSON.parse(vimeoKey) as LiveRecordingVimeo | null, [vimeoKey])
  const removed = media.self?.admission === 'removed'
  // Só a gravação usa a parte (os capítulos): na chamada, trocar de parte não toca o palco.
  const stageSection = mode === 'recording' ? currentSection : null
  const { title: doorTitle, text: doorText, canJoin, busy: doorBusy, takeover } = door
  const stageModel = useMemo<StageModel>(
    () => ({
      recordingVersion: recording?.version ?? 0,
      mode,
      door:
        mode === 'door'
          ? { title: doorTitle, text: doorText, canJoin, busy: doorBusy, takeover, onJoin: join }
          : null,
      admitted,
      removed,
      teacherName,
      recordingState,
      supervised: room.supervision === 'present',
      reconnecting: media.reconnecting,
      sessionReady: media.sessionReady,
      remote: media.remote,
      localCamera: media.local.camera,
      label: media.label,
      ended,
      sessionId: room.session.id,
      occurrenceId: selected?.occurrenceId,
      sectionId: stageSection,
      chapters,
      vimeo,
    }),
    [
      mode,
      doorTitle,
      doorText,
      canJoin,
      doorBusy,
      takeover,
      join,
      admitted,
      removed,
      teacherName,
      recordingState,
      room.supervision,
      media.reconnecting,
      media.sessionReady,
      media.remote,
      media.local.camera,
      media.label,
      ended,
      room.session.id,
      selected?.occurrenceId,
      recording?.version,
      stageSection,
      chapters,
      vimeo,
    ],
  )
  // A aula: as propriedades do slot comparadas pelo conteúdo (as partes abertas, a aula).
  const lessonRef = room.lesson
  const courseId = lessonRef?.courseId
  const courseSlug = lessonRef?.courseSlug
  const lessonId = lessonRef?.lessonId
  const control = mode === 'recording' ? null : learnerSectionControl(room)
  const controlKey = control ? `${control.openedIds.join(',')}|${control.currentId ?? ''}` : ''
  const audience = room.cohort.course?.audience
  const lessonElement = useMemo(() => {
    if (!renderLesson || !courseId || !courseSlug || !lessonId) return null
    const [opened = '', current = ''] = controlKey ? controlKey.split('|') : []
    return renderLesson({
      lesson: { courseId, courseSlug, lessonId },
      stage: STAGE_ELEMENT,
      sectionControl: controlKey
        ? { openedIds: opened ? opened.split(',') : [], currentId: current || null }
        : null,
      teacher: false,
      onSectionReport,
      liveWorkspace,
      onOutline,
      audience,
    })
  }, [
    renderLesson,
    courseId,
    courseSlug,
    lessonId,
    controlKey,
    onSectionReport,
    liveWorkspace,
    onOutline,
    audience,
  ])
  return (
    <>
      {!inCall && recordings.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
          <label htmlFor={replayLabelId} className="text-sm font-semibold">
            Encontro e gravações
          </label>
          <select
            id={replayLabelId}
            className="min-h-11 max-w-full rounded-xl border bg-background px-3"
            value={selected?.occurrenceId ?? 'current'}
            onChange={(event) => setSelectedReplay(event.target.value)}
          >
            <option value="current">Encontro atual</option>
            {recordings.map((item) => (
              <option key={item.occurrenceId} value={item.occurrenceId}>
                Gravação · {friendlyWhen(item.startsAt, room.cohort.timeZone)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <StageContext.Provider value={stageModel}>
        {room.lesson ? lessonElement : <LegacyCohortNotice />}
      </StageContext.Provider>
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
        outline={outline}
      />
    </>
  )
}

/** A porta da sala no lugar da transmissão: entrar troca o que está no palco, nada pula. */
function DoorStage({ door }: { door: StageDoor & { onJoin(): void } }) {
  const [testing, setTesting] = useState(false)
  return (
    <StageBox label="Transmissão">
      <div className="flex max-w-lg flex-col items-center gap-2 md:gap-3">
        <h2 id="live-door-title" className="sz-display text-xl md:text-2xl">
          {door.title}
        </h2>
        <p className="font-medium text-white/85 max-sm:hidden">{door.text}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {door.canJoin ? (
            <Button
              className="min-h-12 px-7 text-base"
              disabled={door.busy}
              onClick={door.onJoin}
              data-live-target="room-join"
            >
              {door.takeover ? 'Continuar aqui' : 'Entrar na sala'}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="min-h-12 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setTesting(true)}
          >
            Testar meu computador
          </Button>
        </div>
      </div>
      <Dialog
        open={testing}
        onClose={() => setTesting(false)}
        title="Testar meu computador"
        description="Nada é enviado para ninguém."
      >
        <LivePreflight open />
      </Dialog>
    </StageBox>
  )
}

/** Antes de entrar (ou sem gravação ainda): o lugar da transmissão diz o que vem ali. */
function StagePlaceholder({ model }: { model: StageModel }) {
  const recording = model.recordingState
  return (
    <StageBox label="Transmissão">
      <div className="space-y-3">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/15 font-extrabold text-2xl">
          {(model.teacherName ?? 'P').charAt(0).toUpperCase()}
        </span>
        <p className="max-w-xs font-semibold">
          {model.ended
            ? recording === 'failed' || recording === 'empty'
              ? 'A gravação deste encontro não ficou pronta.'
              : 'A gravação aparece aqui quando ficar pronta.'
            : 'Entre na sala para ver e ouvir a professora.'}
        </p>
      </div>
    </StageBox>
  )
}

/**
 * O palco: a professora (ou a demonstração dela) grande, numa moldura de tela. Fica no alto da
 * coluna da esquerda da aula; com a atividade ampliada, a aula o leva para o flutuante. "Ampliar a
 * transmissão" usa a tela cheia do navegador (onde ela existe) e, sem ela, cobre a página. As
 * câmeras da turma passam POR CIMA, no pé do vídeo: embaixo dele, a primeira câmera que ligasse
 * empurraria a aula para baixo.
 */
function LiveStage({ model }: { model: StageModel }) {
  const { teacherName, admitted } = model
  const remote = Object.values(model.remote)
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
  const recording = model.recordingState === 'recording'
  const name = teacherName ? `Professora ${teacherName}` : 'Professora'
  const frame = useRef<HTMLElement>(null)
  // `native`: a tela cheia do navegador; `overlay`: sem ela (iPhone), a transmissão cobre a página.
  const [enlarged, setEnlarged] = useState<'native' | 'overlay' | null>(null)
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setEnlarged((value) => (value === 'native' ? null : value))
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  useEffect(() => {
    if (enlarged !== 'overlay') return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEnlarged(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [enlarged])
  async function toggleEnlarged() {
    if (enlarged === 'native') {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (enlarged === 'overlay') {
      setEnlarged(null)
      return
    }
    if (frame.current?.requestFullscreen && document.fullscreenEnabled) {
      try {
        await frame.current.requestFullscreen()
        setEnlarged('native')
        return
      } catch {
        // Recusado (sem gesto, política): cai na sobreposição.
      }
    }
    setEnlarged('overlay')
  }
  const message = !admitted
    ? model.removed
      ? 'A professora encerrou sua participação neste encontro. Seu projeto continua aqui.'
      : 'Você está na recepção. A professora já vai chamar você.'
    : !model.supervised
      ? 'A professora está reconectando. Você pode continuar criando.'
      : model.reconnecting
        ? 'A internet oscilou. Reconectando o som da professora…'
        : !model.sessionReady
          ? 'Conectando o som e a imagem…'
          : !main
            ? 'A professora está com a câmera desligada. Você ouve a voz dela.'
            : null
  return (
    <section
      ref={frame}
      aria-label={`${name} ao vivo`}
      className={`sz-live-stage overflow-hidden bg-(--menu,#1e293b) shadow-lg ${enlarged === 'overlay' ? 'fixed inset-0 z-[95] flex flex-col justify-center rounded-none' : enlarged === 'native' ? 'flex flex-col justify-center' : 'rounded-[1.5rem]'}`}
    >
      <div className={`relative w-full ${enlarged ? 'max-h-dvh flex-1' : 'aspect-video'}`}>
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
        <button
          type="button"
          onClick={() => void toggleEnlarged()}
          aria-pressed={enlarged !== null}
          className="sz-live-stage-enlarge absolute top-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-black/60 px-3 font-bold text-sm text-white hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white [.sz-lesson-video-float_&]:hidden"
        >
          {enlarged ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Expand className="size-4" aria-hidden />
          )}
          <span className="max-sm:sr-only">
            {enlarged ? 'Reduzir a transmissão' : 'Ampliar a transmissão'}
          </span>
        </button>
        {main && message ? (
          <p
            role="status"
            className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 px-3 py-2 text-center font-semibold text-sm text-white"
          >
            {message}
          </p>
        ) : null}
        {!enlarged && (classmates.length > 0 || model.localCamera) ? (
          <ul
            className={`absolute bottom-2 left-2 flex max-w-[70%] gap-1.5 overflow-x-auto rounded-xl bg-black/35 p-1.5 [.sz-lesson-video-float_&]:hidden ${main && message ? 'hidden' : ''}`}
            aria-label="Câmeras da turma"
          >
            {model.localCamera ? (
              <li className="relative w-24 shrink-0 overflow-hidden rounded-lg">
                <Stream
                  bare
                  muted
                  stream={model.localCamera}
                  title="Você"
                  className="aspect-video w-full bg-black object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 font-bold text-[0.7rem] text-white">
                  Você
                </span>
              </li>
            ) : null}
            {classmates.map(({ publication, stream }) => (
              <li
                key={publication.id}
                className="relative w-24 shrink-0 overflow-hidden rounded-lg"
              >
                <Stream
                  bare
                  stream={stream}
                  title={model.label(publication)}
                  className="aspect-video w-full bg-black object-cover"
                />
                <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/60 px-1.5 font-bold text-[0.7rem] text-white">
                  {model.label(publication)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {voices.map(({ publication, stream }) => (
        <Stream key={publication.id} stream={stream} title={model.label(publication)} audioOnly />
      ))}
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
  // ⚠️ A barra mora ACIMA do rodapé da aula (que publica a altura em `--sz-lesson-nav-height`) e
  // publica a dela em `--sz-live-bar-height`, para a página reservar as duas embaixo do conteúdo.
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = bar.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const publish = () =>
      root.style.setProperty(
        '--sz-live-bar-height',
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      )
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--sz-live-bar-height')
    }
  }, [])
  return (
    <div
      ref={bar}
      className="sz-live-controls fixed inset-x-3 bottom-[calc(var(--sz-lesson-nav-height,0px)+0.5rem)] z-30 mx-auto max-w-5xl"
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
        className="grid grid-cols-4 items-center gap-1 rounded-[1.25rem] border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:flex sm:flex-wrap sm:justify-center sm:gap-2 sm:p-2.5"
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
  outline,
}: {
  room: LiveRoomView
  panel: 'chat' | 'materials' | null
  onPanel(panel: 'chat' | 'materials' | null): void
  canSendChat: boolean
  busy: boolean
  perform(path: string, body: unknown): Promise<boolean>
  deviceId: string
  admitted: boolean
  outline: LiveLessonOutline | null
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
          <Materials room={room} outline={outline} />
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

/**
 * Os materiais do encontro: os ANEXOS da aula (com a marca d'água de sempre, pela rota de anexo da
 * aula). Baixa pelo `fetch`: um erro vira recado aqui, em vez de trocar a página da sala por um
 * JSON.
 */
function Materials({ room, outline }: { room: LiveRoomView; outline: LiveLessonOutline | null }) {
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const lesson = room.lesson
  const materials = lesson ? (outline?.attachments ?? []) : []
  if (!materials.length || !lesson)
    return (
      <p className="font-medium text-muted-foreground">Tudo o que você precisa está na sala.</p>
    )
  async function download(id: string, title: string) {
    if (!lesson) return
    setPending(id)
    setProblem(null)
    try {
      const response = await sessionFetch(
        `/api/cursos/${encodeURIComponent(lesson.courseSlug)}/aulas/${encodeURIComponent(lesson.lessonId)}/anexos/${encodeURIComponent(id)}`,
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
              onClick={() => void download(material.id, material.label)}
              className="kids-3d kids-3d--carta flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left font-bold disabled:opacity-60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Download className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate">{material.label}</span>
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
