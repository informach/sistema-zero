'use client'

import type {
  LiveCatalogView,
  LiveRecordingChapter,
  LiveRecordingVimeo,
  LiveRoomView,
  LiveSessionSummary,
} from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Download,
  Expand,
  Hand,
  Headphones,
  Laptop,
  LifeBuoy,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  Paperclip,
  PlayCircle,
  Send,
  Users,
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
import { liveRequest } from '../../lib/live/client'
import { devicesPassed, recordHeadphones } from '../../lib/live/device-check'
import { canShareLiveTab } from '../../lib/live/device-errors'
import { followLiveSection, reviewDeadlineLabel } from '../../lib/live/journey'
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
import { AddToCalendarButton, ReviewDeadlineChip, useDeviceCheck } from './live-journey'
import { LegacyCohortNotice } from './live-legacy-notice'
import { type LiveMedia, Stream, useLiveMedia } from './live-media-panel'
import { LivePreflight } from './live-preflight'
import { LiveLessonSkeleton } from './use-live-lesson'

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
    // A pele adulta é a mesma da agenda (`LiveCatalog skin="adult"`): o cartão de borda fina e o
    // destaque na âncora escura da barra do topo. O `bg-primary` destoava da agenda ao entrar.
    card: adult ? 'sz-card-sm' : 'kids-carta',
    hero: adult ? 'bg-(--topo) text-(--sz-community-on-action,#fff)' : 'kids-marca',
    material: adult ? 'sz-card-sm' : 'kids-3d kids-3d--carta rounded-2xl border bg-card',
  }
}

/**
 * Os tons que só o Kids define (`--sz-kids-amarelo`, `--band-menta`, `--menu`): na comunidade
 * adulta eles não existem, e sem a reserva a pílula "Reconectando…", o "É a sua vez de falar!" e a
 * fala da professora no chat saíam sem fundo.
 */
const WARN_TONE =
  'bg-[var(--sz-kids-amarelo,var(--aviso-tint,#fde68a))] text-[var(--sz-kids-tinta,var(--aviso-texto,#1f2937))]'
const STAGE_BG = 'bg-[var(--menu,var(--topo,#1e293b))]'

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
      <RoomHeader
        room={room}
        teacherName={teacherName}
        stale={stale}
        outline={outline}
        currentSection={currentSection}
      />
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
              present: presentLabel(room.presentCount, skin(room).adult),
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
    warn: WARN_TONE,
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
  outline,
  currentSection,
}: {
  room: LiveRoomView
  teacherName: string | null
  stale: boolean
  outline: LiveLessonOutline | null
  currentSection: string | null
}) {
  const zone = room.cohort.timeZone
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const duration = durationLabel(start, room.occurrence?.endsAt ?? room.session.endsAt)
  const state = room.occurrence?.state
  const deadline =
    state === 'ended' && room.access.canOpen ? reviewDeadlineLabel(room.access.endsAt, zone) : null
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
          {teacherName ? ` · com ${teacherName}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
        {state === 'live' ? (
          <ClassPartMarker room={room} outline={outline} currentSection={currentSection} />
        ) : null}
        {deadline ? <ReviewDeadlineChip label={deadline} /> : null}
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

/**
 * "A turma está na parte 2 de 5", fixo no cabeçalho durante o encontro (o aviso do player some
 * em 6 s). Quem voltou para rever uma parte anterior ganha o "Ir junto", que leva à parte da
 * turma sem esperar quem conduz abrir a próxima.
 */
function ClassPartMarker({
  room,
  outline,
  currentSection,
}: {
  room: LiveRoomView
  outline: LiveLessonOutline | null
  currentSection: string | null
}) {
  const control = learnerSectionControl(room)
  const sections = outline?.sections ?? []
  const at = sections.findIndex((section) => section.id === control?.currentId)
  if (!control?.currentId || at < 0) return null
  const behind = currentSection !== null && currentSection !== control.currentId
  const { card } = skin(room)
  return (
    <div className={`${card} flex items-center gap-3 px-4 py-2 font-extrabold text-sm`}>
      {/* Só o texto é anunciado: o botão dentro da região seria relido a cada troca de parte. */}
      <span role="status">
        A turma está na parte {at + 1} de {sections.length}
      </span>
      <span aria-hidden className="hidden gap-1 sm:flex">
        {sections.map((section, index) => (
          <span
            key={section.id}
            className={`h-2 w-4 rounded-full ${index < at ? 'bg-[var(--pen-sucesso,#0b7a54)]' : index === at ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </span>
      {behind ? (
        <button
          type="button"
          onClick={() => followLiveSection(control.currentId!)}
          className="inline-flex min-h-9 items-center rounded-full bg-primary px-3 font-extrabold text-primary-foreground"
        >
          Ir junto
        </button>
      ) : null}
    </div>
  )
}

/** "3 colegas já chegaram": só o número, que o servidor manda (nunca quem são). */
function presentLabel(count: number | undefined, adult: boolean): string | null {
  if (!count) return null
  const noun = adult ? (count === 1 ? 'pessoa' : 'pessoas') : count === 1 ? 'colega' : 'colegas'
  return `${count} ${noun} já ${count === 1 ? 'chegou' : 'chegaram'}`
}

/** Quem chama para entrar: o nome de quem conduz, ou uma frase sem gênero. */
function calledBy(teacherName: string | null): string {
  return teacherName ? `${teacherName} já vai chamar você.` : 'Já já chamam você para entrar.'
}

/** Antes do dia: expectativa, contagem e o que preparar. Nada do conteúdo é antecipado. */
function FutureMeeting({ room, teacherName }: { room: LiveRoomView; teacherName: string | null }) {
  const { adult, card, hero } = skin(room)
  const zone = room.cohort.timeZone
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const left = countdown(start, zone)
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
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
            {teacherName
              ? `Você cria junto com ${teacherName} e a turma em “${room.session.title}”.`
              : `Você cria junto com a turma em “${room.session.title}”.`}{' '}
            A sala abre 15 minutos antes.
          </p>
          {adult ? (
            <AddToCalendarButton
              className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-[0.6rem] px-6 font-bold text-lg shadow-[inset_0_0_0_2px_var(--sz-community-action-light)]"
              event={{
                id: room.session.id,
                title: room.session.title,
                startsAt: start,
                endsAt: room.occurrence?.endsAt ?? room.session.endsAt,
                path: `/oficinas/aulas/${room.session.id}`,
                description: `${room.cohort.title}${teacherName ? `, com ${teacherName}` : ''}. A sala abre 15 minutos antes.`,
              }}
            />
          ) : null}
        </section>
        <section className={`${card} flex items-start gap-4 p-6`} aria-labelledby="live-who">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 id="live-who" className="sz-display text-xl">
              Quem vai estar lá
            </h2>
            <p className="font-medium text-muted-foreground">
              {teacherName
                ? `${teacherName} conduz o encontro com uma turma de até ${room.cohort.capacity} ${adult ? 'pessoas' : 'crianças'}. Cada um cria no próprio projeto, e ${teacherName} acompanha o de cada um.`
                : `A turma tem até ${room.cohort.capacity} ${adult ? 'pessoas' : 'crianças'}. Cada um cria no próprio projeto, com alguém da equipe acompanhando.`}
            </p>
          </div>
        </section>
      </div>
      <DeviceChecklist room={room} />
    </div>
  )
}

/**
 * "Para o dia chegar tranquilo": o computador, o fone e a câmera e o microfone, com o que já está
 * pronto NESTE aparelho (o teste fica lembrado, `lib/live/device-check.ts`) e o que falta.
 */
function DeviceChecklist({ room }: { room: LiveRoomView }) {
  const { card } = skin(room)
  const check = useDeviceCheck()
  // Decidido depois de montar: o servidor não sabe qual navegador abriu a página. A régua é a da
  // sala (`canShareLiveTab`, só o Chrome e o Edge no computador): celular e Safari abrem a câmera,
  // mas não mostram a tela nem criam do mesmo jeito.
  const [browserReady, setBrowserReady] = useState<boolean | null>(null)
  useEffect(
    () => setBrowserReady(Boolean(navigator.mediaDevices?.getUserMedia) && canShareLiveTab()),
    [],
  )
  const tested = check ? devicesPassed(check) : false
  const missing = [
    tested ? null : 'testar a câmera e o microfone',
    check?.headphones ? null : 'separar o fone',
  ].filter(Boolean)
  return (
    <section className={`${card} space-y-4 p-6`} aria-labelledby="live-prepare-title">
      <div>
        <h2 id="live-prepare-title" className="sz-display text-2xl">
          Para o dia chegar tranquilo
        </h2>
        <p className="mt-1 font-medium text-muted-foreground">
          Dá para deixar tudo pronto hoje. Nada do teste vai para a turma.
        </p>
      </div>
      <ol className="space-y-4">
        <ChecklistItem
          icon={<Laptop className="size-5" aria-hidden />}
          title="Computador com Chrome ou Edge"
          done={browserReady === true}
        >
          {browserReady === null
            ? null
            : browserReady
              ? 'Este navegador está pronto.'
              : 'Para criar junto com a turma, entre por um computador com o Chrome ou o Edge.'}
        </ChecklistItem>
        <ChecklistItem
          icon={<Headphones className="size-5" aria-hidden />}
          title="Um fone de ouvido"
          done={check?.headphones === true}
        >
          Assim o som da turma não volta pelo seu microfone.
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 font-bold text-foreground">
            <input
              type="checkbox"
              className="size-5 accent-(--primary)"
              checked={check?.headphones === true}
              disabled={check === null}
              onChange={(event) => recordHeadphones(event.target.checked)}
            />
            Já separei o meu
          </label>
        </ChecklistItem>
        <ChecklistItem
          icon={<Mic className="size-5" aria-hidden />}
          title="Câmera e microfone"
          done={tested}
        >
          {tested
            ? 'A câmera e o microfone funcionaram neste computador.'
            : 'Teste os dois aqui embaixo. Só você vê e ouve.'}
        </ChecklistItem>
      </ol>
      <LivePreflight open />
      {check ? (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-2xl p-3 font-extrabold ${missing.length ? 'bg-muted' : 'bg-[var(--sz-kids-menta-bg,var(--sucesso-tint,#dcf0e4))]'}`}
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {missing.length
            ? `Quase tudo pronto. Só falta ${missing.join(' e ')}.`
            : 'Tudo pronto. No dia, é só entrar.'}
        </p>
      ) : null}
    </section>
  )
}

function ChecklistItem({
  icon,
  title,
  done,
  children,
}: {
  icon: ReactNode
  title: string
  done: boolean
  children?: ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl ${done ? 'bg-[var(--sz-kids-menta-bg,var(--sucesso-tint,#dcf0e4))] text-[var(--pen-sucesso,#0b7a54)]' : 'bg-primary/10 text-primary'}`}
      >
        {done ? <Check className="size-5" aria-hidden /> : icon}
      </span>
      <div className="min-w-0 pt-1">
        <p className="font-bold">
          {title}
          {done ? <span className="sr-only"> (pronto)</span> : null}
        </p>
        {children ? <div className="font-medium text-muted-foreground">{children}</div> : null}
      </div>
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
  // Quem conduz pode ser professora ou professor: vai o nome e, sem ele, uma frase sem gênero.
  return {
    title: takeover
      ? 'Esta oficina está aberta em outro computador'
      : open
        ? state === 'live'
          ? teacherName
            ? `${teacherName} já está na sala!`
            : 'O encontro já começou!'
          : teacherName
            ? `${teacherName} abriu a sala`
            : 'A sala abriu'
        : early || Date.now() >= Date.parse(start)
          ? teacherName
            ? `${teacherName} ainda vai abrir a sala`
            : 'A sala ainda vai abrir'
          : `A sala abre às ${hour}`,
    text: takeover
      ? 'Se continuar aqui, a outra janela sai da sala. Seu projeto continua o mesmo.'
      : open
        ? early
          ? `Você entra com a câmera e o microfone desligados. O encontro começa às ${hour}.`
          : 'Você entra com a câmera e o microfone desligados.'
        : early
          ? `O encontro começa às ${hour}. Quando a sala abrir, o botão para entrar aparece aqui.`
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
  const { adult, card } = skin(room)
  const copy = doorCopy(room, teacherName, takeover, early)
  const open = copy.canJoin
  const check = useDeviceCheck()
  const passed = check !== null && devicesPassed(check)
  const present = presentLabel(room.presentCount, adult)
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
        <DoorNotes passed={passed} present={present} />
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
            {passed ? 'Testar de novo' : 'Testar meu computador'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

/** "Seu computador já passou no teste" e "3 colegas já chegaram", embaixo do texto da porta. */
function DoorNotes({
  passed,
  present,
  onDark = false,
}: {
  passed: boolean
  present: string | null
  onDark?: boolean
}) {
  if (!passed && !present) return null
  return (
    <p
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 font-bold text-sm ${onDark ? 'justify-center text-white/90' : ''}`}
    >
      {passed ? (
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Seu computador já passou no teste
        </span>
      ) : null}
      {present ? (
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4 shrink-0" aria-hidden />
          {present}
        </span>
      ) : null}
    </p>
  )
}

/** Já na recepção, antes do horário: o que acontece agora, em uma frase. */
function EarlyReception({ room, admitted }: { room: LiveRoomView; admitted: boolean }) {
  const self = room.occurrence?.participants.find((item) => item.learnerId === room.actorId)
  const start = room.occurrence?.startsAt ?? room.session.startsAt
  const hour = liveHour(new Date(start), room.cohort.timeZone)
  const { adult, card } = skin(room)
  const present = presentLabel(room.presentCount, adult)
  return (
    <section role="status" className={`${card} space-y-2 p-6 md:p-7`}>
      <h2 className="sz-display text-2xl md:text-[1.75rem]">
        {self?.admission === 'removed'
          ? 'Sua participação foi encerrada'
          : admitted
            ? 'Você já está na sala!'
            : 'Você está na recepção'}
      </h2>
      <p className="font-medium text-muted-foreground">
        {self?.admission === 'removed'
          ? 'Para voltar, quem conduz a turma precisa liberar sua entrada.'
          : admitted
            ? `O encontro começa às ${hour}. A turma aparece aqui.`
            : `${calledBy(teacherNameOf(room))} O encontro começa às ${hour}.`}
      </p>
      {self?.admission === 'removed' ? null : <DoorNotes passed={false} present={present} />}
    </section>
  )
}

function MeetingEnd({ room }: { room: LiveRoomView }) {
  const cancelled = room.occurrence?.state === 'cancelled'
  const { adult, card } = skin(room)
  const until = friendlyDay(room.access.endsAt, room.cohort.timeZone)
  return (
    <section className={`${card} space-y-4 p-6 md:p-7`} aria-labelledby="live-end-title">
      <div className="space-y-2">
        <h2 id="live-end-title" className="sz-display text-2xl md:text-[1.75rem]">
          {cancelled
            ? 'Este encontro foi cancelado'
            : adult
              ? 'O encontro terminou'
              : 'O encontro terminou. Que criação!'}
        </h2>
        <p className="font-medium text-muted-foreground">
          {/* A comunidade adulta não tem "família": a nova data é combinada com a própria pessoa. */}
          {cancelled
            ? adult
              ? 'Vamos avisar você da nova data. Seu projeto continua guardado.'
              : 'A equipe vai combinar uma nova data com a sua família. Seu projeto continua guardado.'
            : adult
              ? `Seu projeto ficou guardado. Dá para rever a aula e seguir no seu ritmo até ${until}.`
              : `Seu projeto ficou guardado. Agora cada um segue no próprio ritmo, até ${until}.`}
        </p>
      </div>
      {cancelled ? null : <MeetingEndTiles room={room} until={until} />}
    </section>
  )
}

/**
 * O fim do encontro num cartão só (proposta de 23/10/2026): a gravação, o projeto e o próximo
 * encontro, cada um com a sua ação. O próximo encontro vem da agenda (a sala carrega só este
 * encontro, de propósito); enquanto ela chega, o lugar já está reservado.
 */
function MeetingEndTiles({ room, until }: { room: LiveRoomView; until: string }) {
  const { adult } = skin(room)
  const recording = room.occurrence?.recording.state
  const next = useNextSession(room)
  const tile = adult ? 'sz-card-sm' : 'rounded-[1.25rem] bg-(--band-creme,var(--muted))'
  const action = adult
    ? 'inline-flex min-h-12 items-center gap-2 self-start rounded-[0.6rem] border-2 border-foreground bg-card px-5 font-bold'
    : 'kids-3d kids-3d--carta inline-flex min-h-11 items-center gap-2 self-start rounded-full border bg-card px-4 font-bold'
  const scrollTo = (selector: string) =>
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const failed = recording === 'failed' || recording === 'empty'
  const nextStart =
    next.status === 'found' ? (next.session.occurrenceStartsAt ?? next.session.startsAt) : ''
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className={`${tile} flex flex-col gap-2 p-4`}>
        <p className="flex items-center gap-2 font-extrabold text-primary text-sm">
          <PlayCircle className="size-4" aria-hidden />
          Gravação
        </p>
        <p className="sz-display text-lg">
          {room.access.canWatchRecording
            ? 'Pronta para rever'
            : failed
              ? 'Não ficou pronta'
              : 'Fica pronta em breve'}
        </p>
        <p className="font-medium text-muted-foreground text-sm">
          {room.access.canWatchRecording
            ? 'Cada parte tem o trecho dela.'
            : failed
              ? 'A aula continua aberta para você rever cada parte.'
              : 'Ela aparece no lugar da transmissão.'}
        </p>
        {room.access.canWatchRecording ? (
          <button type="button" className={action} onClick={() => scrollTo('.sz-lesson-stage')}>
            Assistir
          </button>
        ) : null}
      </div>
      <div className={`${tile} flex flex-col gap-2 p-4`}>
        <p className="flex items-center gap-2 font-extrabold text-primary text-sm">
          <Check className="size-4" aria-hidden />
          Seu projeto
        </p>
        <p className="sz-display text-lg">Guardado na sua conta</p>
        <p className="font-medium text-muted-foreground text-sm">Dá para continuar até {until}.</p>
        <button
          type="button"
          className={action}
          onClick={() => scrollTo('.sz-lesson-section-head')}
        >
          Continuar criando
        </button>
      </div>
      <div
        className={`${tile} flex min-h-36 flex-col gap-2 p-4`}
        aria-busy={next.status === 'loading'}
      >
        <p className="flex items-center gap-2 font-extrabold text-primary text-sm">
          <CalendarDays className="size-4" aria-hidden />
          Próximo encontro
        </p>
        {next.status === 'found' ? (
          <>
            <p className="sz-display text-lg">{friendlyWhen(nextStart, room.cohort.timeZone)}</p>
            <p className="font-medium text-muted-foreground text-sm">{next.session.title}</p>
            {adult ? (
              <AddToCalendarButton
                className={action}
                event={{
                  id: next.session.id,
                  title: next.session.title,
                  startsAt: nextStart,
                  endsAt: next.session.occurrenceEndsAt ?? next.session.endsAt,
                  path: `/oficinas/aulas/${next.session.id}`,
                  description: `${room.cohort.title}. A sala abre 15 minutos antes.`,
                }}
              />
            ) : (
              <a href={`/oficinas/aulas/${next.session.id}`} className={action}>
                Ver o encontro
              </a>
            )}
          </>
        ) : next.status === 'last' ? (
          <>
            <p className="sz-display text-lg">Este foi o último</p>
            <p className="font-medium text-muted-foreground text-sm">
              O que você criou continua guardado.
            </p>
          </>
        ) : next.status === 'loading' ? (
          <p className="sr-only" role="status">
            Buscando o próximo encontro…
          </p>
        ) : (
          <p className="font-medium text-muted-foreground text-sm">
            A data aparece em Oficinas, na sua agenda.
          </p>
        )}
      </div>
    </div>
  )
}

type NextSession =
  | { status: 'loading' | 'last' | 'unknown' }
  | { status: 'found'; session: LiveSessionSummary }

/**
 * O encontro seguinte da MESMA turma, pela agenda. "Último" só quando a agenda veio inteira (sem
 * próxima página): uma agenda cortada nunca afirma que acabou.
 */
function useNextSession(room: LiveRoomView): NextSession {
  const [next, setNext] = useState<NextSession>({ status: 'loading' })
  const cohortId = room.cohort.id
  const after = Date.parse(room.occurrence?.startsAt ?? room.session.startsAt)
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<LiveCatalogView>('/api/live/catalog', undefined, 'GET', controller.signal)
      .then((view) => {
        const following = view.sessions
          .filter(
            (item) =>
              item.cohortId === cohortId &&
              item.occurrenceState !== 'cancelled' &&
              Date.parse(item.occurrenceStartsAt ?? item.startsAt) > after,
          )
          .sort(
            (a, b) =>
              Date.parse(a.occurrenceStartsAt ?? a.startsAt) -
              Date.parse(b.occurrenceStartsAt ?? b.startsAt),
          )[0]
        setNext(
          following
            ? { status: 'found', session: following }
            : { status: view.nextCursor ? 'unknown' : 'last' },
        )
      })
      .catch(() => {
        if (!controller.signal.aborted) setNext({ status: 'unknown' })
      })
    return () => controller.abort()
  }, [cohortId, after])
  return next
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
  /** "3 colegas já chegaram" (só o número, do servidor). */
  present: string | null
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
      className={`grid aspect-video w-full place-items-center overflow-hidden rounded-[1.5rem] ${STAGE_BG} p-6 text-center text-white shadow-lg`}
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
  const {
    title: doorTitle,
    text: doorText,
    canJoin,
    busy: doorBusy,
    takeover,
    present: doorPresent,
  } = door
  const stageModel = useMemo<StageModel>(
    () => ({
      recordingVersion: recording?.version ?? 0,
      mode,
      door:
        mode === 'door'
          ? {
              title: doorTitle,
              text: doorText,
              canJoin,
              busy: doorBusy,
              takeover,
              present: doorPresent,
              onJoin: join,
            }
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
      doorPresent,
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
    // Keep the lesson closed until its live authority exists; absence means recorded elsewhere.
    // O mesmo formato da aula (transmissão em 16:9 e cartão), para nada pular quando ela chega.
    if (!liveWorkspace)
      return <LiveLessonSkeleton stage={STAGE_ELEMENT} label="Preparando seu projeto…" />
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
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={replayLabelId} className="font-bold text-sm">
            Assistir
          </label>
          <select
            id={replayLabelId}
            className="min-h-11 max-w-full rounded-xl border bg-card px-3 font-semibold"
            value={selected?.occurrenceId ?? 'current'}
            onChange={(event) => setSelectedReplay(event.target.value)}
          >
            <option value="current">Encontro mais recente</option>
            {recordings.map((item) => (
              <option key={item.occurrenceId} value={item.occurrenceId}>
                Gravação de {friendlyWhen(item.startsAt, room.cohort.timeZone).toLowerCase()}
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
  const check = useDeviceCheck()
  const passed = check !== null && devicesPassed(check)
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
            {passed ? 'Testar de novo' : 'Testar meu computador'}
          </Button>
        </div>
        <DoorNotes passed={passed} present={door.present} onDark />
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
            : 'Entre na sala para ver e ouvir o encontro.'}
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
  const name = teacherName ?? 'Transmissão'
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
      ? 'Sua participação neste encontro foi encerrada. Seu projeto continua aqui.'
      : `Você está na recepção. ${calledBy(teacherName)}`
    : !model.supervised
      ? `${teacherName ?? 'Quem conduz a turma'} está reconectando. Você pode continuar criando.`
      : model.reconnecting
        ? 'A internet oscilou. Reconectando o som da aula…'
        : !model.sessionReady
          ? 'Conectando o som e a imagem…'
          : !main
            ? `${teacherName ?? 'Quem conduz a turma'} está com a câmera desligada. Dá para ouvir normalmente.`
            : null
  return (
    <section
      ref={frame}
      aria-label={`${name} ao vivo`}
      className={`sz-live-stage overflow-hidden ${STAGE_BG} shadow-lg ${enlarged === 'overlay' ? 'fixed inset-0 z-[95] flex flex-col justify-center rounded-none' : enlarged === 'native' ? 'flex flex-col justify-center' : 'rounded-[1.5rem]'}`}
    >
      <div className={`relative w-full ${enlarged ? 'max-h-dvh flex-1' : 'aspect-video'}`}>
        {main ? (
          <Stream
            bare
            stream={main.stream}
            title={
              demo
                ? teacherName
                  ? `Demonstração de ${teacherName}`
                  : 'Demonstração ao vivo'
                : name
            }
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
  if (self.microphoneLocked) return 'Seu microfone foi fechado por enquanto.'
  const mode = room.occurrence?.speakingMode
  if (mode === 'listen') return 'Hora de ouvir. Levante a mão se quiser falar.'
  if (mode === 'turns')
    return self.turnGranted ? 'É a sua vez de falar!' : 'Sua vez de falar já vai chegar.'
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
  const { adult } = skin(room)
  const who = teacherNameOf(room)
  // O pedido de ajuda tem retorno: enquanto ele está aceso, a barra diz que ele chegou.
  const helpNote = self?.helpAt
    ? `Seu pedido de ajuda chegou para ${who ?? 'quem conduz a turma'}.`
    : null
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
      {hint || media.local.screen || helpNote ? (
        <p
          role="status"
          aria-live="polite"
          className={`mx-auto mb-2 w-fit rounded-full px-4 py-1.5 text-center font-bold text-sm shadow ${turn ? WARN_TONE : 'bg-card text-foreground'}`}
        >
          {media.local.screen ? `${who ?? 'Quem conduz a turma'} está vendo esta aba. ` : ''}
          {helpNote ? `${helpNote} ` : ''}
          {hint ?? ''}
        </p>
      ) : null}
      <nav
        aria-label="Controles da sala"
        className={`grid ${adult ? 'grid-cols-3' : 'grid-cols-[repeat(auto-fit,minmax(3.25rem,1fr))]'} items-center gap-1 rounded-[1.25rem] border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:flex sm:flex-wrap sm:justify-center sm:gap-2 sm:p-2.5`}
      >
        <BarSkin.Provider value={adult}>
          <BarButton
            active={Boolean(media.local.microphone)}
            disabled={busy || media.busy || !media.microphoneAllowed}
            onClick={() => void media.toggle('microphone')}
            icon={
              media.local.microphone ? <Mic className="size-5" /> : <MicOff className="size-5" />
            }
            label={
              adult
                ? media.local.microphone
                  ? 'Desligar microfone'
                  : 'Ligar microfone'
                : 'Microfone'
            }
            mid="Microfone"
            name={media.local.microphone ? 'Desligar o microfone' : 'Ligar o microfone'}
          />
          <BarButton
            active={Boolean(media.local.camera)}
            disabled={busy || media.busy || (!media.local.camera && !media.cameraAllowed)}
            onClick={() => (media.local.camera ? media.stop('camera') : setCameraOpen(true))}
            icon={
              media.local.camera ? <Camera className="size-5" /> : <CameraOff className="size-5" />
            }
            label={adult ? (media.local.camera ? 'Desligar câmera' : 'Ligar câmera') : 'Câmera'}
            mid="Câmera"
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
            mid={self?.helpAt ? 'Já consegui' : 'Ajuda'}
          />
          {shareSupported ? (
            <BarButton
              active={Boolean(media.local.screen)}
              disabled={busy || media.busy || !media.available}
              onClick={() => void media.toggle('screen')}
              icon={<MonitorUp className="size-5" />}
              label={media.local.screen ? 'Parar de mostrar' : 'Mostrar tela'}
              short="Tela"
              mid="Tela"
              name={
                media.local.screen
                  ? 'Parar de mostrar minha tela'
                  : 'Mostrar minha tela a quem conduz a turma'
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
            mid="Conversa"
            name="Conversa da turma"
            badge={unread}
          />
          <BarButton
            active={panel === 'materials'}
            onClick={() => onPanel(panel === 'materials' ? null : 'materials')}
            icon={<Paperclip className="size-5" />}
            label="Materiais"
            short="Arquivos"
            mid="Materiais"
          />
        </BarSkin.Provider>
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
  mid,
  name,
  onClick,
  active = false,
  disabled = false,
  badge = 0,
  target,
}: {
  icon: ReactNode
  label: string
  /** A palavra do celular no Kids (sem ela, o próprio rótulo). */
  short?: string
  /** O rótulo do celular na comunidade adulta, em letra legível (sem ele, o rótulo inteiro). */
  mid?: string
  /** O nome para o leitor de tela, quando o rótulo visível é curto demais para dizer o estado. */
  name?: string
  onClick(): void
  active?: boolean
  disabled?: boolean
  badge?: number
  target?: string
}) {
  const adult = useContext(BarSkin)
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
      {/* A comunidade adulta não usa letra menor que 17 px: no celular vai uma palavra legível. */}
      <span className={`leading-tight sm:hidden ${adult ? 'text-base' : 'text-[0.6875rem]'}`}>
        {adult ? (mid ?? label) : (short ?? label)}
      </span>
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

/** A barra sabe a pele pela turma: a comunidade adulta tem rótulos de ação e letra maior. */
const BarSkin = createContext(false)

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
  const paused = room.occurrence?.chatEnabled === false
  // A caixa apagada sempre diz por quê (antes, fora do encontro ela só aparecia desligada).
  const closedReason = paused
    ? 'A conversa está pausada por enquanto.'
    : !canSend
      ? room.occurrence?.state === 'live'
        ? 'A conversa volta em instantes, assim que a sala reconectar.'
        : 'A conversa abre quando o encontro começar.'
      : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: rola até o fim quando chega mensagem nova.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])
  if (!admitted)
    return (
      <p className="font-medium text-muted-foreground">
        A conversa aparece quando você entrar na sala.
      </p>
    )
  return (
    <div className="flex h-full flex-col gap-3">
      {pinned.length ? (
        <div className="space-y-2 rounded-2xl bg-(--band-creme,var(--muted)) p-3">
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
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${mine ? 'ml-auto bg-primary text-primary-foreground' : item.role === 'teacher' ? 'bg-(--band-menta,var(--muted))' : 'bg-muted'}`}
            >
              <p className="font-extrabold text-xs">
                {mine
                  ? 'Você'
                  : item.role === 'teacher'
                    ? `${item.authorName} · conduz a turma`
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
        {closedReason ? (
          <p id="live-message-closed" className="font-medium text-muted-foreground text-sm">
            {closedReason}
          </p>
        ) : null}
        <textarea
          id="live-message"
          maxLength={500}
          rows={2}
          placeholder="Escreva para a turma…"
          aria-describedby={closedReason ? 'live-message-closed' : undefined}
          className="w-full rounded-xl border bg-background p-3 font-medium"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={Boolean(closedReason) || busy}
        />
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={Boolean(closedReason) || busy || !message.trim()}
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
  const { material: materialSkin } = skin(room)
  const lesson = room.lesson
  const materials = lesson ? (outline?.attachments ?? []) : []
  if (!materials.length || !lesson)
    return (
      <p className="font-medium text-muted-foreground">
        Este encontro não tem arquivos para baixar. Tudo o que você vai usar já está na aula.
      </p>
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
              className={`${materialSkin} flex min-h-12 w-full items-center gap-3 p-3 text-left font-bold disabled:opacity-60`}
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
