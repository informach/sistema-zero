'use client'

import {
  canPublishMicrophone,
  type LiveMediaKind,
  type LiveMediaPublication,
  type LiveMediaState,
  type LiveRoomView,
} from '@sistemazero/core/live'
import { Button, Dialog } from '@sistemazero/ui'
import { MonitorUp, Presentation } from 'lucide-react'
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
import { createScreenAnnotation, type ScreenAnnotation } from '../../lib/live/screen-annotation'
import { sessionFetch } from '../../lib/session-fetch'
import { LiveAnnotationStage } from './live-annotation-stage'
import { LiveAnnotationControls } from './live-annotation-toolbar'

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
  /**
   * Quem processa a imagem antes de ela sair: o fundo da câmera e o compositor do desenho da
   * demonstração (`screen-annotation.ts`). Cada um é dono da captura dele e é solto junto.
   */
  const processors = useRef<{ camera?: { close(): void }; demo?: ScreenAnnotation }>({})
  const [annotation, setAnnotation] = useState<ScreenAnnotation | null>(null)
  const release = useCallback((kind: LiveMediaKind) => {
    if (kind !== 'camera' && kind !== 'demo') return
    const processor = processors.current[kind]
    delete processors.current[kind]
    processor?.close()
    if (kind === 'demo' && processor)
      setAnnotation((current) => (current === processor ? null : current))
  }, [])
  const releaseAll = useCallback(() => {
    release('camera')
    release('demo')
  }, [release])
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
  const stop = useCallback(
    (kind: LiveMediaKind) => {
      release(kind)
      if (!localRef.current[kind]) return
      stopTracks(localRef.current[kind])
      delete localRef.current[kind]
      setLocal({ ...localRef.current })
      void transport.current?.stopPublishing(kind).catch(() => undefined)
    },
    [release],
  )
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
          releaseAll()
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
      releaseAll()
      for (const stream of Object.values(localRef.current)) stopTracks(stream)
      localRef.current = {}
      void current.close().catch(() => undefined)
      if (transport.current === current) transport.current = null
    }
  }, [occurrenceId, deviceId, onError, autoConnect, releaseAll])
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

  /** A aba de demonstração da professora (a página `/ao-vivo/demonstracao/:id`). */
  const captureDemoTab = useCallback(
    () =>
      captureLiveTab({
        handle: `sz-live-demo:${roomRef.current.session.id}`,
        currentTab: false,
        onInvalidated: () => stop('demo'),
      }),
    [stop],
  )
  /** O compositor do desenho: a trilha publicada como `demo` é a dele, com ou sem desenho. */
  const startAnnotation = useCallback(
    (screen: MediaStream | null) => {
      const compositor = createScreenAnnotation({ screen, onScreenEnded: () => stop('demo') })
      release('demo')
      processors.current.demo = compositor
      setAnnotation(compositor)
      return compositor
    },
    [release, stop],
  )

  /** Abre o aparelho só para a própria pessoa (a câmera já sai com o fundo escolhido). */
  const capture = useCallback(
    async (kind: 'microphone' | 'camera' | 'screen' | 'demo') => {
      if (kind === 'demo') {
        const screen = await captureDemoTab()
        try {
          return startAnnotation(screen).stream
        } catch {
          // Sem compositor (navegador sem canvas capturável), a tela vai como sempre foi, sem
          // as ferramentas de desenho: a demonstração não pode depender delas.
          return screen
        }
      }
      let stream =
        kind === 'microphone'
          ? await captureLiveMicrophone()
          : kind === 'camera'
            ? await captureLiveCamera()
            : await captureLiveTab({ handle, onInvalidated: () => stop(kind) })
      if (kind === 'camera' && cameraEffect !== 'none') {
        const effect = await createLiveCameraEffect({
          input: stream,
          effect: cameraEffect,
          onFailure: (error) => {
            stop('camera')
            onError(friendlyDeviceError(error, 'camera'))
          },
        })
        release('camera')
        processors.current.camera = effect
        stream = effect.stream
      }
      return stream
    },
    [cameraEffect, captureDemoTab, handle, onError, release, startAnnotation, stop],
  )

  /** Envia à sala um aparelho já aberto (por `capture`). */
  const publish = useCallback(
    async (kind: 'microphone' | 'camera' | 'screen' | 'demo', stream: MediaStream) => {
      const attempt = generation.current
      try {
        if (generation.current !== attempt || !transport.current) {
          release(kind)
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
        release(kind)
        stopTracks(stream)
        throw cause
      }
    },
    [deviceId, release, stop],
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
          release(kind)
          stopTracks(stream)
          return
        }
        await publish(kind, stream)
      } catch (cause) {
        release(kind)
        stopTracks(stream)
        onError(friendlyDeviceError(cause, kind))
      } finally {
        setBusy(false)
      }
    },
    [capture, publish, release, stop, onError],
  )

  /** O quadro branco sem tela: a professora explica desenhando, sem abrir a demonstração. */
  const startBoard = useCallback(async () => {
    if (localRef.current.demo) return
    const attempt = generation.current
    setBusy(true)
    let stream: MediaStream | undefined
    try {
      stream = startAnnotation(null).stream
      if (generation.current !== attempt) {
        release('demo')
        return
      }
      await publish('demo', stream)
    } catch (cause) {
      release('demo')
      stopTracks(stream)
      onError(friendlyDeviceError(cause, 'demo'))
    } finally {
      setBusy(false)
    }
  }, [onError, publish, release, startAnnotation])

  /**
   * Põe a aba de demonstração no compositor que já está no ar (quem começou pelo quadro): a
   * transmissão continua a mesma, só a imagem muda.
   */
  const shareDemoScreen = useCallback(async () => {
    const compositor = processors.current.demo
    if (!compositor) return
    setBusy(true)
    try {
      const screen = await captureDemoTab()
      if (processors.current.demo !== compositor) {
        stopTracks(screen)
        return
      }
      compositor.attachScreen(screen)
      compositor.setSurface('screen')
    } catch (cause) {
      onError(friendlyDeviceError(cause, 'demo'))
    } finally {
      setBusy(false)
    }
  }, [captureDemoTab, onError])
  const label = useCallback(
    (publication: LiveMediaPublication) =>
      publication.role === 'teacher'
        ? // Quem conduz lê o nome neutro; a criança continua lendo o de sempre.
          roomRef.current.role === 'teacher'
          ? publication.kind === 'demo'
            ? 'Demonstração de quem conduz'
            : 'Quem conduz'
          : publication.kind === 'demo'
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
    /** O desenho sobre a demonstração (só da professora, enquanto ela transmite). */
    annotation,
    startBoard,
    shareDemoScreen,
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
    annotation,
    startBoard,
    shareDemoScreen,
  } = media
  const [drawing, setDrawing] = useState(false)
  // A demonstração parou (inclusive pelo "Parar de compartilhar" do navegador): sai do desenho.
  useEffect(() => {
    if (!annotation) setDrawing(false)
  }, [annotation])
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
          {teacher && !local.demo ? (
            <Button
              className="min-h-11"
              variant="outline"
              disabled={busy || !available}
              onClick={() => void startBoard()}
            >
              <Presentation className="size-4" />
              Abrir quadro branco
            </Button>
          ) : null}
        </div>
      ) : null}
      {teacher && annotation && local.demo ? (
        <LiveAnnotationControls
          annotation={annotation}
          busy={busy}
          className={compactOnMobile ? 'hidden lg:block' : ''}
          onDraw={() => setDrawing(true)}
          onShareScreen={() => void shareDemoScreen()}
        />
      ) : null}
      {teacher && annotation ? (
        <LiveAnnotationStage
          annotation={annotation}
          open={drawing}
          busy={busy}
          onClose={() => setDrawing(false)}
          onShareScreen={() => void shareDemoScreen()}
        />
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
          da transmissão. Para explicar desenhando, use o quadro branco.
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
