import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Recorte dos sprites fora do palco (lote 8 da conclusão do plano do Estúdio, 22/11/2026): o
 * "Desenhar o grupo" e o "Desenhar o grupo por profundidade" não desenham quem está longe da
 * área visível (a câmera e a escala de nitidez contam), mas o estado do quadro de cada um continua
 * igual: a ordem de pintura (que o clique usa) e o piscar. Com rotação ou inclinação na câmera,
 * nada é recortado (o retângulo visível deixaria de ser um retângulo).
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  blinkFrames: number
  angle: number
  _paintEpoch?: number
  _paintOrder?: number
}
interface Api {
  createSprite(o: Record<string, unknown>): Sprite
  createGroup(): { items: Sprite[] }
  addToGroup(g: { items: Sprite[] }, s: Sprite): void
  drawGroup(ctx: unknown, g: { items: Sprite[] }): void
  drawGroupByY(ctx: unknown, g: { items: Sprite[] }): void
}

function load(): Api {
  const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return (win as unknown as { SZGame2D: Api }).SZGame2D
}

/** Um contexto que registra os retângulos pintados e responde a transformação pedida. */
function ctxCom(transformacao: Partial<DOMMatrix> | null, largura = 640, altura = 480) {
  const pintados: number[] = []
  const ctx: Record<string, unknown> = {
    canvas: { width: largura, height: altura },
    globalAlpha: 1,
    fillStyle: '',
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    fillRect(x: number) {
      pintados.push(x)
    },
  }
  if (transformacao)
    ctx.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, ...transformacao })
  return { ctx, pintados }
}

function grupo(api: Api, xs: number[], extra: Record<string, unknown> = {}) {
  const g = api.createGroup()
  for (const x of xs)
    api.addToGroup(g, api.createSprite({ x, y: 100, w: 20, h: 20, color: '#f00', ...extra }))
  return g
}

describe('recorte dos sprites fora do palco', () => {
  for (const desenhar of ['drawGroup', 'drawGroupByY'] as const) {
    it(`${desenhar}: 400 sprites longe não pintam nada; perto, todos pintam`, () => {
      const api = load()
      const longe = grupo(
        api,
        Array.from({ length: 400 }, (_, i) => 5000 + i * 30),
      )
      const perto = grupo(
        api,
        Array.from({ length: 400 }, (_, i) => (i % 30) * 20),
      )
      const { ctx, pintados } = ctxCom({})
      api[desenhar](ctx, longe)
      expect(pintados).toHaveLength(0)
      api[desenhar](ctx, perto)
      expect(pintados).toHaveLength(400)
    })
  }

  it('quem fica fora continua com a ordem de pintura e o piscar do quadro', () => {
    const api = load()
    const g = grupo(api, [10, 5000, 30])
    g.items[1]!.blinkFrames = 10
    const { ctx } = ctxCom({})
    api.drawGroup(ctx, g)
    const [a, fora, b] = g.items
    expect(fora!._paintEpoch).toBe(a!._paintEpoch)
    expect([a!._paintOrder, fora!._paintOrder, b!._paintOrder]).toEqual([
      a!._paintOrder,
      a!._paintOrder! + 1,
      a!._paintOrder! + 2,
    ])
    expect(fora!.blinkFrames).toBe(9)
  })

  it('a câmera e a escala de nitidez contam; a margem é conservadora', () => {
    const api = load()
    // Câmera andou 4000 para a direita: o mundo em 4100 aparece no palco.
    const camera = ctxCom({ e: -4000 })
    api.drawGroup(camera.ctx, grupo(api, [4100, 100]))
    expect(camera.pintados).toEqual([4100])
    // Escala 2 (tela de alta densidade, palco de 1280 pixels): 600 aparece, 900 não.
    const nitida = ctxCom({ a: 2, d: 2 }, 1280, 960)
    api.drawGroup(nitida.ctx, grupo(api, [600, 900]))
    expect(nitida.pintados).toEqual([600])
    // Logo além da borda (dentro da margem de 64), ainda desenha: nada some de repente.
    const borda = ctxCom({})
    api.drawGroup(borda.ctx, grupo(api, [650, -70, 800]))
    expect(borda.pintados).toEqual([650, -70])
  })

  it('um sprite grande e girado perto da borda ainda desenha', () => {
    const api = load()
    const { ctx, pintados } = ctxCom({})
    const g = api.createGroup()
    api.addToGroup(
      g,
      api.createSprite({ x: -300, y: 100, w: 240, h: 20, angle: 90, color: '#0f0' }),
    )
    api.drawGroup(ctx, g)
    expect(pintados).toHaveLength(1)
  })

  it('com rotação ou inclinação na câmera, ou sem a transformação, nada é recortado', () => {
    const api = load()
    for (const t of [{ b: 0.5 }, { c: 0.2 }, null]) {
      const { ctx, pintados } = ctxCom(t)
      api.drawGroup(ctx, grupo(api, [5000, 9000]))
      expect(pintados, JSON.stringify(t)).toHaveLength(2)
    }
  })
})
