import { describe, expect, it, spyOn } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Figuras: sprite desenhado por código (v0.23.0). defineShape guarda a função;
 * o sprite com skin custom translada o ctx para o canto e chama a figura em
 * coords locais; sem figura registrada cai no fillRect (fallback). Os paint_*
 * desenham no ctx recebido; shapeW/shapeH expõem o tamanho do sprite atual.
 */

interface Ctx {
  calls: string[]
  save(): void
  restore(): void
  translate(x: number, y: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  arc(x: number, y: number, r: number, a: number, b: number): void
  ellipse(x: number, y: number, rx: number, ry: number, r: number, a: number, b: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
  fill(): void
  stroke(): void
  rotate(a: number): void
  scale(x: number, y: number): void
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  globalAlpha: number
}

interface Api {
  createSprite: (opts: Record<string, unknown>) => Record<string, unknown>
  createShapeSprite: (name: string, opts: Record<string, unknown>) => Record<string, unknown>
  defineShape: (name: string, fn: (ctx: unknown) => void) => void
  setShape: (sprite: Record<string, unknown>, name: string) => void
  setImage: (sprite: Record<string, unknown>, name: string) => void
  setAnimation: (
    sprite: Record<string, unknown>,
    sheet: Record<string, unknown>,
    from: number,
    to: number,
    fps: number,
  ) => void
  drawSprite: (ctx: unknown, sprite: unknown) => void
  paintRect: (ctx: unknown, x: number, y: number, w: number, h: number, c: string) => void
  paintCircle: (ctx: unknown, x: number, y: number, r: number, c: string) => void
  paintTriangle: (ctx: unknown, ...a: unknown[]) => void
  paintLine: (ctx: unknown, ...a: unknown[]) => void
  paintEllipse: (ctx: unknown, x: number, y: number, w: number, h: number, c: string) => void
  shapeW: () => number
  shapeH: () => number
}

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
    devicePixelRatio: 1,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

function fakeCtx(): Ctx {
  const calls: string[] = []
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (x: number, y: number) => calls.push(`translate ${x} ${y}`),
    fillRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`fillRect ${x} ${y} ${w} ${h}`),
    beginPath: () => calls.push('beginPath'),
    arc: (x: number, y: number, r: number) => calls.push(`arc ${x} ${y} ${r}`),
    ellipse: (x: number, y: number, rx: number, ry: number) =>
      calls.push(`ellipse ${x} ${y} ${rx} ${ry}`),
    moveTo: (x: number, y: number) => calls.push(`moveTo ${x} ${y}`),
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x} ${y}`),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    rotate: (a: number) => calls.push(`rotate ${a}`),
    scale: (x: number, y: number) => calls.push(`scale ${x} ${y}`),
  } as unknown as Ctx
  return ctx
}

describe('figura: sprite desenhado por código', () => {
  it('setShape marca skin custom e cancela imagem/animação', () => {
    const api = load()
    const s = api.createSprite({ x: 10, y: 20, w: 30, h: 40 })
    api.setImage(s, 'heroi')
    api.setShape(s, 'zumbi')
    expect(s.skin).toEqual({ kind: 'custom', shape: 'zumbi' })
    expect(s.image ?? null).toBeNull()
    expect(s.anim ?? null).toBeNull()
  })

  it('setImage e setAnimation substituem a figura anterior como modo visual', () => {
    const api = load()
    const sprite = api.createShapeSprite('nave', { x: 0, y: 0, w: 20, h: 20 })
    api.setImage(sprite, 'heroi')
    expect(sprite.skin ?? null).toBeNull()

    api.setShape(sprite, 'nave')
    api.setAnimation(sprite, { image: null, frameW: 16, frameH: 16 }, 0, 1, 8)
    expect(sprite.skin ?? null).toBeNull()
  })

  it('createShapeSprite cria o modelo físico e já aponta a figura', () => {
    const api = load()
    const s = api.createShapeSprite('nave', { x: 5, y: 6, w: 20, h: 20 })
    expect(s.x).toBe(5)
    expect(s.w).toBe(20)
    expect((s.skin as { shape: string }).shape).toBe('nave')
  })

  it('drawSprite translada para o canto e roda a figura em coords locais', () => {
    const api = load()
    const ctx = fakeCtx()
    api.defineShape('bolinha', (c) => {
      // desenha em coords LOCAIS (0,0 = canto do sprite)
      api.paintCircle(c, 10, 10, 8, '#f00')
    })
    const s = api.createShapeSprite('bolinha', { x: 100, y: 50, w: 20, h: 20 })
    api.drawSprite(ctx, s)
    expect(ctx.calls).toContain('save')
    expect(ctx.calls).toContain('translate 100 50')
    expect(ctx.calls).toContain('arc 10 10 8') // local, não somou x/y do sprite
    expect(ctx.calls).toContain('restore')
  })

  it('sem figura registrada, cai no retângulo da cor (fallback)', () => {
    const api = load()
    const ctx = fakeCtx()
    const s = api.createSprite({ x: 3, y: 4, w: 12, h: 8, color: '#0f0' })
    api.setShape(s, 'inexistente')
    api.drawSprite(ctx, s)
    expect(ctx.calls).toContain('fillRect 3 4 12 8') // absoluto, fallback
    expect(ctx.calls).not.toContain('translate 3 4')
  })

  it('figura com nome errado AVISA no console (uma vez por nome) — R1/A4', () => {
    const api = load()
    const ctx = fakeCtx()
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10, color: '#0f0' })
      api.setShape(s, 'Estrela') // nunca definida (a criança errou a grafia)
      api.drawSprite(ctx, s)
      api.drawSprite(ctx, s) // 2º quadro: NÃO deve avisar de novo (dedup)
      const msgs = warn.mock.calls.map((c) => String(c[0]))
      const sobreFigura = msgs.filter((m) => m.includes('Estrela'))
      expect(sobreFigura.length).toBe(1)
      expect(sobreFigura[0]).toContain('figura')
    } finally {
      warn.mockRestore()
    }
  })

  it('shapeW/shapeH devolvem o tamanho do sprite durante o desenho', () => {
    const api = load()
    const ctx = fakeCtx()
    let seen: [number, number] = [0, 0]
    api.defineShape('medida', () => {
      seen = [api.shapeW(), api.shapeH()]
    })
    const s = api.createShapeSprite('medida', { x: 0, y: 0, w: 48, h: 64 })
    api.drawSprite(ctx, s)
    expect(seen).toEqual([48, 64])
  })

  it('preserva o tamanho da figura externa ao desenhar outra figura dentro dela', () => {
    const api = load()
    const ctx = fakeCtx()
    const seen: Array<[number, number]> = []
    api.defineShape('interna', () => {})
    const inner = api.createShapeSprite('interna', { x: 0, y: 0, w: 10, h: 20 })
    api.defineShape('externa', (shapeCtx) => {
      seen.push([api.shapeW(), api.shapeH()])
      api.drawSprite(shapeCtx, inner)
      seen.push([api.shapeW(), api.shapeH()])
    })
    const outer = api.createShapeSprite('externa', { x: 0, y: 0, w: 100, h: 200 })

    api.drawSprite(ctx, outer)

    expect(seen).toEqual([
      [100, 200],
      [100, 200],
    ])
  })

  it('paint_* desenham no ctx recebido (formas básicas)', () => {
    const api = load()
    const ctx = fakeCtx()
    api.paintRect(ctx, 1, 2, 3, 4, '#111')
    api.paintTriangle(ctx, 0, 0, 10, 0, 5, 8, '#222')
    api.paintLine(ctx, 0, 0, 10, 10, '#333', 3)
    api.paintEllipse(ctx, 0, 0, 20, 10, '#444')
    expect(ctx.calls).toContain('fillRect 1 2 3 4')
    expect(ctx.calls).toContain('moveTo 0 0')
    expect(ctx.calls).toContain('closePath')
    expect(ctx.calls).toContain('stroke')
    expect(ctx.calls).toContain('ellipse 10 5 10 5')
  })

  it('a figura ainda ganha giro/flip do wrapper (skin custom passa por _drawSpriteRaw)', () => {
    const api = load()
    const ctx = fakeCtx()
    api.defineShape('f', (c) => api.paintRect(c, 0, 0, 10, 10, '#000'))
    const s = api.createShapeSprite('f', { x: 40, y: 40, w: 20, h: 20 }) as Record<string, unknown>
    s.facing = -1 // virado: o wrapper aplica scale(-1,1) em torno do centro
    api.drawSprite(ctx, s)
    // o wrapper faz save/translate/scale/translate ANTES da figura; conta 2 saves
    expect(ctx.calls.filter((c) => c === 'save').length).toBeGreaterThanOrEqual(2)
  })

  it('restaura pilha e opacidade do canvas quando a figura da criança lança erro', () => {
    const api = load()
    const ctx = fakeCtx()
    let depth = 0
    ctx.save = () => {
      depth += 1
    }
    ctx.restore = () => {
      depth -= 1
    }
    api.defineShape('quebrada', () => {
      throw new Error('boom')
    })
    const sprite = api.createShapeSprite('quebrada', {
      x: 10,
      y: 20,
      w: 30,
      h: 40,
    })
    sprite.angle = 0.5
    sprite.opacity = 0.5

    expect(() => api.drawSprite(ctx, sprite)).toThrow('boom')
    expect(depth).toBe(0)
    expect(ctx.globalAlpha).toBe(1)
  })
})
