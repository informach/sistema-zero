import { afterAll, describe, expect, it } from 'bun:test'
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
  drawImage() {},
  beginPath() {},
  lineTo() {},
  stroke() {},
  arc() {},
  closePath() {},
  ellipse() {},
  fillText() {},
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
if (canvasProto) canvasProto.getContext = () => fakeCtx
afterAll(() => {
  if (canvasProto && originalGetContext) canvasProto.getContext = originalGetContext
})

const SETUP = {
  type: 'gk:setup',
  w: { type: 'num', value: 960 },
  h: { type: 'num', value: 540 },
  bg: '#000',
  accent: '#fff',
} as unknown as JSStatement

/** Compila a IR do bloco e RODA o JS resultante no runtime real. */
async function drawViaGenerator(
  stmt: JSStatement,
  prep?: (api: Record<string, unknown>) => void,
): Promise<Array<[string, number[]]>> {
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    innerWidth: 1200,
    innerHeight: 700,
    SZGameKit: undefined,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(win, () => 0)
  const api = win.SZGameKit as Record<string, unknown>
  // setup + start montam o shell (o ctx2d é lazy) e resolvem o carregamento.
  new Function('SZGameKit', `${compileStatements([SETUP], 0)}\nSZGameKit.start();`)(api)
  await Promise.resolve()
  await Promise.resolve()
  if (prep) prep(api) // pré-condição (ex.: definir a aparência que o drawLook desenha)
  calls = [] // só interessa o que o bloco sob teste pintar
  new Function('SZGameKit', compileStatements([stmt], 0))(api)
  return calls
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
})
