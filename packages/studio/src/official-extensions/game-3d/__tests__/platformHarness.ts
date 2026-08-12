import { gameThreeDRuntime } from '../runtime'

/**
 * Bancada compartilhada dos testes de plataforma do Jogo 3D.
 *
 * Um Three.js falso, porém honesto nas partes que a física LÊ: posição, escala e
 * userData de verdade. O renderer e o canvas são de mentira (não há GL aqui), e
 * o canvas 2D registra cada fillRect para os testes de estampa procedural.
 */
const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

export type Any = Record<string, unknown>
export interface Meta {
  vx: number
  vy: number
  vz: number
  grounded: boolean
  gravity: number
}
export interface V3Like {
  x: number
  y: number
  z: number
}

export function loadRuntime() {
  type Listener = (ev: unknown) => void
  const listeners: Record<string, Listener[]> = {}

  class V3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
    copy(v: V3) {
      this.x = v.x
      this.y = v.y
      this.z = v.z
      return this
    }
    lookAt() {}
  }

  const THREE = {
    WebGLRenderer: class {
      shadowMap = { enabled: false, type: 0 }
      _loop: ((t: number) => void) | null = null
      setPixelRatio() {}
      setSize() {}
      setAnimationLoop(fn: ((t: number) => void) | null) {
        this._loop = fn
      }
      render() {}
      dispose() {}
      forceContextLoss() {}
    },
    PCFSoftShadowMap: 1,
    Scene: class {
      background: unknown = null
      children: unknown[] = []
      add(o: Any) {
        o.parent = this
        this.children.push(o)
      }
      remove(o: Any) {
        const i = this.children.indexOf(o)
        if (i !== -1) this.children.splice(i, 1)
        o.parent = null
      }
    },
    Color: class {
      constructor(public value: unknown) {}
    },
    PerspectiveCamera: class {
      position = new V3(0, 0, 5)
      lookAt() {}
    },
    OrthographicCamera: class {
      position = new V3(4, 4, 4)
      up = new V3(0, 1, 0)
      zoom = 1
      lookAt() {}
      updateProjectionMatrix() {}
    },
    AmbientLight: class {},
    DirectionalLight: class {
      position = new V3()
      castShadow = false
      shadow = { camera: {} as Record<string, number>, mapSize: { set() {} } }
    },
    MeshStandardMaterial: class {
      color: Any
      map: unknown = null
      opacity = 1
      transparent = false
      needsUpdate = false
      constructor(options?: { color?: unknown }) {
        this.color = { value: options?.color, set: (v: unknown) => (this.color.value = v) }
      }
      dispose() {}
    },
    Mesh: class {
      position = new V3(0, 0, 0)
      rotation = new V3(0, 0, 0)
      scale = new V3(1, 1, 1)
      castShadow = false
      receiveShadow = false
      userData: Any = {}
      constructor(
        public geometry?: unknown,
        public material?: unknown,
      ) {}
      traverse(fn: (o: unknown) => void) {
        fn(this)
      }
    },
    BoxGeometry: class {
      dispose() {}
    },
    SphereGeometry: class {
      dispose() {}
    },
    Group: class {
      position = new V3(0, 0, 0)
      rotation = new V3(0, 0, 0)
      scale = new V3(1, 1, 1)
      userData: Any = {}
      children: unknown[] = []
      add(o: Any) {
        o.parent = this
        this.children.push(o)
      }
      remove(o: Any) {
        const i = this.children.indexOf(o)
        if (i !== -1) this.children.splice(i, 1)
        o.parent = null
      }
      traverse(fn: (o: unknown) => void) {
        fn(this)
        for (const c of this.children) fn(c)
      }
    },
    Box3: class {
      min = { x: 0, y: 0, z: 0 }
      max = { x: 0, y: 0, z: 0 }
      setFromObject() {
        return this
      }
      intersectsBox() {
        return false
      }
    },
    MeshLambertMaterial: class {
      dispose() {}
    },
    CanvasTexture: class {
      wrapS = 0
      wrapT = 0
      magFilter = 0
      needsUpdate = false
      repeat = { set() {} }
      constructor(public source: unknown) {}
      dispose() {}
    },
    RepeatWrapping: 1000,
    NearestFilter: 1003,
    SRGBColorSpace: 'srgb',
  }

  const win = {
    devicePixelRatio: 1,
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    removeEventListener() {},
    SZGame3D: undefined,
  } as unknown as Any

  // Canvas 2D falso: o padrão procedural desenha com fillRect num contexto.
  const paintCalls: string[] = []
  const doc = {
    getElementById: () => ({ width: 800, height: 480 }),
    createElement: (tag: string) => {
      if (tag !== 'canvas') return {}
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          set globalAlpha(_v: number) {},
          fillRect: (x: number, y: number, w: number, h: number) => {
            paintCalls.push(`${x},${y},${w},${h}`)
          },
          clearRect() {},
          beginPath() {},
          arc() {},
          fill() {},
          createLinearGradient: () => ({ addColorStop() {} }),
        }),
      }
    },
  }

  new Function('THREE', 'window', 'document', runtimeBody)(THREE, win, doc)
  return {
    api: win.SZGame3D as Any,
    fire: (name: string, ev: unknown) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
    paintCalls,
  }
}

// A API do runtime é montada em tempo de execução: a bancada chama por NOME e
// recebe o que vier (malha, mundo, número, booleano). O retorno fica solto de
// propósito — tipar isto exigiria duplicar a API inteira num `.d.ts` que
// envelheceria em silêncio a cada bloco novo.
// biome-ignore lint/suspicious/noExplicitAny: retorno dinâmico da API do runtime
type RetornoDaApi = any

export const call = (api: Any, name: string, ...args: unknown[]): RetornoDaApi =>
  (api[name] as (...a: unknown[]) => RetornoDaApi)(...args)

export const meta = (obj: Any): Meta => (obj.userData as { sz: Meta }).sz
