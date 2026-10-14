'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lesson-media-focus'
import { sessionFetch } from '../session-fetch'
import { SPOKEN_MAX_CHARS_HEADER, SPOKEN_TEXT_MAX_CHARS } from './transcription'

/**
 * O gravador da fala da criança (14/10/2026): grava no navegador, confere que houve voz, manda
 * o áudio para `/api/voice/transcribe` e entrega o TEXTO. Nada é guardado no aparelho.
 *
 * Boas práticas contra perda na transcrição, todas aqui:
 * - captura em mono com cancelamento de eco, supressão de ruído e ganho automático;
 * - "Pode falar" só depois do evento `start` do gravador (a primeira palavra não se perde) e
 *   300 ms de cauda depois do "Parar" (a última também não);
 * - mínimo de 0,8 s e máximo de 60 s, com parada automática;
 * - um medidor de volume (`AnalyserNode`) mostra que o microfone está ouvindo e, com menos de
 *   ~0,4 s de voz, o áudio nem sai do aparelho: silêncio é onde os modelos inventam frases.
 *
 * ⚠️ No iOS o `AudioContext` precisa nascer e ser retomado DENTRO do clique, por isso o `start`
 * cria o contexto antes de qualquer `await`. Pelo mesmo motivo o pedido de foco das mídias da
 * fase vai sem `await` (como o botão "Ouvir"). Perder o foco para outra mídia PARA e DESCARTA a
 * gravação; a aba escondida e a saída da página também. Sempre que para, as trilhas do microfone
 * são encerradas e o indicador de microfone do sistema some.
 */

export const VOICE_MAX_SECONDS = 60
const VOICE_MIN_SECONDS = 0.8
/** Voz de verdade somada ao longo da gravação, abaixo disso é silêncio. */
const VOICE_MIN_SPEECH_MS = 400
/** RMS (0..1) a partir do qual o quadro conta como voz. */
const SPEECH_RMS = 0.02
const TAIL_MS = 300
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm',
] as const

export type VoiceRecorderState = 'idle' | 'starting' | 'recording' | 'transcribing'

export type VoiceProblem =
  | 'blocked'
  | 'no-mic'
  | 'busy'
  | 'short'
  | 'silence'
  | 'empty'
  | 'too-long'
  | 'rate-limited'
  | 'disabled'
  | 'viewer'
  | 'interrupted'
  | 'unavailable'

/** O navegador grava? Calculado depois de montar (o servidor não tem `navigator`). */
export function voiceRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  )
}

function pickMimeType(): string | undefined {
  const isSupported = window.MediaRecorder?.isTypeSupported
  if (typeof isSupported !== 'function') return undefined
  return MIME_CANDIDATES.find((type) => window.MediaRecorder.isTypeSupported(type))
}

/** O erro do `getUserMedia` em um motivo que a criança entende. */
export function problemFromMediaError(error: unknown): VoiceProblem {
  const name = (error as { name?: unknown } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-mic'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unavailable'
}

/** O código de erro da rota em um motivo. */
export function problemFromServerCode(code: unknown): VoiceProblem {
  switch (code) {
    case 'VOICE_EMPTY':
      return 'empty'
    case 'PAYLOAD_TOO_LARGE':
      return 'too-long'
    case 'VOICE_RATE_LIMITED':
      return 'rate-limited'
    case 'VOICE_INPUT_DISABLED':
      return 'disabled'
    // Outro perfil entrou nesta aba: tentar de novo nunca funciona, só abrir a página de novo.
    case 'VIEWER_CHANGED':
      return 'viewer'
    default:
      return 'unavailable'
  }
}

type AudioContextCtor = typeof AudioContext

interface Session {
  stream: MediaStream | null
  recorder: MediaRecorder | null
  audio: AudioContext | null
  chunks: Blob[]
  startedAt: number
  speechMs: number
  lastFrameAt: number
  /**
   * O medidor leu ALGUM som (nem que seja o chiado do ambiente). Um contexto de áudio suspenso
   * (iOS) lê zeros absolutos, e aí o filtro de silêncio recusaria toda fala: sem leitura, ele fica
   * desligado e o servidor decide (o vazio dele vira "Não consegui entender").
   */
  meterOk: boolean
  raf: number
  ticker: ReturnType<typeof setInterval> | null
  autoStop: ReturnType<typeof setTimeout> | null
  /** `true` = o "Parar" da criança (envia); `false` = descartar. */
  send: boolean
  done: boolean
}

export interface UseVoiceRecorder {
  supported: boolean
  state: VoiceRecorderState
  seconds: number
  /** 0..1, o volume de agora (o medidor). */
  level: number
  problem: VoiceProblem | null
  start: () => void
  stop: () => void
  cancel: () => void
}

export function useVoiceRecorder({
  viewerId,
  context,
  maxChars,
  onText,
}: {
  viewerId: string | null
  /** Onde a criança está (título da fase · parte), para o modelo acertar o vocabulário. */
  context?: string
  /**
   * Teto do texto que o servidor devolve. Só o Pensa pede mais que o padrão (`4000`); qualquer
   * outro valor é ignorado pelo servidor.
   */
  maxChars?: number
  onText: (text: string) => void
}): UseVoiceRecorder {
  const [supported, setSupported] = useState(false)
  const [state, setState] = useState<VoiceRecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [problem, setProblem] = useState<VoiceProblem | null>(null)
  const session = useRef<Session | null>(null)
  const upload = useRef<AbortController | null>(null)
  const owner = useRef(Symbol('voz-da-crianca'))
  // Refs para os callbacks lerem o valor de agora sem refazer os efeitos.
  const live = useRef({ viewerId, context, maxChars, onText })
  live.current = { viewerId, context, maxChars, onText }

  useEffect(() => setSupported(voiceRecordingSupported()), [])

  const release = useCallback((s: Session) => {
    if (s.raf) cancelAnimationFrame(s.raf)
    if (s.ticker) clearInterval(s.ticker)
    if (s.autoStop) clearTimeout(s.autoStop)
    for (const track of s.stream?.getTracks() ?? []) track.stop()
    void s.audio?.close().catch(() => undefined)
    s.stream = null
    s.audio = null
  }, [])

  const send = useCallback(async (blob: Blob) => {
    setState('transcribing')
    const controller = new AbortController()
    upload.current = controller
    try {
      const headers: Record<string, string> = {
        'Content-Type': blob.type || 'audio/webm',
        'x-sz-viewer': live.current.viewerId ?? '',
      }
      // Cortado por CARACTERE: o `slice` por unidade partia um emoji ao meio, e o
      // `encodeURIComponent` lançava fora do `try` e prendia o botão em "Escrevendo…".
      const lugar = Array.from(live.current.context?.trim() ?? '')
        .slice(0, 200)
        .join('')
      if (lugar) headers['x-sz-voice-context'] = encodeURIComponent(lugar)
      const teto = live.current.maxChars
      if (teto && teto > SPOKEN_TEXT_MAX_CHARS) headers[SPOKEN_MAX_CHARS_HEADER] = String(teto)
      const res = await sessionFetch('/api/voice/transcribe', {
        method: 'POST',
        headers,
        body: blob,
        signal: controller.signal,
      })
      const body = (await res.json().catch(() => null)) as {
        text?: unknown
        error?: { code?: unknown }
      } | null
      if (controller.signal.aborted) return
      if (res.ok && typeof body?.text === 'string' && body.text.trim()) {
        setProblem(null)
        setState('idle')
        live.current.onText(body.text.trim())
        return
      }
      setProblem(problemFromServerCode(body?.error?.code))
      setState('idle')
    } catch {
      if (controller.signal.aborted) return
      setProblem('unavailable')
      setState('idle')
    } finally {
      if (upload.current === controller) upload.current = null
    }
  }, [])

  const finish = useCallback(
    (s: Session) => {
      if (s.done) return
      s.done = true
      release(s)
      if (session.current === s) session.current = null
      setLevel(0)
      if (!s.send) {
        setState('idle')
        return
      }
      const duration = (performance.now() - s.startedAt) / 1000
      if (duration < VOICE_MIN_SECONDS) {
        setProblem('short')
        setState('idle')
        return
      }
      if (s.meterOk && s.speechMs < VOICE_MIN_SPEECH_MS) {
        setProblem('silence')
        setState('idle')
        return
      }
      const type = s.recorder?.mimeType || s.chunks[0]?.type || 'audio/webm'
      void send(new Blob(s.chunks, { type }))
    },
    [release, send],
  )

  /** Para o gravador; `send` decide se o áudio vai virar texto ou é descartado. */
  const halt = useCallback(
    (sendIt: boolean) => {
      const s = session.current
      if (!s || s.done) return
      s.send = sendIt
      const recorder = s.recorder
      if (!recorder || recorder.state === 'inactive') {
        finish(s)
        return
      }
      if (!sendIt) {
        recorder.stop()
        return
      }
      // A cauda: a última palavra ainda está saindo quando o dedo aperta "Parar".
      if (s.autoStop) clearTimeout(s.autoStop)
      s.autoStop = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, TAIL_MS)
    },
    [finish],
  )

  const stop = useCallback(() => halt(true), [halt])
  /** Parou sem a criança pedir (outro som da fase, saiu da tela): descarta e DIZ por quê. */
  const interrupt = useCallback(() => {
    const s = session.current
    if (!s || s.done) return
    halt(false)
    setProblem('interrupted')
  }, [halt])
  const cancel = useCallback(() => {
    halt(false)
    upload.current?.abort()
    upload.current = null
    setState('idle')
  }, [halt])

  const start = useCallback(() => {
    if (session.current || upload.current || !voiceRecordingSupported()) return
    setProblem(null)
    setSeconds(0)
    setState('starting')
    // ⚠️ iOS: o contexto de áudio nasce e é retomado DENTRO do clique, antes de qualquer await.
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    let audio: AudioContext | null = null
    try {
      audio = Ctor ? new Ctor() : null
      void audio?.resume().catch(() => undefined)
    } catch {
      audio = null
    }
    void requestLessonMediaFocus(owner.current)
    const s: Session = {
      stream: null,
      recorder: null,
      audio,
      chunks: [],
      startedAt: 0,
      speechMs: 0,
      lastFrameAt: 0,
      meterOk: false,
      raf: 0,
      ticker: null,
      autoStop: null,
      send: true,
      done: false,
    }
    session.current = s
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      })
      .then((stream) => {
        s.stream = stream
        if (s.done || session.current !== s) {
          release(s)
          return
        }
        // iOS: abrir a captura mexe na sessão de áudio e pode suspender o contexto criado no
        // clique. Retomar de novo é inofensivo onde ele já está rodando.
        void s.audio?.resume().catch(() => undefined)
        if (s.audio) {
          try {
            const analyser = s.audio.createAnalyser()
            analyser.fftSize = 1024
            s.audio.createMediaStreamSource(stream).connect(analyser)
            const frame = new Float32Array(analyser.fftSize)
            const measure = (at: number) => {
              analyser.getFloatTimeDomainData(frame)
              let sum = 0
              for (const sample of frame) sum += sample * sample
              const rms = Math.sqrt(sum / frame.length)
              if (rms > 0) s.meterOk = true
              if (s.startedAt && s.lastFrameAt && rms >= SPEECH_RMS)
                s.speechMs += Math.min(at - s.lastFrameAt, 100)
              s.lastFrameAt = at
              setLevel(Math.min(1, rms * 6))
              s.raf = requestAnimationFrame(measure)
            }
            s.raf = requestAnimationFrame(measure)
          } catch {
            // Sem medidor, a gravação segue; só o filtro de silêncio fica sem dado.
            s.speechMs = Number.POSITIVE_INFINITY
          }
        } else {
          s.speechMs = Number.POSITIVE_INFINITY
        }
        const mimeType = pickMimeType()
        const recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: 64_000,
        })
        s.recorder = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) s.chunks.push(event.data)
        }
        recorder.onstart = () => {
          s.startedAt = performance.now()
          setState('recording')
          s.ticker = setInterval(() => {
            setSeconds(Math.floor((performance.now() - s.startedAt) / 1000))
          }, 250)
          s.autoStop = setTimeout(() => halt(true), VOICE_MAX_SECONDS * 1000)
        }
        recorder.onstop = () => finish(s)
        recorder.onerror = () => {
          s.send = false
          setProblem('busy')
          finish(s)
        }
        recorder.start()
      })
      .catch((error: unknown) => {
        s.send = false
        finish(s)
        setProblem(problemFromMediaError(error))
        setState('idle')
      })
  }, [finish, halt, release])

  // Outra mídia da fase tomou o foco (o vídeo, o "Ouvir"): para e descarta.
  useEffect(() => registerLessonMedia(owner.current, interrupt), [interrupt])

  // Aba escondida, saída da página e desmontagem: para e descarta, e solta o microfone.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') interrupt()
    }
    const onLeave = () => halt(false)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onLeave)
      halt(false)
      upload.current?.abort()
      upload.current = null
    }
  }, [halt, interrupt])

  return { supported, state, seconds, level, problem, start, stop, cancel }
}
