'use client'

import {
  canPublishMicrophone,
  type LiveMediaKind,
  type LiveMediaPublication,
  type LiveMediaState,
  type LiveRoomView,
} from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import { Camera, CameraOff, Mic, MicOff, MonitorUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createLiveCameraEffect,
  LIVE_CAMERA_EFFECTS,
  type LiveCameraEffect,
} from '../../lib/live/media-camera-effects'
import {
  captureLiveCamera,
  captureLiveMicrophone,
  captureLiveTab,
  registerLiveCaptureHandle,
} from '../../lib/live/media-devices'
import { createLiveMediaTransport } from '../../lib/live/media-transport'
import { sessionFetch } from '../../lib/session-fetch'

function stopTracks(stream?: MediaStream) {
  for (const track of stream?.getTracks() ?? []) track.stop()
}

function Stream({
  stream,
  title,
  muted = false,
  audioOnly = false,
}: {
  stream: MediaStream
  title: string
  muted?: boolean
  audioOnly?: boolean
}) {
  const element = useRef<HTMLVideoElement>(null)
  const [playBlocked, setPlayBlocked] = useState(false)
  useEffect(() => {
    const video = element.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => setPlayBlocked(true))
    return () => {
      video.srcObject = null
    }
  }, [stream])
  return (
    <div className={audioOnly ? 'text-sm' : 'overflow-hidden rounded-xl border bg-card'}>
      <video
        ref={element}
        autoPlay
        playsInline
        muted={muted}
        className={audioOnly ? 'hidden' : 'aspect-video w-full bg-black object-contain'}
        aria-label={title}
      />
      {!audioOnly ? <p className="p-2 text-xs font-bold">{title}</p> : null}
      {playBlocked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void element.current?.play().then(() => setPlayBlocked(false))
          }}
        >
          Ouvir {title}
        </Button>
      ) : null}
    </div>
  )
}

export function LiveMediaPanel({
  room,
  deviceId,
  stale,
  onError,
  compactOnMobile = false,
}: {
  room: LiveRoomView
  deviceId: string
  stale: boolean
  onError(message: string): void
  compactOnMobile?: boolean
}) {
  const transport = useRef<ReturnType<typeof createLiveMediaTransport> | null>(null)
  const roomRef = useRef(room)
  roomRef.current = room
  const staleRef = useRef(stale)
  staleRef.current = stale
  const [state, setState] = useState<LiveMediaState>('idle')
  const [sessionReady, setSessionReady] = useState(false)
  const [focused, setFocused] = useState<{ id: string; title: string } | null>(null)
  const [remote, setRemote] = useState<
    Record<string, { publication: LiveMediaPublication; stream: MediaStream }>
  >({})
  const [local, setLocal] = useState<Partial<Record<LiveMediaKind, MediaStream>>>({})
  const localRef = useRef(local)
  localRef.current = local
  const [busy, setBusy] = useState(false)
  const [cameraEffect, setCameraEffect] = useState<'none' | LiveCameraEffect>('none')
  const cameraProcessor = useRef<{ close(): void } | null>(null)
  const [handle] = useState(() => crypto.randomUUID())
  const generation = useRef(0)
  const muteEpoch = useRef<number | null>(null)
  const occurrenceId = room.occurrence?.id
  const self = room.occurrence?.participants.find(
    (participant) => participant.learnerId === room.actorId,
  )
  const teacher = room.role === 'teacher'
  const available =
    room.mediaReady && room.occurrence?.state === 'live' && room.supervision === 'present' && !stale
  const microphoneAllowed =
    available &&
    (teacher || (!!self && canPublishMicrophone(room.occurrence!.speakingMode, self, true)))
  const cameraAllowed = available && (teacher || (!!self && !self.cameraLocked))
  const stop = useCallback((kind: LiveMediaKind) => {
    if (kind === 'camera') {
      cameraProcessor.current?.close()
      cameraProcessor.current = null
    }
    if (!localRef.current[kind]) return
    stopTracks(localRef.current[kind])
    delete localRef.current[kind]
    setLocal({ ...localRef.current })
    void transport.current?.stopPublishing(kind).catch(() => undefined)
  }, [])
  useEffect(() => registerLiveCaptureHandle(handle), [handle])
  useEffect(() => {
    if (!occurrenceId || !deviceId) return
    const current = createLiveMediaTransport({
      fetch: sessionFetch,
      baseUrl: `/api/live/occurrences/${occurrenceId}/media`,
      deviceId,
      onTrack: (event) =>
        setRemote((previous) => ({
          ...previous,
          [event.publication.id]: { publication: event.publication, stream: event.stream },
        })),
      onTrackRemoved: (id) =>
        setRemote((previous) => {
          const next = { ...previous }
          delete next[id]
          return next
        }),
      onState: (next) => {
        setState(next)
        if (next === 'closed' || next === 'failed' || next === 'suspended') {
          setSessionReady(false)
          setFocused(null)
          generation.current += 1
          cameraProcessor.current?.close()
          cameraProcessor.current = null
          for (const stream of Object.values(localRef.current)) stopTracks(stream)
          localRef.current = {}
          setLocal({})
        }
      },
      onError: (error) => onError(error.message),
    })
    transport.current = current
    return () => {
      generation.current += 1
      cameraProcessor.current?.close()
      cameraProcessor.current = null
      for (const stream of Object.values(localRef.current)) stopTracks(stream)
      localRef.current = {}
      void current.close().catch(() => undefined)
      if (transport.current === current) transport.current = null
    }
  }, [occurrenceId, deviceId, onError])
  useEffect(() => {
    if (!stale && room.serverTime) transport.current?.observeControlHeartbeat()
  }, [room.serverTime, stale])
  useEffect(() => {
    if (!microphoneAllowed) stop('microphone')
    if (!cameraAllowed) stop('camera')
    if (!available) {
      stop('screen')
      stop('demo')
      if (state === 'connected' || state === 'connecting')
        void transport.current?.close().catch(() => undefined)
    }
    if (self && muteEpoch.current !== null && self.muteEpoch !== muteEpoch.current)
      stop('microphone')
    muteEpoch.current = self?.muteEpoch ?? null
  }, [available, microphoneAllowed, cameraAllowed, self?.muteEpoch, state, stop, self])
  useEffect(() => {
    if (!sessionReady || !available) return
    let pending = false
    const discover = () => {
      if (!pending) {
        pending = true
        void transport.current
          ?.refreshPublications()
          .catch(() => undefined)
          .finally(() => {
            pending = false
          })
      }
    }
    discover()
    const timer = setInterval(discover, 3000)
    return () => clearInterval(timer)
  }, [sessionReady, available])
  async function connect() {
    setBusy(true)
    try {
      const current = transport.current
      if (!current) throw new Error('A sala ainda está sendo preparada.')
      current.observeControlHeartbeat()
      await current.join()
      if (
        transport.current === current &&
        !staleRef.current &&
        roomRef.current.occurrence?.state === 'live'
      )
        setSessionReady(true)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Não foi possível conectar áudio e vídeo.')
    } finally {
      setBusy(false)
    }
  }
  async function toggle(kind: 'microphone' | 'camera' | 'screen' | 'demo') {
    if (localRef.current[kind]) {
      stop(kind)
      return
    }
    const attempt = generation.current
    setBusy(true)
    let stream: MediaStream | undefined
    try {
      stream = await (kind === 'microphone'
        ? captureLiveMicrophone()
        : kind === 'camera'
          ? captureLiveCamera()
          : captureLiveTab({
              handle: kind === 'demo' ? `sz-live-demo:${room.session.id}` : handle,
              onInvalidated: () => stop(kind),
            }))
      if (kind === 'camera' && cameraEffect !== 'none') {
        const effect = await createLiveCameraEffect({
          input: stream,
          effect: cameraEffect,
          onFailure: (error) => {
            stop('camera')
            onError(error.message)
          },
        })
        if (generation.current !== attempt) {
          effect.close()
          return
        }
        cameraProcessor.current = effect
        stream = effect.stream
      }
      if (generation.current !== attempt || !transport.current) {
        stopTracks(stream)
        return
      }
      // Permissions can change while a browser permission prompt is open.
      const latest = roomRef.current
      const currentSelf = latest.occurrence?.participants.find(
        (participant) => participant.learnerId === latest.actorId,
      )
      const currentAllowed =
        !staleRef.current &&
        latest.mediaReady &&
        latest.supervision === 'present' &&
        latest.occurrence?.state === 'live' &&
        (latest.role === 'teacher' ||
          (currentSelf?.admission === 'admitted' &&
            currentSelf.deviceId === deviceId &&
            (kind !== 'microphone' ||
              canPublishMicrophone(latest.occurrence.speakingMode, currentSelf, true)) &&
            (kind !== 'camera' || !currentSelf.cameraLocked)))
      if (!currentAllowed)
        throw new Error(
          'A professora mudou a organização da sala. Ligue o aparelho novamente quando estiver liberado.',
        )
      const track = kind === 'microphone' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
      if (!track) throw new Error('O aparelho não forneceu uma imagem ou som.')
      await transport.current.publish(kind, track)
      localRef.current = { ...localRef.current, [kind]: stream }
      setLocal(localRef.current)
      track.addEventListener('ended', () => stop(kind), { once: true })
    } catch (cause) {
      if (kind === 'camera') {
        cameraProcessor.current?.close()
        cameraProcessor.current = null
      }
      stopTracks(stream)
      onError(cause instanceof Error ? cause.message : 'Não foi possível ligar o aparelho.')
    } finally {
      setBusy(false)
    }
  }
  const label = (publication: LiveMediaPublication) =>
    publication.role === 'teacher'
      ? publication.kind === 'demo'
        ? 'Demonstração da professora'
        : 'Professora'
      : `${room.occurrence?.participants.find((item) => item.learnerId === publication.actorId)?.displayName ?? 'Participante'}${publication.kind === 'screen' ? ' · Projeto acompanhado' : ''}`
  async function focus(publication: LiveMediaPublication | null) {
    setFocused(publication ? { id: publication.id, title: label(publication) } : null)
    try {
      await transport.current?.focusPublication(publication?.id ?? null)
    } catch (cause) {
      setFocused(null)
      onError(cause instanceof Error ? cause.message : 'Não foi possível ampliar a imagem.')
    }
  }
  return (
    <section
      className="space-y-4 rounded-2xl border bg-card p-4"
      aria-label="Áudio e vídeo da oficina"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sz-display text-xl font-bold">Nossa sala</h2>
        <p role="status" className="text-sm text-muted-foreground">
          {!room.mediaReady
            ? 'A transmissão ainda não foi habilitada para esta turma.'
            : state === 'connected'
              ? 'Áudio e vídeo conectados'
              : sessionReady
                ? 'Conexão preparada · escolha seus aparelhos'
                : state === 'connecting'
                  ? 'Conectando…'
                  : 'Áudio e vídeo desligados'}
        </p>
      </div>
      {room.mediaReady && !sessionReady ? (
        <Button disabled={!available || busy} onClick={() => void connect()}>
          Conectar áudio e vídeo
        </Button>
      ) : null}
      {sessionReady ? (
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            variant="outline"
            disabled={busy || !microphoneAllowed}
            onClick={() => void toggle('microphone')}
          >
            {local.microphone ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            {local.microphone ? 'Desligar microfone' : 'Ligar microfone'}
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={busy || !cameraAllowed}
            onClick={() => void toggle('camera')}
          >
            {local.camera ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
            {local.camera ? 'Desligar câmera' : 'Ligar câmera'}
          </Button>
          <label
            className={`${compactOnMobile ? 'hidden lg:flex' : 'flex'} items-center gap-2 text-sm font-bold`}
          >
            Fundo
            <select
              className="min-h-10 rounded-lg border bg-background p-2"
              disabled={busy || !!local.camera}
              value={cameraEffect}
              onChange={(event) => setCameraEffect(event.target.value as 'none' | LiveCameraEffect)}
            >
              {LIVE_CAMERA_EFFECTS.map((effect) => (
                <option key={effect.value} value={effect.value}>
                  {effect.label}
                </option>
              ))}
            </select>
          </label>
          {!teacher ? (
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy || !available}
              onClick={() => void toggle('screen')}
            >
              <MonitorUp className="size-4" />
              {local.screen ? 'Parar acompanhamento' : 'Mostrar esta aba à professora'}
            </Button>
          ) : (
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy || !available}
              onClick={() => void toggle('demo')}
            >
              <MonitorUp className="size-4" />
              {local.demo ? 'Parar demonstração' : 'Transmitir aba de demonstração'}
            </Button>
          )}
        </div>
      ) : null}
      {!teacher ? (
        <p className={`${compactOnMobile ? 'hidden lg:block' : ''} text-sm text-muted-foreground`}>
          Sua câmera é opcional. O acompanhamento desta aba aparece somente para a professora.
        </p>
      ) : (
        <p className={`${compactOnMobile ? 'hidden lg:block' : ''} text-sm text-muted-foreground`}>
          <a
            href={`/ao-vivo/demonstracao/${room.session.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary underline"
          >
            Abrir demonstração em outra aba
          </a>
          . Depois, escolha essa aba em “Transmitir aba de demonstração”. A tela da turma fica fora
          da transmissão.
        </p>
      )}
      {Object.values(remote)
        .filter(({ publication }) => publication.kind === 'microphone')
        .map(({ publication, stream }) => (
          <Stream key={publication.id} stream={stream} title={label(publication)} audioOnly />
        ))}
      <div
        className={`${compactOnMobile ? 'hidden lg:grid' : 'grid'} gap-3 sm:grid-cols-2 ${teacher ? 'xl:grid-cols-4' : ''}`}
      >
        {local.camera ? (
          <Stream stream={local.camera} title="Você · câmera compartilhada" muted />
        ) : null}
        {local.screen ? (
          <Stream stream={local.screen} title="Esta aba · visível só para a professora" muted />
        ) : null}
        {local.demo ? (
          <Stream stream={local.demo} title="Demonstração compartilhada" muted />
        ) : null}
        {Object.values(remote)
          .filter(({ publication }) => publication.kind !== 'microphone')
          .map(({ publication, stream }) => (
            <div
              key={publication.id}
              className={`space-y-2 ${!teacher && publication.kind === 'demo' ? 'sm:col-span-2' : ''}`}
            >
              <Stream
                stream={stream}
                title={label(publication)}
                audioOnly={publication.kind === 'microphone'}
              />
              {teacher && publication.kind === 'screen' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!available}
                  onClick={() => void focus(publication)}
                >
                  Ampliar projeto
                </Button>
              ) : null}
            </div>
          ))}
      </div>
      <Dialog
        open={focused !== null}
        onClose={() => void focus(null)}
        title={focused?.title ?? 'Projeto acompanhado'}
        description="Acompanhamento privado da aba do Sistema Zero. Para editar, peça autorização na criação da criança."
        className="max-w-6xl"
      >
        {focused && remote[focused.id] ? (
          <Stream stream={remote[focused.id]!.stream} title={focused.title} muted />
        ) : (
          <p role="status">A imagem foi pausada ou está reconectando.</p>
        )}
      </Dialog>
    </section>
  )
}
