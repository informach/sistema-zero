import { act, fireEvent, screen } from '@testing-library/react'

/**
 * O microfone, o gravador, o medidor e a transcrição de MENTIRA do botão "Falar" (14/10/2026).
 *
 * `instalarMicrofone` troca os globais do navegador e o `fetch`; `desinstalarMicrofone` os
 * devolve. O `fetch` só atende `/api/voice/transcribe` e passa o resto para `outro` (o teste da
 * aula ainda precisa responder ao pedido de ajuda). O relógio (`performance.now`) e os quadros do
 * medidor andam só quando o teste manda (`quadros`).
 */

export type FaixaFalsa = { stop: () => void; parada: boolean }

export const microfone = {
  agora: 1000,
  nivel: 0.2,
  quadros: [] as FrameRequestCallback[],
  faixas: [] as FaixaFalsa[],
  contextos: [] as { fechado: boolean }[],
  gravadores: [] as FakeMediaRecorder[],
  pedidosDoMicrofone: [] as MediaStreamConstraints[],
  erroDoMicrofone: null as Error | null,
  respostas: [] as Response[],
  envios: [] as { url: string; headers: Headers; tamanho: number }[],
}

export class FakeMediaRecorder {
  static isTypeSupported(type: string) {
    return type === 'audio/webm;codecs=opus'
  }
  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstart: (() => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(
    _stream: unknown,
    readonly options: { mimeType?: string; audioBitsPerSecond?: number } = {},
  ) {
    this.mimeType = options.mimeType ?? ''
    microfone.gravadores.push(this)
  }
  start() {
    this.state = 'recording'
    queueMicrotask(() => this.onstart?.())
  }
  stop() {
    if (this.state === 'inactive') return
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob([new Uint8Array(4096)], { type: this.mimeType }) })
    this.onstop?.()
  }
}

class FakeAudioContext {
  registro = { fechado: false }
  constructor() {
    microfone.contextos.push(this.registro)
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    this.registro.fechado = true
    return Promise.resolve()
  }
  createAnalyser() {
    return {
      fftSize: 1024,
      getFloatTimeDomainData(frame: Float32Array) {
        frame.fill(microfone.nivel)
      },
    }
  }
  createMediaStreamSource() {
    return { connect() {} }
  }
}

const originais = {
  performanceNow: Object.getOwnPropertyDescriptor(performance, 'now'),
  fetch: globalThis.fetch,
}

export function instalarMicrofone(
  outro: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = async () =>
    Response.json({}),
) {
  Object.assign(microfone, {
    // Nunca zero: o `performance.now()` de verdade não é, e o gravador lê 0 como "não começou".
    agora: 1000,
    nivel: 0.2,
    quadros: [],
    faixas: [],
    contextos: [],
    gravadores: [],
    pedidosDoMicrofone: [],
    erroDoMicrofone: null,
    respostas: [],
    envios: [],
  })
  Object.defineProperty(performance, 'now', { configurable: true, value: () => microfone.agora })
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (cb: FrameRequestCallback) => {
      microfone.quadros.push(cb)
      return microfone.quadros.length
    },
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: () => {},
  })
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    writable: true,
    value: FakeMediaRecorder,
  })
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: FakeAudioContext,
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        microfone.pedidosDoMicrofone.push(constraints)
        if (microfone.erroDoMicrofone) throw microfone.erroDoMicrofone
        const faixa: FaixaFalsa = {
          parada: false,
          stop() {
            faixa.parada = true
          },
        }
        microfone.faixas.push(faixa)
        return { getTracks: () => [faixa] }
      },
    },
  })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).endsWith('/api/voice/transcribe')) return outro(input, init)
    microfone.envios.push({
      url: String(input),
      headers: new Headers(init?.headers),
      tamanho: (init?.body as Blob).size,
    })
    return microfone.respostas.shift() ?? Response.json({ text: 'meu personagem não pula' })
  }) as typeof fetch
}

export function desinstalarMicrofone() {
  if (originais.performanceNow) Object.defineProperty(performance, 'now', originais.performanceNow)
  Reflect.deleteProperty(window, 'MediaRecorder')
  Reflect.deleteProperty(window, 'AudioContext')
  Reflect.deleteProperty(navigator, 'mediaDevices')
  globalThis.fetch = originais.fetch
}

/** Roda os quadros do medidor, avançando o relógio de 50 em 50 ms. */
export function quadros(n: number) {
  for (let i = 0; i < n; i++) {
    microfone.agora += 50
    const pendentes = microfone.quadros.splice(0)
    for (const cb of pendentes) cb(microfone.agora)
  }
}

export const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Aperta "Falar" e fala por `segundos` (no relógio de mentira). */
export async function falar(segundos: number) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Falar em vez de escrever' }))
    await Promise.resolve()
  })
  await act(async () => {
    await esperar(0)
  })
  await act(async () => {
    quadros(Math.round((segundos * 1000) / 50))
  })
}

/** Aperta "Parar" e espera a cauda de 300 ms e a transcrição. */
export async function parar() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Parar de gravar' }))
  })
  await act(async () => {
    await esperar(360)
  })
  await act(async () => {
    await esperar(0)
  })
}
