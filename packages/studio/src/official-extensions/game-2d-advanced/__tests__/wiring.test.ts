import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { gameKitRuntime } from '../runtime'

/**
 * ⭐ A REDE QUE FALTAVA — bloco → gerador → RUNTIME, executado de VERDADE.
 *
 * O `drawHearts` foi para PRODUÇÃO com os argumentos trocados: o bloco lê
 * (atual, máximo, x, y), o gerador emitia nessa ordem, e o runtime recebia
 * (x, y, atual, máximo) — "Desenhar corações: 3 de 3, em x 20 y 20" desenhava
 * 20 corações colados em (3,3). Os três testes existentes se cobriam sem NUNCA
 * se cruzar:
 *
 *   · runtime.test.ts  chama `api.drawHearts(...)` na ordem do RUNTIME (pula o
 *     gerador) e só assere `not.toThrow()` — passa com QUALQUER ordem;
 *   · examples.test.ts compara a STRING do código gerado — nunca executa;
 *   · blockAudit       confere que o NOME do helper existe no runtime — nunca a
 *     aridade nem a ordem dos argumentos.
 *
 * Este arquivo fecha o buraco: compila a IR (a mesma que o bloco produz) e RODA
 * o resultado no runtime real, com um ctx espião, conferindo o EFEITO. Todo
 * helper de DESENHO com mais de 2 argumentos merece um caso aqui.
 */

// happy-dom devolve null em getContext('2d') — sem stub o desenho fica invisível
// ao teste. RESTORE no afterAll (o registro de módulos do bun não é isolado por
// arquivo).
const canvasProto = (globalThis as { HTMLCanvasElement?: { prototype: object } }).HTMLCanvasElement
  ?.prototype as { getContext?: unknown } | undefined
const originalGetContext = canvasProto?.getContext
let calls: Array<[string, number[]]> = []
let textCalls: Array<[string, number, number]> = []
let arcCalls: number[][] = []
let imageCalls: number[][] = []
const fakeCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  imageSmoothingEnabled: true,
  font: '',
  globalAlpha: 1,
  canvas: { width: 960, height: 540 },
  fillRect(...a: number[]) {
    calls.push(['fillRect', a])
  },
  moveTo(...a: number[]) {
    calls.push(['moveTo', a])
  },
  fill() {
    calls.push(['fill', []])
  },
  strokeRect() {},
  drawImage(...a: unknown[]) {
    imageCalls.push(a.slice(1).map((value) => (typeof value === 'number' ? value : Number.NaN)))
  },
  beginPath() {},
  lineTo() {},
  stroke() {},
  arc(...a: number[]) {
    arcCalls.push(a)
  },
  closePath() {},
  ellipse() {},
  fillText(value: unknown, x: number, y: number) {
    textCalls.push([String(value), x, y])
  },
  measureText: () => ({ width: 10 }),
  save() {},
  restore() {},
  translate(...a: number[]) {
    calls.push(['translate', a])
  },
  rotate() {},
  scale(...a: number[]) {
    calls.push(['scale', a])
  },
  clearRect() {},
  setTransform() {},
  createLinearGradient: () => ({ addColorStop() {} }),
}
const globalWithImage = globalThis as { Image?: unknown }
const originalImage = globalWithImage.Image
class FakeImage {
  width = 240
  height = 120
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}
if (canvasProto) canvasProto.getContext = () => fakeCtx
beforeAll(() => {
  globalWithImage.Image = FakeImage
})
afterAll(() => {
  if (canvasProto && originalGetContext) canvasProto.getContext = originalGetContext
  globalWithImage.Image = originalImage
})

const SETUP = {
  type: 'gk:setup',
  w: { type: 'num', value: 960 },
  h: { type: 'num', value: 540 },
  bg: '#000',
  accent: '#fff',
} as unknown as JSStatement

interface DrawViaGeneratorOptions {
  beforeStart?: (api: Record<string, unknown>) => void
  prep?: (api: Record<string, unknown>) => void
  prelude?: string
  frameAt?: number
  window?: Record<string, unknown>
}

type DrawPrep = (api: Record<string, unknown>) => void

/** Compila a IR do bloco e RODA o JS resultante no runtime real. */
async function drawViaGenerator(
  stmt: JSStatement,
  options: DrawViaGeneratorOptions | DrawPrep = {},
): Promise<Array<[string, number[]]>> {
  const config: DrawViaGeneratorOptions =
    typeof options === 'function' ? { prep: options } : options
  let nextFrame: ((timestamp: number) => void) | undefined
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    innerWidth: 1200,
    innerHeight: 700,
    SZGameKit: undefined,
    ...config.window,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(
    win,
    (callback: (timestamp: number) => void) => {
      nextFrame = callback
      return 1
    },
  )
  const api = win.SZGameKit as Record<string, unknown>
  config.beforeStart?.(api)
  // setup + start montam o shell (o ctx2d é lazy) e resolvem o carregamento.
  new Function('SZGameKit', `${compileStatements([SETUP], 0)}\nSZGameKit.start();`)(api)
  for (let flush = 0; flush < 10 && !nextFrame; flush += 1) await Promise.resolve()
  config.prep?.(api)
  calls = [] // só interessa o que o bloco sob teste pintar
  textCalls = []
  arcCalls = []
  imageCalls = []
  new Function('SZGameKit', `${config.prelude ?? ''}\n${compileStatements([stmt], 0)}`)(api)
  if (config.frameAt !== undefined) {
    if (!nextFrame) throw new Error('o runtime não agendou o primeiro quadro')
    nextFrame(config.frameAt)
  }
  return calls
}

function callApi(api: Record<string, unknown>, name: string, ...args: unknown[]): unknown {
  const method = api[name]
  if (typeof method !== 'function') throw new Error(`SZGameKit.${name} não existe no runtime`)
  return method(...args)
}

describe('gk — fiação bloco→gerador→runtime (executa de verdade)', () => {
  const hearts = {
    type: 'gk:drawHearts',
    current: { type: 'num', value: 3 },
    max: { type: 'num', value: 3 },
    x: { type: 'num', value: 20 },
    y: { type: 'num', value: 20 },
  } as unknown as JSStatement

  it('⭐ "Desenhar corações: 3 de 3, em x 20 y 20" → 3 corações EM (20,20)', async () => {
    // A ordem que o gerador emite é a ordem que o bloco lê.
    expect(compileStatements([hearts], 0).trim()).toBe('SZGameKit.drawHearts(3, 3, 20, 20);')

    const painted = await drawViaGenerator(hearts)
    // ⭐ TRÊS corações (o máximo é 3) — o bug desenhava `max` = 20.
    expect(painted.filter((c) => c[0] === 'fill').length).toBe(3)
    // ⭐ O 1º coração perto de (20,20) — o bug punha em (3,3).
    const first = painted.find((c) => c[0] === 'moveTo')
    expect(first).toBeDefined()
    expect(first?.[1][0] ?? -1).toBeGreaterThanOrEqual(20)
    expect(first?.[1][0] ?? -1).toBeLessThan(60)
    expect(first?.[1][1] ?? -1).toBeGreaterThanOrEqual(20)
    expect(first?.[1][1] ?? -1).toBeLessThan(60)
  })

  it('a barra (o irmão que já estava certo) desenha no lugar e na proporção', async () => {
    const painted = await drawViaGenerator({
      type: 'gk:drawBar',
      current: { type: 'num', value: 5 },
      max: { type: 'num', value: 10 },
      x: { type: 'num', value: 100 },
      y: { type: 'num', value: 40 },
      w: { type: 'num', value: 200 },
      h: { type: 'num', value: 12 },
      color: '#0f0',
    } as unknown as JSStatement)
    const rects = painted.filter((c) => c[0] === 'fillRect').map((c) => c[1])
    // O fundo sai em (100,40) com 200 de largura…
    expect(rects.some((r) => r[0] === 100 && r[1] === 40 && r[2] === 200)).toBe(true)
    // …e a barra, com 5 de 10, sai com METADE (100).
    expect(rects.some((r) => r[2] === 100)).toBe(true)
  })

  it('⭐ "Desenhar a aparência L em x50 y30 tamanho 20×40" → translate(50,30) + escala certa', async () => {
    // drawLook(name, x, y, w, h): 5 args posicionais = a forma propensa à transposição
    // (o motivo do drawHearts). Define uma aparência com tamanho-base 20×10 (assimétrico
    // p/ distinguir w de h) e confere translate/scale — pega x↔y ou w↔h trocados.
    const drawLook = {
      type: 'gk:drawLook',
      look: 'L',
      x: { type: 'num', value: 50 },
      y: { type: 'num', value: 30 },
      w: { type: 'num', value: 20 },
      h: { type: 'num', value: 40 },
    } as unknown as JSStatement
    expect(compileStatements([drawLook], 0).trim()).toBe('SZGameKit.drawLook("L", 50, 30, 20, 40);')

    const painted = await drawViaGenerator(drawLook, (api) => {
      ;(api.defineLook as (n: string, fn: () => void, bw: number, bh: number) => void)(
        'L',
        () => {},
        20,
        10,
      )
    })
    const translate = painted.find((c) => c[0] === 'translate')
    const scale = painted.find((c) => c[0] === 'scale')
    // translate = (x, y) — não (y, x).
    expect(translate?.[1]).toEqual([50, 30])
    // scale = (w/baseW, h/baseH) = (20/20, 40/10) = (1, 4) — não (2, 4) nem (4, 1).
    expect(scale?.[1]).toEqual([1, 4])
  })

  it('texto flutuante preserva texto, posição, cor e tamanho do bloco', async () => {
    const stmt = {
      type: 'gk:floatText',
      text: { type: 'str', value: '+7' },
      x: { type: 'num', value: 111 },
      y: { type: 'num', value: 222 },
      color: '#12ab34',
      size: { type: 'num', value: 37 },
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGameKit.floatText("+7", 111, 222, "#12ab34", 37);',
    )

    await drawViaGenerator(stmt, {
      prep: (api) => callApi(api, 'setState', 'jogando'),
      frameAt: 100,
    })

    const painted = textCalls[0]
    expect(painted?.[0]).toBe('+7')
    expect(painted?.[1]).toBe(111)
    expect(painted?.[2]).toBeCloseTo(222 - (40 / 0.75) * 0.1)
    expect(fakeCtx.fillStyle).toBe('#12ab34')
    expect(fakeCtx.font).toContain('37px')
  })

  it('onda de choque preserva centro, raio, duração e cor do bloco', async () => {
    const stmt = {
      type: 'gk:shockwave',
      x: { type: 'num', value: 111 },
      y: { type: 'num', value: 222 },
      radius: { type: 'num', value: 333 },
      seconds: { type: 'num', value: 3.33 },
      color: '#654321',
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGameKit.shockwave(111, 222, 333, 3.33, "#654321");',
    )

    await drawViaGenerator(stmt, {
      prep: (api) => callApi(api, 'setState', 'jogando'),
      frameAt: 100,
    })

    expect(arcCalls[0]?.slice(0, 2)).toEqual([111, 222])
    expect(arcCalls[0]?.[2]).toBeCloseTo(10)
    expect(fakeCtx.fillStyle).toBe('#654321')
  })

  it('explosão por folha preserva quadros, fps, posição e tamanho do bloco', async () => {
    const stmt = {
      type: 'gk:sheetBurst',
      image: 'explosao',
      frames: { type: 'num', value: 6 },
      fps: { type: 'num', value: 10 },
      x: { type: 'num', value: 111 },
      y: { type: 'num', value: 222 },
      size: { type: 'num', value: 50 },
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe(
      'SZGameKit.sheetBurst("explosao", 6, 10, 111, 222, 50);',
    )

    await drawViaGenerator(stmt, {
      window: { __SZGAME_ASSETS: { explosao: 'data:image/png;base64,AA==' } },
      beforeStart: (api) => callApi(api, 'loadImage', 'explosao', 'explosao'),
      prep: (api) => callApi(api, 'setState', 'jogando'),
      frameAt: 100,
    })

    expect(imageCalls[0]).toEqual([40, 0, 40, 120, 86, 197, 50, 50])
  })

  it('fundo rolante preserva as velocidades x/y do bloco', async () => {
    const scroll = {
      type: 'gk:scrollImage',
      image: 'fundo',
      vx: { type: 'num', value: 70 },
      vy: { type: 'num', value: 130 },
    } as unknown as JSStatement
    const stmt = {
      type: 'gk:onDraw',
      ctxName: 'ctx',
      body: [scroll],
    } as unknown as JSStatement
    expect(compileStatements([scroll], 0).trim()).toBe('SZGameKit.scrollImage("fundo", 70, 130);')

    await drawViaGenerator(stmt, {
      window: { __SZGAME_ASSETS: { fundo: 'data:image/png;base64,AA==' } },
      beforeStart: (api) => callApi(api, 'loadImage', 'fundo', 'fundo'),
      prep: (api) => callApi(api, 'setState', 'jogando'),
      frameAt: 100,
    })

    expect(imageCalls[0]).toEqual([-233, -107, 240, 120])
  })

  it('paralaxe preserva fatores horizontal e vertical do bloco', async () => {
    const stmt = {
      type: 'gk:parallaxLayer',
      image: 'ceu',
      fx: { type: 'num', value: 0.25 },
      fy: { type: 'num', value: 0.75 },
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe('SZGameKit.parallaxLayer("ceu", 0.25, 0.75);')

    await drawViaGenerator(stmt, {
      window: { __SZGAME_ASSETS: { ceu: 'data:image/png;base64,AA==' } },
      beforeStart: (api) => callApi(api, 'loadImage', 'ceu', 'ceu'),
      prep: (api) => {
        callApi(api, 'setState', 'jogando')
        const hero = callApi(api, 'createCharacter', { w: 40, h: 40 })
        callApi(api, 'placeCharacter', hero, 1200, 800)
        callApi(api, 'cameraFollow', hero, 2000, 1500)
      },
    })

    expect(imageCalls[0]).toEqual([555, 497.5, 240, 120])
  })

  it('mão de cartas preserva pilha, posição e modo leque do bloco', async () => {
    const stmt = {
      type: 'gk:handDraw',
      pileVar: 'mao',
      x: { type: 'num', value: 111 },
      y: { type: 'num', value: 222 },
      fan: true,
    } as unknown as JSStatement
    expect(compileStatements([stmt], 0).trim()).toBe('SZGameKit.handDraw(mao, 111, 222, true);')

    const painted = await drawViaGenerator(stmt, {
      prelude: 'const mao = [SZGameKit.card("A", "?"), SZGameKit.card("B", "?")];',
    })
    const rects = painted.filter(([method]) => method === 'fillRect').map(([, args]) => args)

    expect(rects).toEqual([
      [111, 225, 60, 84],
      [183, 225, 60, 84],
    ])
  })
})
