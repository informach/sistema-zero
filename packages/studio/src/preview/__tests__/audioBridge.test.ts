import { describe, expect, it } from 'bun:test'
import { buildAudioRuntime } from '../audioBridge'

/**
 * `window.__szAudio` — o toca-sons dos blocos da categoria 🔊 Som do NÚCLEO.
 *
 * O bridge é uma string auto-contida, então dá para exercitá-lo de verdade num
 * escopo falso (mesmo molde do `inputBridge.test.ts`). Este arquivo guarda o
 * COMPORTAMENTO, não a forma: cada `it` aqui nasceu de um defeito real achado na
 * revisão do lote de som (08/2026).
 */

interface AudioApi {
  carregar: (nome: string, arquivo: string) => void
  tocar: (nome: string) => void
  tocarSemParar: (nome: string) => void
  parar: (nome: string) => void
  pararMusica: () => void
  volume: (nivel: unknown) => void
  tom: (onda: string, frequencia: number, duracao: number, nivel: number) => void
  ruido: (duracao: number, nivel: number) => void
}

interface FakeEl {
  src: string
  volume: number
  loop: boolean
  currentTime: number
  paused: boolean
  preload: string
  onerror: (() => void) | null
  play: () => Promise<void>
  pause: () => void
}

function load(sons: Record<string, string> | undefined, opts: { recusarPlay?: boolean } = {}) {
  type Listener = () => void
  const listeners: Record<string, Listener[]> = {}
  const criados: FakeEl[] = []
  const avisos: string[] = []
  const sintese = {
    osciladores: 0,
    ruidos: 0,
    starts: 0,
    stops: 0,
    frequencia: 0,
    ganhos: [] as number[],
    onda: '',
  }
  class FakeAudio implements FakeEl {
    src = ''
    volume = 1
    loop = false
    currentTime = 0
    paused = true
    preload = ''
    onerror: (() => void) | null = null
    constructor() {
      criados.push(this)
    }
    play() {
      // Espelha o navegador: antes de um gesto, a promise REJEITA em silêncio.
      if (opts.recusarPlay) return Promise.reject(new Error('NotAllowedError'))
      this.paused = false
      return Promise.resolve()
    }
    pause() {
      this.paused = true
    }
  }
  class FakeAudioContext {
    state = 'running'
    currentTime = 10
    sampleRate = 1000
    destination = {}
    createOscillator() {
      sintese.osciladores += 1
      return {
        type: 'sine',
        frequency: {
          setValueAtTime: (value: number) => (sintese.frequencia = value),
        },
        connect() {},
        start() {
          sintese.starts += 1
        },
        stop() {
          sintese.stops += 1
        },
      }
    }
    createGain() {
      return {
        gain: {
          setValueAtTime(value: number) {
            sintese.ganhos.push(value)
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      }
    }
    createBuffer(_channels: number, frames: number) {
      sintese.ruidos += 1
      return { getChannelData: () => new Float32Array(frames) }
    }
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start() {
          sintese.starts += 1
        },
        stop() {
          sintese.stops += 1
        },
      }
    }
    resume() {}
  }
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    Audio: FakeAudio,
    AudioContext: FakeAudioContext,
    console: { warn: (msg: string) => avisos.push(msg) },
    __SZGAME_SOUNDS: sons,
    __szAudio: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'Audio', 'console', buildAudioRuntime())(win, FakeAudio, win.console)
  return {
    audio: (win as { __szAudio: AudioApi }).__szAudio,
    criados,
    avisos,
    sintese,
    gesto: () => {
      for (const fn of listeners.pointerdown ?? []) fn()
    },
  }
}

const SONS = {
  moeda: 'data:audio/mpeg;base64,AAA',
  musica: 'data:audio/mpeg;base64,BBB',
}

describe('__szAudio — o toca-sons do núcleo', () => {
  it('volume ZERO deixa mudo de verdade (não cai em nenhum fallback)', () => {
    // ⚠️ O defeito irmão no runtime do Jogo 2D era exatamente este: um helper que
    // só aceitava `> 0` mandava o zero para o fallback, e "pôr o volume em 0"
    // DEIXAVA O SOM EM 80% — o oposto do que o bloco promete, no valor que a
    // criança mais tenta (o rótulo diz "0 (mudo)").
    const { audio, criados, gesto, sintese } = load(SONS)
    gesto()
    audio.carregar('moeda', 'moeda')
    audio.volume(0)
    expect(criados[0]?.volume).toBe(0)
    audio.tom('sine', 440, 100, 10)
    audio.ruido(100, 10)
    expect(sintese.ganhos.filter((gain) => gain > 0)).toEqual([])
  })

  it('volume aceita a escala de criança (0 a 10) e apara o que passa', () => {
    const { audio, criados, gesto } = load(SONS)
    gesto()
    audio.carregar('moeda', 'moeda')
    audio.volume(10)
    expect(criados[0]?.volume).toBe(1)
    audio.volume(99)
    expect(criados[0]?.volume).toBe(1)
    audio.volume(5)
    expect(criados[0]?.volume).toBe(0.5)
    // Lixo cai no padrão, não em NaN (que faria o navegador lançar).
    audio.volume('abacaxi')
    expect(criados[0]?.volume).toBe(0.8)
  })

  it('avisa UMA vez por som ausente, mesmo chamado 200 vezes', () => {
    // Sem dedup, um nome errado dentro do laço de animação despejaria 60 avisos
    // por segundo e afogaria o console justamente quando ele precisa ser lido.
    const { audio, avisos, gesto } = load(SONS)
    gesto()
    for (let i = 0; i < 200; i += 1) audio.tocar('naoexiste')
    expect(avisos.length).toBe(1)
    expect(avisos[0]).toContain('naoexiste')
  })

  it('toca sem carregar antes, usando o nome do arquivo', () => {
    const { audio, criados, gesto } = load(SONS)
    gesto()
    audio.tocar('moeda')
    expect(criados.length).toBe(1)
    expect(criados[0]?.paused).toBe(false)
  })

  it('uma trilha por vez: começar outra para a anterior', () => {
    const { audio, criados, gesto } = load(SONS)
    gesto()
    audio.tocarSemParar('moeda')
    audio.tocarSemParar('musica')
    expect(criados[0]?.paused).toBe(true)
    expect(criados[1]?.paused).toBe(false)
    expect(criados[1]?.loop).toBe(true)
  })

  it('repetir a MESMA trilha não recomeça a faixa', () => {
    const { audio, criados, gesto } = load(SONS)
    gesto()
    audio.tocarSemParar('musica')
    const faixa = criados[0]
    if (!faixa) throw new Error('a faixa não foi criada')
    faixa.currentTime = 42
    audio.tocarSemParar('musica')
    expect(criados[0]?.currentTime).toBe(42)
  })

  it('som pedido ANTES do gesto espera o clique em vez de sumir calado', () => {
    // O navegador recusa play() antes de um gesto, e a recusa é uma promise
    // rejeitada: sem a fila, "tocar o som" no começo do programa não acontecia
    // e não havia nada no console explicando.
    const { audio, criados, gesto } = load(SONS)
    audio.tocar('moeda')
    expect(criados[0]?.paused).toBe(true)
    gesto()
    expect(criados[0]?.paused).toBe(false)
  })

  it('parar rebobina e desliga a repetição', () => {
    const { audio, criados, gesto } = load(SONS)
    gesto()
    audio.tocarSemParar('musica')
    const emLoop = criados[0]
    if (!emLoop) throw new Error('a faixa não foi criada')
    emLoop.currentTime = 10
    audio.pararMusica()
    expect(criados[0]?.paused).toBe(true)
    expect(criados[0]?.currentTime).toBe(0)
    expect(criados[0]?.loop).toBe(false)
  })

  it('projeto SEM áudio nenhum não quebra (o manifesto nem existe)', () => {
    // `__SZGAME_SOUNDS` só é semeado quando há pelo menos um asset de áudio.
    const { audio, avisos, gesto } = load(undefined)
    gesto()
    expect(() => audio.tocar('moeda')).not.toThrow()
    expect(avisos.length).toBe(1)
  })

  it('sintetiza tom e ruído sem asset externo e respeita o desbloqueio por gesto', () => {
    const { audio, gesto, sintese } = load(undefined)
    audio.tom('triangle', 523.25, 80, 5)
    expect(sintese.osciladores).toBe(0)

    gesto()
    expect(sintese.osciladores).toBe(1)
    expect(sintese.frequencia).toBe(523.25)
    audio.ruido(120, 4)
    expect(sintese.ruidos).toBe(1)
    expect(sintese.starts).toBe(2)
    expect(sintese.stops).toBe(2)
  })
})
