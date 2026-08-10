import { describe, expect, it } from 'bun:test'
import { buildCanvasHarness, buildDomHarness } from '../coverCapture'

/**
 * O harness que fotografa o jogo, avaliado de verdade.
 *
 * Ele é uma STRING de JS puro injetada num iframe sandbox, então dá para rodá-lo
 * aqui com um `window`/`document` falsos — mesmo padrão dos testes de runtime das
 * extensões. É a única forma de cobrir isto: `bun test` roda em happy-dom, que
 * não tem canvas nenhum.
 *
 * ⚠️ Este arquivo nasceu de um defeito em produção: a capa de um jogo de fundo
 * LARANJA saiu toda PRETA. Não havia teste nenhum da captura — só do elo card ⇄
 * miniatura —, e foi por isso que a regressão passou batida.
 */

const LARANJA = 'rgb(255, 165, 0)'

interface Chamada {
  op: string
  fill: string
  rect: number[]
}

/** Canvas falso: só o que o harness toca. `pixels` = os bytes que o getImageData devolve. */
function canvasFalso(opts: {
  width?: number
  height?: number
  pixels?: number[] | 'lanca'
  bg?: string
  url?: string
}) {
  const chamadas: Chamada[] = []
  let op = 'source-over'
  let fill = ''
  const canvas = {
    width: opts.width ?? 4,
    height: opts.height ?? 1,
    __bg: opts.bg ?? '',
    __chamadas: chamadas,
    getContext: (tipo: string) =>
      tipo === '2d'
        ? {
            drawImage() {},
            getImageData() {
              if (opts.pixels === 'lanca') throw new Error('canvas contaminado')
              return { data: opts.pixels ?? [] }
            },
            set globalCompositeOperation(v: string) {
              op = v
            },
            get globalCompositeOperation() {
              return op
            },
            set fillStyle(v: string) {
              fill = v
            },
            get fillStyle() {
              return fill
            },
            fillRect(x: number, y: number, w: number, h: number) {
              chamadas.push({ op, fill, rect: [x, y, w, h] })
            },
          }
        : null,
    toDataURL: () => opts.url ?? 'data:image/png;base64,AAAA',
  }
  return canvas
}

/** Roda o harness com um palco falso e devolve o que foi postado ao parent. */
function rodar(opts: {
  /** O canvas do JOGO (só width/height importam: ele é a fonte do drawImage). */
  palco?: ReturnType<typeof canvasFalso> | null
  /** O canvas TEMPORÁRIO que o harness cria — é nele que a composição acontece. */
  temp?: ReturnType<typeof canvasFalso>
  bodyBg?: string
}): { postado: string | null | undefined; temp: ReturnType<typeof canvasFalso> } {
  const temp = opts.temp ?? canvasFalso({ pixels: [0, 0, 0, 255] })
  const palco = opts.palco === undefined ? canvasFalso({}) : opts.palco
  const body = { __bg: opts.bodyBg ?? '' }
  let postado: string | null | undefined

  const documento = {
    readyState: 'complete',
    body,
    querySelectorAll: () => (palco ? [palco] : []),
    createElement: () => temp,
  }
  const janela = {
    addEventListener() {},
    // Roda na hora: o harness corre rAF × setTimeout e a guarda `done` decide.
    requestAnimationFrame: (fn: () => void) => fn(),
    getComputedStyle: (el: { __bg?: string }) => ({ backgroundColor: el?.__bg ?? '' }),
  }
  const pai = {
    postMessage: (msg: { dataUrl: string | null }) => {
      postado = msg.dataUrl
    },
  }
  const agora = (fn: () => void) => {
    fn()
    return 0
  }
  new Function(
    'window',
    'document',
    'parent',
    'setTimeout',
    buildCanvasHarness({ parentOrigin: 'https://x.test', warmupMs: 0, maxBytes: 6_000_000 }),
  )(janela, documento, pai, agora)
  return { postado, temp }
}

/**
 * Roda o harness com controle sobre QUANDO o rAF e os timers disparam, para
 * cobrir o AGENDAMENTO (o `rodar` acima executa tudo na hora e por isso não
 * enxerga a ordem). Devolve as filas para o teste avançar o tempo à mão.
 */
function rodarComRelogio(opts: { rafDisponivel: boolean }) {
  const temp = canvasFalso({ pixels: [0, 0, 0, 255] })
  const palco = canvasFalso({})
  let postado: string | null | undefined
  let capturas = 0

  const rafs: Array<() => void> = []
  const timers: Array<{ fn: () => void; ms: number }> = []

  const documento = {
    readyState: 'complete',
    body: { __bg: '' },
    querySelectorAll: () => [palco],
    createElement: () => {
      capturas++
      return temp
    },
  }
  const janela: Record<string, unknown> = {
    addEventListener() {},
    getComputedStyle: (el: { __bg?: string }) => ({ backgroundColor: el?.__bg ?? '' }),
  }
  if (opts.rafDisponivel) {
    janela.requestAnimationFrame = (fn: () => void) => {
      rafs.push(fn)
    }
  }
  const pai = {
    postMessage: (msg: { dataUrl: string | null }) => {
      postado = msg.dataUrl
    },
  }
  const setTimeoutFalso = (fn: () => void, ms: number) => {
    timers.push({ fn, ms })
    return 0
  }

  new Function(
    'window',
    'document',
    'parent',
    'setTimeout',
    buildCanvasHarness({ parentOrigin: 'https://x.test', warmupMs: 1_500, maxBytes: 6_000_000 }),
  )(janela, documento, pai, setTimeoutFalso)

  return {
    /** Dispara os timers pendentes cujo atraso seja <= ms (uma leva). */
    avancarTimers(ms: number) {
      const prontos = timers.filter((t) => t.ms <= ms)
      timers.length = 0
      for (const t of prontos) t.fn()
    },
    /** Dispara um quadro de animação. */
    quadro() {
      const fila = [...rafs]
      rafs.length = 0
      for (const fn of fila) fn()
    },
    get postado() {
      return postado
    },
    get capturas() {
      return capturas
    },
    get quadrosPendentes() {
      return rafs.length
    },
  }
}

describe('harness da capa — quando fotografar', () => {
  it('⭐⭐ NÃO fotografa no primeiro quadro: espera o jogo desenhar', () => {
    // O defeito relatado: "não é toda vez que tira o print, e quando saiu foi só
    // a cor de fundo, sem o texto do placar". A captura esperava tempo de
    // RELÓGIO; com o requestAnimationFrame estrangulado (é o que acontece na
    // saída do editor), o jogo não avançava e saía a foto de um canvas quase
    // vazio com o fundo composto por cima.
    const h = rodarComRelogio({ rafDisponivel: true })
    h.avancarTimers(1_500) // passou o warmup: agenda o 1º quadro
    expect(h.capturas).toBe(0)

    h.quadro() // 1º quadro: ainda pode ser só o clear + fundo
    expect(h.capturas).toBe(0)

    h.quadro() // 2º quadro: agora o jogo já pintou de verdade
    expect(h.capturas).toBe(1)
    expect(h.postado).toBe('data:image/png;base64,AAAA')
  })

  it('⭐ sem requestAnimationFrame, a rede fotografa mesmo assim (página estática)', () => {
    // Um projeto HTML/CSS puro, ou um jogo que desenha uma vez só, nunca entrega
    // os quadros — e esperar o timeout inteiro atrasaria a saída à toa.
    const h = rodarComRelogio({ rafDisponivel: false })
    h.avancarTimers(1_500)
    expect(h.capturas).toBe(0)
    h.avancarTimers(900)
    expect(h.capturas).toBe(1)
  })

  it('a rede e os quadros não fotografam DUAS vezes', () => {
    const h = rodarComRelogio({ rafDisponivel: true })
    h.avancarTimers(1_500)
    h.quadro()
    h.quadro()
    expect(h.capturas).toBe(1)
    h.avancarTimers(900) // a rede chega depois: tem que ser inerte
    h.quadro()
    expect(h.capturas).toBe(1)
  })

  it('depois de fotografar, para de pedir quadros', () => {
    const h = rodarComRelogio({ rafDisponivel: true })
    h.avancarTimers(1_500)
    h.quadro()
    h.quadro()
    expect(h.capturas).toBe(1)
    expect(h.quadrosPendentes).toBe(0)
  })
})

describe('harness da capa', () => {
  it('⭐ compõe o fundo do palco ATRÁS do desenho (o laranja que saía preto)', () => {
    // O fundo do jogo é CSS (style.background do canvas), nunca pixel — sem
    // compor, o PNG vai transparente e a miniatura em JPEG achata para PRETO.
    const temp = canvasFalso({ pixels: [0, 0, 255, 255], bg: '' })
    const { postado } = rodar({ palco: canvasFalso({ bg: LARANJA }), temp })

    expect(postado).toStartWith('data:image/png')
    expect(temp.__chamadas).toHaveLength(1)
    const pintura = temp.__chamadas[0]
    expect(pintura?.fill).toBe(LARANJA)
    // ⚠️ `destination-over` é o que põe a cor ATRÁS: com o default a tinta cobriria
    // o desenho da criança e a capa viraria um retângulo laranja liso.
    expect(pintura?.op).toBe('destination-over')
    expect(pintura?.rect).toEqual([0, 0, temp.width, temp.height])
  })

  it('⭐ quadro EM BRANCO não vira capa: posta null para a passada DOM assumir', () => {
    // O caso exato do relato: canvas 100% transparente contava como sucesso, e a
    // passada do DOM (a única que enxerga o CSS) era cortada. Também é o 3D com
    // o buffer WebGL já descartado.
    const temp = canvasFalso({ pixels: [0, 0, 0, 0, 0, 0, 0, 0] })
    const { postado } = rodar({ palco: canvasFalso({ bg: LARANJA }), temp })

    expect(postado).toBeNull()
    expect(temp.__chamadas).toHaveLength(0) // nem chegou a compor
  })

  it('um pixel pintado no meio de tudo transparente já conta', () => {
    const temp = canvasFalso({ pixels: [0, 0, 0, 0, 9, 9, 9, 7, 0, 0, 0, 0] })
    expect(rodar({ temp }).postado).toStartWith('data:image/png')
  })

  it('não dá para inspecionar (canvas contaminado)? não descarta por isso', () => {
    const temp = canvasFalso({ pixels: 'lanca' })
    const { postado } = rodar({ temp })
    expect(postado).toStartWith('data:image/png')
    expect(temp.__chamadas).toHaveLength(1)
  })

  it('sem cor no canvas, cai no body; sem nenhuma, branco', () => {
    const comBody = canvasFalso({ pixels: [1, 1, 1, 255] })
    rodar({ palco: canvasFalso({ bg: '' }), temp: comBody, bodyBg: LARANJA })
    expect(comBody.__chamadas[0]?.fill).toBe(LARANJA)

    const semNada = canvasFalso({ pixels: [1, 1, 1, 255] })
    rodar({ palco: canvasFalso({ bg: '' }), temp: semNada })
    expect(semNada.__chamadas[0]?.fill).toBe('#ffffff')
  })

  it('fundo totalmente transparente conta como AUSENTE, não como preto', () => {
    // `rgba(0, 0, 0, 0)` é o que o getComputedStyle devolve para "sem fundo" —
    // usá-lo como tinta pintaria preto, que é justamente o defeito.
    const temp = canvasFalso({ pixels: [1, 1, 1, 255] })
    rodar({ palco: canvasFalso({ bg: 'rgba(0, 0, 0, 0)' }), temp, bodyBg: LARANJA })
    expect(temp.__chamadas[0]?.fill).toBe(LARANJA)
  })

  it('sem canvas nenhum na página, posta null (projeto HTML/CSS puro)', () => {
    expect(rodar({ palco: null }).postado).toBeNull()
  })
})

describe('harness DOM da capa', () => {
  it('⭐⭐ rasteriza uma página sem canvas sem depender de html2canvas ou same-origin', () => {
    const imageOriginal = globalThis.Image
    const serializerOriginal = globalThis.XMLSerializer
    let postado: string | null | undefined
    let copias = 0

    class ImagemFalsa {
      width = 640
      height = 360
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
    class SerializadorFalso {
      serializeToString() {
        return '<main><h1>Minha página</h1></main>'
      }
    }

    ;(globalThis as { Image: unknown }).Image = ImagemFalsa
    ;(globalThis as { XMLSerializer: unknown }).XMLSerializer = SerializadorFalso
    try {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage() {
            copias++
          },
        }),
        toDataURL: () => 'data:image/png;base64,DOM',
      }
      const body = {
        clientWidth: 640,
        clientHeight: 360,
        scrollWidth: 640,
        scrollHeight: 360,
        getBoundingClientRect: () => ({ width: 640, height: 360 }),
        cloneNode: () => ({
          childNodes: [{ nodeName: 'MAIN' }],
          querySelectorAll: () => [],
        }),
      }
      const documentFake = {
        readyState: 'complete',
        body,
        querySelectorAll: (selector: string) => (selector === 'style' ? [] : []),
        createElement: () => canvas,
      }
      const windowFake = {
        addEventListener() {},
        getComputedStyle: () => ({
          backgroundColor: 'rgb(250, 250, 250)',
          display: 'block',
          position: 'static',
        }),
      }
      const parentFake = {
        postMessage: (message: { dataUrl: string | null }) => {
          postado = message.dataUrl
        },
      }
      const runNow = (fn: () => void, ms: number) => {
        if (ms === 0) fn()
        return 0
      }

      const source = buildDomHarness({
        parentOrigin: 'https://x.test',
        warmupMs: 0,
        maxBytes: 6_000_000,
      })
      expect(source).not.toContain('html2canvas')
      new Function('window', 'document', 'parent', 'setTimeout', source)(
        windowFake,
        documentFake,
        parentFake,
        runNow,
      )

      expect(copias).toBe(1)
      expect(postado).toBe('data:image/png;base64,DOM')
    } finally {
      ;(globalThis as { Image: unknown }).Image = imageOriginal
      ;(globalThis as { XMLSerializer: unknown }).XMLSerializer = serializerOriginal
    }
  })
})
