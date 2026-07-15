import { describe, expect, it } from 'bun:test'
import { gameKit3DRuntime } from '../runtime'

/**
 * Testa o COMPORTAMENTO do motor SZGameKit3D executando a IIFE com um stub de
 * THREE (receita do game-3d: strip da linha `import` + new Function). O DOM é o
 * happy-dom do preload; o `window` injetado é o global (tem addEventListener,
 * innerWidth e KeyboardEvent de verdade).
 */

const runtimeBody = gameKit3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')

interface FakeRenderer {
  disposeCalls: number
  forceContextLossCalls: number
  loop: ((t: number) => void) | null
  shadowMap: { enabled: boolean; type: number }
  toneMapping: number
  setPixelRatio: (n: number) => void
  setSize: (w: number, h: number, updateStyle: boolean) => void
  setAnimationLoop: (fn: ((t: number) => void) | null) => void
  setRenderTarget: (t: unknown) => void
  render: () => void
  dispose: () => void
  forceContextLoss: () => void
}

function makeFakeThree() {
  const renderers: FakeRenderer[] = []

  class Vec3 {
    x = 0
    y = 0
    z = 0
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
    copy(v: Vec3) {
      this.x = v.x
      this.y = v.y
      this.z = v.z
      return this
    }
    sub(v: Vec3) {
      this.x -= v.x
      this.y -= v.y
      this.z -= v.z
      return this
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z
    }
    normalize() {
      const len = Math.sqrt(this.lengthSq()) || 1
      this.x /= len
      this.y /= len
      this.z /= len
      return this
    }
    applyQuaternion() {
      return this
    }
    addScaledVector(v: Vec3, s: number) {
      this.x += v.x * s
      this.y += v.y * s
      this.z += v.z * s
      return this
    }
    lerp(v: Vec3, a: number) {
      this.x += (v.x - this.x) * a
      this.y += (v.y - this.y) * a
      this.z += (v.z - this.z) * a
      return this
    }
    dot(v: Vec3) {
      return this.x * v.x + this.y * v.y + this.z * v.z
    }
  }

  class Euler {
    x = 0
    y = 0
    z = 0
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
  }

  class Quat {
    setFromUnitVectors() {
      return this
    }
    slerp() {
      return this
    }
    copy() {
      return this
    }
  }

  class Object3D {
    position = new Vec3()
    rotation = new Euler()
    scale = new Vec3().set(1, 1, 1)
    quaternion = new Quat()
    visible = true
    castShadow = false
    receiveShadow = false
    children: Object3D[] = []
    parent: Object3D | null = null
    add(child: Object3D) {
      child.parent = this
      this.children.push(child)
      return this
    }
    remove(child: Object3D) {
      const i = this.children.indexOf(child)
      if (i !== -1) this.children.splice(i, 1)
      return this
    }
    lookAt() {}
    traverse(fn: (o: Object3D) => void) {
      fn(this)
      for (const c of this.children) c.traverse(fn)
    }
    clone(): Object3D {
      const copy = new (this.constructor as new () => Object3D)()
      for (const c of this.children) copy.add(c.clone())
      return copy
    }
  }

  class Group extends Object3D {}
  class Mesh extends Object3D {
    constructor(
      public geometry?: unknown,
      public material?: unknown,
    ) {
      super()
    }
    override clone(): Object3D {
      const copy = new Mesh(this.geometry, this.material)
      copy.position.copy(this.position)
      copy.scale.copy(this.scale)
      for (const c of this.children) copy.add(c.clone())
      return copy
    }
  }
  class Scene extends Object3D {
    background: unknown = null
  }

  class Geo {
    disposed = false
    dispose() {
      this.disposed = true
    }
  }
  /** A rampa (wedgeGeo) monta a geometria na mão — o stub precisa acompanhar. */
  class BufferGeo extends Geo {
    attributes: Record<string, unknown> = {}
    index: unknown = null
    boundingSphere: unknown = null
    drawRange = { start: 0, count: 0 }
    setAttribute(name: string, attr: unknown) {
      this.attributes[name] = attr
      return this
    }
    setIndex(idx: unknown) {
      this.index = idx
      return this
    }
    computeVertexNormals() {}
    setDrawRange(start: number, count: number) {
      this.drawRange = { start, count }
    }
  }
  class BufferAttr {
    constructor(
      public array: unknown,
      public itemSize?: number,
    ) {}
    needsUpdate = false
    setUsage() {
      return this
    }
    copyArray() {}
  }
  class Material {
    emissiveIntensity = 0
    emissive = { set() {} }
    disposed = false
    constructor(public opts?: unknown) {}
    dispose() {
      this.disposed = true
    }
  }

  const THREE = {
    // biome-ignore lint/complexity/useArrowFunction: construtor (chamado com `new`)
    WebGLRenderer: function () {
      const r: FakeRenderer = {
        disposeCalls: 0,
        forceContextLossCalls: 0,
        loop: null,
        shadowMap: { enabled: false, type: 0 },
        toneMapping: 0,
        setPixelRatio: () => {},
        setSize: () => {},
        setAnimationLoop: (fn) => {
          r.loop = fn
        },
        setRenderTarget: () => {},
        render: () => {},
        dispose: () => {
          r.disposeCalls += 1
        },
        forceContextLoss: () => {
          r.forceContextLossCalls += 1
        },
      }
      renderers.push(r)
      return r
    } as unknown as new () => FakeRenderer,
    PCFSoftShadowMap: 1,
    ACESFilmicToneMapping: 2,
    Scene,
    Group,
    Mesh,
    Color: class {
      constructor(public value: unknown) {}
    },
    CanvasTexture: class {
      isTexture = true
      dispose() {}
    },
    // A curva de vida das partículas é assada numa DataTexture (toTexture do curso).
    DataTexture: class {
      isTexture = true
      needsUpdate = false
      constructor(
        public data?: unknown,
        public width?: number,
        public height?: number,
      ) {}
      dispose() {}
    },
    RGBAFormat: 1023,
    LinearFilter: 1006,
    ClampToEdgeWrapping: 1001,
    PerspectiveCamera: class extends Object3D {
      constructor(
        public fov?: number,
        public aspect?: number,
      ) {
        super()
      }
    },
    AmbientLight: class extends Object3D {},
    DirectionalLight: class extends Object3D {
      shadow = { camera: {} as Record<string, number>, mapSize: { set() {} } }
    },
    Vector3: Vec3,
    Quaternion: Quat,
    PlaneGeometry: Geo,
    BoxGeometry: Geo,
    SphereGeometry: Geo,
    CylinderGeometry: Geo,
    ConeGeometry: Geo,
    IcosahedronGeometry: Geo,
    OctahedronGeometry: Geo,
    TorusGeometry: Geo,
    BufferGeometry: BufferGeo,
    Float32BufferAttribute: BufferAttr,
    MeshStandardMaterial: Material,
  }
  return { THREE, renderers }
}

/** Só o que os testes chamam — o inventário completo é auditado no blockAudit. */
interface KitApi {
  setup(opts: Record<string, unknown>): void
  start(): void
  setState(name: string): void
  defineMold(name: string, opts: Record<string, unknown>, fn: () => void): void
  part(opts: Record<string, unknown>): void
  spawn(mold: string, x: number, y: number, z: number): unknown
  recycle(e: unknown): void
  exists(e: unknown): boolean
  countAlive(mold: string): number
  nearest(mold: string, e: unknown): unknown
  forEachNear(e: unknown, mold: string, radius: number, fn: (o: unknown) => void): void
  onEnterEntityState(mold: string, state: string, fn: (e: unknown) => void): void
  onExitEntityState(mold: string, state: string, fn: (e: unknown) => void): void
  setEntityState(e: unknown, state: string): void
  entityStateIs(e: unknown, state: string): boolean
  stateTimer(mold: string, state: string, sec: number, next: string): void
  hurt(e: unknown, amount: number): void
  healthOf(e: unknown): number
  onEntityDeath(mold: string, fn: (e: unknown) => void): void
  keyDown(key: string): boolean
  posOf(e: unknown, axis: string): number
  fall(e: unknown, g: number): void
  jump(e: unknown, force: number): void
  onGround(e: unknown): boolean
  makeSolid(mold: string): void
  setVelocity(e: unknown, x: number, y: number, z: number): void
  setDrag(e: unknown, amount: number): void
  place(e: unknown, x: number, y: number, z: number): void
  setCollider(mold: string, shape: string): void
  passThrough(e: unknown, on: boolean): void
  makeTrigger(mold: string): void
  onOverlap(mold: string, fn: (zone: unknown, who: unknown) => void): void
  setBounce(mold: string, amount: number): void
  setFriction(mold: string, amount: number): void
  setSeed(n: number): void
  forEachAlive(mold: string, fn: (e: unknown) => void): void
  startSpawner(mold: string, seconds: number, where: string): void
}

async function loadStartedKit(): Promise<{
  api: KitApi
  renderers: FakeRenderer[]
  step: (frames: number) => void
}> {
  const { THREE, renderers } = makeFakeThree()
  const win = globalThis.window as unknown as Record<string, unknown>
  new Function('THREE', 'window', runtimeBody)(THREE, win)
  const api = win.SZGameKit3D as KitApi
  api.setup({ width: 640, height: 360, world: 100 })
  api.start()
  // O start espera Promise.all(pending) antes de ligar o loop.
  await new Promise((resolve) => setTimeout(resolve, 0))
  let now = 0
  const step = (frames: number) => {
    const loop = renderers[0]?.loop
    if (!loop) throw new Error('loop não ligado')
    for (let i = 0; i < frames; i++) {
      now += 33.4
      loop(now)
    }
  }
  // Primeiro tick fixa o _lastT (dt = 0).
  step(1)
  return { api, renderers, step }
}

describe('SZGameKit3D — montagem', () => {
  it('monta a API pública sem THREE real e sem DOM no top-level', () => {
    const win = {
      addEventListener() {},
      SZGameKit3D: undefined,
    } as unknown as Record<string, unknown>
    new Function('THREE', 'window', runtimeBody)({}, win)
    const api = win.SZGameKit3D as Record<string, unknown> | undefined
    expect(api).toBeDefined()
    for (const key of ['setup', 'start', 'defineMold', 'spawn', 'onEntityStateUpdate', 'nearest']) {
      expect(typeof api?.[key]).toBe('function')
    }
  })
})

describe('SZGameKit3D — motor (fake THREE + happy-dom)', () => {
  it('pool: nascer/recolher reusa a entidade; FSM nasce em parado e roda o entrar', async () => {
    const { api } = await loadStartedKit()
    const entered: unknown[] = []
    api.defineMold('inimigo', { health: 30, speed: 3 }, () => {
      api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.onEnterEntityState('inimigo', 'parado', (e: unknown) => {
      entered.push(e)
    })
    api.setState('jogando')
    const e = api.spawn('inimigo', 1, 0, 2)
    expect(e).not.toBeNull()
    expect(entered).toEqual([e])
    expect(api.entityStateIs(e, 'parado')).toBe(true)
    expect(api.exists(e)).toBe(true)
    expect(api.countAlive('inimigo')).toBe(1)

    api.recycle(e)
    expect(api.exists(e)).toBe(false)
    expect(api.countAlive('inimigo')).toBe(0)
    const e2 = api.spawn('inimigo', 0, 0, 0)
    expect(e2).toBe(e) // pooling: o MESMO objeto volta
  })

  it('teto de entidades: acima de 200 o spawn devolve null', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('m', { health: 1, speed: 1 }, () => {})
    api.setState('jogando')
    for (let i = 0; i < 200; i++) {
      expect(api.spawn('m', 0, 0, 0)).not.toBeNull()
    }
    expect(api.spawn('m', 0, 0, 0)).toBeNull()
  })

  it('vizinhança: nearest acha o mais perto; forEachNear respeita o raio e exclui a própria', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('inimigo', { health: 10, speed: 1 }, () => {})
    api.setState('jogando')
    const a = api.spawn('inimigo', 0, 0, 0)
    const b = api.spawn('inimigo', 5, 0, 0)
    const c = api.spawn('inimigo', 30, 0, 0)
    expect(api.nearest('inimigo', a)).toBe(b)
    const seen: unknown[] = []
    api.forEachNear(a, 'inimigo', 10, (o: unknown) => {
      seen.push(o)
    })
    expect(seen).toEqual([b])
    expect(seen.includes(a)).toBe(false)
    expect(seen.includes(c)).toBe(false)
  })

  it('stateTimer: depois do tempo no estado, muda sozinho; setEntityState é idempotente', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('torre', { health: 100, speed: 0 }, () => {})
    const exits: string[] = []
    api.onExitEntityState('torre', 'parado', () => {
      exits.push('saiu')
    })
    api.stateTimer('torre', 'parado', 0.5, 'mirar')
    api.setState('jogando')
    const t = api.spawn('torre', 0, 0, 0)
    api.setEntityState(t, 'parado') // já está — não roda exit/enter de novo
    expect(exits).toEqual([])
    step(20) // ~0.66s em quadros de 1/30
    expect(api.entityStateIs(t, 'mirar')).toBe(true)
    expect(exits).toEqual(['saiu'])
  })

  it('combate: i-frames seguram o segundo hit; a derrota roda o gancho e recolhe', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('inimigo', { health: 30, speed: 1 }, () => {})
    const deaths: unknown[] = []
    api.onEntityDeath('inimigo', (e: unknown) => {
      deaths.push(e)
    })
    api.setState('jogando')
    const e = api.spawn('inimigo', 0, 0, 0)
    api.hurt(e, 10)
    expect(api.healthOf(e)).toBe(20)
    api.hurt(e, 10) // invencível: ignorado
    expect(api.healthOf(e)).toBe(20)
    step(20) // decai os i-frames (0.5s)
    api.hurt(e, 10)
    expect(api.healthOf(e)).toBe(10)
    step(20)
    api.hurt(e, 10)
    expect(deaths).toEqual([e])
    expect(api.exists(e)).toBe(false)
  })

  it('estados do jogo: entrar em jogando recolhe a arena; pausa não', async () => {
    const { api } = await loadStartedKit()
    api.defineMold('inimigo', { health: 10, speed: 1 }, () => {})
    api.setState('jogando')
    api.spawn('inimigo', 0, 0, 0)
    expect(api.countAlive('inimigo')).toBe(1)
    api.setState('pausado')
    api.setState('jogando') // despausar NÃO reseta
    expect(api.countAlive('inimigo')).toBe(1)
    api.setState('menu')
    api.setState('jogando') // recomeço: arena limpa
    expect(api.countAlive('inimigo')).toBe(0)
  })

  it('teclado: keyDown lê o mapa; blur solta as teclas', async () => {
    const { api } = await loadStartedKit()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))
    expect(api.keyDown('w')).toBe(true)
    window.dispatchEvent(new Event('blur'))
    expect(api.keyDown('w')).toBe(false)
  })

  it('dispose no pagehide: renderer.dispose + forceContextLoss (higiene de contexto WebGL)', async () => {
    const { renderers } = await loadStartedKit()
    window.dispatchEvent(new Event('pagehide'))
    expect(renderers[0]?.disposeCalls).toBe(1)
    expect(renderers[0]?.forceContextLossCalls).toBe(1)
  })
})

/**
 * Física. A v0.2.0 foi para produção com o motor de colisão SEM NENHUM teste de
 * runtime — foi o que deixou os 14 defeitos passarem. Esta suíte é a rede.
 */
describe('SZGameKit3D — física', () => {
  /** Monta o molde `chao` do exemplo "Salto nas Nuvens", byte a byte. */
  function definePlatform(api: KitApi) {
    api.defineMold('chao', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#334155', w: 4, h: 0.6, d: 4, x: 0, y: 0, z: 0 })
    })
  }
  /** Molde do herói do exemplo (caixa 0.9×1.1 em y=0.55 + cabeça). */
  function defineHero(api: KitApi) {
    api.defineMold('heroi', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#38bdf8', w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 })
      api.part({ shape: 'sphere', color: '#e0f2fe', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 })
    })
  }

  // ---- CONTRATO com o exemplo em produção (teste #1 do plano) ----
  it('CONTRATO: o herói de "Salto nas Nuvens" ainda pousa exatamente em y=1.8', async () => {
    const { api, step } = await loadStartedKit()
    definePlatform(api)
    defineHero(api)
    api.makeSolid('chao')
    api.setState('jogando')
    api.spawn('chao', 0, 1.5, 0)
    const heroi = api.spawn('heroi', 0, 3, 0)
    api.fall(heroi, 20)
    step(40)
    // A plataforma nasce em y=1.5 e tem meia-altura 0.3 → topo em 1.8. Os pés do
    // herói são a origem do molde, então ele PARA com p.y = 1.8. Se a caixa
    // min/max tivesse mudado o topo, este número mudaria — e o exemplo que já
    // está no ar mudaria junto.
    expect(api.posOf(heroi, 'y')).toBeCloseTo(1.8, 5)
    expect(api.onGround(heroi)).toBe(true)
  })

  it('CONTRATO: molde centrado tem a MESMA caixa de antes (hw/hd simétricos)', async () => {
    const { api, step } = await loadStartedKit()
    // Todas as peças dos 2 exemplos em produção estão em x=0,z=0 → a caixa
    // min/max é simétrica e idêntica ao hw/hd antigo. Prova indireta: o herói
    // encosta na parede exatamente a 0.45+0.5 = 0.95 do centro dela.
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    defineHero(api)
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    api.setVelocity(h, 8, 0, 0)
    step(60)
    expect(api.posOf(h, 'x')).toBeCloseTo(5 - 0.5 - 0.45, 2)
  })

  // ---- Defeito 1: o gate da gravidade ----
  it('⭐ tiro SEM gravidade agora PARA na parede sólida (antes atravessava)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    api.setVelocity(t, 10, 0, 0) // sem gravidade nenhuma
    step(60)
    expect(api.posOf(t, 'x')).toBeLessThan(5)
  })

  it('fantasma (pass_through) volta a atravessar — o escape hatch', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    api.passThrough(t, true)
    api.setVelocity(t, 10, 0, 0)
    step(60)
    expect(api.posOf(t, 'x')).toBeGreaterThan(6)
  })

  it('chão-base (y=0) segue SÓ para quem tem gravidade (drone não é preso)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('drone', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const d = api.spawn('drone', 0, 5, 0)
    api.setVelocity(d, 0, -2, 0) // desce por vontade própria, sem gravidade
    step(120)
    expect(api.posOf(d, 'y')).toBeLessThan(0)
  })

  // ---- Defeito 2: tunelamento ----
  it('⭐ tiro rápido NÃO atravessa parede fina (substepping)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('tiro', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#ff0', w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 })
    })
    api.makeSolid('parede')
    api.setState('jogando')
    api.spawn('parede', 5, 0, 0)
    const t = api.spawn('tiro', 0, 2, 0)
    // 60 u/s com dt=1/30 = 2 unidades por quadro, contra parede de 1 → o modelo
    // antigo (integra e testa depois) passava direto.
    api.setVelocity(t, 60, 0, 0)
    step(30)
    expect(api.posOf(t, 'x')).toBeLessThan(5)
  })

  // ---- Defeito 7 + MIN_THICK: a regressão que o próprio fix cria ----
  it('⭐ piso de PLANO sólido não é atravessado (MIN_THICK)', async () => {
    const { api, step } = await loadStartedKit()
    // O plano tem espessura ZERO de verdade. Corrigir a caixa honestamente daria
    // um colisor sem volume — o MIN_THICK é o que segura.
    api.defineMold('piso', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'plane', color: '#888', w: 10, h: 10, d: 1, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('piso')
    api.setState('jogando')
    api.spawn('piso', 0, 2, 0)
    const h = api.spawn('heroi', 0, 5, 0)
    api.fall(h, 20)
    step(60)
    expect(api.posOf(h, 'y')).toBeGreaterThan(1.9)
  })

  // ---- Defeito 5: molde descentrado ----
  it('peça fora do centro não infla a caixa para o lado oposto', async () => {
    const { api, step } = await loadStartedKit()
    // Peça só em x=+5: a caixa vai de 4.5 a 5.5, NÃO de -5.5 a +5.5.
    api.defineMold('torto', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 4, d: 1, x: 5, y: 2, z: 0 })
    })
    defineHero(api)
    api.makeSolid('torto')
    api.setState('jogando')
    api.spawn('torto', 0, 0, 0)
    const h = api.spawn('heroi', -3, 0, 0)
    api.setVelocity(h, -4, 0, 0) // anda para LONGE da peça
    step(30)
    // Antes: a caixa simétrica ±5.5 pegava o herói em x=-3 e o empurrava.
    expect(api.posOf(h, 'x')).toBeLessThan(-3)
  })

  // ---- Plataforma móvel ----
  it('⭐ plataforma que anda CARREGA quem está em cima', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('plat', { health: 1, speed: 1 }, () => {
      api.part({ shape: 'box', color: '#334155', w: 4, h: 0.6, d: 4, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('plat')
    api.setState('jogando')
    const plat = api.spawn('plat', 0, 1.5, 0)
    const h = api.spawn('heroi', 0, 3, 0)
    api.fall(h, 20)
    step(40) // pousa
    expect(api.onGround(h)).toBe(true)
    const x0 = api.posOf(h, 'x')
    api.setVelocity(plat, 3, 0, 0)
    step(30)
    // Sem a carona o herói ficaria parado enquanto a plataforma sai debaixo dele.
    expect(api.posOf(h, 'x') - x0).toBeGreaterThan(1)
  })

  // ---- Zonas ----
  it('⭐ zona dispara ao ENTRAR (uma vez), não a cada quadro', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('moeda', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#fde047', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeTrigger('moeda')
    api.setState('jogando')
    api.spawn('moeda', 3, 0.5, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    let hits = 0
    api.onOverlap('moeda', () => {
      hits += 1
    })
    api.setVelocity(h, 2, 0, 0)
    step(60) // atravessa a moeda inteira
    expect(hits).toBe(1)
  })

  it('zona NÃO empurra: dá para atravessar', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('moeda', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#fde047', w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeTrigger('moeda')
    api.setState('jogando')
    api.spawn('moeda', 3, 0.5, 0)
    const h = api.spawn('heroi', 0, 0, 0)
    api.setVelocity(h, 3, 0, 0)
    step(60)
    expect(api.posOf(h, 'x')).toBeGreaterThan(4)
  })

  // ---- Quique ----
  it('quique: bounce=0 é o comportamento de hoje; bounce>0 devolve a bola', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('tramp', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#0f0', w: 6, h: 0.6, d: 6, x: 0, y: 0, z: 0 })
    })
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.makeSolid('tramp')
    api.setBounce('tramp', 0.9)
    api.setState('jogando')
    api.spawn('tramp', 0, 1.5, 0)
    const b = api.spawn('bola', 0, 8, 0)
    api.fall(b, 20)
    step(40) // cai e bate
    step(10)
    // Com quique, depois de bater a bola sobe: vy passa a ser positiva.
    expect(api.posOf(b, 'y')).toBeGreaterThan(1.8)
  })

  // ---- Defeito 11: arrasto ----
  it('arrasto do ar não briga mais com a gravidade (só X/Z)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('cx', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.setState('jogando')
    const a = api.spawn('cx', 0, 50, 0)
    api.fall(a, 20)
    api.setDrag(a, 5) // arrasto ALTO: antes segurava a queda (flutuava)
    step(60)
    expect(api.posOf(a, 'y')).toBeLessThan(30)
  })

  // ---- Cápsula / bola ----
  it('⭐ cápsula não engancha na quina: escorrega em vez de travar', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('quina', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 2, h: 2, d: 2, x: 0, y: 1, z: 0 })
    })
    defineHero(api)
    api.makeSolid('quina')
    api.setCollider('heroi', 'capsule')
    api.setState('jogando')
    api.spawn('quina', 0, 0, 0)
    // Mira DE RASPÃO na quina do cubo (diagonal): a caixa engata, a cápsula
    // desliza pelo canto arredondado e segue.
    const h = api.spawn('heroi', -4, 0, -1.6)
    api.setVelocity(h, 4, 0, 0)
    step(60)
    expect(api.posOf(h, 'x')).toBeGreaterThan(2)
  })

  it('bola: colisor esférico empurra pelo raio (sem quina)', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('parede', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'box', color: '#fff', w: 4, h: 4, d: 1, x: 0, y: 2, z: 0 })
    })
    api.defineMold('bola', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
    })
    api.makeSolid('parede')
    api.setCollider('bola', 'sphere')
    api.setState('jogando')
    api.spawn('parede', 0, 0, 5)
    const b = api.spawn('bola', 0, 0, 0)
    api.setVelocity(b, 0, 0, 6)
    step(60)
    // Para encostando: face da parede em z=4.5, menos o raio 0.5 da bola.
    expect(api.posOf(b, 'z')).toBeCloseTo(4.0, 1)
  })

  // ---- Semente (determinismo do curso) ----
  it('⭐ a MESMA semente dá a MESMA partida (e sementes diferentes, partidas diferentes)', async () => {
    async function runWithSeed(seed: number): Promise<number[]> {
      const { api, step } = await loadStartedKit()
      api.defineMold('bicho', { health: 1, speed: 0 }, () => {
        api.part({ shape: 'box', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
      })
      api.setSeed(seed)
      api.setState('jogando')
      // O nascedouro "em qualquer lugar" sorteia ângulo e distância — é acaso puro.
      api.startSpawner('bicho', 0.05, 'anywhere')
      step(20)
      const out: number[] = []
      api.forEachAlive('bicho', (e) => {
        out.push(Math.round(api.posOf(e, 'x') * 1000) / 1000)
      })
      return out.sort((a, b) => a - b)
    }
    const a = await runWithSeed(42)
    const b = await runWithSeed(42)
    const c = await runWithSeed(7)
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b) // mesma semente → partida idêntica
    expect(a).not.toEqual(c) // semente diferente → outra partida
  })

  // ---- Rampa ----
  it('⭐ rampa: o herói sobe a inclinação em vez de bater nela', async () => {
    const { api, step } = await loadStartedKit()
    api.defineMold('rampa', { health: 1, speed: 0 }, () => {
      api.part({ shape: 'rampa', color: '#888', w: 4, h: 2, d: 8, x: 0, y: 0, z: 0 })
    })
    defineHero(api)
    api.makeSolid('rampa')
    api.setState('jogando')
    api.spawn('rampa', 0, 0, 0)
    const h = api.spawn('heroi', 0, 1, -3)
    api.fall(h, 20)
    step(20)
    const y0 = api.posOf(h, 'y')
    api.setVelocity(h, 0, 0, 3) // anda subindo a rampa (+Z)
    step(40)
    expect(api.posOf(h, 'y')).toBeGreaterThan(y0)
  })
})
