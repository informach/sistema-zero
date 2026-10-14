'use client'

import { startBackgroundClock } from './background-clock'

export type LiveCameraEffect = 'blur' | 'space' | 'workshop'
export const LIVE_CAMERA_EFFECTS = [
  { value: 'none', label: 'Sem efeito' },
  { value: 'blur', label: 'Embaçar o fundo' },
  { value: 'space', label: 'Espaço dos criadores' },
  { value: 'workshop', label: 'Oficina colorida' },
] as const

/** Owns both input and processed tracks. Failure closes capture; it never publishes raw frames. */
export async function createLiveCameraEffect(options: {
  input: MediaStream
  effect: LiveCameraEffect
  onFailure: (error: Error) => void
}): Promise<{ stream: MediaStream; close(): void }> {
  if (!globalThis.Worker || !globalThis.OffscreenCanvas || !globalThis.createImageBitmap) {
    for (const track of options.input.getTracks()) track.stop()
    throw new Error(
      'Este navegador não consegue aplicar o fundo. Escolha Sem efeito antes de ligar a câmera.',
    )
  }
  const video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.srcObject = options.input
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (!context) {
    for (const track of options.input.getTracks()) track.stop()
    throw new Error('Não foi possível preparar o fundo da câmera.')
  }
  // Start with a covered image. The original camera stream never enters the returned stream.
  context.fillStyle = '#111827'
  context.fillRect(0, 0, 640, 360)
  let candidateStream: MediaStream | undefined
  let worker: Worker
  try {
    candidateStream = canvas.captureStream(15)
    worker = new Worker(new URL('./media-camera-effects.worker.ts', import.meta.url), {
      type: 'module',
      name: 'sz-camera-background',
    })
  } catch {
    for (const track of [...options.input.getTracks(), ...(candidateStream?.getTracks() ?? [])])
      track.stop()
    video.srcObject = null
    throw new Error('Não foi possível preparar o efeito. A câmera continua desligada.')
  }
  const stream = candidateStream
  let stopped = false,
    busy = false,
    initialized = false
  let lastFrameAt = Date.now()
  let stopClock: (() => void) | undefined
  let readyResolve!: () => void, readyReject!: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  const close = () => {
    if (stopped) return
    stopped = true
    stopClock?.()
    worker.terminate()
    for (const track of [...options.input.getTracks(), ...stream.getTracks()]) track.stop()
    video.pause()
    video.srcObject = null
    context.clearRect(0, 0, 640, 360)
  }
  const fail = (message: string) => {
    if (stopped) return
    const error = new Error(message)
    close()
    readyReject(error)
    options.onFailure(error)
  }
  worker.addEventListener('error', () =>
    fail('O efeito da câmera parou. A câmera foi desligada para preservar o fundo escolhido.'),
  )
  worker.addEventListener(
    'message',
    (event: MessageEvent<{ type: 'ready' | 'frame' | 'error'; bitmap?: ImageBitmap }>) => {
      if (stopped) {
        event.data.bitmap?.close()
        return
      }
      if (event.data.type === 'ready') {
        initialized = true
        lastFrameAt = Date.now()
        return
      }
      if (event.data.type === 'error') {
        fail('Não foi possível aplicar o fundo. A câmera continua desligada.')
        return
      }
      if (event.data.bitmap) {
        context.drawImage(event.data.bitmap, 0, 0, 640, 360)
        event.data.bitmap.close()
        busy = false
        lastFrameAt = Date.now()
        readyResolve()
      }
    },
  )
  for (const track of options.input.getVideoTracks())
    track.addEventListener('ended', () => fail('A câmera foi desconectada.'), { once: true })
  try {
    await video.play()
    worker.postMessage({
      type: 'init',
      effect: options.effect,
      assetBase: new URL('/api/live/camera-assets/', window.location.origin).href,
    })
    // Relógio em Worker: com a aba da sala em segundo plano (a professora mostrando outra aba),
    // o `setInterval` da página cairia para 1 quadro por segundo e, minutos depois, para 1 por
    // minuto, e a câmera com fundo travaria ou seria desligada pelo vigia abaixo.
    stopClock = startBackgroundClock(10, () => {
      if (stopped) return
      if (Date.now() - lastFrameAt > (initialized ? 4000 : 20_000)) {
        fail('O computador não conseguiu manter o efeito. A câmera foi desligada.')
        return
      }
      if (!initialized || busy || video.readyState < 2) return
      busy = true
      void createImageBitmap(video, { resizeWidth: 640, resizeHeight: 360 })
        .then((bitmap) => {
          if (stopped) {
            bitmap.close()
            return
          }
          worker.postMessage({ type: 'frame', bitmap, timestamp: performance.now() }, [bitmap])
        })
        .catch(() => fail('Não foi possível processar a imagem da câmera.'))
    })
    await ready
    return { stream, close }
  } catch (error) {
    close()
    throw error
  }
}
