'use client'

type CaptureHandle = { handle?: string; origin?: string }
type CaptureTrack = MediaStreamTrack & { getCaptureHandle?: () => CaptureHandle | null }
type CaptureDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: {
    handle: string
    exposeOrigin: boolean
    permittedOrigins: string[]
  }) => void
}

/** Opaque per-tab nonce; never a learner ID or an enrollment credential. */
export function registerLiveCaptureHandle(
  handle: string,
  origin = window.location.origin,
): () => void {
  const devices = navigator.mediaDevices as CaptureDevices
  if (!devices?.setCaptureHandleConfig) return () => undefined
  devices.setCaptureHandleConfig({ handle, exposeOrigin: true, permittedOrigins: [origin] })
  return () =>
    devices.setCaptureHandleConfig?.({ handle: '', exposeOrigin: false, permittedOrigins: [] })
}

export function isApprovedLiveCapture(
  track: CaptureTrack,
  handle: string,
  origin: string,
): boolean {
  const settings = track.getSettings()
  const captured = track.getCaptureHandle?.()
  return (
    settings.displaySurface === 'browser' &&
    captured?.handle === handle &&
    captured.origin === origin
  )
}

/** Called directly from a user gesture. Browser constraints are hints; validation is mandatory. */
export async function captureLiveTab(options: {
  handle: string
  origin?: string
  onInvalidated?: () => void
  /**
   * `true` (padrão): a aba a escolher é ESTA (a sala compartilhada), e o Chrome a oferece em
   * destaque. `false`: a aba é OUTRA (a demonstração), e esta sai da lista: em destaque, ela era
   * justamente a escolha que a validação recusa.
   */
  currentTab?: boolean
}): Promise<MediaStream> {
  const origin = options.origin ?? window.location.origin
  const currentTab = options.currentTab ?? true
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser',
      // O mesmo ritmo do envio e do desenho (`ANNOTATION_FPS`): com a fonte a 10, a codificação a
      // 15 não adiantava e o Estúdio da professora chegava aos saltos à criança.
      frameRate: { ideal: 15, max: 15 },
      width: { max: 1600 },
      height: { max: 1000 },
    },
    audio: false,
    preferCurrentTab: currentTab,
    selfBrowserSurface: currentTab ? 'include' : 'exclude',
    systemAudio: 'exclude',
    surfaceSwitching: 'exclude',
  } as DisplayMediaStreamOptions)
  const track = stream.getVideoTracks()[0] as CaptureTrack | undefined
  const stop = () => {
    for (const item of stream.getTracks()) item.stop()
  }
  // Defend against browser additions and unexpected audio without ever publishing it.
  for (const audio of stream.getAudioTracks()) {
    audio.stop()
    stream.removeTrack(audio)
  }
  if (!track || !isApprovedLiveCapture(track, options.handle, origin)) {
    stop()
    throw new Error(
      'Escolha esta aba do Sistema Zero. Janelas, outras abas e a tela inteira não são compartilhadas.',
    )
  }
  const validate = () => {
    if (!isApprovedLiveCapture(track, options.handle, origin)) {
      stop()
      options.onInvalidated?.()
    }
  }
  track.addEventListener('capturehandlechange', validate)
  track.addEventListener(
    'ended',
    () => track.removeEventListener('capturehandlechange', validate),
    { once: true },
  )
  return stream
}

export async function captureLiveMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  })
}

export async function captureLiveCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 360, max: 720 },
      frameRate: { ideal: 15, max: 20 },
    },
  })
}
