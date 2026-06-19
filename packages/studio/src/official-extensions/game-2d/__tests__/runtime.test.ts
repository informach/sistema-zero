import { beforeEach, describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

interface SZGame2DSurface {
  SZGame2D: {
    createSprite: (
      opts: Partial<{ x: number; y: number; w: number; h: number; color: string }>,
    ) => {
      x: number
      y: number
      w: number
      h: number
      color: string
      vx: number
      vy: number
    }
    isColliding: (a: unknown, b: unknown) => boolean
    drawSprite: (ctx: unknown, sprite: unknown) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  }
}

function loadRuntime(): SZGame2DSurface {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const requestAnimationFrame = () => 0
  // Executa o runtime num escopo controlado, com `window` e
  // `requestAnimationFrame` como argumentos. O runtime define
  // `window.SZGame2D` que depois lemos.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, requestAnimationFrame)
  return win as unknown as SZGame2DSurface
}

describe('gameTwoDRuntime', () => {
  let api: SZGame2DSurface['SZGame2D']
  beforeEach(() => {
    api = loadRuntime().SZGame2D
  })

  it('createSprite preenche defaults', () => {
    const s = api.createSprite({ x: 5, y: 10 })
    expect(s.x).toBe(5)
    expect(s.y).toBe(10)
    expect(s.w).toBe(32)
    expect(s.color).toBe('#22d3ee')
    expect(s.vx).toBe(0)
  })

  it('isColliding detecta sobreposição AABB', () => {
    const a = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const b = api.createSprite({ x: 5, y: 5, w: 10, h: 10 })
    const c = api.createSprite({ x: 100, y: 100, w: 10, h: 10 })
    expect(api.isColliding(a, b)).toBe(true)
    expect(api.isColliding(a, c)).toBe(false)
  })
})

describe('gameTwoDRuntime — imagens / spritesheet / animação', () => {
  interface FakeImg {
    onload: (() => void) | null
    onerror: (() => void) | null
    src: string
    naturalWidth: number
    width: number
    addEventListener: (type: string, fn: () => void) => void
    /** Helper de teste: dispara o `load` (onload + listeners addEventListener). */
    fireLoad: () => void
  }
  interface ImageApi {
    createSprite: (o: Record<string, unknown>) => {
      image: { img: FakeImg; loaded: boolean } | null
      anim: unknown
    }
    setImage: (s: unknown, name: string | null) => void
    loadSpriteSheet: (
      name: string,
      fw: number,
      fh: number,
    ) => { image: { img: FakeImg; loaded: boolean }; frameW: number; frameH: number }
    setAnimation: (s: unknown, sheet: unknown, from: number, to: number, fps: number) => void
    drawSprite: (ctx: unknown, s: unknown) => void
    drawFrame: (
      ctx: unknown,
      sheet: unknown,
      i: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void
  }

  // Loader que injeta __SZGAME_ASSETS, um Image controlável e um relógio (performance.now)
  // mutável — para testar o índice de animação de forma determinística.
  function loadImaging(assets: Record<string, string>) {
    const created: FakeImg[] = []
    const clock = 0
    const win = {
      addEventListener() {},
      SZGame2D: undefined,
      __SZGAME_ASSETS: assets,
      performance: { now: () => clock },
      Image: function (this: FakeImg) {
        this.onload = null
        this.onerror = null
        this.naturalWidth = 0
        this.width = 0
        const loadListeners: Array<() => void> = []
        this.addEventListener = (type, fn) => {
          if (type === 'load') loadListeners.push(fn)
        }
        this.fireLoad = () => {
          if (!this.naturalWidth) this.naturalWidth = 32
          this.onload?.()
          for (const fn of loadListeners) fn()
        }
        Object.defineProperty(this, 'src', {
          set() {
            // Não dispara onload sozinho: o teste controla via fireLoad().
          },
          get() {
            return ''
          },
        })
        created.push(this)
      },
    } as unknown as Record<string, unknown>
    // O runtime usa `new Image()` (global), então expomos Image no escopo da Function.
    new Function('window', 'requestAnimationFrame', 'Image', gameTwoDRuntime)(
      win,
      () => 0,
      (win as { Image: unknown }).Image,
    )
    const api = (win as unknown as { SZGame2D: ImageApi }).SZGame2D
    return {
      api,
      created,
      setClock: (t: number) => ((win.performance as { now: () => number }).now = () => t),
    }
  }

  function fakeCtx() {
    const calls: Array<{ fn: string; args: unknown[] }> = []
    return {
      ctx: {
        fillStyle: '',
        fillRect: (...a: unknown[]) => calls.push({ fn: 'fillRect', args: a }),
        drawImage: (...a: unknown[]) => calls.push({ fn: 'drawImage', args: a }),
        clearRect: (...a: unknown[]) => calls.push({ fn: 'clearRect', args: a }),
      },
      calls,
    }
  }

  it('createSprite com image anexa um handle de imagem e anim nulo', () => {
    const { api } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10, image: 'heroi' })
    expect(s.image).not.toBeNull()
    expect(s.anim).toBeNull()
  })

  it('drawSprite cai no fillRect (placeholder) enquanto a imagem não carregou', () => {
    const { api } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 1, y: 2, w: 10, h: 10, image: 'heroi', color: '#abc' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, s)
    expect(calls.map((c) => c.fn)).toEqual(['fillRect'])
  })

  it('um desenho ÚNICO redesenha a imagem quando ela termina de carregar (sem loop)', () => {
    // Regressão do "quadrado azul": createImageSprite + drawSprite UMA vez (sem
    // "a cada frame") mostrava só o placeholder, pois a imagem carrega depois do
    // único desenho. O hook de load redesenha o sprite quando a imagem chega.
    const { api, created } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 5, y: 6, w: 20, h: 20, image: 'heroi' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, s) // 1ª (e única) chamada: imagem ainda não carregou → placeholder
    expect(calls.map((c) => c.fn)).toEqual(['fillRect'])
    // A imagem termina de carregar → o hook redesenha (clear + drawImage).
    created[0]?.fireLoad()
    expect(calls.map((c) => c.fn)).toContain('drawImage')
  })

  it('drawSprite usa drawImage quando a imagem está carregada', () => {
    const { api } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 1, y: 2, w: 10, h: 10, image: 'heroi' })
    // Simula a imagem pronta.
    if (s.image) {
      s.image.loaded = true
      s.image.img.naturalWidth = 10
    }
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, s)
    expect(calls.map((c) => c.fn)).toEqual(['drawImage'])
  })

  it('animação avança o quadro pelo tempo (índice determinístico)', () => {
    const { api, setClock } = loadImaging({ folha: 'data:image/png;base64,AAAA' })
    const sheet = api.loadSpriteSheet('folha', 32, 32)
    sheet.image.loaded = true
    sheet.image.img.naturalWidth = 128 // 4 colunas de 32px
    const s = api.createSprite({ x: 0, y: 0, w: 32, h: 32 })
    setClock(1000)
    api.setAnimation(s, sheet, 0, 3, 8) // 8 fps, quadros 0..3
    const { ctx, calls } = fakeCtx()

    // t = 1000ms (elapsed 0) → quadro 0 → sx = 0.
    api.drawSprite(ctx, s)
    // t = 1125ms (elapsed 125ms → floor(0.125*8)=1) → quadro 1 → sx = 32.
    setClock(1125)
    api.drawSprite(ctx, s)

    const draws = calls.filter((c) => c.fn === 'drawImage')
    expect(draws).toHaveLength(2)
    // drawImage(img, sx, sy, fw, fh, dx, dy, dw, dh): sx é o 2º argumento.
    expect(draws[0]?.args[1]).toBe(0)
    expect(draws[1]?.args[1]).toBe(32)
  })
})

describe('gameTwoDRuntime — movimento e efeitos (v0.4.0)', () => {
  interface Sprite {
    x: number
    y: number
    w: number
    h: number
    vy?: number
  }
  interface CanvasCtx {
    canvas: { width: number; height: number; style: { transform?: string } }
    save: () => void
    restore: () => void
    globalAlpha: number
    fillStyle: string
    fillRect: (x: number, y: number, w: number, h: number) => void
  }
  interface MoveApi {
    createSprite: (o: Partial<Sprite>) => Sprite
    platformer: (s: Sprite, ctx: CanvasCtx, speed: number, jump: number) => void
    topDown: (s: Sprite, speed: number) => void
    followPointer: (s: Sprite, speed: number) => void
    clampToScreen: (s: Sprite, ctx: CanvasCtx) => void
    flash: (ctx: CanvasCtx, color: string) => void
    shake: (ctx: CanvasCtx, intensity: number) => void
    emitParticles: (x: number, y: number, count: number, color: string) => void
    drawParticles: (ctx: CanvasCtx) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
    pointer: { x: number; y: number; down: boolean }
  }

  function load() {
    const rafs: Array<() => void> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, (cb: () => void) => {
      rafs.push(cb)
      return rafs.length
    })
    return { api: (win as unknown as { SZGame2D: MoveApi }).SZGame2D, rafs }
  }

  function fakeCtx(w = 200, h = 200) {
    const fills: Array<[number, number, number, number]> = []
    const ctx: CanvasCtx = {
      canvas: { width: w, height: h, style: {} },
      save() {},
      restore() {},
      globalAlpha: 1,
      fillStyle: '',
      fillRect: (x, y, fw, fh) => fills.push([x, y, fw, fh]),
    }
    return { ctx, fills }
  }

  it('platformer: gravidade puxa pra baixo e direita move', () => {
    const { api } = load()
    const { ctx } = fakeCtx()
    const s = api.createSprite({ x: 50, y: 10, w: 20, h: 20 })
    api.keys.right = true
    api.platformer(s, ctx, 4, 11)
    expect(s.x).toBe(54)
    expect(s.vy ?? 0).toBeGreaterThan(0)
    expect(s.y).toBeGreaterThan(10)
    api.keys.right = false
  })

  it('platformer: pousa no chão e pula quando seta pra cima', () => {
    const { api } = load()
    const { ctx } = fakeCtx(200, 200)
    const s = api.createSprite({ x: 50, y: 500, w: 20, h: 20 })
    api.platformer(s, ctx, 4, 11) // cai e pousa no chão (200 - 20)
    expect(s.y).toBe(180)
    expect(s.vy).toBe(0)
    api.keys.up = true
    api.platformer(s, ctx, 4, 11) // no chão + seta pra cima → pula
    expect(s.vy ?? 0).toBeLessThan(0)
    api.keys.up = false
  })

  it('topDown: diagonal não fica mais rápida que andar reto', () => {
    const { api } = load()
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    api.keys.right = true
    api.topDown(s, 10)
    expect(s.x).toBe(10)
    api.keys.down = true
    const before = s.x
    api.topDown(s, 10)
    expect(s.x - before).toBeCloseTo(7.071, 1)
    api.keys.right = false
    api.keys.down = false
  })

  it('followPointer: anda em direção ao ponteiro', () => {
    const { api } = load()
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    api.pointer.x = 100
    api.pointer.y = 0
    api.followPointer(s, 5)
    expect(s.x).toBeGreaterThan(0)
  })

  it('clampToScreen: gruda nas bordas do canvas', () => {
    const { api } = load()
    const { ctx } = fakeCtx(100, 100)
    const s = api.createSprite({ x: -20, y: 200, w: 10, h: 10 })
    api.clampToScreen(s, ctx)
    expect(s.x).toBe(0)
    expect(s.y).toBe(90)
  })

  it('flash: pinta a tela inteira', () => {
    const { api } = load()
    const { ctx, fills } = fakeCtx(80, 60)
    api.flash(ctx, '#ffffff')
    expect(fills).toEqual([[0, 0, 80, 60]])
  })

  it('emitParticles + drawParticles: cria e desenha cada partícula', () => {
    const { api } = load()
    const { ctx, fills } = fakeCtx()
    api.emitParticles(50, 50, 10, '#ffffff')
    api.drawParticles(ctx)
    expect(fills).toHaveLength(10)
  })

  it('shake: agenda um RAF e sacode o transform do canvas, parando sozinho', () => {
    const { api, rafs } = load()
    const { ctx } = fakeCtx()
    api.shake(ctx, 8)
    expect(rafs.length).toBe(1)
    rafs[0]?.() // roda um frame do tremor
    expect(ctx.canvas.style.transform ?? '').toContain('translate')
  })
})

describe('gameTwoDRuntime — tiles / tilemaps (v0.5.0)', () => {
  interface TileSprite {
    x: number
    y: number
    w: number
    h: number
    vx?: number
    vy?: number
  }
  interface TileApi {
    createTileMap: (o: { image?: string; tile?: number; solid?: string; grid?: string }) => {
      tile: number
      rows: number[][]
      solid: number[]
      ox: number
      oy: number
    }
    drawTileMap: (ctx: unknown, map: unknown, x: number, y: number) => void
    collideTileMap: (sprite: TileSprite, map: unknown) => void
    tileAt: (map: unknown, px: number, py: number) => number
  }

  // Loader com um Image fake (nunca carrega) — os tiles caem no placeholder, que é
  // o que queremos contar; o desenho real do tileset se verifica em browser.
  function load(): TileApi {
    const win = {
      addEventListener() {},
      SZGame2D: undefined,
      __SZGAME_ASSETS: {},
      Image: function (this: Record<string, unknown>) {
        this.onload = null
        this.onerror = null
        this.naturalWidth = 0
        this.width = 0
        this.addEventListener = () => {}
        Object.defineProperty(this, 'src', { set() {}, get: () => '' })
      },
    } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', 'Image', gameTwoDRuntime)(
      win,
      () => 0,
      (win as { Image: unknown }).Image,
    )
    return (win as unknown as { SZGame2D: TileApi }).SZGame2D
  }

  function fakeCtx() {
    const calls: string[] = []
    return {
      ctx: {
        fillStyle: '',
        fillRect: () => calls.push('fillRect'),
        drawImage: () => calls.push('drawImage'),
        clearRect: () => calls.push('clearRect'),
      },
      calls,
    }
  }

  it('createTileMap lê a grade (linhas por ";", vazio = ".") e os índices sólidos', () => {
    const api = load()
    const map = api.createTileMap({ image: 'tileset', tile: 32, solid: '1', grid: '0 0 0;. 1 .' })
    expect(map.tile).toBe(32)
    expect(map.rows).toEqual([
      [0, 0, 0],
      [-1, 1, -1],
    ])
    expect(map.solid).toEqual([1])
  })

  it('tileAt devolve o índice do tile no pixel (e -1 fora/vazio)', () => {
    const api = load()
    const map = api.createTileMap({ image: 'tileset', tile: 32, solid: '1', grid: '0 1;2 .' })
    expect(api.tileAt(map, 5, 5)).toBe(0) // col 0, linha 0
    expect(api.tileAt(map, 40, 5)).toBe(1) // col 1, linha 0
    expect(api.tileAt(map, 40, 40)).toBe(-1) // col 1, linha 1 = vazio
    expect(api.tileAt(map, -5, 0)).toBe(-1) // fora do mapa
  })

  it('drawTileMap desenha uma vez por célula NÃO vazia (placeholder até o tileset carregar)', () => {
    const api = load()
    const map = api.createTileMap({ image: 'tileset', tile: 32, solid: '1', grid: '. . 1;1 . 1' })
    const { ctx, calls } = fakeCtx()
    api.drawTileMap(ctx, map, 0, 0)
    // 3 células não vazias → 3 placeholders (fillRect), 0 drawImage (imagem não carregada).
    expect(calls.filter((c) => c === 'fillRect')).toHaveLength(3)
    expect(map.ox).toBe(0)
  })

  it('collideTileMap pousa o sprite sobre o chão sólido e zera a velocidade vertical', () => {
    const api = load()
    // 3 linhas; só a última (índice 1) é sólida → chão a partir de y = 64.
    const map = api.createTileMap({
      image: 'tileset',
      tile: 32,
      solid: '1',
      grid: '0 0 0;0 0 0;1 1 1',
    })
    const sprite: TileSprite = { x: 10, y: 50, w: 20, h: 20, vx: 0, vy: 5 }
    api.collideTileMap(sprite, map)
    // o fundo do sprite (y+h) encosta no topo do chão (64) → y = 44, vy = 0.
    expect(sprite.y).toBe(44)
    expect(sprite.vy).toBe(0)
  })

  it('collideTileMap não mexe no sprite quando não há tile sólido por perto', () => {
    const api = load()
    const map = api.createTileMap({
      image: 'tileset',
      tile: 32,
      solid: '1',
      grid: '0 0 0;0 0 0;0 0 0',
    })
    const sprite: TileSprite = { x: 10, y: 10, w: 20, h: 20, vx: 0, vy: 5 }
    api.collideTileMap(sprite, map)
    expect(sprite.x).toBe(10)
    expect(sprite.y).toBe(10)
    expect(sprite.vy).toBe(5)
  })
})

describe('gameTwoDRuntime.gameLoop', () => {
  // Loader com requestAnimationFrame controlável: cada frame agendado fica numa
  // fila e só roda quando chamamos flushFrame() manualmente.
  function loadWithFrameControl() {
    const frames: Array<() => void> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      frames.push(cb)
      return nextId++
    }
    const canceledIds = new Set<number>()
    const cancelAnimationFrame = (id: number) => canceledIds.add(id)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (win as unknown as { SZGame2D: { gameLoop: (fn: () => void) => () => void } })
      .SZGame2D
    const flushFrame = () => {
      const cb = frames.shift()
      cb?.()
    }
    return { api, flushFrame }
  }

  it('devolve uma função que para o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    const stop = api.gameLoop(() => {
      count += 1
    })
    expect(typeof stop).toBe('function')

    flushFrame() // frame 1 → roda fn e reagenda
    flushFrame() // frame 2 → roda fn e reagenda
    expect(count).toBe(2)

    stop()
    flushFrame() // frame agendado pelo último tick não deve mais rodar fn
    expect(count).toBe(2)
  })

  it('isola erros da fn sem interromper o loop', () => {
    const { api, flushFrame } = loadWithFrameControl()
    let count = 0
    api.gameLoop(() => {
      count += 1
      throw new Error('boom')
    })
    expect(() => {
      flushFrame()
      flushFrame()
    }).not.toThrow()
    expect(count).toBe(2)
  })

  it('mantém apenas UM loop ativo: chamar gameLoop de novo para o anterior', () => {
    // requestAnimationFrame com fila controlada que carrega o ID de cada frame,
    // para sabermos qual `tick` está agendado e respeitar cancelAnimationFrame.
    const frames: Array<{ id: number; cb: () => void }> = []
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      const id = nextId++
      frames.push({ id, cb })
      return id
    }
    const canceled = new Set<number>()
    const cancelAnimationFrame = (id: number) => canceled.add(id)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (win as unknown as { SZGame2D: { gameLoop: (fn: () => void) => () => void } })
      .SZGame2D

    // flushAll roda todos os frames pendentes (uma rodada), pulando os cancelados.
    const flushRound = () => {
      const round = frames.splice(0, frames.length)
      for (const f of round) {
        if (!canceled.has(f.id)) f.cb()
      }
    }

    let countA = 0
    let countB = 0
    api.gameLoop(() => {
      countA += 1
    })
    // Segundo loop: deve PARAR o primeiro automaticamente (sem empilhar RAFs).
    api.gameLoop(() => {
      countB += 1
    })

    flushRound()
    flushRound()
    // Só o segundo loop continua vivo; o primeiro foi cancelado na 2ª chamada.
    expect(countA).toBe(0)
    expect(countB).toBe(2)
  })
})

describe('gameTwoDRuntime.onPointer', () => {
  // Loader que captura os listeners registrados em window por nome de evento,
  // para podermos disparar um 'pointerdown' sintético e contar os handlers.
  function loadWithPointer() {
    type Listener = (ev: unknown) => void
    const listeners: Record<string, Listener[]> = {}
    const win = {
      addEventListener(name: string, fn: Listener) {
        listeners[name] ??= []
        listeners[name].push(fn)
      },
      SZGame2D: undefined,
    } as unknown as Record<string, unknown>
    const requestAnimationFrame = () => 0
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, requestAnimationFrame)
    const api = (
      win as unknown as { SZGame2D: { onPointer: (fn: (x: number, y: number) => void) => void } }
    ).SZGame2D
    const firePointerDown = (x: number, y: number) => {
      for (const fn of listeners.pointerdown ?? []) fn({ clientX: x, clientY: y })
    }
    return { api, firePointerDown }
  }

  it('registrar a MESMA fn duas vezes mantém um único handler', () => {
    const { api, firePointerDown } = loadWithPointer()
    let calls = 0
    const handler = () => {
      calls += 1
    }
    api.onPointer(handler)
    api.onPointer(handler)
    firePointerDown(10, 20)
    // Apesar de duas chamadas a onPointer com a MESMA referência, um clique
    // dispara o handler uma única vez.
    expect(calls).toBe(1)
  })

  it('funções DIFERENTES continuam acumulando (API compatível)', () => {
    const { api, firePointerDown } = loadWithPointer()
    let a = 0
    let b = 0
    api.onPointer(() => {
      a += 1
    })
    api.onPointer(() => {
      b += 1
    })
    firePointerDown(0, 0)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  it('ignora valores que não são função', () => {
    const { api, firePointerDown } = loadWithPointer()
    expect(() => {
      ;(api.onPointer as unknown as (v: unknown) => void)(null)
      firePointerDown(0, 0)
    }).not.toThrow()
  })

  it('registrar arrows NOVOS a cada frame não cresce a lista sem limite', () => {
    // Cenário real do bug: o gerador emite um arrow LITERAL a cada execução do
    // bloco "quando clicar/tocar". Se o aluno colocar esse bloco dentro do "a
    // cada frame", onPointer recebe uma referência inédita por frame e a lista
    // cresceria sem limite. Simulamos 1000 "frames" registrando funções
    // distintas e verificamos que UM clique não dispara 1000 vezes.
    const { api, firePointerDown } = loadWithPointer()
    let totalCalls = 0
    for (let frame = 0; frame < 1000; frame++) {
      // arrow novo a cada iteração — referência sempre diferente
      api.onPointer(() => {
        totalCalls += 1
      })
    }
    firePointerDown(5, 5)
    // Com o teto de 32 handlers, um clique dispara no máximo 32 vezes — não 1000.
    expect(totalCalls).toBeLessThanOrEqual(32)
    expect(totalCalls).toBeGreaterThan(0)
  })

  it('avisa no console (uma vez) ao atingir o teto', () => {
    const { api } = loadWithPointer()
    const original = console.warn
    let warnCount = 0
    console.warn = () => {
      warnCount += 1
    }
    try {
      // Bem acima do teto de 32 → deve avisar, mas só UMA vez.
      for (let i = 0; i < 100; i++) {
        api.onPointer(() => {})
      }
    } finally {
      console.warn = original
    }
    expect(warnCount).toBe(1)
  })

  it('poucos handlers distintos continuam todos disparando', () => {
    // O cap não pode quebrar o uso legítimo de alguns cliques registrados de
    // propósito: 4 handlers distintos abaixo do teto devem TODOS rodar.
    const { api, firePointerDown } = loadWithPointer()
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < counts.length; i++) {
      const idx = i
      api.onPointer(() => {
        counts[idx] = (counts[idx] ?? 0) + 1
      })
    }
    firePointerDown(0, 0)
    expect(counts).toEqual([1, 1, 1, 1])
  })
})
