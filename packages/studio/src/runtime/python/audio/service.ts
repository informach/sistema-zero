import { awaitWithSignal } from '@sistemazero/core/http'
import { digestAssetBytes } from '../../../core/assetBinary'
import type { StudioHostAudioPreference } from '../../types'
import type { PythonExecutionSnapshot } from '../protocol'
import { PYTHON_AUDIO_LIMITS, readPythonAudioRequest } from './contract'
import { readPythonAudioWav } from './wav'

interface Voice {
  cancelled: AbortController
  audio?: HTMLAudioElement
  release?(): void
}

/** Host-owned media. Requests never supply executable URLs, media bytes or DOM options. */
export function createPythonAudioService(options: {
  snapshot: Pick<PythonExecutionSnapshot, 'files'>
  signal: AbortSignal
  onError(error: Error): void
  hostAudio?: StudioHostAudioPreference
}) {
  const files = new Map(options.snapshot.files.map((file) => [file.path, { ...file }]))
  if (files.size !== options.snapshot.files.length)
    throw new Error('O snapshot de áudio contém caminhos duplicados.')
  const resources = new Map<string, Promise<string>>()
  const urls = new Set<string>()
  const voices = new Map<number, Voice>()
  const lifetime = new AbortController()
  const signal = AbortSignal.any([options.signal, lifetime.signal])
  let windowStart = performance.now()
  let commands = 0
  let disposed = false
  let unsubscribeAudio: (() => void) | undefined
  const currentMuted = () => {
    const muted = options.hostAudio ? options.hostAudio.getMuted() : false
    if (typeof muted !== 'boolean') throw new Error('A preferência de som do host é inválida.')
    return muted
  }
  currentMuted()

  function stop(id: number, voice: Voice) {
    if (voices.get(id) === voice) voices.delete(id)
    voice.cancelled.abort(new DOMException('Som encerrado.', 'AbortError'))
    voice.release?.()
  }
  function dispose() {
    if (disposed) return
    disposed = true
    unsubscribeAudio?.()
    unsubscribeAudio = undefined
    lifetime.abort(new DOMException('Execução de áudio encerrada.', 'AbortError'))
    for (const [id, voice] of voices) stop(id, voice)
    for (const url of urls) URL.revokeObjectURL(url)
    urls.clear()
    resources.clear()
    files.clear()
    options.signal.removeEventListener('abort', dispose)
  }
  options.signal.addEventListener('abort', dispose, { once: true })
  if (options.signal.aborted) dispose()
  if (!disposed && options.hostAudio) {
    const release = options.hostAudio.subscribe(() => {
      if (disposed) return
      try {
        const muted = currentMuted()
        for (const voice of voices.values()) if (voice.audio) voice.audio.muted = muted
      } catch (error) {
        dispose()
        options.onError(error instanceof Error ? error : new Error('Falha da preferência de som.'))
      }
    })
    if (disposed) release()
    else unsubscribeAudio = release
  }

  function resource(path: string): Promise<string> {
    const existing = resources.get(path)
    if (existing) return existing
    const file = files.get(path)
    if (file?.kind !== 'asset') throw new Error('O som precisa ser um material deste projeto.')
    readPythonAudioWav(file.bytes)
    // Blob captures exact bytes before the first await, independently of later caller mutations.
    const blob = new Blob([file.bytes], { type: 'audio/wav' })
    const pending = (async () => {
      const captured = new Uint8Array(await blob.arrayBuffer())
      if ((await digestAssetBytes(captured)) !== file.sha256)
        throw new Error('Os bytes do som diferem do snapshot da execução.')
      signal.throwIfAborted()
      const url = URL.createObjectURL(blob)
      urls.add(url)
      return url
    })()
    resources.set(path, pending)
    return pending
  }

  async function play(request: Extract<ReturnType<typeof readPythonAudioRequest>, { op: 'play' }>) {
    if (voices.has(request.id)) throw new Error('Esse identificador de som já está em uso.')
    if (voices.size >= PYTHON_AUDIO_LIMITS.voices)
      throw new Error('O programa atingiu o limite de sons simultâneos.')
    const voice: Voice = { cancelled: new AbortController() }
    voices.set(request.id, voice)
    const voiceSignal = AbortSignal.any([signal, voice.cancelled.signal])
    try {
      const url = await awaitWithSignal(() => resource(request.path), voiceSignal)
      voiceSignal.throwIfAborted()
      const audio = new Audio()
      voice.audio = audio
      audio.muted = currentMuted()
      voiceSignal.throwIfAborted()
      audio.preload = 'auto'
      audio.volume = request.volume
      audio.loop = request.loop
      let started = false
      let rejectLoad: (reason: unknown) => void = () => {}
      const failure = new Promise<never>((_resolve, reject) => {
        rejectLoad = reject
      })
      const ended = () => stop(request.id, voice)
      const failed = () => {
        const error = new Error(`Não foi possível reproduzir o som ${request.path}.`)
        rejectLoad(error)
        if (started) {
          stop(request.id, voice)
          if (!disposed) options.onError(error)
        }
      }
      audio.addEventListener('ended', ended, { once: true })
      audio.addEventListener('error', failed, { once: true })
      let released = false
      voice.release = () => {
        if (released) return
        released = true
        audio.removeEventListener('ended', ended)
        audio.removeEventListener('error', failed)
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      audio.src = url
      await awaitWithSignal(
        () => Promise.race([audio.play(), failure]),
        AbortSignal.any([voiceSignal, AbortSignal.timeout(5000)]),
      )
      voiceSignal.throwIfAborted()
      started = true
    } catch (error) {
      stop(request.id, voice)
      if (error instanceof DOMException && error.name === 'NotAllowedError')
        throw new Error('Clique em Jogar ou Executar para permitir o som e tente novamente.')
      throw error
    }
  }

  return {
    async exchange(raw: unknown): Promise<string> {
      try {
        signal.throwIfAborted()
        const request = readPythonAudioRequest(raw)
        const now = performance.now()
        if (now - windowStart >= 1000) {
          windowStart = now
          commands = 0
        }
        if (++commands > PYTHON_AUDIO_LIMITS.commandsPerSecond)
          throw new Error('O programa excedeu o limite de comandos de áudio.')
        if (request.op === 'play') await play(request)
        else if (request.id === null) {
          for (const [id, voice] of voices) stop(id, voice)
        } else {
          const voice = voices.get(request.id)
          if (voice) stop(request.id, voice)
        }
        signal.throwIfAborted()
        return JSON.stringify({ version: 1, ok: true })
      } catch (error) {
        return JSON.stringify({
          version: 1,
          ok: false,
          error: error instanceof Error ? error.message.slice(0, 1000) : 'Falha do áudio Python.',
        })
      }
    },
    dispose,
  }
}
