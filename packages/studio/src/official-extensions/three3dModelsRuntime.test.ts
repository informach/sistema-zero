import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as RealTHREE from 'three'
import ts from 'typescript'
import type { ExtensionDefinition } from '#extensions'
import { makeAnimatedGlb, makeHdrDataUrl } from './__tests__/three3d/assetFixtures'
import flipbookFixture from './__tests__/three3d/molda-flipbook.json'
import skinFixture from './__tests__/three3d/molda-skinned.json'
import { gameThreeDExtension } from './game-3d'
import { gameThreeDRuntime } from './game-3d/runtime'
import { gameKit3DExtension } from './game-3d-advanced'
import { gameKit3DRuntime } from './game-3d-advanced/runtime'
import {
  THREE_MODELS_MARKER,
  threeModelsRuntimeSource,
  withThreeModelsRuntime,
} from './three3dModelsRuntime'
import { worldThreeDExtension } from './world-3d'
import { world3DRuntime } from './world-3d/runtime'

/**
 * O carregador de modelos compartilhado pelos três runtimes 3D, avaliado ISOLADO: o
 * fragmento roda num `new Function` com THREE, GLTFLoader, HDRLoader e SkeletonUtils de
 * VERDADE (o bun resolve `three/addons/...`, a mesma versão do CDN) e um host falso. É a
 * receita dos harnesses das extensões, sem o resto do motor por cima.
 *
 * Aqui mora a parte GENÉRICA que antes era testada só pelo Jogo 3D Avançado (orçamento,
 * pintura animada, animador); cada extensão guarda um teste de integração com a fixture
 * real do Molda.
 */

type Hit = {
  name: string
  scene: RealTHREE.Object3D
  clips: RealTHREE.AnimationClip[]
  clipNames: string[]
  metrics: {
    meshes: number
    triangles: number
    bones: number
    materials: number
    drawCalls: number
  }
  bounds: {
    min: RealTHREE.Vector3
    max: RealTHREE.Vector3
    size: RealTHREE.Vector3
    center: RealTHREE.Vector3
  } | null
  skinned: boolean
  flipbooks: { material: RealTHREE.MeshStandardMaterial }[]
}
type Fit = { scale: number; hw: number; hh: number; hd: number; minY: number }
type Anim = {
  mixer: RealTHREE.AnimationMixer
  clips: RealTHREE.AnimationClip[]
  play(name: string, opts?: { once?: boolean; fade?: number; speed?: number }): boolean
  stop(): void
  setSpeed(k: number): void
  update(dt: number): void
  current(): string
  action(): RealTHREE.AnimationAction | null
  onFinished(cb: (name: string) => void): () => void
  dispose(seen?: Set<unknown>): void
}
type Ambient = {
  sky: { r: number; g: number; b: number; intensity: number }
  ground: { r: number; g: number; b: number; intensity: number }
  sun: { r: number; g: number; b: number; intensity: number; x: number; y: number; z: number }
}
interface Models {
  load(name: string, onReady?: (hit: Hit) => void): Hit | null
  cached(name: string): Hit | null
  instantiate(
    hit: Hit,
    opts?: { ownMaterials?: boolean; shadows?: boolean | 'cast' },
  ): RealTHREE.Object3D
  clone(root: RealTHREE.Object3D): RealTHREE.Object3D
  fit(root: RealTHREE.Object3D, hit: Partial<Hit>, opts: Record<string, unknown>): Fit
  animator(root: RealTHREE.Object3D, hit: Partial<Hit>, opts?: { owner?: string }): Anim | null
  disposeClone(root: RealTHREE.Object3D, anim?: Anim | null, seen?: Set<unknown>): void
  stepFlipbooks(dt: number, frameStamp?: number): void
  resetFlipbooks(): void
  loadHdr(name: string, cb: (texture: RealTHREE.DataTexture | null) => void): void
  hdrAmbient(texture: unknown): Ambient | null
  configureColorTexture(tex: RealTHREE.Texture, opts?: Record<string, unknown>): RealTHREE.Texture
  cancelAll(): void
  disposeAll(done?: Record<string, Set<unknown>>): void
}

interface Bench {
  models: Models
  warnings: string[]
  pendings: Promise<void>[]
  disposed: { value: boolean }
  settle(): Promise<void>
}

function bench(
  assets: Record<string, { kind: string; dataUrl: string }>,
  extra: Record<string, unknown> = {},
  timers?: { set: (fn: () => void, ms: number) => number; clear: (id: number) => void },
): Bench {
  const factory = new Function(
    'THREE',
    'setTimeout',
    'clearTimeout',
    `${threeModelsRuntimeSource}\nreturn createSzModels;`,
  )(RealTHREE, timers?.set ?? setTimeout, timers?.clear ?? clearTimeout) as (
    host: Record<string, unknown>,
  ) => Models
  const warnings: string[] = []
  const once = new Set<string>()
  const pendings: Promise<void>[] = []
  const disposed = { value: false }
  const models = factory({
    THREE: RealTHREE,
    warn: (message: string) => warnings.push(message),
    warnOnce: (key: string, message: string) => {
      if (once.has(key)) return
      once.add(key)
      warnings.push(message)
    },
    assets,
    isDisposed: () => disposed.value,
    trackPending: (promise: Promise<void>) => pendings.push(promise),
    ...extra,
  })
  return {
    models,
    warnings,
    pendings,
    disposed,
    async settle() {
      await Promise.all(pendings)
      for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0))
    },
  }
}

async function loaded(b: Bench, name: string): Promise<Hit> {
  b.models.load(name)
  await b.settle()
  const hit = b.models.cached(name)
  if (!hit) throw new Error(`o modelo "${name}" não carregou: ${b.warnings.join(' | ')}`)
  return hit
}

function encodeGlb(gltf: Record<string, unknown>, bin: Uint8Array): string {
  const json = new TextEncoder().encode(
    JSON.stringify({ ...gltf, buffers: [{ byteLength: bin.length }] }),
  )
  const jsonLength = Math.ceil(json.length / 4) * 4
  const binLength = Math.ceil(bin.length / 4) * 4
  const total = 12 + 8 + jsonLength + 8 + binLength
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.fill(0x20, 20, 20 + jsonLength)
  bytes.set(json, 20)
  view.setUint32(20 + jsonLength, binLength, true)
  view.setUint32(24 + jsonLength, 0x004e4942, true)
  bytes.set(bin, 28 + jsonLength)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}

/** `meshes` nós com o MESMO triângulo e `bones` juntas de uma skin (o loader cria um Bone por junta). */
function makeCountedGlb(meshes: number, bones = 0): string {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const nodes: Record<string, unknown>[] = Array.from({ length: meshes }, (_, i) => ({
    name: `Mesh-${i}`,
    mesh: 0,
  }))
  const joints: number[] = []
  for (let i = 0; i < bones; i++) {
    joints.push(nodes.length)
    nodes.push({ name: `Bone-${i}` })
  }
  const gltf: Record<string, unknown> = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
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
  }
  if (bones) gltf.skins = [{ joints }]
  return encodeGlb(gltf, new Uint8Array(positions.buffer))
}

describe('withThreeModelsRuntime', () => {
  it('injeta uma única cópia do carregador e dos tetos por modelo', () => {
    const runtime = withThreeModelsRuntime(`antes\n${THREE_MODELS_MARKER}\ndepois`)
    expect(runtime).not.toContain(THREE_MODELS_MARKER)
    expect(runtime).not.toContain('__SZ_DATA_URL_RUNTIME__')
    expect(runtime.match(/function createSzModels\(/g)).toHaveLength(1)
    expect(runtime.match(/function dataUrlToBuffer\(/g)).toHaveLength(1)
    for (const name of ['MESHES', 'TRIANGLES', 'BONES', 'MATERIALS', 'DRAW_CALLS']) {
      expect(runtime.match(new RegExp(`var MAX_MODEL_${name} = \\d+;`, 'g'))).toHaveLength(1)
    }
  })

  it('os três runtimes recebem exatamente uma implementação, sem marcador sobrando', () => {
    for (const runtime of [gameThreeDRuntime, world3DRuntime, gameKit3DRuntime]) {
      expect(runtime).not.toContain('__SZ_THREE_MODELS_RUNTIME__')
      expect(runtime.match(/function createSzModels\(/g)).toHaveLength(1)
      expect(runtime.match(/GLTFLoader\(\)\.parse/g)).toHaveLength(1)
      expect(runtime.match(/HDRLoader\(\)\.parse/g)).toHaveLength(1)
      expect(runtime.match(/function dataUrlToBuffer\(/g)).toHaveLength(1)
    }
  })

  it('falha cedo quando o marcador está ausente ou duplicado', () => {
    expect(() => withThreeModelsRuntime('sem marcador')).toThrow('sem o marcador')
    expect(() => withThreeModelsRuntime(`${THREE_MODELS_MARKER}\n${THREE_MODELS_MARKER}`)).toThrow(
      'marcador do carregador de modelos duplicado',
    )
  })

  it('o fragmento é UM literal sem cifrão-chave cru e compila como JavaScript', () => {
    const src = readFileSync(join(import.meta.dir, 'three3dModelsRuntime.ts'), 'utf8')
    const opener = src.indexOf('`', src.indexOf('const THREE_MODELS_TEMPLATE ='))
    const hazards: number[] = []
    let line = src.slice(0, opener).split('\n').length
    let closed = false
    for (let index = opener + 1; index < src.length; index += 1) {
      const char = src[index]
      if (char === '\n') line += 1
      let backslashes = 0
      for (let cursor = index - 1; cursor >= 0 && src[cursor] === '\\'; cursor -= 1)
        backslashes += 1
      const escaped = backslashes % 2 === 1
      if (char === '`' && !escaped) {
        closed = true
        break
      }
      if (char === '$' && src[index + 1] === '{' && !escaped) hazards.push(line)
    }
    expect(closed).toBe(true)
    expect(hazards).toEqual([])
    expect(() => new Function('THREE', threeModelsRuntimeSource)).not.toThrow()
  })
})

describe('importmap: os addons que o carregador pede', () => {
  function specifiers(source: string): string[] {
    const file = ts.createSourceFile(
      'runtime.js',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    )
    const out: string[] = []
    const visit = (node: ts.Node) => {
      const first = ts.isCallExpression(node) ? node.arguments[0] : undefined
      if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
        out.push(node.moduleSpecifier.text)
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        first !== undefined &&
        ts.isStringLiteralLike(first)
      ) {
        out.push(first.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
    return out
  }

  const extensions: ExtensionDefinition[] = [
    gameThreeDExtension,
    worldThreeDExtension,
    gameKit3DExtension,
  ]

  it('nos três kits, todo import do runtime resolve no importmap, SkeletonUtils incluso e pinado igual', async () => {
    const skeletonUrls = new Set<string>()
    for (const extension of extensions) {
      const runtime = extension.runtime
      if (!runtime || !('loadBootstrapScript' in runtime) || !runtime.loadBootstrapScript) {
        throw new Error('runtime sem bootstrap')
      }
      const imports = runtime.esmImports ?? {}
      const found = specifiers(await runtime.loadBootstrapScript())
      expect(found).toContain('three/addons/utils/SkeletonUtils.js')
      expect(found.filter((specifier) => !(specifier in imports))).toEqual([])
      const url = imports['three/addons/utils/SkeletonUtils.js'] ?? ''
      expect(url.startsWith(imports.three ?? 'x')).toBe(true)
      skeletonUrls.add(url)
    }
    expect(skeletonUrls.size).toBe(1)
  })
})

describe('createSzModels — carga', () => {
  it('dois pedidos do mesmo nome entram na FILA: um parse, os dois recebem o mesmo hit', async () => {
    const b = bench({ heroi: { kind: 'model3d', dataUrl: makeAnimatedGlb('Heroi', ['Idle']) } })
    const got: Hit[] = []
    expect(b.models.load('heroi', (hit) => got.push(hit))).toBeNull()
    expect(b.models.load('heroi', (hit) => got.push(hit))).toBeNull()
    expect(b.pendings).toHaveLength(1)
    await b.settle()
    expect(got).toHaveLength(2)
    expect(got[0]).toBe(got[1] as Hit)
    // Depois de pronto: o hit volta NA HORA, sem nova espera e sem chamar o onReady.
    let late = 0
    expect(b.models.load('heroi', () => late++)).toBe(got[0] as Hit)
    expect(late).toBe(0)
    expect(b.pendings).toHaveLength(1)
    const hit = got[0] as Hit
    expect(hit.clipNames).toEqual(['Idle'])
    expect(hit.skinned).toBe(false)
    expect(hit.bounds?.size.y).toBeCloseTo(1.6)
    expect(hit.metrics).toMatchObject({ meshes: 1, triangles: 1, bones: 0, drawCalls: 1 })
  })

  it('modelo ausente ou de outro tipo avisa com o recado do host e não espera nada', () => {
    const b = bench(
      { ceu: { kind: 'environment3d', dataUrl: makeHdrDataUrl(1, 1, 1) } },
      {
        fallbackNote: ' — a peça fica com a forma de reserva',
      },
    )
    expect(b.models.load('sumido')).toBeNull()
    expect(b.models.load('ceu')).toBeNull()
    expect(b.models.load('')).toBeNull()
    expect(b.pendings).toHaveLength(0)
    expect(b.warnings).toHaveLength(2)
    expect(b.warnings[0]).toContain('o modelo "sumido" não está no projeto')
    expect(b.warnings[0]).toContain('reserva')
  })

  it('prazo estourado: avisa, libera a espera e solta a conclusão tardia sem cachear', async () => {
    const timers: Array<() => void> = []
    const b = bench(
      { tardio: { kind: 'model3d', dataUrl: makeAnimatedGlb('Tardio') } },
      {},
      { set: (fn) => timers.push(fn), clear: () => undefined },
    )
    let ready = 0
    b.models.load('tardio', () => ready++)
    expect(timers).toHaveLength(1)
    timers[0]?.()
    expect(b.warnings.some((w) => w.includes('demorou demais'))).toBe(true)
    await b.settle()
    expect(ready).toBe(0)
    expect(b.models.cached('tardio')).toBeNull()
  })

  it('cancelAll limpa o prazo NA HORA e nenhuma resposta atrasada entra', async () => {
    const cleared: number[] = []
    const b = bench(
      { tardio: { kind: 'model3d', dataUrl: makeAnimatedGlb('Tardio') } },
      {},
      { set: () => 7, clear: (id) => cleared.push(id) },
    )
    let ready = 0
    b.models.load('tardio', () => ready++)
    b.models.cancelAll()
    expect(cleared).toEqual([7])
    await b.settle()
    expect(ready).toBe(0)
    expect(b.models.cached('tardio')).toBeNull()
  })

  it('host encerrado durante o parse: o resultado tardio é descartado e liberado', async () => {
    const originalDispose = RealTHREE.BufferGeometry.prototype.dispose
    let disposals = 0
    RealTHREE.BufferGeometry.prototype.dispose = function audit() {
      disposals++
      return originalDispose.call(this)
    }
    try {
      await import('three/addons/loaders/GLTFLoader.js')
      await import('three/addons/utils/SkeletonUtils.js')
      const b = bench({ arvore: { kind: 'model3d', dataUrl: makeAnimatedGlb('Arvore') } })
      b.models.load('arvore')
      for (let i = 0; i < 4; i++) await Promise.resolve()
      b.disposed.value = true
      await b.settle()
      expect(b.models.cached('arvore')).toBeNull()
      expect(disposals).toBeGreaterThan(0)
    } finally {
      RealTHREE.BufferGeometry.prototype.dispose = originalDispose
    }
  })

  it('orçamento nas bordas: 48 malhas entram, 49 não; 256 ossos entram, 257 não', async () => {
    const b = bench({
      m48: { kind: 'model3d', dataUrl: makeCountedGlb(48) },
      m49: { kind: 'model3d', dataUrl: makeCountedGlb(49) },
      o256: { kind: 'model3d', dataUrl: makeCountedGlb(1, 256) },
      o257: { kind: 'model3d', dataUrl: makeCountedGlb(1, 257) },
    })
    for (const name of ['m48', 'm49', 'o256', 'o257']) b.models.load(name)
    await b.settle()
    expect(b.models.cached('m48')?.metrics.meshes).toBe(48)
    expect(b.models.cached('m49')).toBeNull()
    expect(b.models.cached('o256')?.metrics.bones).toBe(256)
    expect(b.models.cached('o257')).toBeNull()
    expect(b.warnings.some((w) => w.includes('49 malhas'))).toBe(true)
    expect(b.warnings.some((w) => w.includes('ossos demais (257 > 256)'))).toBe(true)
  })

  it('aquece o shader contra a cena do host quando renderer/cena/câmera existem', async () => {
    const compiled: unknown[] = []
    const scene = new RealTHREE.Scene()
    const camera = new RealTHREE.PerspectiveCamera()
    const renderer = { compile: (root: unknown) => compiled.push(root) }
    const b = bench(
      { heroi: { kind: 'model3d', dataUrl: makeAnimatedGlb('Heroi') } },
      { getRenderer: () => renderer, getScene: () => scene, getCamera: () => camera },
    )
    const hit = await loaded(b, 'heroi')
    expect(compiled).toEqual([hit.scene])
  })
})

describe('createSzModels — cópias com ossos', () => {
  function skins(root: RealTHREE.Object3D): RealTHREE.SkinnedMesh[] {
    const out: RealTHREE.SkinnedMesh[] = []
    root.traverse((node) => {
      if (node instanceof RealTHREE.SkinnedMesh) out.push(node)
    })
    return out
  }

  function expectPose(root: RealTHREE.Object3D, expected: typeof skinFixture.rest) {
    root.updateMatrixWorld(true)
    const nodes = new Map(
      skins(root).map((mesh) => [
        mesh.userData.molda.mirrorId ?? mesh.userData.molda.sourceId,
        mesh,
      ]),
    )
    expect(nodes.size).toBe(expected.length)
    const inverse = new RealTHREE.Matrix4().copy(root.matrixWorld).invert()
    const point = new RealTHREE.Vector3()
    for (const part of expected) {
      const mesh = nodes.get(part.id)
      if (!mesh) throw new Error('peça com pesos ausente')
      for (const [vertex, expectedPoint] of part.points.entries()) {
        mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse)
        for (const [axis, actual] of point.toArray().entries())
          expect(Math.abs(actual - (expectedPoint[axis] as number))).toBeLessThan(5e-5)
      }
    }
  }

  it('instantiate dá a cada cópia o PRÓPRIO esqueleto (geometria do cache) e cada uma anima no seu tempo', async () => {
    const b = bench({ boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl } })
    const hit = await loaded(b, 'boneco')
    expect(hit.skinned).toBe(true)
    expect(hit.metrics.bones).toBe(skinFixture.stats.bones)
    const first = b.models.instantiate(hit, { shadows: true })
    const second = b.models.instantiate(hit, { ownMaterials: true })
    const a = skins(first)
    const c = skins(second)
    expect(a).toHaveLength(3)
    const firstNodes = new Set<RealTHREE.Object3D>()
    first.traverse((node) => firstNodes.add(node))
    for (const [i, mesh] of a.entries()) {
      expect(mesh.skeleton).not.toBe(c[i]?.skeleton as RealTHREE.Skeleton)
      expect(mesh.geometry).toBe(c[i]?.geometry as RealTHREE.BufferGeometry)
      for (const bone of mesh.skeleton.bones) expect(firstNodes.has(bone)).toBe(true)
      expect(mesh.castShadow && mesh.receiveShadow).toBe(true)
      // ownMaterials: o segundo pinta sem tingir o primeiro.
      expect(c[i]?.material).not.toBe(mesh.material)
    }
    const anim = b.models.animator(first, hit)
    if (!anim) throw new Error('sem animador')
    expectPose(first, skinFixture.rest)
    anim.play('Acenar', { once: true })
    anim.update(1.5)
    expectPose(first, (skinFixture.clips[0] as (typeof skinFixture.clips)[number]).end)
    expectPose(second, skinFixture.rest)
  })

  it('sem o SkeletonUtils carregado, uma skin NUNCA cai no clone comum', async () => {
    const donor = await loaded(
      bench({ boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl } }),
      'boneco',
    )
    const fresh = bench({})
    expect(() => fresh.models.clone(donor.scene)).toThrow('ossos independentes')
    // Sem skin, o clone comum basta.
    expect(fresh.models.clone(new RealTHREE.Group())).toBeInstanceOf(RealTHREE.Group)
  })

  it('disposeClone solta os ossos (uma vez) e nunca a geometria do cache', async () => {
    const b = bench({ boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl } })
    const hit = await loaded(b, 'boneco')
    const root = b.models.instantiate(hit)
    const anim = b.models.animator(root, hit)
    let textures = 0
    let geometries = 0
    for (const mesh of skins(root)) {
      mesh.skeleton.computeBoneTexture()
      mesh.skeleton.boneTexture?.addEventListener('dispose', () => textures++)
      mesh.geometry.addEventListener('dispose', () => geometries++)
    }
    anim?.play('Acenar')
    b.models.disposeClone(root, anim)
    b.models.disposeClone(root, anim)
    expect(textures).toBe(3)
    expect(geometries).toBe(0)
    expect(anim?.mixer.existingAction(hit.clips[0] as RealTHREE.AnimationClip)).toBeNull()
  })
})

describe('createSzModels — encaixe', () => {
  // Um boneco de 6,5 de altura (o personagem típico do Molda), pé no 0.
  const tall: Partial<Hit> = {
    bounds: {
      min: new RealTHREE.Vector3(-0.5, 0, -0.25),
      max: new RealTHREE.Vector3(0.5, 6.5, 0.25),
      size: new RealTHREE.Vector3(1, 6.5, 0.5),
      center: new RealTHREE.Vector3(0, 3.25, 0),
    },
  }
  const models = bench({}).models

  for (const anchor of ['center', 'floor'] as const) {
    it(`longest/${anchor}: o lado MAIOR vira o tamanho`, () => {
      const root = new RealTHREE.Group()
      const fit = models.fit(root, tall, { mode: 'longest', anchor, size: 2 })
      expect(fit.scale).toBeCloseTo(2 / 6.5)
      expect(fit.hh).toBeCloseTo(1)
      expect(fit.hw).toBeCloseTo(1 / 6.5)
      expect(root.scale.y).toBeCloseTo(2 / 6.5)
      expect(root.position.y).toBeCloseTo(anchor === 'floor' ? 0 : -1)
      expect(fit.minY).toBeCloseTo(anchor === 'floor' ? 0 : -1)
    })

    it(`contain/${anchor}: 6,5 de altura numa caixa 1×2×1 cabe pela altura, sem esticar`, () => {
      const root = new RealTHREE.Group()
      const fit = models.fit(root, tall, { mode: 'contain', anchor, box: { w: 1, h: 2, d: 1 } })
      expect(fit.scale).toBeCloseTo(2 / 6.5)
      expect(fit.hh * 2).toBeCloseTo(2)
      expect(fit.hw * 2).toBeLessThanOrEqual(1)
      expect(fit.hd * 2).toBeLessThanOrEqual(1)
      expect(root.scale.x).toBeCloseTo(root.scale.y)
      expect(root.position.y).toBeCloseTo(anchor === 'floor' ? 0 : -1)
    })

    it(`height/${anchor}: a altura vira a pedida`, () => {
      const root = new RealTHREE.Group()
      const fit = models.fit(root, tall, { mode: 'height', anchor, height: 1.6 })
      expect(fit.scale).toBeCloseTo(1.6 / 6.5)
      expect(fit.hh * 2).toBeCloseTo(1.6)
      expect(fit.minY).toBeCloseTo(anchor === 'floor' ? 0 : -0.8)
    })
  }

  it('com um modelo de verdade, o pé fica no chão e a altura é a pedida', async () => {
    const b = bench({ heroi: { kind: 'model3d', dataUrl: makeAnimatedGlb('Heroi') } })
    const hit = await loaded(b, 'heroi')
    const root = b.models.instantiate(hit)
    b.models.fit(root, hit, { mode: 'height', anchor: 'floor', height: 3 })
    const box = new RealTHREE.Box3().setFromObject(root)
    expect(box.min.y).toBeCloseTo(0)
    expect(box.max.y - box.min.y).toBeCloseTo(3)
  })

  it('sem medida (caixa vazia): devolve as meias-medidas pedidas e não mexe na raiz', () => {
    const root = new RealTHREE.Group()
    const fit = models.fit(root, { bounds: null }, { mode: 'longest', size: 4 })
    expect(fit).toEqual({ scale: 1, hw: 2, hh: 2, hd: 2, minY: -2 })
    expect(root.scale.x).toBe(1)
  })
})

describe('createSzModels — animador', () => {
  async function heroAnim(extraClips: string[] = []) {
    const b = bench({
      heroi: { kind: 'model3d', dataUrl: makeAnimatedGlb('Heroi', ['Idle', 'Run', ...extraClips]) },
    })
    const hit = await loaded(b, 'heroi')
    const root = b.models.instantiate(hit)
    const anim = b.models.animator(root, hit)
    if (!anim) throw new Error('sem animador')
    return { b, hit, anim }
  }

  it('repetir: toca em laço e é idempotente enquanto a mesma ação roda', async () => {
    const { anim } = await heroAnim()
    expect(anim.play('Idle')).toBe(true)
    const action = anim.action()
    expect(action?.loop).toBe(RealTHREE.LoopRepeat)
    anim.update(0.3)
    expect(anim.play('Idle')).toBe(true)
    expect(anim.action()).toBe(action)
    expect(action?.time).toBeCloseTo(0.3)
    anim.update(1)
    expect(action?.isRunning()).toBe(true)
    expect(anim.current()).toBe('Idle')
  })

  it('uma vez: para no fim, avisa o onFinished e um novo pedido rebobina', async () => {
    const { anim } = await heroAnim()
    const done: string[] = []
    const off = anim.onFinished((name) => done.push(name))
    anim.play('Run', { once: true })
    anim.update(1.2)
    expect(done).toEqual(['Run'])
    const action = anim.action()
    expect(action?.isRunning()).toBe(false)
    expect(action?.clampWhenFinished).toBe(true)
    anim.play('Run', { once: true })
    expect(action?.time).toBe(0)
    expect(action?.isRunning()).toBe(true)
    off()
    anim.update(1.2)
    expect(done).toEqual(['Run'])
  })

  it('trocar o mesmo clipe de repetir para uma vez reconfigura a MESMA ação', async () => {
    const { anim } = await heroAnim()
    anim.play('Run')
    anim.update(0.2)
    const action = anim.action()
    anim.play('Run', { once: true })
    expect(anim.action()).toBe(action)
    expect(action?.loop).toBe(RealTHREE.LoopOnce)
    expect(action?.time).toBe(0)
  })

  it('velocidade: por pedido e para o animador inteiro', async () => {
    const { anim } = await heroAnim()
    anim.play('Idle', { speed: 2 })
    anim.update(0.2)
    expect(anim.action()?.time).toBeCloseTo(0.4)
    anim.setSpeed(0.5)
    expect(anim.action()?.timeScale).toBe(0.5)
    anim.play('Run')
    expect(anim.action()?.timeScale).toBe(0.5)
  })

  it('crossfade: as duas ações se misturam durante a passagem; sem fade, a anterior para', async () => {
    const { anim } = await heroAnim(['Jump'])
    anim.play('Idle', { fade: 0 })
    const idle = anim.action()
    anim.update(0.1)
    anim.play('Run', { fade: 0.4 })
    const run = anim.action()
    anim.update(0.2)
    expect(idle?.getEffectiveWeight()).toBeGreaterThan(0)
    expect(idle?.getEffectiveWeight()).toBeLessThan(1)
    expect(run?.getEffectiveWeight()).toBeGreaterThan(0)
    expect(run?.getEffectiveWeight()).toBeLessThan(1)
    anim.play('Jump', { fade: 0 })
    expect(run?.isRunning()).toBe(false)
  })

  it('nome que não existe: avisa UMA vez, listando os clipes do modelo', async () => {
    const { b, anim } = await heroAnim()
    for (let i = 0; i < 5; i++) expect(anim.play('Voar')).toBe(false)
    const avisos = b.warnings.filter((w) => w.includes('Voar'))
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toContain('o modelo "heroi" não tem a animação "Voar" (tem: Idle, Run)')
  })

  it('stop/dispose: para tudo, solta o mixer; modelo sem clipes não ganha animador', async () => {
    const { b, hit, anim } = await heroAnim()
    anim.play('Idle')
    anim.stop()
    expect(anim.current()).toBe('')
    anim.play('Idle')
    anim.dispose()
    expect(anim.mixer.existingAction(hit.clips[0] as RealTHREE.AnimationClip)).toBeNull()
    expect(b.models.animator(new RealTHREE.Group(), { clips: [] })).toBeNull()
  })
})

describe('createSzModels — pintura animada do Molda (contrato 1)', () => {
  type Book = { material: RealTHREE.MeshStandardMaterial }
  function placed(book: Book) {
    const map = book.material.map
    return [map?.offset.x, map?.offset.y, map?.repeat.x, map?.repeat.y]
  }

  /** Reescreve o flipbook do JSON do GLB (mesmo tamanho de binário, chunk JSON regravado). */
  function contractDataUrl(change: Record<string, unknown>) {
    const bytes = Uint8Array.from(atob(flipbookFixture.dataUrl.split(',')[1] as string), (c) =>
      c.charCodeAt(0),
    )
    const oldLength = new DataView(bytes.buffer).getUint32(12, true)
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + oldLength)))
    for (const material of json.materials) {
      const book = material.extras?.molda?.flipbook
      if (book) Object.assign(book, change)
    }
    const encoded = new TextEncoder().encode(JSON.stringify(json))
    const length = Math.ceil(encoded.length / 4) * 4
    const tail = bytes.subarray(20 + oldLength)
    const patched = new Uint8Array(20 + length + tail.length)
    patched.set(bytes.subarray(0, 20))
    const view = new DataView(patched.buffer)
    view.setUint32(8, patched.length, true)
    view.setUint32(12, length, true)
    patched.fill(32, 20, 20 + length)
    patched.set(encoded, 20)
    patched.set(tail, 20 + length)
    return `data:model/gltf-binary;base64,${btoa(Array.from(patched, (n) => String.fromCharCode(n)).join(''))}`
  }

  async function paintedHit(dataUrl = flipbookFixture.dataUrl) {
    const b = bench({ pintado: { kind: 'model3d', dataUrl } })
    const hit = await loaded(b, 'pintado')
    return { b, hit }
  }

  it('o contrato chega pelo userData do material e a sequência anda pelo tempo, em laço', async () => {
    const { b, hit } = await paintedHit()
    expect(hit.flipbooks).toHaveLength(1)
    const book = hit.flipbooks[0] as Book
    // O loader não decodifica PNG fora do navegador: o teste anexa a textura que ele daria.
    book.material.map = new RealTHREE.Texture()
    b.models.stepFlipbooks(0)
    const [first, ...rest] = flipbookFixture.steps
    expect(placed(book)).toEqual([...(first?.offset ?? []), ...(first?.scale ?? [])])
    for (const step of rest) {
      b.models.stepFlipbooks(1 / flipbookFixture.flipbook.fps)
      expect(placed(book)).toEqual([...step.offset, ...step.scale])
    }
    b.models.stepFlipbooks(1 / flipbookFixture.flipbook.fps)
    expect(placed(book)).toEqual([...(first?.offset ?? []), ...(first?.scale ?? [])])
  })

  it('o carimbo do quadro evita andar duas vezes (um laço por mundo) e o reset volta ao 1º passo', async () => {
    const { b, hit } = await paintedHit()
    const book = hit.flipbooks[0] as Book
    book.material.map = new RealTHREE.Texture()
    const step = 1 / flipbookFixture.flipbook.fps
    b.models.stepFlipbooks(step, 1)
    b.models.stepFlipbooks(step, 1)
    const second = flipbookFixture.steps[1]
    expect(placed(book)).toEqual([...(second?.offset ?? []), ...(second?.scale ?? [])])
    b.models.resetFlipbooks()
    const first = flipbookFixture.steps[0]
    expect(placed(book)).toEqual([...(first?.offset ?? []), ...(first?.scale ?? [])])
  })

  it('sem textura ainda, o passo não é dado: uma folha que chega depois anda', async () => {
    const { b, hit } = await paintedHit()
    const book = hit.flipbooks[0] as Book
    book.material.map = null
    b.models.stepFlipbooks(0.01)
    book.material.map = new RealTHREE.Texture()
    b.models.stepFlipbooks(0.01)
    const first = flipbookFixture.steps[0]
    expect(placed(book)).toEqual([...(first?.offset ?? []), ...(first?.scale ?? [])])
  })

  it.each([
    { contract: 2 },
    { frames: Array.from({ length: 257 }, () => 1) },
    { frames: [0.5, 1.5] },
    { frames: ['1', '0'] },
    { frames: [4] },
    { columns: 1.5 },
    { fps: 61 },
    { fps: 0 },
    { loop: 'sim' },
  ])('contrato futuro ou dado inválido fica PARADO, sem coerção: %j', async (change) => {
    const { hit } = await paintedHit(contractDataUrl(change))
    expect(hit.flipbooks).toEqual([])
  })
})

describe('createSzModels — céu 360°', () => {
  it('um parse por nome, um clone por uso; espera rastreada só quando o host pede', async () => {
    const assets = { ceu: { kind: 'environment3d', dataUrl: makeHdrDataUrl(200, 120, 40) } }
    const b = bench(assets, { waitForHdr: true })
    const got: (RealTHREE.DataTexture | null)[] = []
    b.models.loadHdr('ceu', (texture) => got.push(texture))
    b.models.loadHdr('ceu', (texture) => got.push(texture))
    expect(b.pendings).toHaveLength(1)
    await b.settle()
    expect(got).toHaveLength(2)
    expect(got[0]).not.toBe(got[1] as RealTHREE.DataTexture)
    expect(got[0]?.mapping).toBe(RealTHREE.EquirectangularReflectionMapping)
    expect(got[0]?.image.data).toBe(got[1]?.image.data)
    let sync: RealTHREE.DataTexture | null = null
    b.models.loadHdr('ceu', (texture) => {
      sync = texture
    })
    expect(sync).not.toBeNull()
    const quiet = bench(assets)
    quiet.models.loadHdr('ceu', () => undefined)
    expect(quiet.pendings).toHaveLength(0)
    let wrong: unknown = 'nada'
    b.models.loadHdr('nao-existe', (texture) => {
      wrong = texture
    })
    expect(wrong).toBeNull()
  })

  it('hdrAmbient: média do céu e do chão e o ponto forte (sol) com a direção dele', () => {
    const models = bench({}).models
    const w = 16
    const h = 8
    const data = new Float32Array(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const sky = y < h / 2
        data.set(sky ? [0.2, 0.4, 0.9, 1] : [0.1, 0.5, 0.1, 1], i)
      }
    }
    // Sol forte no alto, na coluna do meio (amostra 8×8 passa por x=9, y=1).
    data.set([20, 18, 12, 1], (1 * w + 9) * 4)
    const ambient = models.hdrAmbient(
      new RealTHREE.DataTexture(data, w, h, RealTHREE.RGBAFormat, RealTHREE.FloatType),
    )
    if (!ambient) throw new Error('sem amostra')
    expect(ambient.sky.b).toBeGreaterThan(ambient.sky.r)
    expect(ambient.ground.g).toBeGreaterThan(ambient.ground.b)
    expect(ambient.sun.intensity).toBe(20)
    expect(ambient.sun.r).toBe(1)
    expect(ambient.sun.y).toBeGreaterThan(0.5)
    expect(Math.hypot(ambient.sun.x, ambient.sun.y, ambient.sun.z)).toBeCloseTo(1)
    expect(models.hdrAmbient(new RealTHREE.Texture())).toBeNull()
  })

  it('hdrAmbient lê a textura que o HDRLoader de verdade entrega (meia-precisão)', async () => {
    const b = bench({ ceu: { kind: 'environment3d', dataUrl: makeHdrDataUrl(200, 120, 40) } })
    let texture: RealTHREE.DataTexture | null = null
    b.models.loadHdr('ceu', (t) => {
      texture = t
    })
    await b.settle()
    for (let i = 0; i < 20 && !texture; i++) await new Promise((resolve) => setTimeout(resolve, 5))
    const ambient = b.models.hdrAmbient(texture)
    if (!ambient) throw new Error('sem amostra')
    expect(ambient.sky.r).toBeGreaterThan(ambient.sky.g)
    expect(ambient.sky.g).toBeGreaterThan(ambient.sky.b)
    expect(ambient.sky.intensity).toBeGreaterThan(0)
  })
})

describe('createSzModels — textura de cor e descarte', () => {
  it('configureColorTexture: sRGB, repetindo, anisotropia até 4', () => {
    const models = bench({}).models
    const renderer = (max: number) => ({ capabilities: { getMaxAnisotropy: () => max } })
    const tex = new RealTHREE.Texture()
    const version = tex.version
    models.configureColorTexture(tex, { repeat: 3, renderer: renderer(16) })
    expect(tex.colorSpace).toBe(RealTHREE.SRGBColorSpace)
    expect(tex.wrapS).toBe(RealTHREE.RepeatWrapping)
    expect(tex.wrapT).toBe(RealTHREE.RepeatWrapping)
    expect(tex.repeat.toArray()).toEqual([3, 3])
    expect(tex.anisotropy).toBe(4)
    // Sem imagem ainda: quem marca o upload é o loader quando ela chega.
    expect(tex.version).toBe(version)
    const withImage = new RealTHREE.Texture({ width: 2, height: 2 } as unknown as HTMLImageElement)
    const before = withImage.version
    models.configureColorTexture(withImage, { renderer: renderer(2) })
    expect(withImage.anisotropy).toBe(2)
    expect(withImage.repeat.toArray()).toEqual([1, 1])
    expect(withImage.version).toBeGreaterThan(before)
  })

  it('disposeAll solta modelos e céus do cache uma vez só, respeitando o que o host já soltou', async () => {
    const b = bench({
      heroi: { kind: 'model3d', dataUrl: makeAnimatedGlb('Heroi') },
      ceu: { kind: 'environment3d', dataUrl: makeHdrDataUrl(10, 10, 10) },
    })
    const hit = await loaded(b, 'heroi')
    b.models.loadHdr('ceu', () => undefined)
    await b.settle()
    let geometries = 0
    let materials = 0
    let hdrDisposals = 0
    const material = new Set<RealTHREE.Material>()
    hit.scene.traverse((node) => {
      if (!(node instanceof RealTHREE.Mesh)) return
      node.geometry.addEventListener('dispose', () => geometries++)
      material.add(node.material as RealTHREE.Material)
    })
    for (const m of material) m.addEventListener('dispose', () => materials++)
    const originalDispose = RealTHREE.DataTexture.prototype.dispose
    RealTHREE.DataTexture.prototype.dispose = function audit() {
      hdrDisposals++
      return originalDispose.call(this)
    }
    try {
      const done = {
        geometries: new Set<unknown>(),
        materials: new Set<unknown>([...material]),
        textures: new Set<unknown>(),
        skeletons: new Set<unknown>(),
      }
      b.models.disposeAll(done)
      expect(geometries).toBe(1)
      expect(materials).toBe(0)
      expect(hdrDisposals).toBe(1)
      expect(b.models.cached('heroi')).toBeNull()
      b.models.disposeAll()
      expect(geometries).toBe(1)
    } finally {
      RealTHREE.DataTexture.prototype.dispose = originalDispose
    }
  })
})

describe('createSzModels — SkeletonUtils que falhou é pedido de novo', () => {
  it('a 1ª espera falha (rede): o modelo seguinte tenta outra vez e ganha ossos próprios', async () => {
    const real = await import('three/addons/utils/SkeletonUtils.js')
    let calls = 0
    const b = bench(
      {
        boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl },
        outro: { kind: 'model3d', dataUrl: skinFixture.dataUrl },
      },
      {
        importSkeleton: () => {
          calls += 1
          return calls === 1 ? Promise.reject(new Error('rede caiu')) : Promise.resolve(real)
        },
      },
    )
    await loaded(b, 'boneco')
    const second = await loaded(b, 'outro')
    // Antes, a espera falhada ficava guardada: 1 pedido só e nenhum modelo com ossos próprios.
    expect(calls).toBe(2)
    expect(() => b.models.clone(second.scene)).not.toThrow()
  })
})
