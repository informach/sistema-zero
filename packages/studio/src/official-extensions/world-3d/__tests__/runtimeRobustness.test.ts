import { afterEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import {
  loadStartedWorld,
  makeFakeThree,
  pressKey,
  releaseKey,
  runtimeBody,
  type WorldApi,
} from './kitHarness'

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const el of Array.from(document.querySelectorAll('#szw3d-stage'))) el.remove()
  for (const [key, code] of [
    ['e', 'KeyE'],
    ['w', 'KeyW'],
    ['shift', 'ShiftLeft'],
  ])
    releaseKey(key as string, code as string)
  delete (window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D
})

function findTerrain(scene: THREE.Scene | null): THREE.Mesh<THREE.PlaneGeometry> {
  let terrain: THREE.Mesh<THREE.PlaneGeometry> | null = null
  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh<THREE.PlaneGeometry>
    if (mesh.geometry?.type !== 'PlaneGeometry') return
    const segments = mesh.geometry.parameters?.widthSegments ?? 0
    if (!terrain || segments > terrain.geometry.parameters.widthSegments) terrain = mesh
  })
  if (!terrain) throw new Error('a malha do terreno não foi criada')
  return terrain
}

function meshHeightAt(geometry: THREE.PlaneGeometry, x: number, z: number): number {
  const { width, widthSegments: seg } = geometry.parameters
  const gx = Math.max(0, Math.min(seg, (x / width + 0.5) * seg))
  const gz = Math.max(0, Math.min(seg, (z / width + 0.5) * seg))
  const ix = Math.min(seg - 1, Math.floor(gx))
  const iz = Math.min(seg - 1, Math.floor(gz))
  const u = gx - ix
  const v = gz - iz
  const stride = seg + 1
  const pos = geometry.attributes.position
  if (!pos) throw new Error('o terreno não tem atributo de posição')
  const a = pos.getY(iz * stride + ix)
  const b = pos.getY((iz + 1) * stride + ix)
  const c = pos.getY((iz + 1) * stride + ix + 1)
  const d = pos.getY(iz * stride + ix + 1)
  return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v)
}

function observeDisposals(scene: THREE.Scene | null): () => number {
  let count = 0
  const seen = new Set<THREE.EventDispatcher>()
  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh
    const resources = [
      mesh.geometry,
      ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]),
    ]
    for (const resource of resources) {
      if (!resource || seen.has(resource)) continue
      seen.add(resource)
      resource.addEventListener('dispose', () => count++)
    }
  })
  return () => count
}

function makeHdrDataUrl(): string {
  const header = new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n')
  const bytes = new Uint8Array(header.length + 4)
  bytes.set(header)
  bytes.set([180, 120, 80, 129], header.length)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:application/octet-stream;base64,${btoa(binary)}`
}

function makeTriangleGlbDataUrl(): string {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const json = new TextEncoder().encode(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      buffers: [{ byteLength: positions.byteLength }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 }],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          min: [0, 0, 0],
          max: [1, 1, 0],
        },
      ],
    }),
  )
  const jsonPadding = (4 - (json.length % 4)) % 4
  const binaryPadding = (4 - (positions.byteLength % 4)) % 4
  const jsonLength = json.length + jsonPadding
  const binaryLength = positions.byteLength + binaryPadding
  const total = 12 + 8 + jsonLength + 8 + binaryLength
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  bytes.fill(0x20, 20 + json.length, 20 + jsonLength)
  const binaryOffset = 20 + jsonLength
  view.setUint32(binaryOffset, binaryLength, true)
  view.setUint32(binaryOffset + 4, 0x004e4942, true)
  bytes.set(new Uint8Array(positions.buffer), binaryOffset + 8)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}

describe('Mundo 3D — robustez do runtime', () => {
  it('não reinicia o relógio do mesmo som ambiente quando o comando é repetido', async () => {
    const { api, step } = await loadStartedWorld((world) => world.ambience('passaros'))
    const random = Math.random
    let calls = 0
    Math.random = () => {
      calls += 1
      return 0.5
    }
    try {
      api.ambience('passaros')
      step(1)
      expect(calls).toBe(0)
    } finally {
      Math.random = random
    }
  })

  it('não transforma keydown repetido pelo sistema em um novo keyPressed', async () => {
    const { api, step } = await loadStartedWorld()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }))
    expect(api.keyPressed('e')).toBe(true)
    step(1)
    expect(api.keyPressed('e')).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', repeat: true }))
    expect(api.keyPressed('e')).toBe(false)
  })

  it('oferece no toque todas as ações do teclado e solta a tecla ao cancelar o gesto', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    })
    try {
      const { api } = await loadStartedWorld()
      const labels = Array.from(
        document.querySelectorAll<HTMLButtonElement>('#szw3d-stage button'),
      ).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(
        expect.arrayContaining([
          'Pular',
          'Turbo ou correr',
          'Interagir',
          'Buzinar',
          'Abrir mapa',
          'Abrir pódio',
        ]),
      )

      const turbo = document.querySelector<HTMLButtonElement>('[aria-label="Turbo ou correr"]')
      if (!turbo) throw new Error('o botão de turbo não foi criado')
      turbo.dispatchEvent(new Event('pointerdown'))
      expect(api.keyDown('shift')).toBe(true)
      expect(api.keyPressed('shift')).toBe(true)
      turbo.dispatchEvent(new Event('pointercancel'))
      expect(api.keyDown('shift')).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor)
      else delete (window as unknown as Record<string, unknown>).matchMedia
    }
  })

  it('restaura resolução e mapa de sombra ao sair do modo desempenho', async () => {
    const { api, renderers } = await loadStartedWorld((world) => world.quality('desempenho'))
    const renderer = renderers[0]
    const sun = renderer?.scene?.children.find((object) => object.type === 'DirectionalLight') as
      | THREE.DirectionalLight
      | undefined
    expect(renderer?.pixelRatio).toBe(0.75)
    expect(sun?.shadow.mapSize.width).toBe(1024)

    api.quality('alta')
    expect(renderer?.pixelRatio).toBe(1)
    expect(sun?.shadow.mapSize.width).toBe(2048)
  })

  it('limita a malha pesada e usa exatamente seus triângulos na física do chão', async () => {
    const { api, renderers } = await loadStartedWorld((world) => {
      world.setup({ style: 'floresta', world: 240 })
      world.terrain(30, 1)
    })
    const terrain = findTerrain(renderers[0]?.scene ?? null)
    expect(terrain.geometry.parameters.widthSegments).toBe(320)

    const samples = [
      [-101.25, -88.4],
      [-47.1, 23.75],
      [-2.2, 7.7],
      [31.125, -59.625],
      [104.8, 93.2],
    ]
    for (const [x, z] of samples) {
      expect(api.groundHeight(x as number, z as number)).toBeCloseTo(
        meshHeightAt(terrain.geometry, x as number, z as number),
        5,
      )
    }
  })

  it('libera geometrias e materiais ao reconstruir personagem e barco', async () => {
    const { api, renderers, step } = await loadStartedWorld((world) => {
      world.car({ style: 'passeio', color: '#ef4444' })
      world.person('#3b82f6', 'bone')
      world.boat('#f8fafc')
    })
    const scene = renderers[0]?.scene ?? null

    const personDisposals = observeDisposals(scene)
    api.person('#22c55e', 'coroa')
    expect(personDisposals()).toBeGreaterThan(0)

    const boatDisposals = observeDisposals(scene)
    api.boat('#0ea5e9')
    expect(boatDisposals()).toBeGreaterThan(0)
    step(1)
  })

  it('libera a árvore da TNT quando a explosão a remove da cena', async () => {
    let explosions = 0
    const { api, renderers, step } = await loadStartedWorld((world) => {
      world.car({ style: 'passeio', color: '#ef4444' })
      world.onExplosion(() => explosions++)
    })
    const scene = renderers[0]?.scene ?? null
    api.explosive(0, 2)
    const explosiveDisposals = observeDisposals(scene)
    pressKey('w', 'KeyW')
    step(45)
    releaseKey('w', 'KeyW')
    expect(explosions).toBe(1)
    expect(explosiveDisposals()).toBeGreaterThan(0)
  })

  it('carrega HDR local, aplica no céu/reflexos e libera a textura no teardown', async () => {
    await import('three/addons/loaders/HDRLoader.js')
    ;(window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D = {
      ceu: { kind: 'environment3d', fileName: 'ceu.hdr', dataUrl: makeHdrDataUrl() },
    }
    const { api, renderers } = await loadStartedWorld((world: WorldApi) => world.skyPhoto('ceu'))
    const scene = renderers[0]?.scene
    const texture = scene?.environment as THREE.Texture | null | undefined
    expect(texture?.isTexture).toBe(true)
    expect(scene?.background).toBe(texture)

    let disposed = 0
    texture?.addEventListener('dispose', () => disposed++)
    api.disposeAll()
    expect(disposed).toBe(1)
  })

  it('encerra com segurança enquanto um GLB ainda está sendo interpretado', async () => {
    await import('three/addons/loaders/GLTFLoader.js')
    ;(window as unknown as Record<string, unknown>).__SZGAME_ASSETS_3D = {
      arvore: {
        kind: 'model3d',
        fileName: 'arvore.glb',
        dataUrl: makeTriangleGlbDataUrl(),
      },
    }
    const originalDispose = THREE.BufferGeometry.prototype.dispose
    let modelGeometryDisposals = 0
    THREE.BufferGeometry.prototype.dispose = function disposeWithAudit() {
      if (this.attributes.position?.count === 3) modelGeometryDisposals++
      return originalDispose.call(this)
    }
    try {
      const { THREE: fakeThree, renderers } = makeFakeThree()
      const win = window as unknown as Record<string, unknown>
      new Function('THREE', 'window', runtimeBody)(fakeThree, win)
      const api = win.SZWorld3D as WorldApi & {
        scatterModel(n: number, name: string, scale: number): void
      }
      api.setup({ style: 'floresta', world: 80 })
      api.scatterModel(5, 'arvore', 1)
      api.start()
      await Promise.resolve()
      api.disposeAll()
      for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0))

      expect(renderers[0]?.loop).toBeNull()
      expect(renderers[0]?.disposeCalls).toBe(1)
      expect(renderers[0]?.forceContextLossCalls).toBe(1)
      expect(modelGeometryDisposals).toBeGreaterThan(0)
    } finally {
      THREE.BufferGeometry.prototype.dispose = originalDispose
    }
  })
})
