import type { RecordingSource } from './contracts'

export interface ReceiverPage {
  offer(
    sources: { mid: string; kind: RecordingSource['kind'] }[],
    description: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit>
  start(): Promise<void>
  pause(): Promise<void>
  close(): Promise<void>
}

declare global {
  interface Window {
    szRecorder: ReceiverPage
    szRecordingSegment(value: {
      base64: string
      startsAt: string
      endsAt: string
      durationMs: number
    }): Promise<void>
    szRecordingFailure(message: string): Promise<void>
  }
}

/** Runs ONLY in an isolated recorder browser. It has no classroom UI, child data or app cookies. */
export function installReceiverPage(iceServers: RTCIceServer[]): void {
  const peer = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' })
  const sources = new Map<
    string,
    { kind: RecordingSource['kind']; track?: MediaStreamTrack; video?: HTMLVideoElement }
  >()
  const audio = new AudioContext()
  const destination = audio.createMediaStreamDestination()
  // Stable audio track makes MP4 segment stream layouts identical, including muted explanations.
  const silent = audio.createOscillator()
  const volume = audio.createGain()
  volume.gain.value = 0
  silent.connect(volume).connect(destination)
  silent.start()
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  document.body.append(canvas)
  const drawing = canvas.getContext('2d')!
  const output = canvas.captureStream(15)
  for (const track of destination.stream.getAudioTracks()) output.addTrack(track)
  let active = false
  let recorder: MediaRecorder | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let uploading: Promise<void> = Promise.resolve()
  let bufferCount = 0
  let currentFinished: Promise<void> = Promise.resolve()
  let failureReported = false
  const reportFailure = (message: string) => {
    active = false
    if (failureReported) return
    failureReported = true
    void window.szRecordingFailure(message).catch(() => undefined)
  }

  const paint = () => {
    drawing.fillStyle = '#101827'
    drawing.fillRect(0, 0, 1280, 720)
    drawing.fillStyle = '#ffffff'
    drawing.font = 'bold 36px sans-serif'
    drawing.fillText('Sistema Zero · Oficina ao vivo', 48, 80)
    for (const source of sources.values()) {
      if (!source.video || source.video.readyState < 2) continue
      if (source.kind === 'demo') drawing.drawImage(source.video, 0, 0, 1280, 720)
    }
    for (const source of sources.values())
      if (source.kind === 'camera' && source.video && source.video.readyState >= 2)
        drawing.drawImage(source.video, 1012, 553, 240, 135)
  }
  const paintTimer = setInterval(paint, 1000 / 15)
  paint()
  peer.addEventListener('track', (event) => {
    const source = event.transceiver.mid ? sources.get(event.transceiver.mid) : null
    if (!source) {
      event.track.stop()
      return
    }
    source.track = event.track
    const stream = new MediaStream([event.track])
    if (source.kind === 'microphone') audio.createMediaStreamSource(stream).connect(destination)
    else {
      const video = document.createElement('video')
      video.muted = true
      video.autoplay = true
      video.playsInline = true
      video.srcObject = stream
      source.video = video
      void video
        .play()
        .catch(() => reportFailure('Não foi possível receber a imagem da demonstração.'))
    }
    event.track.addEventListener('ended', () => {
      reportFailure('Uma fonte autorizada foi encerrada.')
    })
  })
  peer.addEventListener('connectionstatechange', () => {
    if (active && (peer.connectionState === 'failed' || peer.connectionState === 'disconnected'))
      reportFailure('A recepção da aula foi interrompida.')
  })

  function segment() {
    if (!active) return
    if (bufferCount >= 2) {
      active = false
      reportFailure('A gravação pausou para preservar os segmentos pendentes.')
      return
    }
    const mimeType = 'video/webm;codecs=vp8,opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('Codec de gravação indisponível.')
    const current = new MediaRecorder(output, {
      mimeType,
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 96_000,
    })
    const chunks: Blob[] = []
    let bytes = 0
    const starts = Date.now()
    let resolveStop!: () => void
    let rejectStop!: (error: Error) => void
    currentFinished = new Promise<void>((resolve, reject) => {
      resolveStop = resolve
      rejectStop = reject
    })
    void currentFinished.catch(() => undefined)
    current.addEventListener('dataavailable', (event) => {
      bytes += event.data.size
      if (bytes > 8 * 1024 * 1024) {
        active = false
        if (current.state !== 'inactive') current.stop()
        rejectStop(new Error('Segmento excedeu o limite de memória.'))
        reportFailure('Segmento excedeu o limite de memória.')
        return
      }
      chunks.push(event.data)
    })
    current.addEventListener('error', () => {
      active = false
      rejectStop(new Error('Falha ao codificar a gravação.'))
      reportFailure('Falha ao codificar a gravação.')
    })
    current.addEventListener(
      'stop',
      () => {
        const ends = Date.now()
        bufferCount++
        uploading = uploading
          .then(async () => {
            if (!bytes || bytes > 8 * 1024 * 1024) throw new Error('Segmento incompleto.')
            const bytesArray = new Uint8Array(
              await new Blob(chunks, { type: mimeType }).arrayBuffer(),
            )
            let binary = ''
            for (let offset = 0; offset < bytesArray.length; offset += 8192)
              binary += String.fromCharCode(...bytesArray.subarray(offset, offset + 8192))
            await window.szRecordingSegment({
              base64: btoa(binary),
              startsAt: new Date(starts).toISOString(),
              endsAt: new Date(ends).toISOString(),
              durationMs: ends - starts,
            })
          })
          .finally(() => {
            bufferCount--
            resolveStop()
          })
        void uploading.catch((error) => {
          active = false
          reportFailure(error instanceof Error ? error.message : 'Falha ao guardar a gravação.')
        })
      },
      { once: true },
    )
    recorder = current
    current.start(1000)
  }

  window.szRecorder = {
    async offer(bindings, description) {
      for (const source of bindings) sources.set(source.mid, { kind: source.kind })
      await peer.setRemoteDescription(description)
      await peer.setLocalDescription(await peer.createAnswer())
      if (peer.iceGatheringState !== 'complete')
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            peer.removeEventListener('icegatheringstatechange', check)
            reject(new Error('ICE timeout'))
          }, 8000)
          function check() {
            if (peer.iceGatheringState === 'complete') {
              clearTimeout(timeout)
              peer.removeEventListener('icegatheringstatechange', check)
              resolve()
            }
          }
          peer.addEventListener('icegatheringstatechange', check)
          check()
        })
      return peer.localDescription!.toJSON()
    },
    async start() {
      if (active) return
      await audio.resume()
      const deadline = Date.now() + 10_000
      while (Date.now() < deadline) {
        const stats = await peer.getStats()
        let received = false
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.bytesReceived > 0) received = true
        })
        if (received) {
          active = true
          segment()
          interval = setInterval(() => {
            try {
              if (recorder?.state === 'recording') recorder.stop()
              segment()
            } catch {
              reportFailure('Não foi possível continuar codificando a gravação.')
            }
          }, 10_000)
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error('A gravação ainda não recebeu a professora ou demonstração.')
    },
    async pause() {
      active = false
      if (interval) clearInterval(interval)
      interval = null
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      await currentFinished
      await uploading
      recorder = null
    },
    async close() {
      await this.pause()
      clearInterval(paintTimer)
      for (const track of output.getTracks()) track.stop()
      for (const source of sources.values()) source.track?.stop()
      silent.stop()
      await audio.close()
      peer.close()
    },
  }
}
