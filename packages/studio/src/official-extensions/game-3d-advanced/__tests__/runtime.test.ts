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
