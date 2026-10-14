'use client'

import {
  canPublishMicrophone,
  type LiveMediaKind,
  type LiveMediaPublication,
  type LiveMediaState,
  type LiveRoomView,
} from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import { MonitorUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyDeviceError } from '../../lib/live/device-errors'
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

export function Stream({
  stream,
  title,
  muted = false,
  audioOnly = false,
  bare = false,
  className,
}: {
  stream: MediaStream
  title: string
  muted?: boolean
  audioOnly?: boolean
  /** Só o vídeo, sem moldura nem legenda (quem desenha é o palco). */
  bare?: boolean
  className?: string
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
  const unblock = playBlocked ? (
    <Button
      className="min-h-11"
      onClick={() => {
        void element.current?.play().then(() => setPlayBlocked(false))
      }}
    >
      Ouvir {title}
    </Button>
  ) : null
  if (bare)
    return (
      <>
        <video
          ref={element}
          autoPlay
          playsInline
          muted={muted}
          className={className ?? 'size-full object-contain'}
          aria-label={title}
        />
        {unblock ? (
          <div className="absolute inset-0 grid place-items-center bg-black/40">{unblock}</div>
        ) : null}
      </>
    )
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
      {unblock}
    </div>
  )
}

const EFFECT_KEY = 'sz:live-camera-effect:'
function rememberedEffect(actorId: string): 'none' | LiveCameraEffect {
  try {
    const value = localStorage.getItem(EFFECT_KEY + actorId)
    if (LIVE_CAMERA_EFFECTS.some((effect) => effect.value === value))
      return value as 'none' | LiveCameraEffect
  } catch {
    /* Preferência opcional. */
  }
  return 'none'
}

/**
 * Toda a lógica de áudio e vídeo da sala, sem desenho. A professora usa o painel de sempre
 * (`LiveMediaPanel`); a criança usa o palco (`LiveStage`) e a barra de controles da sala.
 */
export function useLiveMedia({
  room,
  deviceId,
  stale,
  onError,
  enabled = true,
  autoConnect = false,
}: {
  room: LiveRoomView
  deviceId: string
  stale: boolean
  onError(message: string): void
  /** A criança só conecta depois de recebida na sala. */
  enabled?: boolean
  /**
   * Liga a RECEPÇÃO (ouvir e ver a professora) sozinha e a refaz depois de uma queda, com
   * espera crescente. Nunca liga o microfone, a câmera ou a tela da própria pessoa.
   */
  autoConnect?: boolean
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
  const [cameraEffect, setCameraEffectState] = useState<'none' | LiveCameraEffect>('none')
  const cameraProcessor = useRef<{ close(): void } | null>(null)
  const [handle] = useState(() => crypto.randomUUID())
  const generation = useRef(0)
  const muteEpoch = useRef<number | null>(null)
  const attempts = useRef(0)
  const [reconnecting, setReconnecting] = useState(false)
  // A internet voltou: tenta de novo na hora, sem esperar o resto da espera crescente.
  const [wake, setWake] = useState(0)
  const occurrenceId = room.occurrence?.id
  const self = room.occurrence?.participants.find(
    (participant) => participant.learnerId === room.actorId,
  )
  const teacher = room.role === 'teacher'
  const available =
    enabled &&
    room.mediaReady &&
    room.occurrence?.state === 'live' &&
    room.supervision === 'present' &&
    !stale
  const microphoneAllowed =
    available &&
    (teacher || (!!self && canPublishMicrophone(room.occurrence!.speakingMode, self, true)))
  const cameraAllowed = available && (teacher || (!!self && !self.cameraLocked))
  useEffect(() => {
    setCameraEffectState(rememberedEffect(room.actorId))
  }, [room.actorId])
  const setCameraEffect = useCallback(
    (value: 'none' | LiveCameraEffect) => {
      setCameraEffectState(value)
      try {
        localStorage.setItem(EFFECT_KEY + room.actorId, value)
      } catch {
        /* Preferência opcional. */
      }
    },
    [room.actorId],
  )
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
          setRemote({})
        }
      },
      onError: (error) => {
        // Na reconexão automática a criança vê "Reconectando o som…", não um alerta a cada tentativa.
        if (!autoConnect) onError(friendlyDeviceError(error))
      },
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
  }, [occurrenceId, deviceId, onError, autoConnect])
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
  const connect = useCallback(
    async (automatic = false) => {
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
        ) {
          setSessionReady(true)
          attempts.current = 0
          setReconnecting(false)
        }
      } catch (cause) {
        if (automatic) setReconnecting(true)
        else onError(friendlyDeviceError(cause))
      } finally {
        setBusy(false)
      }
    },
    [onError],
  )
  useEffect(() => {
    if (!autoConnect) return
    const online = () => {
      attempts.current = 0
      setWake((value) => value + 1)
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [autoConnect])
  // Recepção automática: ao ser recebida, e de novo depois de cada queda, com espera crescente.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `wake` reagenda quando a internet volta.
  useEffect(() => {
    if (!autoConnect || !available || sessionReady || busy || state === 'connecting') return
    const delay = [0, 2_000, 5_000, 10_000, 20_000][Math.min(attempts.current, 4)]!
    if (attempts.current > 0) setReconnecting(true)
    const timer = setTimeout(() => {
      attempts.current += 1
      void connect(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [autoConnect, available, sessionReady, busy, state, connect, wake])
  useEffect(() => {
    if (!available) setReconnecting(false)
  }, [available])

  /** Abre o aparelho só para a própria pessoa (a câmera já sai com o fundo escolhido). */
  const capture = useCallback(
    async (kind: 'microphone' | 'camera' | 'screen' | 'demo') => {
      let stream =
        kind === 'microphone'
          ? await captureLiveMicrophone()
          : kind === 'camera'
            ? await captureLiveCamera()
            : await captureLiveTab({
                handle: kind === 'demo' ? `sz-live-demo:${roomRef.current.session.id}` : handle,
                onInvalidated: () => stop(kind),
              })
      if (kind === 'camera' && cameraEffect !== 'none') {
        const effect = await createLiveCameraEffect({
          input: stream,
          effect: cameraEffect,
          onFailure: (error) => {
            stop('camera')
            onError(friendlyDeviceError(error, 'camera'))
          },
        })
        cameraProcessor.current?.close()
        cameraProcessor.current = effect
        stream = effect.stream
      }
      return stream
    },
    [cameraEffect, handle, onError, stop],
  )

  /** Envia à sala um aparelho já aberto (por `capture`). */
  const publish = useCallback(
    async (kind: 'microphone' | 'camera' | 'screen' | 'demo', stream: MediaStream) => {
      const attempt = generation.current
      try {
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
            'A professora mudou a organização da sala. Ligue o aparelho de novo quando estiver liberado.',
          )
        const track =
          kind === 'microphone' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
        if (!track) throw new Error('O aparelho não mandou imagem nem som.')
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
        throw cause
      }
    },
    [deviceId, stop],
  )

  const toggle = useCallback(
    async (kind: 'microphone' | 'camera' | 'screen' | 'demo') => {
      if (localRef.current[kind]) {
        stop(kind)
        return
      }
      const attempt = generation.current
      setBusy(true)
      let stream: MediaStream | undefined
      try {
        stream = await capture(kind)
        if (generation.current !== attempt) {
          stopTracks(stream)
          return
        }
        await publish(kind, stream)
      } catch (cause) {
        stopTracks(stream)
        onError(friendlyDeviceError(cause, kind))
      } finally {
        setBusy(false)
      }
    },
    [capture, publish, stop, onError],
  )
  const label = useCallback(
    (publication: LiveMediaPublication & { displayName?: string }) =>
      publication.role === 'teacher'
        ? publication.kind === 'demo'
          ? 'Demonstração da professora'
          : 'Professora'
        : `${
            publication.displayName ??
            roomRef.current.occurrence?.participants.find(
              (item) => item.learnerId === publication.actorId,
            )?.displayName ??
            'Colega'
          }${publication.kind === 'screen' ? ' · Projeto acompanhado' : ''}`,
    [],
  )
  const focus = useCallback(
    async (publication: LiveMediaPublication | null) => {
      setFocused(publication ? { id: publication.id, title: label(publication) } : null)
      try {
        await transport.current?.focusPublication(publication?.id ?? null)
      } catch (cause) {
        setFocused(null)
        onError(friendlyDeviceError(cause))
      }
    },
    [label, onError],
  )
  return {
    teacher,
    self,
    state,
    sessionReady,
    reconnecting,
    available,
    microphoneAllowed,
    cameraAllowed,
    busy,
    local,
    remote,
    cameraEffect,
    setCameraEffect,
    connect,
    capture,
    publish,
    toggle,
    stop,
    focus,
    focused,
    label,
  }
}
export type LiveMedia = ReturnType<typeof useLiveMedia>

/** O painel de sempre, usado pela professora (e por quem ainda monta a sala sem o palco). */
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
  const media = useLiveMedia({ room, deviceId, stale, onError })
  const {
    teacher,
    state,
    sessionReady,
    available,
    microphoneAllowed,
    cameraAllowed,
    busy,
    local,
    remote,
    cameraEffect,
    setCameraEffect,
    connect,
    toggle,
    focus,
    focused,
    label,
  } = media
  return (
    <section
      className="space-y-4 rounded-2xl border bg-card p-4"
      aria-label="Áudio e vídeo da oficina"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Nossa sala</h2>
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
        <Button className="min-h-11" disabled={!available || busy} onClick={() => void connect()}>
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
            {local.microphone ? 'Desligar microfone' : 'Ligar microfone'}
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={busy || !cameraAllowed}
            onClick={() => void toggle('camera')}
          >
            {local.camera ? 'Desligar câmera' : 'Ligar câmera'}
          </Button>
          <label
            className={`${compactOnMobile ? 'hidden lg:flex' : 'flex'} items-center gap-2 text-sm font-bold`}
          >
            Fundo
            <select
              className="min-h-11 rounded-lg border bg-background p-2"
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
          {teacher ? (
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy || !available}
              onClick={() => void toggle('demo')}
            >
              <MonitorUp className="size-4" />
              {local.demo ? 'Parar demonstração' : 'Transmitir aba de demonstração'}
            </Button>
          ) : null}
        </div>
      ) : null}
      {teacher ? (
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
      ) : null}
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
        {local.demo ? (
          <Stream stream={local.demo} title="Demonstração compartilhada" muted />
        ) : null}
        {Object.values(remote)
          .filter(({ publication }) => publication.kind !== 'microphone')
          .map(({ publication, stream }) => (
            <div key={publication.id} className="space-y-2">
              <Stream stream={stream} title={label(publication)} />
              {teacher && publication.kind === 'screen' ? (
                <Button
                  className="min-h-11"
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
