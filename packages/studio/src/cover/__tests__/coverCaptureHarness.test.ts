import { describe, expect, it } from 'bun:test'
import { buildCanvasHarness } from '../coverCapture'

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

  it('⭐ quadro EM BRANCO não vira capa: posta null para o html2canvas assumir', () => {
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
