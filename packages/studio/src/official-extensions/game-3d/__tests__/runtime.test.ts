import { describe, expect, it } from 'bun:test'
import { gameThreeDRuntime } from '../runtime'

// O runtime é um SCRIPT MODULE (começa com `import * as THREE from 'three'`).
// Para rodá-lo no bun:test sem um bundler, tiramos a linha do import e
// executamos o IIFE restante num escopo controlado com `THREE`, `window` e
// `document` injetados — espelha o loader do gameTwoDRuntime.
const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

interface FakeRenderer {
  disposeCalls: number
  forceContextLossCalls: number
  animationLoopArgs: unknown[]
  setPixelRatio: (n: number) => void
  setSize: (w: number, h: number, updateStyle: boolean) => void
  setAnimationLoop: (fn: unknown) => void
  dispose: () => void
  forceContextLoss: () => void
}

interface World {
  renderer: FakeRenderer
  _objects: unknown[]
}

interface FakeGeometry {
  disposed: boolean
  dispose: () => void
}

interface SZGame3DSurface {
  createScene: (canvasId: string) => World
  dispose: (world: World) => void
  disposeAll: () => void
  createBox: (world: World, opts?: { size?: number; color?: string }) => unknown
  createSphere: (world: World, opts?: { radius?: number; color?: string }) => unknown
  setPosition: (obj: unknown, x: number, y: number, z: number) => void
}

interface LoadedRuntime {
  api: SZGame3DSurface
  fireEvent: (name: string) => void
  listenerCount: (name: string) => number
  geometries: FakeGeometry[]
}

function loadRuntime(getElementById?: (id: string) => unknown): LoadedRuntime {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}
  // Cada geometria criada registra-se aqui e marca disposed=true no dispose() —
  // assim o teste do teto confirma que a geometria órfã (acima do limite) é
  // liberada em vez de vazar na GPU.
  const geometries: FakeGeometry[] = []

  // Stub mínimo de Three.js: só o que createScene/dispose tocam. O renderer
  // registra quantas vezes dispose()/forceContextLoss() foram chamados.
  function makeRenderer(): FakeRenderer {
    const r: FakeRenderer = {
      disposeCalls: 0,
      forceContextLossCalls: 0,
      animationLoopArgs: [],
      setPixelRatio: () => {},
      setSize: () => {},
      setAnimationLoop: (fn: unknown) => {
        r.animationLoopArgs.push(fn)
      },
      dispose: () => {
        r.disposeCalls += 1
      },
      forceContextLoss: () => {
        r.forceContextLossCalls += 1
      },
    }
    return r
  }

  class Vec3 {
    set() {}
    lookAt() {}
  }
  const THREE = {
    // Precisa ser FUNÇÃO construtora: o runtime faz `new THREE.WebGLRenderer(...)`,
    // e uma arrow não pode ser instanciada com `new`.
    // biome-ignore lint/complexity/useArrowFunction: construtor (chamado com `new`)
    WebGLRenderer: function () {
      return makeRenderer()
    } as unknown as new () => FakeRenderer,
    Scene: class {
      background: unknown = null
      add() {}
    },
    Color: class {
      constructor(public value: unknown) {}
    },
    PerspectiveCamera: class {
      position = new Vec3()
      lookAt() {}
    },
    AmbientLight: class {},
    DirectionalLight: class {
      position = new Vec3()
    },
    MeshStandardMaterial: class {},
    Mesh: class {
      position = new Vec3()
      rotation = new Vec3()
      constructor(public geometry: unknown) {}
    },
    // Geometrias registram dispose() para o teste do teto verificar que a órfã é
    // descartada. Box e Sphere compartilham a mesma classe instrumentada.
    BoxGeometry: class implements FakeGeometry {
      disposed = false
      constructor() {
        geometries.push(this)
      }
      dispose() {
        this.disposed = true
      }
    },
    SphereGeometry: class implements FakeGeometry {
      disposed = false
      constructor() {
        geometries.push(this)
      }
      dispose() {
        this.disposed = true
      }
    },
  }

  const win = {
    devicePixelRatio: 1,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    SZGame3D: undefined,
  } as unknown as Record<string, unknown>

  const doc = {
    getElementById: getElementById ?? (() => ({ width: 400, height: 300 })),
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('THREE', 'window', 'document', runtimeBody)(THREE, win, doc)

  return {
    api: (win as unknown as { SZGame3D: SZGame3DSurface }).SZGame3D,
    fireEvent: (name: string) => {
      for (const fn of listeners[name] ?? []) fn({})
    },
    listenerCount: (name: string) => (listeners[name] ?? []).length,
    geometries,
  }
}

describe('gameThreeDRuntime — higiene de GPU', () => {
  it('dispose() chama forceContextLoss() além de dispose() do renderer', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    expect(world.renderer.disposeCalls).toBe(0)
    expect(world.renderer.forceContextLossCalls).toBe(0)

    api.dispose(world)

    // O ponto do achado #3: dispose() sozinho não libera o contexto WebGL.
    expect(world.renderer.disposeCalls).toBe(1)
    expect(world.renderer.forceContextLossCalls).toBe(1)
    // E também para o loop de animação (setAnimationLoop(null)).
    expect(world.renderer.animationLoopArgs.at(-1)).toBeNull()
  })

  it('registra um listener de pagehide (com fallback beforeunload)', () => {
    const { listenerCount } = loadRuntime()
    expect(listenerCount('pagehide')).toBe(1)
    expect(listenerCount('beforeunload')).toBe(1)
  })

  it('pagehide descarta TODOS os mundos vivos liberando o contexto WebGL', () => {
    const { api, fireEvent } = loadRuntime()
    const a = api.createScene('tela-a')
    const b = api.createScene('tela-b')

    fireEvent('pagehide')

    expect(a.renderer.forceContextLossCalls).toBe(1)
    expect(b.renderer.forceContextLossCalls).toBe(1)

    // Já descartados pelo pagehide: um segundo pagehide não redescarta.
    fireEvent('pagehide')
    expect(a.renderer.forceContextLossCalls).toBe(1)
    expect(b.renderer.forceContextLossCalls).toBe(1)
  })

  it('createScene duas vezes no MESMO canvas descarta o contexto anterior', () => {
    // getElementById devolve o MESMO objeto por id (espelha o DOM real): a
    // 2ª chamada de createScene precisa reconhecer o canvas e descartar o
    // mundo anterior antes de instanciar outro WebGLRenderer sobre ele.
    const canvases: Record<string, { width: number; height: number }> = {}
    const { api } = loadRuntime((id) => {
      canvases[id] ??= { width: 400, height: 300 }
      return canvases[id]
    })

    const first = api.createScene('tela')
    expect(first.renderer.disposeCalls).toBe(0)
    expect(first.renderer.forceContextLossCalls).toBe(0)

    const second = api.createScene('tela')

    // O primeiro mundo (mesmo canvas) foi descartado: loop parado + contexto
    // devolvido ao navegador.
    expect(first.renderer.disposeCalls).toBe(1)
    expect(first.renderer.forceContextLossCalls).toBe(1)
    expect(first.renderer.animationLoopArgs.at(-1)).toBeNull()

    // O segundo mundo é novo e segue vivo.
    expect(second.renderer.disposeCalls).toBe(0)
    expect(second.renderer.forceContextLossCalls).toBe(0)

    // E o registro não acumula contextos do mesmo canvas: pagehide só descarta
    // o segundo (o primeiro já saiu do registro).
    // (first já foi descartado, então não conta de novo)
  })

  it('createScene em canvases DIFERENTES não descarta o mundo anterior', () => {
    const canvases: Record<string, { width: number; height: number }> = {}
    const { api } = loadRuntime((id) => {
      canvases[id] ??= { width: 400, height: 300 }
      return canvases[id]
    })

    const a = api.createScene('tela-a')
    const b = api.createScene('tela-b')

    // Canvas distinto: o primeiro mundo continua vivo.
    expect(a.renderer.disposeCalls).toBe(0)
    expect(a.renderer.forceContextLossCalls).toBe(0)
    expect(b.renderer.disposeCalls).toBe(0)
    expect(b.renderer.forceContextLossCalls).toBe(0)
  })

  it('canvas inexistente (getElementById null) não colide entre cenas', () => {
    const { api } = loadRuntime(() => null)
    const a = api.createScene('some')
    const b = api.createScene('other')
    // Sem canvas resolvido, cada cena tem seu próprio contexto interno do
    // Three.js — não devem descartar uma à outra.
    expect(a.renderer.disposeCalls).toBe(0)
    expect(a.renderer.forceContextLossCalls).toBe(0)
    expect(b.renderer.disposeCalls).toBe(0)
    expect(b.renderer.forceContextLossCalls).toBe(0)
  })

  it('dispose() manual remove o mundo do registro (pagehide não o redescarta)', () => {
    const { api, fireEvent } = loadRuntime()
    const world = api.createScene('tela')
    api.dispose(world)
    expect(world.renderer.forceContextLossCalls).toBe(1)

    fireEvent('pagehide')
    // Não conta de novo: já saiu do registro no dispose() manual.
    expect(world.renderer.forceContextLossCalls).toBe(1)
  })
})

describe('gameThreeDRuntime — teto de objetos (anti-vazamento de GPU)', () => {
  it('createBox/createSphere devolvem um mesh e o registram no mundo', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const box = api.createBox(world, { size: 1 })
    expect(box).not.toBeNull()
    expect(world._objects).toHaveLength(1)
    const sphere = api.createSphere(world, { radius: 0.5 })
    expect(sphere).not.toBeNull()
    expect(world._objects).toHaveLength(2)
  })

  it('para de crescer no teto (300): novas criações devolvem null em silêncio', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    for (let i = 0; i < 300; i++) {
      expect(api.createBox(world)).not.toBeNull()
    }
    expect(world._objects).toHaveLength(300)
    // Acima do teto: null e o mundo NÃO cresce mais (o cenário parou de crescer).
    const overflow = api.createBox(world)
    expect(overflow).toBeNull()
    expect(world._objects).toHaveLength(300)
  })

  it('descarta a geometria órfã criada acima do teto (não vaza GPU)', () => {
    const { api, geometries } = loadRuntime()
    const world = api.createScene('tela')
    for (let i = 0; i < 300; i++) api.createBox(world)
    const beforeOverflow = geometries.length
    api.createBox(world) // acima do teto → geometria criada, mas logo descartada
    const orphan = geometries[beforeOverflow]
    expect(orphan?.disposed).toBe(true)
  })

  it('avisa no console UMA vez ao estourar o teto, em português', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    const originalWarn = console.warn
    let warnCount = 0
    let warnMsg = ''
    console.warn = (msg?: unknown) => {
      warnCount += 1
      warnMsg = String(msg)
    }
    try {
      for (let i = 0; i < 320; i++) api.createBox(world) // 20 acima do teto
    } finally {
      console.warn = originalWarn
    }
    expect(warnCount).toBe(1)
    expect(warnMsg).toContain("'a cada quadro'")
  })

  it('setPosition tolera o null devolvido acima do teto (não lança)', () => {
    const { api } = loadRuntime()
    const world = api.createScene('tela')
    for (let i = 0; i < 300; i++) api.createBox(world)
    const overflow = api.createBox(world)
    expect(() => api.setPosition(overflow, 1, 2, 3)).not.toThrow()
  })
})
