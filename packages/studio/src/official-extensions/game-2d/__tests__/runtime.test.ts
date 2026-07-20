import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
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
    randomBetween: (min: number, max: number) => number
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

  it('randomBetween sempre devolve um inteiro, inclusive com limites fracionários', () => {
    const random = spyOn(Math, 'random')
    try {
      for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
        random.mockReturnValue(value)
        expect(Number.isInteger(api.randomBetween(0.5, 3.8))).toBe(true)
      }
      random.mockReturnValue(0.5)
      expect(api.randomBetween(0.2, 0.8)).toBe(1)
    } finally {
      random.mockRestore()
    }
  })

  it('velocidade: spriteVx/Vy/Speed + isMoving(H/V) leem a velocidade do sprite', () => {
    const sz = api as unknown as {
      spriteVx: (s: unknown) => number
      spriteVy: (s: unknown) => number
      spriteSpeed: (s: unknown) => number
      isMoving: (s: unknown) => boolean
      isMovingH: (s: unknown) => boolean
      isMovingV: (s: unknown) => boolean
    }
    const s = api.createSprite({ x: 0, y: 0 })

    s.vx = 3
    s.vy = -4
    expect(sz.spriteVx(s)).toBe(3)
    expect(sz.spriteVy(s)).toBe(-4)
    expect(sz.spriteSpeed(s)).toBe(5) // hypot(3, 4)
    expect(sz.isMoving(s)).toBe(true)
    expect(sz.isMovingH(s)).toBe(true)
    expect(sz.isMovingV(s)).toBe(true)

    // Só na horizontal.
    s.vx = 2
    s.vy = 0
    expect(sz.isMovingH(s)).toBe(true)
    expect(sz.isMovingV(s)).toBe(false)
    expect(sz.isMoving(s)).toBe(true)

    // Parado (resíduo sub-pixel abaixo do limiar não conta como movimento).
    s.vx = 0.001
    s.vy = 0
    expect(sz.isMoving(s)).toBe(false)
    expect(sz.spriteSpeed(s)).toBeCloseTo(0.001, 5)
  })

  it('movers 2D gravam vx/vy → os getters de velocidade refletem o movimento real', () => {
    const sz = api as unknown as {
      topDown: (s: unknown, speed?: number) => void
      arrowsX: (s: unknown, speed?: number) => void
      spriteVx: (s: unknown) => number
      spriteVy: (s: unknown) => number
      isMoving: (s: unknown) => boolean
    }
    const s = api.createSprite({ x: 0, y: 0 })

    // "Mover em 4 direções" p/ a direita → vx = velocidade, vy = 0, movendo.
    api.keys.right = true
    sz.topDown(s, 3)
    expect(sz.spriteVx(s)).toBe(3)
    expect(sz.spriteVy(s)).toBe(0)
    expect(sz.isMoving(s)).toBe(true)

    // Soltou a tecla → velocidade volta a 0 (parado).
    api.keys.right = false
    sz.topDown(s, 3)
    expect(sz.spriteVx(s)).toBe(0)
    expect(sz.isMoving(s)).toBe(false)

    // "Mover com as setas ← →" p/ a esquerda → vx negativo e preserva a queda/pulo.
    s.vy = 7
    api.keys.left = true
    sz.arrowsX(s, 5)
    expect(sz.spriteVx(s)).toBe(-5)
    expect(sz.spriteVy(s)).toBe(7)
    expect(sz.isMoving(s)).toBe(true)
    api.keys.left = false
  })

  it('moveToward para exatamente no alvo e registra o deslocamento real', () => {
    const sz = api as unknown as {
      moveToward: (
        sprite: { x: number; y: number; w: number; h: number; vx: number; vy: number },
        target: { x: number; y: number; w: number; h: number },
        speed: number,
      ) => void
    }
    const sprite = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const target = api.createSprite({ x: 3, y: 4, w: 10, h: 10 })

    sz.moveToward(sprite, target, 10)
    expect({ x: sprite.x, y: sprite.y, vx: sprite.vx, vy: sprite.vy }).toEqual({
      x: 3,
      y: 4,
      vx: 3,
      vy: 4,
    })

    sz.moveToward(sprite, target, 10)
    expect({ x: sprite.x, y: sprite.y, vx: sprite.vx, vy: sprite.vy }).toEqual({
      x: 3,
      y: 4,
      vx: 0,
      vy: 0,
    })
  })

  it('mapa de tiles ENCAIXA no canvas (tamanho na tela ≠ tamanho da arte)', () => {
    const sz = api as unknown as {
      createTileMap: (o: unknown) => {
        tile: number
        draw: number
        ox: number
        oy: number
      }
      drawTileMap: (ctx: unknown, map: unknown, x?: number, y?: number) => void
      tileAt: (map: unknown, px: number, py: number) => number
    }
    // ctx permissivo: canvas 800×480; qualquer método é no-op (não rasteriza no teste).
    const canvas = { width: 800, height: 480 }
    const ctx = new Proxy({ canvas } as Record<string, unknown>, {
      get(t, p) {
        if (p in t) return t[p as string]
        return () => {}
      },
      set(t, p, v) {
        t[p as string] = v
        return true
      },
    })

    const map = sz.createTileMap({ image: 'tiles', tile: 16, grid: '0 0 0 0;0 0 0 0', solid: '1' })
    expect(map.tile).toBe(16) // tamanho na ARTE (fatiar o tileset)
    expect(map.draw).toBe(0) // ainda não desenhou

    sz.drawTileMap(ctx, map, 0, 0)
    // 4 colunas × 2 linhas → cabe: min(800/4=200, 480/2=240) = 200 px por tile NA TELA.
    expect(map.draw).toBe(200)
    expect(map.ox).toBe(0) // centralizado: (800 − 4·200)/2 = 0
    expect(map.oy).toBe(40) // (480 − 2·200)/2 = 40

    // tileAt usa o tamanho NA TELA + offset: pixel (210,250) → col 1, linha 1.
    expect(sz.tileAt(map, 210, 250)).toBe(0)
    expect(sz.tileAt(map, -5, -5)).toBe(-1) // fora do mapa
  })

  it('tilemap grande desenha somente as células que cruzam a viewport', () => {
    const sz = api as unknown as {
      createTileMap: (o: unknown) => unknown
      drawTileMap: (ctx: unknown, map: unknown, x: number, y: number, size: number) => void
    }
    const grid = Array.from({ length: 128 }, () => Array(128).fill('0').join(' ')).join(';')
    const map = sz.createTileMap({ image: 'tiles', tile: 16, grid, solid: '' })
    const draws: Array<[number, number, number, number]> = []
    const canvas = { width: 320, height: 192 }
    const ctx = new Proxy({ canvas } as Record<string, unknown>, {
      get(target, property) {
        if (property === 'fillRect') {
          return (x: number, y: number, w: number, h: number) => draws.push([x, y, w, h])
        }
        if (property in target) return target[property as string]
        return () => {}
      },
      set(target, property, value) {
        target[property as string] = value
        return true
      },
    })

    sz.drawTileMap(ctx, map, 0, 0, 16)

    expect(draws).toHaveLength(20 * 12)
    expect(draws.every(([x, y, w, h]) => x < 320 && x + w > 0 && y < 192 && y + h > 0)).toBe(true)
  })

  it('isColliding detecta sobreposição AABB', () => {
    const a = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const b = api.createSprite({ x: 5, y: 5, w: 10, h: 10 })
    const c = api.createSprite({ x: 100, y: 100, w: 10, h: 10 })
    expect(api.isColliding(a, b)).toBe(true)
    expect(api.isColliding(a, c)).toBe(false)
  })

  it('setupStage cria a tela com id "tela", centraliza e aplica a cor de fundo', () => {
    document.body.innerHTML = ''
    ;(api as unknown as { setupStage: (w: number, h: number, bg: string) => void }).setupStage(
      800,
      480,
      '#123456',
    )
    const canvas = document.getElementById('tela') as HTMLCanvasElement | null
    expect(canvas).not.toBeNull()
    expect(canvas?.tagName.toLowerCase()).toBe('canvas')
    // Centralizado via flex no body (a sobra fica igual dos dois lados).
    expect(document.body.style.display).toBe('flex')
    expect(document.body.style.alignItems).toBe('center')
    expect(document.body.style.justifyContent).toBe('center')
    // Cor de fundo aplicada no body (a sobra) e no canvas.
    expect(document.body.style.background).toContain('#123456')
    expect(canvas?.style.background).toContain('#123456')
  })
})

describe('gameTwoDRuntime — Kit dino + pulo no chão (v0.9.0)', () => {
  interface DinoSprite {
    x: number
    y: number
    w: number
    h: number
    color: string
    vy: number
    skin: { kind: string; shape?: string; fullH?: number; onGround?: boolean }
  }
  interface DinoGroup {
    items: DinoSprite[]
  }
  interface DinoSZ {
    createDino(o: { x: number; y: number; size: number; color: string }): DinoSprite
    controlDino(s: DinoSprite, ctx: unknown, jump: number): void
    jumpOnGround(s: unknown, ctx: unknown, jump: number): void
    spawnObstacle(
      g: DinoGroup,
      ctx: unknown,
      o: { type: string; x: number; size: number; vx: number },
    ): DinoSprite
    spawnEgg(g: DinoGroup, o: { x: number; y: number; vx: number }): DinoSprite
    drawForest(ctx: unknown, speed: number): void
    drawSprite(ctx: unknown, s: unknown): void
    createGroup(): DinoGroup
    createSprite(o: Partial<DinoSprite>): DinoSprite
  }

  function dinoApi(): DinoSZ {
    return loadRuntime().SZGame2D as unknown as DinoSZ
  }

  // ctx falso "tudo no-op" (Proxy): cobre createLinearGradient/ellipse/roundRect…
  // sem mockar cada método. `canvas` devolve as dimensões lógicas do palco.
  function fakeDinoCtx(w = 480, h = 270): unknown {
    const noop = () => ({ addColorStop() {} })
    return new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'canvas') return { width: w, height: h }
          return noop
        },
        set() {
          return true
        },
      },
    )
  }

  it('expõe as funções do kit dino e do pulo genérico', () => {
    const sz = loadRuntime().SZGame2D as unknown as Record<string, unknown>
    for (const fn of [
      'jumpOnGround',
      'createDino',
      'controlDino',
      'spawnObstacle',
      'spawnEgg',
      'drawForest',
      'playJump',
      'playDinoHurt',
      'playCollect',
    ]) {
      expect(typeof sz[fn]).toBe('function')
    }
  })

  it('createDino cria um sprite com skin de dino', () => {
    const d = dinoApi().createDino({ x: 10, y: 20, size: 64, color: '#5fb45f' })
    expect(d.skin.kind).toBe('dino')
    expect(d.skin.fullH).toBe(64)
    expect(d.h).toBe(64)
    expect(d.color).toBe('#5fb45f')
  })

  it('spawnObstacle põe o obstáculo no grupo; o pássaro nasce mais alto que o cacto', () => {
    const sz = dinoApi()
    const ctx = fakeDinoCtx()
    const g = sz.createGroup()
    const cacto = sz.spawnObstacle(g, ctx, { type: 'cactus', x: 500, size: 44, vx: -6 })
    const passaro = sz.spawnObstacle(g, ctx, { type: 'bird', x: 500, size: 44, vx: -6 })
    expect(g.items.length).toBe(2)
    expect(cacto.skin.kind).toBe('obstacle')
    expect(cacto.skin.shape).toBe('cactus')
    expect(passaro.skin.shape).toBe('bird')
    expect(passaro.y).toBeLessThan(cacto.y)
  })

  it('spawnEgg põe um ovo (bônus) no grupo', () => {
    const sz = dinoApi()
    const g = sz.createGroup()
    const ovo = sz.spawnEgg(g, { x: 500, y: 115, vx: -6 })
    expect(g.items.length).toBe(1)
    expect(ovo.skin.kind).toBe('egg')
  })

  it('drawSprite desenha dino/obstáculo/ovo e drawForest roda sem lançar', () => {
    const sz = dinoApi()
    const ctx = fakeDinoCtx()
    const g = sz.createGroup()
    const dino = sz.createDino({ x: 0, y: 0, size: 64, color: '#5fb45f' })
    const cacto = sz.spawnObstacle(g, ctx, { type: 'cactus', x: 10, size: 44, vx: -6 })
    const passaro = sz.spawnObstacle(g, ctx, { type: 'bird', x: 10, size: 44, vx: -6 })
    const ovo = sz.spawnEgg(g, { x: 10, y: 10, vx: -6 })
    expect(() => sz.drawSprite(ctx, dino)).not.toThrow()
    expect(() => sz.drawSprite(ctx, cacto)).not.toThrow()
    expect(() => sz.drawSprite(ctx, passaro)).not.toThrow()
    expect(() => sz.drawSprite(ctx, ovo)).not.toThrow()
    expect(() => sz.drawForest(ctx, 5)).not.toThrow()
  })

  it('controlDino aplica gravidade e pousa na linha do chão (não atravessa o piso)', () => {
    const sz = dinoApi()
    const ctx = fakeDinoCtx(480, 270)
    const dino = sz.createDino({ x: 100, y: 0, size: 64, color: '#5fb45f' })
    for (let i = 0; i < 200; i++) sz.controlDino(dino, ctx, 15)
    // chão do dino = 270 - round(270*0.16) = 227; os pés (y+h) param em 227.
    expect(dino.y + dino.h).toBe(227)
    expect(dino.skin.onGround).toBe(true)
  })
})

describe('gameTwoDRuntime — palco implícito (ctx escondido)', () => {
  it('expõe SZGame2D.clear() e o global lazy "ctx" sem lançar', () => {
    const win = loadRuntime() as unknown as {
      SZGame2D: { clear: () => void }
      ctx: unknown
    }
    expect(typeof win.SZGame2D.clear).toBe('function')
    // ensureStage cria/acha o canvas e limpa; em happy-dom (sem contexto 2D real)
    // é defensivo e não lança.
    expect(() => win.SZGame2D.clear()).not.toThrow()
    expect(() => win.ctx).not.toThrow()
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
    fireError: () => void
  }
  interface ImageApi {
    createSprite: (o: Record<string, unknown>) => {
      image: { img: FakeImg; loaded: boolean } | null
      anim: unknown
    }
    loadImage: (
      name: string,
    ) => { img: FakeImg | null; loaded: boolean; failed: boolean; url: string } | null
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
    pauseGame: () => void
    resumeGame: () => void
    setCamera: (x: number, y: number) => void
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
        const errorListeners: Array<() => void> = []
        this.addEventListener = (type, fn) => {
          if (type === 'load') loadListeners.push(fn)
          if (type === 'error') errorListeners.push(fn)
        }
        this.fireLoad = () => {
          if (!this.naturalWidth) this.naturalWidth = 32
          this.onload?.()
          for (const fn of loadListeners) fn()
        }
        this.fireError = () => {
          this.onerror?.()
          for (const fn of errorListeners) fn()
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
        canvas: { width: 320, height: 240 },
        fillStyle: '',
        globalAlpha: 1,
        save: () => calls.push({ fn: 'save', args: [] }),
        restore: () => calls.push({ fn: 'restore', args: [] }),
        translate: (...a: unknown[]) => calls.push({ fn: 'translate', args: a }),
        rotate: (...a: unknown[]) => calls.push({ fn: 'rotate', args: a }),
        scale: (...a: unknown[]) => calls.push({ fn: 'scale', args: a }),
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

  it('loadImage expõe o estado real do handle e devolve null para fonte vazia', () => {
    const { api } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    expect(api.loadImage('')).toBeNull()
    expect(api.loadImage('heroi')).toMatchObject({
      loaded: false,
      failed: false,
      url: 'data:image/png;base64,AAAA',
    })
  })

  it('drawSprite preserva o cenário enquanto a imagem ainda está carregando', () => {
    const { api } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 1, y: 2, w: 10, h: 10, image: 'heroi', color: '#abc' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, s)
    expect(calls.map((c) => c.fn)).toEqual([])
  })

  it('um desenho ÚNICO redesenha a imagem quando ela termina de carregar (sem loop)', () => {
    // Regressão do "quadrado azul": createImageSprite + drawSprite UMA vez (sem
    // "a cada frame") mostrava só o placeholder, pois a imagem carrega depois do
    // único desenho. O hook de load redesenha o sprite quando a imagem chega.
    const { api, created } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const s = api.createSprite({ x: 5, y: 6, w: 20, h: 20, image: 'heroi' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, s) // 1ª (e única) chamada: aguarda sem cobrir o cenário.
    expect(calls.map((c) => c.fn)).toEqual([])
    // A imagem termina de carregar → o hook desenha sem apagar o que estava atrás.
    created[0]?.fireLoad()
    expect(calls.map((c) => c.fn)).toContain('drawImage')
    expect(calls.map((c) => c.fn)).not.toContain('clearRect')
  })

  it('falha de carga desenha o retângulo de fallback sem apagar o cenário', () => {
    const { api, created } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const sprite = api.createSprite({ x: 5, y: 6, w: 20, h: 20, image: 'heroi' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, sprite)
    created[0]?.fireError()
    expect(calls.map((call) => call.fn)).toContain('fillRect')
    expect(calls.map((call) => call.fn)).not.toContain('clearRect')
  })

  it('ignora o load atrasado de uma imagem que já foi trocada no sprite', () => {
    const { api, created } = loadImaging({
      antiga: 'data:image/png;base64,AAAA',
      nova: 'data:image/png;base64,BBBB',
    })
    const sprite = api.createSprite({ x: 5, y: 6, w: 20, h: 20, image: 'antiga' })
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, sprite)
    api.setImage(sprite, 'nova')

    created[0]?.fireLoad()

    expect(calls.filter((call) => call.fn === 'drawImage')).toEqual([])
  })

  it('redraw assíncrono da imagem atual passa pela câmera e transformação do sprite', () => {
    const { api, created } = loadImaging({ heroi: 'data:image/png;base64,AAAA' })
    const sprite = api.createSprite({ x: 50, y: 60, w: 20, h: 20, image: 'heroi' }) as Record<
      string,
      unknown
    >
    sprite.angle = 0.5
    sprite.opacity = 0.5
    api.setCamera(40, 30)
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, sprite)
    calls.splice(0)

    created[0]?.fireLoad()

    expect(calls.map((call) => call.fn)).toContain('translate')
    expect(calls.map((call) => call.fn)).toContain('rotate')
    expect(calls.map((call) => call.fn)).toContain('drawImage')
    expect(ctx.globalAlpha).toBe(1)
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

  it('animação não avança enquanto o jogo está pausado', () => {
    const { api, setClock } = loadImaging({ folha: 'data:image/png;base64,AAAA' })
    const sheet = api.loadSpriteSheet('folha', 32, 32)
    sheet.image.loaded = true
    sheet.image.img.naturalWidth = 128
    const sprite = api.createSprite({ x: 0, y: 0, w: 32, h: 32 })
    setClock(1000)
    api.setAnimation(sprite, sheet, 0, 3, 8)
    setClock(1125)
    const { ctx, calls } = fakeCtx()
    api.drawSprite(ctx, sprite)
    api.pauseGame()
    setClock(10_000)
    api.resumeGame()
    api.drawSprite(ctx, sprite)

    const draws = calls.filter((call) => call.fn === 'drawImage')
    expect(draws.map((call) => call.args[1])).toEqual([32, 32])
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
    dragX: (s: Sprite) => void
    jumpOnGround: (s: Sprite, ctx: CanvasCtx, jump: number) => void
    clampToScreen: (s: Sprite, ctx: CanvasCtx) => void
    setCamera: (x: number, y: number) => void
    flash: (ctx: CanvasCtx, color: string) => void
    shake: (ctx: CanvasCtx, intensity: number) => void
    emitParticles: (x: number, y: number, count: number, color: string) => void
    drawParticles: (ctx: CanvasCtx) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
    pointer: { x: number; y: number; down: boolean }
    pauseGame: () => void
    resumeGame: () => void
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

  it('movimento, chão, ponteiro e limites acompanham o viewport da câmera', () => {
    const { api } = load()
    const { ctx } = fakeCtx(200, 100)
    api.setCamera(1000, 500)

    const platformHero = api.createSprite({ x: 1050, y: 900, w: 20, h: 20 })
    api.platformer(platformHero, ctx, 4, 11)
    expect(platformHero.y).toBe(580)

    const jumper = api.createSprite({ x: 1050, y: 900, w: 20, h: 20 })
    api.jumpOnGround(jumper, ctx, 14)
    expect(jumper.y).toBe(580)

    const clamped = api.createSprite({ x: 0, y: 900, w: 10, h: 10 })
    api.clampToScreen(clamped, ctx)
    expect([clamped.x, clamped.y]).toEqual([1000, 590])

    api.pointer.x = 100
    api.pointer.y = 50
    const follower = api.createSprite({ x: 1000, y: 500, w: 10, h: 10 })
    api.followPointer(follower, 5)
    expect(follower.x).toBeGreaterThan(1000)
    expect(follower.y).toBeGreaterThan(500)

    const dragged = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    api.dragX(dragged)
    expect(dragged.x).toBe(1090)
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

  it('shake congela durante a pausa e continua ao retomar', () => {
    const { api, rafs } = load()
    const { ctx } = fakeCtx()
    api.shake(ctx, 8)
    const pending = rafs.shift()
    api.pauseGame()
    pending?.()
    expect(ctx.canvas.style.transform ?? '').toBe('')
    expect(rafs).toHaveLength(0)
    api.resumeGame()
    expect(rafs).toHaveLength(1)
  })
})

describe('gameTwoDRuntime — música e pausa', () => {
  it('suspende o agendamento da música na pausa e continua ao retomar', () => {
    let nextTimerId = 1
    const timers = new Map<number, () => void>()
    const setTimeoutControlled = (callback: () => void) => {
      const id = nextTimerId
      nextTimerId += 1
      timers.set(id, callback)
      return id
    }
    const clearTimeoutControlled = (id: number) => timers.delete(id)
    const win = {
      addEventListener() {},
      SZGame2D: undefined,
      performance: { now: () => 0 },
    } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', gameTwoDRuntime)(
      win,
      () => 0,
      setTimeoutControlled,
      clearTimeoutControlled,
    )
    const api = (
      win as unknown as {
        SZGame2D: {
          playMusic: (name: string) => void
          pauseGame: () => void
          resumeGame: () => void
          stopMusic: () => void
        }
      }
    ).SZGame2D

    api.playMusic('adventure')
    expect(timers.size).toBe(1)
    api.pauseGame()
    expect(timers.size).toBe(0)
    api.resumeGame()
    expect(timers.size).toBe(1)
    const next = timers.values().next().value
    if (typeof next !== 'function') throw new Error('próxima nota não foi agendada')
    timers.clear()
    next()
    expect(timers.size).toBe(1)
    api.stopMusic()
    expect(timers.size).toBe(0)
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
      draw: number
      rows: number[][]
      solid: number[]
      ox: number
      oy: number
    }
    drawTileMap: (ctx: unknown, map: unknown, x: number, y: number, size?: number) => void
    collideTileMap: (sprite: TileSprite, map: unknown) => void
    tileAt: (map: unknown, px: number, py: number) => number
    setupStage: (width: number, height: number, background: string) => void
  }

  // Loader com um Image fake (nunca carrega) — os tiles caem no placeholder, que é
  // o que queremos contar; o desenho real do tileset se verifica em browser.
  function load(devicePixelRatio = 1): TileApi {
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
      devicePixelRatio,
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

  it('drawTileMap com tamanho manual usa o tamanho pedido; 0 volta ao encaixe automático', () => {
    const api = load()
    const map = api.createTileMap({ image: 'tileset', tile: 32, solid: '', grid: '0 0;0 0' })
    const noop = () => {}
    const ctx = {
      canvas: { width: 200, height: 100 },
      fillRect: noop,
      drawImage: noop,
      clearRect: noop,
    }
    // Encaixe automático: 2×2 num canvas 200×100 → célula 50, centrado (ox 50, oy 0).
    api.drawTileMap(ctx, map, 0, 0)
    expect(map.draw).toBe(50)
    expect(map.ox).toBe(50)
    expect(map.oy).toBe(0)
    // Tamanho manual: célula 20, mapa 40×40 centrado (ox 80, oy 30).
    api.drawTileMap(ctx, map, 0, 0, 20)
    expect(map.draw).toBe(20)
    expect(map.ox).toBe(80)
    expect(map.oy).toBe(30)
    // 0 (a sombra padrão do bloco) mantém o encaixe automático de sempre.
    api.drawTileMap(ctx, map, 0, 0, 0)
    expect(map.draw).toBe(50)
  })

  it('drawTileMap usa o palco lógico, não o backing store ampliado pelo DPR', () => {
    document.body.innerHTML = '<canvas id="tela"></canvas>'
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('canvas do teste não foi criado')
    canvas.getBoundingClientRect = () =>
      ({ width: 800, height: 480, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 480 }) as DOMRect
    const api = load(2)
    api.setupStage(800, 480, '#000000')
    expect(canvas.width).toBe(1600)
    expect(canvas.height).toBe(960)

    const map = api.createTileMap({ image: 'tileset', tile: 32, solid: '', grid: '0 0;0 0' })
    const ctx = { canvas, fillRect() {}, drawImage() {}, clearRect() {} }
    api.drawTileMap(ctx, map, 0, 0)
    expect(map.draw).toBe(240)
    expect(map.ox).toBe(160)
    expect(map.oy).toBe(0)
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

  it('createTileMap chamado 61+ vezes (sinal de laço no "a cada quadro") avisa uma única vez', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const api = load()
      for (let i = 0; i < 80; i += 1) {
        api.createTileMap({ image: 'tileset', tile: 32, solid: '', grid: '0' })
      }
      const calls = warn.mock.calls.filter((c) => String(c[0]).includes('Criar mapa'))
      expect(calls).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
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

  it('isola erros e desativa somente o loop defeituoso', () => {
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
    expect(count).toBe(1)
  })

  it('compõe múltiplos loops num único scheduler', () => {
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
    api.gameLoop(() => {
      countB += 1
    })

    flushRound()
    flushRound()
    expect(countA).toBe(2)
    expect(countB).toBe(2)
  })

  it('cancela o driver durante a pausa e agenda um novo frame ao continuar', () => {
    const pending = new Map<number, () => void>()
    let nextId = 1
    const requestAnimationFrame = (cb: () => void) => {
      const id = nextId++
      pending.set(id, cb)
      return id
    }
    const cancelAnimationFrame = (id: number) => pending.delete(id)
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
      win,
      requestAnimationFrame,
      cancelAnimationFrame,
    )
    const api = (
      win as unknown as {
        SZGame2D: {
          gameLoop: (fn: () => void) => () => void
          pauseGame: () => void
          resumeGame: () => void
        }
      }
    ).SZGame2D
    api.gameLoop(() => {})
    expect(pending.size).toBe(1)

    api.pauseGame()
    expect(pending.size).toBe(0)

    api.resumeGame()
    expect(pending.size).toBe(1)
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

  it('o id estável do bloco substitui arrows novos sem multiplicar o clique', () => {
    const { api, firePointerDown } = loadWithPointer()
    let totalCalls = 0
    for (let frame = 0; frame < 1000; frame++) {
      ;(api.onPointer as unknown as (fn: () => void, id: string) => void)(() => {
        totalCalls += 1
      }, 'bloco-clique')
    }
    firePointerDown(5, 5)
    expect(totalCalls).toBe(1)
  })

  it('não impõe teto artificial a eventos legítimos de blocos diferentes', () => {
    const { api, firePointerDown } = loadWithPointer()
    const original = console.warn
    let warnCount = 0
    let calls = 0
    console.warn = () => {
      warnCount += 1
    }
    try {
      for (let i = 0; i < 100; i++) {
        ;(api.onPointer as unknown as (fn: () => void, id: string) => void)(() => {
          calls += 1
        }, `bloco-${i}`)
      }
      firePointerDown(0, 0)
    } finally {
      console.warn = original
    }
    expect(warnCount).toBe(0)
    expect(calls).toBe(100)
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

describe('gameTwoDRuntime — grupos de sprites + temporizadores (v0.6.0)', () => {
  interface Sprite {
    x: number
    y: number
    w: number
    h: number
    vx: number
    vy: number
  }
  interface Group {
    items: Sprite[]
  }
  interface GroupApi {
    createGroup: () => Group
    spawn: (g: Group, o: Partial<Sprite> & { color?: string; image?: string }) => Sprite | null
    updateGroup: (g: Group) => void
    drawGroup: (ctx: unknown, g: Group) => void
    forEachInGroup: (g: Group, fn: (s: Sprite, i: number) => void) => void
    countGroup: (g: Group) => number
    clearGroup: (g: Group) => void
    removeFromGroup: (g: Group, s: Sprite) => void
    pruneOffscreen: (
      ctx: { canvas: { width: number; height: number } },
      g: Group,
      margin: number,
      onLeave?: (s: Sprite) => void,
    ) => void
    overlapGroups: (a: Group, b: Group, fn: (a: Sprite, b: Sprite) => void) => void
    everyFrames: (key: string, n: number) => boolean
    everySeconds: (key: string, secs: number) => boolean
    drawSprite: (ctx: unknown, s: unknown) => void
    setCamera: (x: number, y: number) => void
    pauseGame: () => void
    resumeGame: () => void
  }

  let clock = 0
  function load(): GroupApi {
    clock = 0
    const win = {
      addEventListener() {},
      SZGame2D: undefined,
      performance: { now: () => clock },
    } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    return (win as unknown as { SZGame2D: GroupApi }).SZGame2D
  }

  it('createGroup começa vazio; spawn adiciona sprites e devolve cada um', () => {
    const api = load()
    const g = api.createGroup()
    expect(api.countGroup(g)).toBe(0)
    const s = api.spawn(g, { x: 10, y: 20, w: 8, h: 8, color: '#fff', vx: 0, vy: 3 })
    expect(api.countGroup(g)).toBe(1)
    expect(s?.x).toBe(10)
    expect(s?.vy).toBe(3)
  })

  it('updateGroup move cada sprite pela velocidade; clear/remove tiram do grupo', () => {
    const api = load()
    const g = api.createGroup()
    const s = api.spawn(g, { x: 0, y: 0, w: 4, h: 4, color: '#fff', vx: 2, vy: 5 })
    api.updateGroup(g)
    expect(s?.x).toBe(2)
    expect(s?.y).toBe(5)
    if (s) api.removeFromGroup(g, s)
    expect(api.countGroup(g)).toBe(0)
    api.spawn(g, { x: 0, y: 0, color: '#fff' })
    api.spawn(g, { x: 0, y: 0, color: '#fff' })
    api.clearGroup(g)
    expect(api.countGroup(g)).toBe(0)
  })

  it('forEachInGroup roda em ordem reversa e tolera remoção no corpo', () => {
    const api = load()
    const g = api.createGroup()
    for (let i = 0; i < 3; i++) api.spawn(g, { x: i, y: 0, color: '#fff' })
    // Remove TODOS de dentro do forEach — a iteração reversa não pula nenhum.
    api.forEachInGroup(g, (s) => api.removeFromGroup(g, s))
    expect(api.countGroup(g)).toBe(0)
  })

  it('pruneOffscreen tira quem saiu da tela e chama onLeave para cada um', () => {
    const api = load()
    const g = api.createGroup()
    const ctx = { canvas: { width: 200, height: 200 } }
    api.spawn(g, { x: 50, y: 50, w: 10, h: 10, color: '#fff' }) // dentro
    api.spawn(g, { x: 0, y: 400, w: 10, h: 10, color: '#fff' }) // bem abaixo (fora)
    let escaped = 0
    api.pruneOffscreen(ctx, g, 40, () => {
      escaped += 1
    })
    expect(escaped).toBe(1)
    expect(api.countGroup(g)).toBe(1)
  })

  it('pruneOffscreen usa o viewport deslocado da câmera nos quatro lados', () => {
    const api = load()
    const g = api.createGroup()
    const ctx = { canvas: { width: 200, height: 100 } }
    api.setCamera(1000, 500)
    api.spawn(g, { x: 1050, y: 540, w: 10, h: 10, color: '#fff' })
    api.spawn(g, { x: 900, y: 540, w: 10, h: 10, color: '#fff' })
    api.spawn(g, { x: 1250, y: 540, w: 10, h: 10, color: '#fff' })
    api.spawn(g, { x: 1050, y: 400, w: 10, h: 10, color: '#fff' })
    api.spawn(g, { x: 1050, y: 650, w: 10, h: 10, color: '#fff' })
    api.pruneOffscreen(ctx, g, 0)
    expect(g.items.map((sprite) => [sprite.x, sprite.y])).toEqual([[1050, 540]])
  })

  it('overlapGroups chama fn para cada par que se encosta', () => {
    const api = load()
    const a = api.createGroup()
    const b = api.createGroup()
    api.spawn(a, { x: 0, y: 0, w: 10, h: 10, color: '#fff' })
    api.spawn(b, { x: 5, y: 5, w: 10, h: 10, color: '#fff' }) // encosta no de cima
    api.spawn(b, { x: 100, y: 100, w: 10, h: 10, color: '#fff' }) // longe
    let pares = 0
    api.overlapGroups(a, b, () => {
      pares += 1
    })
    expect(pares).toBe(1)
  })

  it('overlapGroups não faz buscas lineares de pertencimento dentro da varredura N×M', () => {
    const api = load()
    const a = api.createGroup()
    const b = api.createGroup()
    api.spawn(a, { x: 0, y: 0, w: 10, h: 10, color: '#fff' })
    api.spawn(b, { x: 100, y: 100, w: 10, h: 10, color: '#fff' })
    a.items.indexOf = () => {
      throw new Error('busca linear no grupo A')
    }
    b.items.indexOf = () => {
      throw new Error('busca linear no grupo B')
    }

    expect(() => api.overlapGroups(a, b, () => {})).not.toThrow()
  })

  it('overlapGroups usa fase ampla para grupos grandes e esparsos', () => {
    const api = load()
    const a = api.createGroup()
    const b = api.createGroup()
    let geometryReads = 0
    const sparseSprite = (x: number) => {
      const sprite = { y: 0, w: 8, h: 8, vx: 0, vy: 0 } as Sprite
      Object.defineProperty(sprite, 'x', {
        configurable: true,
        enumerable: true,
        get() {
          geometryReads += 1
          return x
        },
      })
      return sprite
    }
    for (let i = 0; i < 200; i++) {
      a.items.push(sparseSprite(i * 1_000))
      b.items.push(sparseSprite(i * 1_000 + 400))
    }

    api.overlapGroups(a, b, () => {})

    // A varredura cartesiana faria dezenas de milhares de leituras de x.
    expect(geometryReads).toBeLessThan(10_000)
  })

  it('a fase ampla preserva a ordem reversa e a remoção durante o callback', () => {
    const api = load()
    const a = api.createGroup()
    const b = api.createGroup()
    for (let i = 0; i < 50; i++) {
      const ax = i === 0 || i === 49 ? 0 : 10_000 + i * 100
      const bx = i === 0 || i === 49 ? 0 : -10_000 - i * 100
      const first = api.spawn(a, { x: ax, y: 0, w: 20, h: 20, color: '#fff' }) as Sprite & {
        tag: string
      }
      const second = api.spawn(b, { x: bx, y: 0, w: 20, h: 20, color: '#fff' }) as Sprite & {
        tag: string
      }
      first.tag = `a${i}`
      second.tag = `b${i}`
    }
    const pairs: string[] = []
    api.overlapGroups(a, b, (first, second) => {
      pairs.push(
        `${(first as Sprite & { tag: string }).tag}:${(second as Sprite & { tag: string }).tag}`,
      )
      if ((first as Sprite & { tag: string }).tag === 'a49') api.removeFromGroup(a, first)
    })

    expect(pairs).toEqual(['a49:b49', 'a0:b49', 'a0:b0'])
  })

  it('overlapGroups no mesmo grupo ignora o próprio sprite e visita cada par uma vez', () => {
    const api = load()
    const group = api.createGroup()
    api.spawn(group, { x: 0, y: 0, w: 20, h: 20, color: '#fff' })
    expect(() => api.overlapGroups(group, group, () => {})).not.toThrow()
    let oneSpritePairs = 0
    api.overlapGroups(group, group, () => {
      oneSpritePairs += 1
    })
    expect(oneSpritePairs).toBe(0)

    api.spawn(group, { x: 0, y: 0, w: 20, h: 20, color: '#fff' })
    api.spawn(group, { x: 0, y: 0, w: 20, h: 20, color: '#fff' })
    const pairs = new Set<string>()
    api.overlapGroups(group, group, (a, b) => {
      pairs.add([a.x, group.items.indexOf(a), group.items.indexOf(b)].join(':'))
    })
    expect(pairs.size).toBe(3)
  })

  it('overlapGroups: se o corpo REMOVE o tiro, ele não perfura os inimigos encostados (R1/A3)', () => {
    const api = load()
    const tiros = api.createGroup()
    const inimigos = api.createGroup()
    const tiro = api.spawn(tiros, { x: 10, y: 10, w: 8, h: 8, color: '#fff' })
    // Dois inimigos EMPILHADOS no mesmo lugar, ambos sob o tiro.
    api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20, color: '#f00' })
    api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20, color: '#f00' })
    let mortos = 0
    api.overlapGroups(tiros, inimigos, (t, e) => {
      api.removeFromGroup(tiros, t) // "remova o tiro"
      api.removeFromGroup(inimigos, e) // "remova o inimigo"
      mortos += 1
    })
    // O tiro sumiu no 1º acerto → só UM inimigo cai (antes derrubava os dois).
    expect(mortos).toBe(1)
    expect(api.countGroup(inimigos)).toBe(1)
    expect(api.countGroup(tiros)).toBe(0)
    expect(tiro).toBeTruthy()
  })

  it('overlapGroups: se o corpo NÃO remove o sprite, ele PERFURA de propósito (R1/A3)', () => {
    const api = load()
    const raio = api.createGroup()
    const inimigos = api.createGroup()
    api.spawn(raio, { x: 10, y: 10, w: 8, h: 8, color: '#fff' })
    api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20, color: '#f00' })
    api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20, color: '#f00' })
    let acertos = 0
    api.overlapGroups(raio, inimigos, (_r, e) => {
      api.removeFromGroup(inimigos, e) // remove só o inimigo; o raio continua
      acertos += 1
    })
    // O raio segue vivo → acerta os dois no mesmo quadro (perfura).
    expect(acertos).toBe(2)
    expect(api.countGroup(inimigos)).toBe(0)
  })

  it('everyFrames dispara a cada N quadros (por chave)', () => {
    const api = load()
    const hits: number[] = []
    for (let frame = 1; frame <= 6; frame++) {
      if (api.everyFrames('k', 3)) hits.push(frame)
    }
    // dispara no 3º e no 6º quadro.
    expect(hits).toEqual([3, 6])
  })

  it('everyFrames normaliza intervalos fracionários e não finitos para ao menos um quadro', () => {
    const api = load()
    expect(api.everyFrames('fracionario', 0.5)).toBe(true)
    expect(api.everyFrames('nan', Number.NaN)).toBe(true)
    expect(api.everyFrames('infinito', Number.POSITIVE_INFINITY)).toBe(true)
  })

  it('everySeconds respeita o relógio (1ª chamada arma; dispara após o período)', () => {
    const api = load()
    clock = 1000
    expect(api.everySeconds('k', 2)).toBe(false) // arma em t=1000
    clock = 2000
    expect(api.everySeconds('k', 2)).toBe(false) // só 1s passou
    clock = 3000
    expect(api.everySeconds('k', 2)).toBe(true) // 2s passaram → dispara
  })

  it('everySeconds desconta todo o tempo em que o jogo ficou pausado', () => {
    const api = load()
    clock = 1000
    expect(api.everySeconds('pausa', 2)).toBe(false)
    clock = 1500
    api.pauseGame()
    clock = 10_000
    api.resumeGame()
    expect(api.everySeconds('pausa', 2)).toBe(false)
    clock = 11_500
    expect(api.everySeconds('pausa', 2)).toBe(true)
  })
})

describe('gameTwoDRuntime — HUD no canvas + estado/cenas (v0.6.0)', () => {
  interface HudApi {
    drawScore: (
      ctx: unknown,
      label: string,
      value: unknown,
      x: number,
      y: number,
      color: string,
      size: number,
    ) => void
    drawLabel: (
      ctx: unknown,
      text: string,
      x: number,
      y: number,
      color: string,
      size: number,
      align: string,
    ) => void
    drawHearts: (
      ctx: unknown,
      count: number,
      x: number,
      y: number,
      size: number,
      color: string,
    ) => void
    drawBar: (
      ctx: unknown,
      value: number,
      max: number,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) => void
    setScene: (name: string) => void
    sceneIs: (name: string) => boolean
    getScene: () => string
    showScreen: (ctx: unknown, t: string, s: string, h: string, bg: string) => void
  }

  function load(): HudApi {
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    return (win as unknown as { SZGame2D: HudApi }).SZGame2D
  }

  function fakeCtx(w = 320, h = 200) {
    const texts: string[] = []
    const fills: Array<[number, number, number, number]> = []
    let fillShapes = 0
    const ctx = {
      canvas: { width: w, height: h },
      save() {},
      restore() {},
      fillStyle: '',
      font: '',
      textAlign: '',
      fillText: (t: string) => texts.push(t),
      fillRect: (x: number, y: number, fw: number, fh: number) => fills.push([x, y, fw, fh]),
      beginPath() {},
      moveTo() {},
      bezierCurveTo() {},
      closePath() {},
      fill() {
        fillShapes += 1
      },
    }
    return { ctx, texts, fills, getShapes: () => fillShapes }
  }

  it('drawScore escreve "rótulo valor" na tela', () => {
    const api = load()
    const { ctx, texts } = fakeCtx()
    api.drawScore(ctx, 'Pontos:', 5, 10, 30, '#fff', 24)
    expect(texts).toEqual(['Pontos: 5'])
  })

  it('drawHearts desenha um coração por vida (cap 20)', () => {
    const api = load()
    const { ctx, getShapes } = fakeCtx()
    api.drawHearts(ctx, 3, 10, 10, 20, '#f00')
    expect(getShapes()).toBe(3)
    // acima do teto não estoura.
    const c2 = fakeCtx()
    api.drawHearts(c2.ctx, 999, 0, 0, 10, '#f00')
    expect(c2.getShapes()).toBe(20)
  })

  it('drawBar desenha fundo + preenchimento proporcional (value/max)', () => {
    const api = load()
    const { ctx, fills } = fakeCtx()
    api.drawBar(ctx, 50, 100, 10, 10, 200, 12, '#0f0')
    // 2 retângulos: fundo (largura cheia) e preenchimento (metade).
    expect(fills).toHaveLength(2)
    expect(fills[0]?.[2]).toBe(200)
    expect(fills[1]?.[2]).toBe(100)
  })

  it('setScene / sceneIs controlam a cena atual', () => {
    const api = load()
    expect(api.sceneIs('inicio')).toBe(true) // cena inicial
    api.setScene('jogando')
    expect(api.sceneIs('jogando')).toBe(true)
    expect(api.sceneIs('inicio')).toBe(false)
    expect(api.getScene()).toBe('jogando')
  })

  it('showScreen cobre a tela e escreve o título (sem lançar)', () => {
    const api = load()
    const { ctx, texts, fills } = fakeCtx(300, 150)
    expect(() => api.showScreen(ctx, 'Fim', 'Tente de novo', 'Enter', '#000')).not.toThrow()
    expect(fills[0]).toEqual([0, 0, 300, 150]) // overlay de tela cheia
    expect(texts).toContain('Fim')
  })
})

describe('gameTwoDRuntime — Kit espaço (v0.7.0): nave, asteroide, explosão, colisão sprite×grupo', () => {
  interface KitApi {
    createShip: (o: Record<string, unknown>) => {
      skin: { kind: string; body: string; wings: string }
    }
    createGroup: () => { items: unknown[] }
    spawnAsteroid: (
      g: { items: unknown[] },
      o: Record<string, unknown>,
    ) => { skin: { kind: string; sides: number } }
    drawSprite: (ctx: unknown, s: unknown) => void
    drawGroup: (ctx: unknown, g: unknown) => void
    explodeSprite: (s: unknown, color: string) => void
    drawParticles: (ctx: unknown) => void
    overlapSpriteGroup: (
      get: () => unknown,
      g: { items: unknown[] },
      fn: (it: unknown) => void,
    ) => void
  }

  function load(): KitApi {
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    return (win as unknown as { SZGame2D: KitApi }).SZGame2D
  }

  // ctx que registra as chamadas de desenho (sem renderizar de verdade).
  function fakeCtx(w = 320, h = 240) {
    const calls: string[] = []
    const ctx = {
      canvas: { width: w, height: h },
      save() {},
      restore() {},
      translate() {},
      scale() {},
      rotate() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      bezierCurveTo() {},
      arc() {},
      ellipse() {},
      closePath() {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      fill() {
        calls.push('fill')
      },
      stroke() {
        calls.push('stroke')
      },
      fillRect() {
        calls.push('fillRect')
      },
    }
    return { ctx, calls }
  }

  it('createShip cria um sprite com skin de nave (cores guardadas)', () => {
    const api = load()
    const nave = api.createShip({ x: 10, y: 20, w: 54, h: 62, body: '#0ff', wings: '#00f' })
    expect(nave.skin.kind).toBe('ship')
    expect(nave.skin.body).toBe('#0ff')
    expect(nave.skin.wings).toBe('#00f')
    // drawSprite desenha a nave (preenche várias formas) sem lançar.
    const { ctx, calls } = fakeCtx()
    expect(() => api.drawSprite(ctx, nave)).not.toThrow()
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(3)
  })

  it('spawnAsteroid coloca um asteroide no grupo e drawGroup o desenha (polígono + crateras)', () => {
    const api = load()
    const g = api.createGroup()
    const a = api.spawnAsteroid(g, { x: 0, y: 0, size: 40, color: '#999', vx: 0, vy: 3 })
    expect(a.skin.kind).toBe('asteroid')
    expect(a.skin.sides).toBeGreaterThanOrEqual(7)
    expect(g.items).toHaveLength(1)
    const { ctx, calls } = fakeCtx()
    expect(() => api.drawGroup(ctx, g)).not.toThrow()
    // polígono preenchido + contornado.
    expect(calls).toContain('fill')
    expect(calls).toContain('stroke')
  })

  it('explodeSprite solta partículas no centro do sprite', () => {
    const api = load()
    const { ctx, calls } = fakeCtx()
    api.explodeSprite({ x: 50, y: 50, w: 20, h: 20 }, '#ffb13b')
    api.drawParticles(ctx)
    // 18 + 10 partículas emitidas → desenha vários fillRect.
    expect(calls.filter((c) => c === 'fillRect').length).toBeGreaterThan(10)
  })

  it('overlapSpriteGroup chama fn para cada sprite do grupo que encosta na nave', () => {
    const api = load()
    const nave = api.createShip({ x: 0, y: 0, w: 40, h: 40, body: '#0ff', wings: '#00f' })
    const g = api.createGroup()
    api.spawnAsteroid(g, { x: 10, y: 10, size: 20, color: '#999', vx: 0, vy: 0 }) // encosta
    api.spawnAsteroid(g, { x: 200, y: 200, size: 20, color: '#999', vx: 0, vy: 0 }) // longe
    let hits = 0
    api.overlapSpriteGroup(
      () => nave,
      g,
      () => {
        hits += 1
      },
    )
    expect(hits).toBe(1)
  })
})

describe('gameTwoDRuntime — nave clássica: girar + impulsionar (v0.10.0)', () => {
  interface ShipSprite {
    x: number
    y: number
    w: number
    h: number
    vx: number
    vy: number
    angle?: number
  }
  interface NaveApi {
    createSprite: (o: Partial<ShipSprite> & { color?: string }) => ShipSprite
    createGroup: () => { items: ShipSprite[] }
    rotateSprite: (s: ShipSprite, deg: number) => void
    pointSprite: (s: ShipSprite, deg: number) => void
    thrust: (s: ShipSprite, force: number) => void
    applyFriction: (s: ShipSprite, factor: number) => void
    steerThrust: (s: ShipSprite, speed: number, turnDeg: number) => void
    spriteAngleDeg: (s: ShipSprite) => number
    shootFrom: (
      s: ShipSprite,
      g: { items: ShipSprite[] },
      o: { speed?: number; color?: string },
    ) => ShipSprite | null
    spawnAsteroidFromEdge: (
      g: { items: ShipSprite[] },
      o: { size?: number; color?: string; speed?: number },
    ) => ShipSprite | null
    setCamera: (x: number, y: number) => void
    keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  }

  function load(): NaveApi {
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    return (win as unknown as { SZGame2D: NaveApi }).SZGame2D
  }

  const RAD = Math.PI / 180

  it('rotateSprite acumula em graus (horário) e pointSprite fixa o ângulo', () => {
    const api = load()
    const s = api.createSprite({ x: 0, y: 0 })
    api.rotateSprite(s, 90)
    expect(s.angle).toBeCloseTo(90 * RAD, 6)
    api.rotateSprite(s, 90)
    expect(s.angle).toBeCloseTo(180 * RAD, 6)
    api.pointSprite(s, 45)
    expect(s.angle).toBeCloseTo(45 * RAD, 6)
    expect(api.spriteAngleDeg(s)).toBeCloseTo(45, 6)
  })

  it('thrust acelera na direção apontada (0=cima, 90=direita)', () => {
    const api = load()
    const s = api.createSprite({ x: 0, y: 0 })
    api.pointSprite(s, 0) // pra cima → frente (0, -1)
    api.thrust(s, 2)
    expect(s.vx).toBeCloseTo(0, 6)
    expect(s.vy).toBeCloseTo(-2, 6)
    const s2 = api.createSprite({ x: 0, y: 0 })
    api.pointSprite(s2, 90) // pra direita → frente (1, 0)
    api.thrust(s2, 2)
    expect(s2.vx).toBeCloseTo(2, 6)
    expect(s2.vy).toBeCloseTo(0, 6)
  })

  it('applyFriction multiplica a velocidade pelo fator', () => {
    const api = load()
    const s = api.createSprite({ x: 0, y: 0 })
    s.vx = 10
    s.vy = -4
    api.applyFriction(s, 0.5)
    expect(s.vx).toBeCloseTo(5, 6)
    expect(s.vy).toBeCloseTo(-2, 6)
  })

  it('steerThrust: ↑ acelera na frente e integra a posição; ← → giram', () => {
    const api = load()
    const s = api.createSprite({ x: 100, y: 100 })
    api.pointSprite(s, 0) // pra cima
    api.keys.up = true
    api.steerThrust(s, 3, 4)
    // velocidade = frente*speed = (0, -3); posição move junto
    expect(s.vy).toBeCloseTo(-3, 6)
    expect(s.y).toBeCloseTo(97, 6)
    api.keys.up = false
    api.keys.right = true
    const before = s.angle ?? 0
    api.steerThrust(s, 3, 4)
    expect((s.angle ?? 0) - before).toBeCloseTo(4 * RAD, 6) // virou à direita
  })

  it('shootFrom cria o tiro na frente do sprite, com velocidade pra frente', () => {
    const api = load()
    const nave = api.createSprite({ x: 100, y: 100, w: 40, h: 40 })
    api.pointSprite(nave, 90) // pra direita → frente (1, 0)
    const g = api.createGroup()
    const tiro = api.shootFrom(nave, g, { speed: 5, color: '#9cff57' })
    expect(g.items.length).toBe(1)
    // velocidade do tiro aponta pra direita (vx>0, vy≈0)
    expect(tiro?.vx ?? 0).toBeGreaterThan(0)
    expect(Math.abs(tiro?.vy ?? 0)).toBeLessThan(0.001)
  })

  it('spawnAsteroidFromEdge nasce numa borda e vai rumo ao centro', () => {
    const random = spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.25)
    for (const canvas of Array.from(document.querySelectorAll('canvas'))) canvas.remove()
    const stage = document.createElement('canvas')
    stage.width = 360
    stage.height = 360
    document.body.appendChild(stage)
    try {
      const api = load()
      const g = api.createGroup()
      const a = api.spawnAsteroidFromEdge(g, { size: 30, color: '#8d8f9b', speed: 2 })
      expect(g.items.length).toBe(1)
      if (!a) throw new Error('asteroide não foi criado')
      const centerX = a.x + a.w / 2
      const centerY = a.y + a.h / 2
      const targetX = 360 / 2
      const targetY = 360 / 2
      const crossProduct = (targetX - centerX) * a.vy - (targetY - centerY) * a.vx
      expect(Math.hypot(a.vx, a.vy)).toBeCloseTo(2, 6)
      expect(crossProduct).toBeCloseTo(0, 6)
      expect((targetX - centerX) * a.vx + (targetY - centerY) * a.vy).toBeGreaterThan(0)
    } finally {
      random.mockRestore()
      stage.remove()
    }
  })

  it('spawnAsteroidFromEdge usa as bordas e o centro visíveis quando há câmera', () => {
    const random = spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.25)
    try {
      const api = load()
      api.setCamera(1000, 500)
      const g = api.createGroup()
      const asteroid = api.spawnAsteroidFromEdge(g, { size: 30, speed: 2 })
      if (!asteroid) throw new Error('asteroide não foi criado')
      expect(asteroid.x).toBeLessThan(1000)
      expect(asteroid.x + asteroid.w).toBeGreaterThanOrEqual(1000 - asteroid.w)
      expect(asteroid.y).toBeGreaterThanOrEqual(500)
      expect(asteroid.vx).toBeGreaterThan(0)
    } finally {
      random.mockRestore()
    }
  })
})

describe('gameTwoDRuntime — Kit gorilas (v0.11.0)', () => {
  interface City {
    buildings: { x: number; w: number; h: number; color: string }[]
    holes: { x: number; y: number; r: number }[]
    wind: number
    W: number
    H: number
  }
  interface Gorilla {
    x: number
    y: number
    w: number
    h: number
    skin: { kind: string; color: string; side: string }
  }
  interface GorillaSZ {
    createCity(): City
    placeThrower(city: City, o: { side: string; color: string }): Gorilla
    newWind(city: City): void
    throwBanana(thrower: Gorilla, city: City): void
    updateBanana(city: City): void
    bananaHitCity(city: City): boolean
    bananaHitThrower(city: City, thrower: Gorilla): boolean
    computerTurn(thrower: Gorilla, city: City, enemy: Gorilla): void
  }

  function gz(): GorillaSZ {
    return loadRuntime().SZGame2D as unknown as GorillaSZ
  }

  it('expõe as funções do kit gorilas', () => {
    const sz = loadRuntime().SZGame2D as unknown as Record<string, unknown>
    for (const fn of [
      'createCity',
      'drawCity',
      'placeThrower',
      'newWind',
      'drawWind',
      'aimDrag',
      'aimReleased',
      'throwBanana',
      'updateBanana',
      'drawBanana',
      'bananaHitThrower',
      'bananaHitCity',
      'playWhistle',
      'computerTurn',
      'drawAimReadout',
    ]) {
      expect(typeof sz[fn]).toBe('function')
    }
  })

  it('o robô (computerTurn) mira e joga sozinho — a banana resolve', () => {
    const sz = gz()
    const city = sz.createCity()
    const robot = sz.placeThrower(city, { side: 'right', color: '#6b4a2b' })
    const enemy = sz.placeThrower(city, { side: 'left', color: '#6b4a2b' })
    // Roda a vez do robô a cada quadro: ele pensa ~48 quadros e joga; a banana
    // voa e em algum momento bate num prédio ou no inimigo (one of the checks).
    let resolved = false
    for (let i = 0; i < 900 && !resolved; i++) {
      sz.computerTurn(robot, city, enemy)
      sz.updateBanana(city)
      if (sz.bananaHitThrower(city, enemy) || sz.bananaHitCity(city)) resolved = true
    }
    expect(resolved).toBe(true)
  })

  it('createCity gera uma fileira de prédios (com largura/altura)', () => {
    const city = gz().createCity()
    expect(Array.isArray(city.buildings)).toBe(true)
    expect(city.buildings.length).toBeGreaterThan(0)
    expect(Array.isArray(city.holes)).toBe(true)
    expect(city.holes.length).toBe(0)
    expect(city.W).toBeGreaterThan(0)
    expect(city.H).toBeGreaterThan(0)
  })

  it('newWind sorteia um vento dentro do limite', () => {
    const sz = gz()
    const city = sz.createCity()
    sz.newWind(city)
    expect(typeof city.wind).toBe('number')
    expect(Math.abs(city.wind)).toBeLessThanOrEqual(0.06 + 1e-9)
  })

  it('placeThrower devolve um gorila no lado pedido', () => {
    const sz = gz()
    const city = sz.createCity()
    const g = sz.placeThrower(city, { side: 'right', color: '#6b4a2b' })
    expect(g.skin.kind).toBe('gorilla')
    expect(g.skin.side).toBe('right')
  })

  it('bananaHitCity abre uma cratera quando a banana cai no prédio', () => {
    const sz = gz()
    const city = sz.createCity()
    const g = sz.placeThrower(city, { side: 'left', color: '#6b4a2b' })
    // sem mira, a banana sai parada da mão e a gravidade a derruba no prédio.
    sz.throwBanana(g, city)
    let hit = false
    for (let i = 0; i < 400 && !hit; i++) {
      sz.updateBanana(city)
      hit = sz.bananaHitCity(city)
    }
    expect(hit).toBe(true)
    expect(city.holes.length).toBeGreaterThan(0)
  })

  it('bananaHitThrower acerta o gorila e some com a banana (uma vez)', () => {
    const sz = gz()
    const city = sz.createCity()
    const g = sz.placeThrower(city, { side: 'left', color: '#6b4a2b' })
    // a banana nasce na mão do gorila → encosta nele.
    sz.throwBanana(g, city)
    expect(sz.bananaHitThrower(city, g)).toBe(true)
    // já zerou: não acerta de novo.
    expect(sz.bananaHitThrower(city, g)).toBe(false)
  })
})

// ---- Nitidez de pixel art (imageSmoothingEnabled heurístico) ----
// Pixel art AMPLIADA desenha com nearest (smoothing OFF durante o drawImage) e
// imagem REDUZIDA continua suave; o smoothing é sempre RESTAURADO depois (o
// ajuste é por desenho — setupStage/_resizeBacking resetam o estado do ctx).
interface CrispApi {
  createSprite: (opts: Record<string, unknown>) => Record<string, unknown>
  drawSprite: (ctx: unknown, sprite: unknown) => void
  drawFrame: (
    ctx: unknown,
    sheet: unknown,
    index: number,
    x: number,
    y: number,
    w?: number,
    h?: number,
  ) => void
}

function makeRecordingCtx() {
  let smoothing = true
  const calls: Array<{ smoothing: boolean }> = []
  const ctx = {
    get imageSmoothingEnabled() {
      return smoothing
    },
    set imageSmoothingEnabled(v: boolean) {
      smoothing = v
    },
    drawImage() {
      calls.push({ smoothing })
    },
    fillRect() {},
    clearRect() {},
    fillStyle: '',
    globalAlpha: 1,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
  }
  return { ctx, calls, current: () => smoothing }
}

describe('gameTwoDRuntime — nitidez de pixel art', () => {
  let api: CrispApi
  beforeEach(() => {
    api = loadRuntime().SZGame2D as unknown as CrispApi
  })

  it('imagem fixa AMPLIADA desenha com smoothing OFF e restaura depois', () => {
    const { ctx, calls, current } = makeRecordingCtx()
    const sprite = api.createSprite({ x: 0, y: 0, w: 64, h: 64 })
    sprite.image = { loaded: true, img: { naturalWidth: 16 } }
    api.drawSprite(ctx, sprite)
    expect(calls.length).toBe(1)
    expect(calls[0]?.smoothing).toBe(false)
    expect(current()).toBe(true)
  })

  it('imagem grande REDUZIDA continua suave (vetor/foto não serrilham)', () => {
    const { ctx, calls, current } = makeRecordingCtx()
    const sprite = api.createSprite({ x: 0, y: 0, w: 40, h: 40 })
    sprite.image = { loaded: true, img: { naturalWidth: 128 } }
    api.drawSprite(ctx, sprite)
    expect(calls.length).toBe(1)
    expect(calls[0]?.smoothing).toBe(true)
    expect(current()).toBe(true)
  })

  it('drawFrame amplia quadro de spritesheet com smoothing OFF', () => {
    const { ctx, calls, current } = makeRecordingCtx()
    const sheet = {
      image: { loaded: true, img: { naturalWidth: 32 } },
      frameW: 16,
      frameH: 16,
    }
    api.drawFrame(ctx, sheet, 0, 0, 0, 64, 64)
    expect(calls.length).toBe(1)
    expect(calls[0]?.smoothing).toBe(false)
    expect(current()).toBe(true)
  })

  it('drawFrame que REDUZ o quadro segue suave', () => {
    const { ctx, calls } = makeRecordingCtx()
    const sheet = {
      image: { loaded: true, img: { naturalWidth: 32 } },
      frameW: 16,
      frameH: 16,
    }
    api.drawFrame(ctx, sheet, 0, 0, 0, 8, 8)
    expect(calls.length).toBe(1)
    expect(calls[0]?.smoothing).toBe(true)
  })

  it('drawImage que LANÇA cai no placeholder (retângulo da cor)', () => {
    let filled = 0
    let smoothing = true
    const ctx = {
      get imageSmoothingEnabled() {
        return smoothing
      },
      set imageSmoothingEnabled(v: boolean) {
        smoothing = v
      },
      drawImage() {
        throw new Error('broken image')
      },
      fillRect() {
        filled++
      },
      clearRect() {},
      fillStyle: '',
      globalAlpha: 1,
    }
    const sprite = api.createSprite({ x: 0, y: 0, w: 64, h: 64 })
    sprite.image = { loaded: true, img: { naturalWidth: 16 } }
    api.drawSprite(ctx, sprite)
    expect(filled).toBe(1)
    expect(smoothing).toBe(true)
  })
})
