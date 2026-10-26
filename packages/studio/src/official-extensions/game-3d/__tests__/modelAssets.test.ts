import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import * as RealTHREE from 'three'
import { compileStatements } from '#generators'
import { type JSStatement, JSStatementSchema } from '#ir'
import { resolveBlockLevel } from '../../../blockly/blockLevels'
import { parseJS } from '../../../parsers/js'
import {
  GAME3D_CALL_ARITIES,
  GAME3D_SEMANTIC_DECLARATION_FIELDS,
  GAME3D_SEMANTIC_REFERENCE_FIELDS,
  GAME3D_START_ONLY_STATEMENT_TYPES,
} from '../../../three/game3dContract'
import flipbookFixture from '../../__tests__/three3d/molda-flipbook.json'
import skinFixture from '../../__tests__/three3d/molda-skinned.json'
import { gameKit3DExtension } from '../../game-3d-advanced'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from '../blocks'
import { gameThreeDExtension } from '../index'
import { gameThreeDRuntime } from '../runtime'

/**
 * Os dois blocos do lote 7 do Molda no kit iniciante: "Criar o objeto … com o
 * modelo" (.glb) e "Usar o céu 360°" (.hdr). A cadeia bloco⇄IR⇄código é coberta
 * pelo `blockAudit`; aqui ficam a forma exata do código gerado, a volta pela Ponte
 * com um TAMANHO que não é literal, os contratos e o runtime na parte SÍNCRONA
 * (o cubo de reserva nasce na hora; o parse do arquivo é assíncrono e depende do
 * addon, que só existe no navegador).
 */

const createModelFile: JSStatement = {
  type: 'g3d:createModelFile',
  varName: 'nave',
  worldVar: 'cena',
  asset: 'nave-cristal',
  size: 2,
}
const skyPhoto: JSStatement = { type: 'g3d:skyPhoto', worldVar: 'cena', asset: 'ceu-de-tarde' }

function gen(stmt: JSStatement): string {
  return compileStatements([stmt], 0).trim()
}

describe('modelo .glb e céu .hdr — cadeia', () => {
  it('gera as chamadas da API com o nome do asset entre aspas', () => {
    expect(gen(createModelFile)).toBe(
      'const nave = SZGame3D.createModelFile(cena, "nave-cristal", 2);',
    )
    expect(gen(skyPhoto)).toBe('SZGame3D.skyPhoto(cena, "ceu-de-tarde");')
  })

  it('a IR passa no schema e os dois estão nos contratos (declaração, referência, aridade, só no Ao iniciar)', () => {
    expect(JSStatementSchema.safeParse(createModelFile).success).toBe(true)
    expect(JSStatementSchema.safeParse(skyPhoto).success).toBe(true)
    expect(GAME3D_SEMANTIC_DECLARATION_FIELDS['g3d:createModelFile']).toEqual({
      field: 'varName',
      kind: 'object',
    })
    expect(GAME3D_SEMANTIC_REFERENCE_FIELDS['g3d:createModelFile']?.map((f) => f.field)).toEqual([
      'worldVar',
    ])
    expect(GAME3D_SEMANTIC_REFERENCE_FIELDS['g3d:skyPhoto']?.map((f) => f.field)).toEqual([
      'worldVar',
    ])
    expect(GAME3D_CALL_ARITIES.createModelFile).toBe(3)
    expect(GAME3D_CALL_ARITIES.skyPhoto).toBe(2)
    expect(GAME3D_START_ONLY_STATEMENT_TYPES.has('g3d:createModelFile')).toBe(true)
    expect(GAME3D_START_ONLY_STATEMENT_TYPES.has('g3d:skyPhoto')).toBe(true)
  })

  it('a Ponte lê o código de volta, inclusive com o tamanho vindo de uma variável', () => {
    const source = [
      'const cena = SZGame3D.createFullscreenScene("#0b1020");',
      'const tamanho = 3;',
      'const nave = SZGame3D.createModelFile(cena, "nave-cristal", tamanho);',
      'SZGame3D.skyPhoto(cena, "ceu-de-tarde");',
    ].join('\n')
    const statements = parseJS(source)
    const types = statements.map((s) => s.type)
    expect(types).toContain('g3d:createModelFile')
    expect(types).toContain('g3d:skyPhoto')
    const model = statements.find((s) => s.type === 'g3d:createModelFile')
    expect(model && 'size' in model ? model.size : null).toEqual({ type: 'var', name: 'tamanho' })
    expect(statements.some((s) => s.type === 'rawJS')).toBe(false)
  })

  it('os blocos existem, com seletor de asset filtrado pelo tipo, e moram nas gavetas certas', () => {
    const model = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_create_model_file')
    const sky = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_sky_photo')
    expect(model?.placement).toBe('start-only-command')
    expect(sky?.placement).toBe('start-only-command')
    const modelPicker = (model?.args0 as { name?: string }[] | undefined)?.find(
      (a) => a.name === 'MODEL',
    ) as { type: string; kind?: string; filter?: string } | undefined
    expect(modelPicker).toMatchObject({ type: 'field_asset_picker', kind: '3d', filter: 'model3d' })
    const skyPicker = (sky?.args0 as { name?: string }[] | undefined)?.find(
      (a) => a.name === 'PHOTO',
    ) as { type: string; kind?: string; filter?: string } | undefined
    expect(skyPicker).toMatchObject({
      type: 'field_asset_picker',
      kind: '3d',
      filter: 'environment3d',
    })
    // Família → seção da paleta (a árvore de `palette.ts`, montada na toolbox).
    type Item = { name?: string; type?: string; contents?: Item[] }
    const secao = (familia: string, nome: string) => {
      const fam = (gameThreeDToolboxCategory.contents as Item[] | undefined)?.find(
        (c) => c.name === familia,
      )
      const sec = fam?.contents?.find((c) => c.name === nome)
      return (sec?.contents ?? []).map((b) => b.type ?? '')
    }
    expect(secao('🧊 Objetos', 'Criar')).toContain('sz_g3d_create_model_file')
    expect(secao('🎬 Cena, céu e câmera', 'Céu e luz')).toContain('sz_g3d_sky_photo')
  })

  it('os addons do three entram no importmap do kit (mesma origem pinada do three)', () => {
    const imports = gameThreeDExtension.runtime.esmImports ?? {}
    expect(imports['three/addons/loaders/GLTFLoader.js']).toContain(
      '/examples/jsm/loaders/GLTFLoader.js',
    )
    expect(imports['three/addons/loaders/HDRLoader.js']).toContain(
      '/examples/jsm/loaders/HDRLoader.js',
    )
    // Cópias de modelo com ossos próprios: a MESMA URL pinada do Jogo 3D Avançado.
    expect(imports['three/addons/utils/SkeletonUtils.js']).toBe(
      gameKit3DExtension.runtime.esmImports?.['three/addons/utils/SkeletonUtils.js'] ?? 'ausente',
    )
    for (const url of Object.values(imports)) expect(url.startsWith(imports.three ?? '')).toBe(true)
  })
})

describe('runtime — a parte síncrona', () => {
  type Api = {
    createModelFile: (world: unknown, name: string, size: number) => unknown
    createGroup: () => unknown[]
    spawnCopy: (group: unknown, original: unknown, x: number, y: number, z: number) => unknown
    removeFromGroup: (group: unknown, item: unknown) => void
    setBackground: (world: unknown, color: string) => void
    setSky: (world: unknown, top: string, bottom: string) => void
    setColor: (object: unknown, color: string) => void
    setOpacity: (object: unknown, opacity: number) => void
    setMaterial: (object: unknown, kind: string) => void
    setTexture: (object: unknown, asset: string) => void
    skyPhoto: (world: unknown, name: string) => void
  }
  const warnings: string[] = []
  const warnSpy = spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  })
  afterEach(() => {
    warnings.length = 0
  })
  // Restaura no fim do arquivo (o registry do bun:test não isola por arquivo).
  const restore = () => warnSpy.mockRestore()
  process.on('beforeExit', restore)

  class FakeColor {
    constructor(public value: string) {}
    set(value: string) {
      this.value = value
      return this
    }
    copy(other: FakeColor) {
      this.value = other.value
      return this
    }
  }

  class FakeTexture {
    isTexture = true
    disposed = false
    magFilter: unknown = null
    needsUpdate = false
    constructor(public url = '') {}
    clone() {
      return new FakeTexture(this.url)
    }
    dispose() {
      this.disposed = true
    }
  }

  class FakeMaterial {
    visible = true
    color: FakeColor
    emissive = new FakeColor('#000000')
    metalness = 0
    roughness = 1
    transparent = false
    opacity = 1
    wireframe = false
    map: FakeTexture | null = null
    needsUpdate = false
    constructor(options: { color?: string } = {}) {
      this.color = new FakeColor(options.color ?? '#ffffff')
    }
    clone() {
      const copy = new FakeMaterial({ color: this.color.value })
      copy.emissive.copy(this.emissive)
      copy.metalness = this.metalness
      copy.roughness = this.roughness
      copy.transparent = this.transparent
      copy.opacity = this.opacity
      copy.wireframe = this.wireframe
      copy.map = this.map
      return copy
    }
  }

  class FakeGeometry {
    disposed = false
    userData: Record<string, unknown> = {}
    attributes = { position: { count: 3 } }
    dispose() {
      this.disposed = true
    }
  }

  class FakeNode {
    children: FakeNode[] = []
    userData: Record<string, unknown> = {}
    castShadow = false
    receiveShadow = false
    position = { set() {} }
    scale = { setScalar() {} }
    isMesh = false
    geometry: FakeGeometry | null = null
    material: FakeMaterial | null = null
    add(child: FakeNode) {
      this.children.push(child)
    }
    traverse(visitor: (node: FakeNode) => void) {
      visitor(this)
      for (const child of this.children) child.traverse(visitor)
    }
    clone() {
      const copy = new FakeNode()
      copy.isMesh = this.isMesh
      copy.geometry = this.geometry
      copy.material = this.material
      for (const child of this.children) copy.add(child.clone())
      return copy
    }
  }

  class FakeMesh extends FakeNode {
    override isMesh = true
    constructor(geometry: FakeGeometry, material: FakeMaterial) {
      super()
      this.geometry = geometry
      this.material = material
    }
    override clone() {
      const copy = new FakeMesh(
        this.geometry ?? new FakeGeometry(),
        this.material ?? new FakeMaterial(),
      )
      for (const child of this.children) copy.add(child.clone())
      return copy
    }
  }

  function importedScene(): FakeNode {
    const root = new FakeNode()
    root.add(new FakeMesh(new FakeGeometry(), new FakeMaterial({ color: '#224466' })))
    return root
  }

  function loadRuntime(assets3d: Record<string, { kind: string; dataUrl: string }>) {
    let startModelParse: (() => void) | null = null
    let signalModelParse: (() => void) | null = null
    const modelParseStarted = new Promise<void>((resolve) => {
      signalModelParse = resolve
    })
    let resolveHdrModule: ((module: unknown) => void) | null = null
    const hdrModule = new Promise((resolve) => {
      resolveHdrModule = resolve
    })
    let signalHdrParse: (() => void) | null = null
    const hdrParseStarted = new Promise<void>((resolve) => {
      signalHdrParse = resolve
    })
    const gltfModule = Promise.resolve({
      GLTFLoader: class {
        parse(_buffer: ArrayBuffer, _path: string, onLoad: (gltf: { scene: FakeNode }) => void) {
          startModelParse = () => onLoad({ scene: importedScene() })
          signalModelParse?.()
        }
      },
    })
    const source = gameThreeDRuntime
      .replace(/^import \* as THREE from 'three';\s*/, '')
      .replace("import('three/addons/loaders/GLTFLoader.js')", 'window.__gltfModule')
      .replace("import('three/addons/loaders/HDRLoader.js')", 'window.__hdrModule')
    const THREE = {
      BoxGeometry: FakeGeometry,
      Color: FakeColor,
      MeshStandardMaterial: FakeMaterial,
      Mesh: FakeMesh,
      NearestFilter: 9728,
      TextureLoader: class {
        load(url: string) {
          return new FakeTexture(url)
        }
      },
    }
    const win = {
      addEventListener() {},
      SZGame3D: undefined,
      __SZGAME_ASSETS: { pele: 'data:image/png;base64,AAAA' },
      __SZGAME_ASSETS_3D: assets3d,
      __gltfModule: gltfModule,
      __hdrModule: hdrModule,
      performance: { now: () => 0 },
      devicePixelRatio: 1,
    } as unknown as Record<string, unknown>
    const doc = { addEventListener() {}, getElementById: () => null }
    new Function('THREE', 'window', 'document', source)(THREE, win, doc)
    return {
      api: win.SZGame3D as Api,
      modelParseStarted,
      /** Termina o parse; o modelo sai depois de o SkeletonUtils (import real) chegar. */
      async completeModel() {
        if (!startModelParse) throw new Error('o parse do modelo ainda não começou')
        startModelParse()
        for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0))
      },
      hdrParseStarted,
      completeHdrModule() {
        if (!resolveHdrModule) throw new Error('o carregador HDR já foi resolvido')
        const resolve = resolveHdrModule
        resolveHdrModule = null
        resolve({
          HDRLoader: class {
            parse() {
              signalHdrParse?.()
              return new FakeTexture('ceu-hdr')
            }
          },
        })
      },
    }
  }

  function loadApi(assets3d: Record<string, { kind: string; dataUrl: string }>): Api {
    return loadRuntime(assets3d).api
  }

  const fakeWorld = (): {
    scene: {
      add: () => void
      background: FakeColor | FakeTexture | null
      environment: FakeTexture | null
    }
    _objects: unknown[]
    _listeners: unknown[]
  } => ({
    scene: { add() {}, background: null, environment: null },
    _objects: [],
    _listeners: [],
  })

  it('createModelFile devolve o cubo de reserva NA HORA, registrado na cena, e avisa quando o modelo não está no projeto', () => {
    const api = loadApi({})
    const world = fakeWorld()
    const mesh = api.createModelFile(world, 'nave-cristal', 2) as {
      userData: { sz: { hw: number; modelFile: string } }
      _szWorld: unknown
    }
    expect(mesh).not.toBeNull()
    expect(world._objects).toHaveLength(1)
    expect(mesh._szWorld).toBe(world)
    expect(mesh.userData.sz.hw).toBe(1)
    expect(mesh.userData.sz.modelFile).toBe('nave-cristal')
    expect(warnings.some((w) => w.includes('o modelo "nave-cristal" não está no projeto'))).toBe(
      true,
    )
  })

  it('com o asset presente, o cubo nasce sem aviso e o parse fica para o addon (assíncrono)', () => {
    const api = loadApi({
      'nave-cristal': {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const mesh = api.createModelFile(world, 'nave-cristal', 4) as {
      userData: { sz: { hh: number } }
    }
    expect(world._objects).toHaveLength(1)
    expect(mesh.userData.sz.hh).toBe(2)
    expect(warnings.filter((w) => w.includes('não está no projeto'))).toEqual([])
  })

  it('sem nome escolhido, avisa uma vez e ainda devolve o cubo', () => {
    const api = loadApi({})
    const world = fakeWorld()
    expect(api.createModelFile(world, '', 1)).not.toBeNull()
    api.createModelFile(world, '', 1)
    expect(warnings.filter((w) => w.includes('escolha um modelo 3D'))).toHaveLength(1)
    expect(world._objects).toHaveLength(2)
  })

  it('skyPhoto avisa quando o céu não está no projeto (ou é um modelo) e não mexe na cena', () => {
    const api = loadApi({
      'nave-cristal': {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    api.skyPhoto(world, 'ceu-de-tarde')
    api.skyPhoto(world, 'nave-cristal')
    expect(warnings.filter((w) => w.includes('não está no projeto'))).toHaveLength(2)
    expect(world.scene.background).toBeNull()
  })

  it('reaplica no GLB a aparência definida enquanto o cubo de reserva estava visível', async () => {
    const runtime = loadRuntime({
      'nave-cristal': {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const mesh = runtime.api.createModelFile(world, 'nave-cristal', 2) as FakeMesh
    runtime.api.setColor(mesh, '#ff00aa')
    runtime.api.setTexture(mesh, 'pele')
    runtime.api.setMaterial(mesh, 'metal')
    runtime.api.setOpacity(mesh, 0.4)

    await runtime.modelParseStarted
    await runtime.completeModel()

    const imported = mesh.children[0]?.children[0]
    expect(imported?.material?.color.value).toBe('#ff00aa')
    expect(imported?.material?.map?.url).toBe('data:image/png;base64,AAAA')
    expect(imported?.material?.metalness).toBe(1)
    expect(imported?.material?.roughness).toBe(0.25)
    expect(imported?.material?.transparent).toBe(true)
    expect(imported?.material?.opacity).toBe(0.4)
  })

  it('uma cópia num grupo criada durante a carga recebe o GLB quando o parse termina', async () => {
    const runtime = loadRuntime({
      nave: {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const original = runtime.api.createModelFile(world, 'nave', 2) as FakeMesh
    await runtime.modelParseStarted
    const grupo = runtime.api.createGroup()
    const copy = runtime.api.spawnCopy(grupo, original, 4, 0, 0) as FakeMesh

    await runtime.completeModel()

    expect(original.children[0]?.children[0]?.isMesh).toBe(true)
    expect(copy.children[0]?.children[0]?.isMesh).toBe(true)
  })

  it('tirar do grupo durante a carga cancela o encaixe tardio do GLB', async () => {
    const runtime = loadRuntime({
      nave: {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const original = runtime.api.createModelFile(world, 'nave', 2) as FakeMesh
    await runtime.modelParseStarted
    const grupo = runtime.api.createGroup()
    const copy = runtime.api.spawnCopy(grupo, original, 4, 0, 0) as FakeMesh
    runtime.api.removeFromGroup(grupo, copy)

    await runtime.completeModel()

    expect(copy.children).toHaveLength(0)
  })

  it('uma carga HDR antiga não sobrescreve uma cor de fundo escolhida depois', async () => {
    const runtime = loadRuntime({
      'ceu-de-tarde': {
        kind: 'environment3d',
        dataUrl: 'data:image/vnd.radiance;base64,Iz9SQURJQU5DRQ==',
      },
    })
    const world = fakeWorld()
    runtime.api.skyPhoto(world, 'ceu-de-tarde')
    runtime.api.setBackground(world, '#123456')
    runtime.completeHdrModule()
    await runtime.hdrParseStarted

    const background = world.scene.background
    expect(background).toBeInstanceOf(FakeColor)
    if (!(background instanceof FakeColor)) throw new Error('o fundo deveria ser uma cor')
    expect(background.value).toBe('#123456')
    expect(world.scene.environment).toBeNull()
  })

  it('uma carga HDR antiga não sobrescreve um degradê escolhido depois', async () => {
    const runtime = loadRuntime({
      'ceu-de-tarde': {
        kind: 'environment3d',
        dataUrl: 'data:image/vnd.radiance;base64,Iz9SQURJQU5DRQ==',
      },
    })
    const world = fakeWorld()
    runtime.api.skyPhoto(world, 'ceu-de-tarde')
    runtime.api.setSky(world, '#112233', '#445566')
    runtime.completeHdrModule()
    await runtime.hdrParseStarted

    const background = world.scene.background
    expect(background).toBeInstanceOf(FakeColor)
    if (!(background instanceof FakeColor)) throw new Error('o fundo deveria ser uma cor')
    expect(background.value).toBe('#112233')
    expect(world.scene.environment).toBeNull()
  })
})

describe('runtime — modelo com ossos (fixture real do Molda, THREE de verdade)', () => {
  type Obj = RealTHREE.Mesh & {
    userData: { sz: { modelLoaded?: boolean; modelRoot?: RealTHREE.Object3D } }
  }
  type RealApi = {
    createScene: (canvasId: string) => unknown
    createModelFile: (world: unknown, name: string, size: number) => Obj
    createGroup: () => unknown[]
    spawnCopy: (group: unknown, original: unknown, x: number, y: number, z: number) => Obj
  }

  function skeletonsOf(root: RealTHREE.Object3D) {
    const meshes: RealTHREE.SkinnedMesh[] = []
    root.traverse((node) => {
      if (node instanceof RealTHREE.SkinnedMesh) meshes.push(node)
    })
    return meshes
  }

  it('modelo com ossos: cada objeto/cópia tem esqueleto independente', async () => {
    const win = {
      devicePixelRatio: 1,
      addEventListener() {},
      SZGame3D: undefined,
      __SZGAME_ASSETS_3D: { boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl } },
    } as unknown as Record<string, unknown>
    const doc = {
      getElementById: () => ({ width: 400, height: 300, addEventListener() {} }),
      addEventListener() {},
    }
    function FakeWebGLRenderer() {
      return {
        setPixelRatio() {},
        setSize() {},
        setAnimationLoop() {},
        dispose() {},
        forceContextLoss() {},
      }
    }
    const THREE = { ...RealTHREE, WebGLRenderer: FakeWebGLRenderer as unknown as new () => unknown }
    const source = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\s*/, '')
    new Function('THREE', 'window', 'document', source)(THREE, win, doc)
    const api = win.SZGame3D as RealApi
    const world = api.createScene('tela')
    const first = api.createModelFile(world, 'boneco', 2)
    const second = api.createModelFile(world, 'boneco', 2)
    for (
      let i = 0;
      i < 200 && !(first.userData.sz.modelLoaded && second.userData.sz.modelLoaded);
      i++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    expect(first.userData.sz.modelLoaded).toBe(true)
    const copy = api.spawnCopy(api.createGroup(), first, 3, 0, 0)
    const groups = [first, second, copy].map(skeletonsOf)
    expect(groups[0]).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      const [a, b, c] = groups.map((group) => group[i] as RealTHREE.SkinnedMesh)
      expect(new Set([a?.skeleton, b?.skeleton, c?.skeleton]).size).toBe(3)
      // Geometria do cache, compartilhada; ossos da árvore de cada um.
      expect(a?.geometry).toBe(b?.geometry as RealTHREE.BufferGeometry)
      expect(c?.geometry).toBe(a?.geometry as RealTHREE.BufferGeometry)
    }
    const copyNodes = new Set<RealTHREE.Object3D>()
    copy.traverse((node) => copyNodes.add(node))
    for (const mesh of groups[2] ?? [])
      for (const bone of mesh.skeleton.bones) expect(copyNodes.has(bone)).toBe(true)
    // Encaixe de sempre: o lado MAIOR do modelo vira o tamanho do bloco.
    const half = first.userData.sz as unknown as { hw: number; hh: number; hd: number }
    expect(Math.max(half.hw, half.hh, half.hd) * 2).toBeCloseTo(2)
  })
})

/**
 * Lote 6 do review 3D: o modelo do Molda ANIMA no Jogo 3D. Runtime de verdade, THREE de
 * verdade, GLTFLoader e SkeletonUtils de verdade, fixtures reais do Molda; só a GPU é
 * fronteira (renderer falso que guarda o laço para o teste dar os quadros na mão).
 */
describe('runtime — animação do modelo e pintura animada (fixtures reais do Molda)', () => {
  type Anim = {
    mixer: RealTHREE.AnimationMixer
    current(): string
    action(): RealTHREE.AnimationAction | null
  }
  type State = { modelLoaded?: boolean; modelRoot?: RealTHREE.Object3D; anim?: Anim | null }
  type Obj = RealTHREE.Mesh & { userData: { sz: State } }
  type World = { _animated?: Anim[] }
  type Api = {
    runProject(fn: () => void): void
    restart(): void
    createScene(canvasId: string): World
    createModelFile(world: unknown, name: string, size: number): Obj
    createGroup(): unknown[]
    spawnCopy(group: unknown, original: unknown, x: number, y: number, z: number): Obj
    removeFromGroup(group: unknown, item: unknown): void
    setTexture(obj: unknown, asset: string, repeat?: number): void
    playAnimation(obj: unknown, clip: string, mode: string): void
    stopAnimation(obj: unknown): void
    animationDone(obj: unknown): boolean
    animate(world: unknown, fn: () => void): void
  }

  const STEP_MS = 1000 / 16

  function boot(assets: Record<string, { kind: string; dataUrl: string }>) {
    const renderers: { loop: ((t: number) => void) | null }[] = []
    function FakeWebGLRenderer() {
      const r = {
        loop: null as ((t: number) => void) | null,
        shadowMap: {},
        setPixelRatio() {},
        setSize() {},
        setAnimationLoop(cb: ((t: number) => void) | null) {
          r.loop = cb
        },
        render() {},
        dispose() {},
        forceContextLoss() {},
      }
      renderers.push(r)
      return r
    }
    const canvas = { width: 400, height: 300, addEventListener() {}, setAttribute() {} }
    const win = {
      devicePixelRatio: 1,
      addEventListener() {},
      SZGame3D: undefined,
      __SZGAME_ASSETS: { grama: 'data:image/png;base64,AAAA' },
      __SZGAME_ASSETS_3D: assets,
    } as unknown as Record<string, unknown>
    const doc = { getElementById: () => canvas, addEventListener() {} }
    const THREE = { ...RealTHREE, WebGLRenderer: FakeWebGLRenderer as unknown as new () => unknown }
    const source = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\s*/, '')
    new Function('THREE', 'window', 'document', source)(THREE, win, doc)
    let t = 1000
    return {
      api: win.SZGame3D as Api,
      /** n quadros de 1/16 s em todas as cenas vivas (o laço corta d em 0,1 s). */
      frames(n: number) {
        for (let i = 0; i < n; i++) {
          t += STEP_MS
          for (const r of renderers) r.loop?.(t)
        }
      },
    }
  }

  async function loaded(...objs: Obj[]) {
    for (let i = 0; i < 400 && !objs.every((o) => o.userData.sz.modelLoaded); i++) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    for (const o of objs) expect(o.userData.sz.modelLoaded).toBe(true)
  }

  const skinned = { boneco: { kind: 'model3d', dataUrl: skinFixture.dataUrl } }
  const warnings: string[] = []
  let warnSpy: ReturnType<typeof spyOn> | null = null
  function watchWarnings() {
    warnings.length = 0
    warnSpy?.mockRestore()
    warnSpy = spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    })
  }
  afterEach(() => {
    warnSpy?.mockRestore()
    warnSpy = null
  })

  async function sceneWithHero() {
    const kit = boot(skinned)
    const world = kit.api.createScene('tela')
    kit.api.animate(world, () => {})
    const heroi = kit.api.createModelFile(world, 'boneco', 2)
    await loaded(heroi)
    return { kit, world, heroi }
  }

  it('cada objeto com modelo ganha um animador próprio, guardado fora do JSON do userData', async () => {
    const { world, heroi } = await sceneWithHero()
    const anim = heroi.userData.sz.anim
    expect(anim).toBeTruthy()
    expect(world._animated).toContain(anim as Anim)
    // O clone do Three copia o userData por JSON: mixer e modelo não podem entrar nele.
    expect(Object.keys(heroi.userData.sz)).not.toContain('anim')
    expect(Object.keys(heroi.userData.sz)).not.toContain('modelRoot')
    expect(() => JSON.stringify(heroi.userData)).not.toThrow()
  })

  it('tocar repetindo: a animação anda no laço da cena e nunca "termina"', async () => {
    const { kit, heroi } = await sceneWithHero()
    kit.api.playAnimation(heroi, 'Acenar', 'repetir')
    kit.frames(1)
    const anim = heroi.userData.sz.anim as Anim
    expect(anim.current()).toBe('Acenar')
    kit.frames(8)
    expect(anim.action()?.time ?? 0).toBeGreaterThan(0.3)
    // 2 s de clipe de 1 s, pedido a cada quadro (como no "A cada quadro"): continua sem rebobinar.
    for (let i = 0; i < 32; i++) {
      kit.api.playAnimation(heroi, 'Acenar', 'repetir')
      kit.frames(1)
    }
    expect(anim.action()?.isRunning()).toBe(true)
    expect(kit.api.animationDone(heroi)).toBe(false)
  })

  it('uma vez: chega ao fim, "terminou a animação?" vira verdadeiro e o pedido no laço não rebobina', async () => {
    const { kit, heroi } = await sceneWithHero()
    for (let i = 0; i < 24; i++) {
      kit.api.playAnimation(heroi, 'Esticar', 'uma-vez')
      kit.frames(1)
    }
    expect(kit.api.animationDone(heroi)).toBe(true)
    kit.api.playAnimation(heroi, 'Esticar', 'uma-vez')
    kit.frames(1)
    expect(kit.api.animationDone(heroi)).toBe(true)
    // Um pedido NOVO depois de uma pausa (tecla apertada de novo) toca outra vez.
    kit.frames(3)
    kit.api.playAnimation(heroi, 'Esticar', 'uma-vez')
    expect(kit.api.animationDone(heroi)).toBe(false)
  })

  it('parar desliga a animação; um nome que não existe avisa listando os clipes do modelo', async () => {
    const { kit, heroi } = await sceneWithHero()
    watchWarnings()
    kit.api.playAnimation(heroi, 'Acenar', 'repetir')
    kit.frames(2)
    kit.api.stopAnimation(heroi)
    expect(heroi.userData.sz.anim?.current()).toBe('')
    kit.api.playAnimation(heroi, 'Pular', 'repetir')
    expect(
      warnings.some((w) => w.includes('não tem a animação "Pular" (tem: Acenar, Esticar)')),
    ).toBe(true)
  })

  it('pedir antes de o modelo carregar: a animação começa quando ele chega', async () => {
    const kit = boot(skinned)
    const world = kit.api.createScene('tela')
    const heroi = kit.api.createModelFile(world, 'boneco', 2)
    kit.api.playAnimation(heroi, 'Acenar', 'repetir')
    await loaded(heroi)
    expect(heroi.userData.sz.anim?.current()).toBe('Acenar')
  })

  it('a cópia de grupo anima independente (mixer e ossos próprios) e o descarte libera o mixer', async () => {
    const { kit, world, heroi } = await sceneWithHero()
    kit.api.playAnimation(heroi, 'Acenar', 'repetir')
    kit.frames(4)
    const grupo = kit.api.createGroup()
    const copia = kit.api.spawnCopy(grupo, heroi, 3, 0, 0)
    const original = heroi.userData.sz.anim as Anim
    const propria = copia.userData.sz.anim as Anim
    expect(propria).toBeTruthy()
    expect(propria.mixer).not.toBe(original.mixer)
    // A cópia nasce tocando o que o molde pedia, do começo.
    expect(propria.current()).toBe('Acenar')
    kit.api.playAnimation(copia, 'Esticar', 'repetir')
    kit.frames(2)
    expect(propria.current()).toBe('Esticar')
    expect(original.current()).toBe('Acenar')
    expect(world._animated).toHaveLength(2)
    kit.api.removeFromGroup(grupo, copia)
    expect(world._animated).toEqual([original])
    expect(propria.mixer.stats.actions.total).toBe(0)
    expect(propria.current()).toBe('')
  })

  it('recomeçar descarta os mixers da partida e a partida nova anima de novo', async () => {
    const kit = boot(skinned)
    const herois: Obj[] = []
    kit.api.runProject(() => {
      const world = kit.api.createScene('tela')
      kit.api.animate(world, () => {})
      const heroi = kit.api.createModelFile(world, 'boneco', 2)
      kit.api.playAnimation(heroi, 'Acenar', 'repetir')
      herois.push(heroi)
    })
    await loaded(herois[0] as Obj)
    const antigo = (herois[0] as Obj).userData.sz.anim as Anim
    kit.frames(2)
    kit.api.restart()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(herois).toHaveLength(2)
    expect(antigo.mixer.stats.actions.total).toBe(0)
    await loaded(herois[1] as Obj)
    expect((herois[1] as Obj).userData.sz.anim?.current()).toBe('Acenar')
  })

  it('pintura animada: anda com o tempo da cena e volta ao 1º quadro no recomeçar', async () => {
    // O loader não decodifica PNG fora do navegador; no navegador a folha já existe no
    // parse e a cópia do material a COMPARTILHA. O teste reproduz isso: dá a textura ao
    // material do cache antes de o objeto clonar o seu.
    const sheet = new RealTHREE.Texture()
    const clone = RealTHREE.Material.prototype.clone
    RealTHREE.Material.prototype.clone = function (this: RealTHREE.Material) {
      const self = this as RealTHREE.Material & { map?: RealTHREE.Texture | null }
      if ((self.userData as { molda?: { flipbook?: unknown } }).molda?.flipbook && !self.map)
        self.map = sheet
      return clone.call(this)
    }
    try {
      const kit = boot({ pintado: { kind: 'model3d', dataUrl: flipbookFixture.dataUrl } })
      const objs: Obj[] = []
      kit.api.runProject(() => {
        const world = kit.api.createScene('tela')
        kit.api.animate(world, () => {})
        objs.push(kit.api.createModelFile(world, 'pintado', 1))
      })
      await loaded(objs[0] as Obj)
      const maps: (RealTHREE.Texture | null)[] = []
      ;(objs[0] as Obj).traverse((node) => {
        const material = (node as RealTHREE.Mesh).material as
          | (RealTHREE.MeshStandardMaterial & { userData: { molda?: { flipbook?: unknown } } })
          | undefined
        if (material?.userData?.molda?.flipbook) maps.push(material.map)
      })
      expect(maps).toEqual([sheet])
      const offset = () => [sheet.offset.x, sheet.offset.y]
      const step = (i: number) => flipbookFixture.steps[i]?.offset as number[]
      kit.frames(2)
      expect(offset()).toEqual(step(0))
      kit.frames(2)
      expect(offset()).toEqual(step(1))
      kit.frames(2)
      expect(offset()).toEqual(step(2))
      kit.api.restart()
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(offset()).toEqual(step(0))
    } finally {
      RealTHREE.Material.prototype.clone = clone
    }
  })

  it('"Vestir … repetindo N vezes": sRGB, repetição na textura e cache por imagem + repetição', () => {
    const kit = boot({})
    const world = kit.api.createScene('tela')
    const chao = kit.api.createModelFile(world, '', 1)
    const parede = kit.api.createModelFile(world, '', 1)
    const outro = kit.api.createModelFile(world, '', 1)
    kit.api.setTexture(chao, 'grama', 8)
    kit.api.setTexture(parede, 'grama')
    kit.api.setTexture(outro, 'grama', 8)
    const mapOf = (o: Obj) =>
      (o.material as RealTHREE.MeshStandardMaterial).map as RealTHREE.Texture
    expect(mapOf(chao).repeat.x).toBe(8)
    expect(mapOf(chao).repeat.y).toBe(8)
    expect(mapOf(chao).wrapS).toBe(RealTHREE.RepeatWrapping)
    expect(mapOf(chao).colorSpace).toBe(RealTHREE.SRGBColorSpace)
    expect(mapOf(parede).repeat.x).toBe(1)
    expect(mapOf(parede)).not.toBe(mapOf(chao))
    expect(mapOf(outro)).toBe(mapOf(chao))
  })
})

describe('blocos de animação e "repetindo" — cadeia', () => {
  it('geram a API e a Ponte lê de volta (inclusive a repetição como variável)', () => {
    const play: JSStatement = {
      type: 'g3d:modelAnimation',
      op: 'tocar',
      objVar: 'heroi',
      clip: 'Andar',
      mode: 'uma-vez',
    }
    const stop: JSStatement = { type: 'g3d:modelAnimation', op: 'parar', objVar: 'heroi' }
    expect(JSStatementSchema.safeParse(play).success).toBe(true)
    expect(gen(play)).toBe('SZGame3D.playAnimation(heroi, "Andar", "uma-vez");')
    expect(gen(stop)).toBe('SZGame3D.stopAnimation(heroi);')
    expect(
      gen({
        type: 'g3d:setTexture',
        objVar: 'chao',
        asset: 'grama',
        repeat: { type: 'num', value: 8 },
      }),
    ).toBe('SZGame3D.setTexture(chao, "grama", 8);')
    expect(gen({ type: 'g3d:setTexture', objVar: 'chao', asset: 'grama' })).toBe(
      'SZGame3D.setTexture(chao, "grama");',
    )
    const source = [
      'const cena = SZGame3D.createFullscreenScene("#0b1020");',
      'const heroi = SZGame3D.createModelFile(cena, "boneco", 2);',
      'const vezes = 4;',
      'SZGame3D.setTexture(heroi, "grama", vezes);',
      'SZGame3D.setTexture(heroi, "grama", 1);',
      'SZGame3D.playAnimation(heroi, "Andar", "repetir");',
      'SZGame3D.stopAnimation(heroi);',
      'if (SZGame3D.animationDone(heroi)) { SZGame3D.playAnimation(heroi, "Parado", "uma-vez"); }',
    ].join('\n')
    const statements = parseJS(source)
    expect(statements.some((s) => s.type === 'rawJS')).toBe(false)
    const textures = statements.filter((s) => s.type === 'g3d:setTexture')
    expect(textures.map((s) => ('repeat' in s ? s.repeat : undefined))).toEqual([
      { type: 'var', name: 'vezes' },
      undefined,
    ])
    expect(statements.filter((s) => s.type === 'g3d:modelAnimation')).toHaveLength(2)
    expect(JSON.stringify(statements)).toContain('"type":"g3d:animationDone"')
    // Modo inventado não cabe no bloco: fica como chamada em código, nunca vira outro modo.
    expect(parseJS('SZGame3D.playAnimation(heroi, "Andar", "sempre");')[0]?.type).not.toBe(
      'g3d:modelAnimation',
    )
  })

  it('aridades, contexto e degrau: tocar é núcleo; parar e "terminou?" sobem um degrau', () => {
    expect(GAME3D_CALL_ARITIES.playAnimation).toBe(3)
    expect(GAME3D_CALL_ARITIES.stopAnimation).toBe(1)
    expect(GAME3D_CALL_ARITIES.animationDone).toBe(1)
    expect(GAME3D_CALL_ARITIES.setTexture).toEqual([2, 3])
    expect(GAME3D_SEMANTIC_REFERENCE_FIELDS['g3d:modelAnimation']?.map((f) => f.field)).toEqual([
      'objVar',
    ])
    expect(GAME3D_START_ONLY_STATEMENT_TYPES.has('g3d:modelAnimation')).toBe(false)
    type Item = { name?: string; type?: string; contents?: Item[] }
    const objetos = (gameThreeDToolboxCategory.contents as Item[] | undefined)?.find(
      (c) => c.name === '🧊 Objetos',
    )
    const secoes = (objetos?.contents ?? []).map((c) => c.name)
    expect(secoes.indexOf('🎬 Animação do modelo')).toBe(secoes.indexOf('Criar') + 1)
    const animacao = objetos?.contents?.find((c) => c.name === '🎬 Animação do modelo')
    expect((animacao?.contents ?? []).map((b) => b.type)).toEqual([
      'sz_g3d_play_animation',
      'sz_g3d_stop_animation',
      'sz_g3d_animation_done',
    ])
    expect(resolveBlockLevel('sz_g3d_play_animation')).toBe('iniciante-3d')
    expect(resolveBlockLevel('sz_g3d_stop_animation')).toBe('intermediario-3d')
    expect(resolveBlockLevel('sz_g3d_animation_done')).toBe('intermediario-3d')
  })
})

describe('GAME3D_CALL_ARITIES só lista o que a Ponte lê', () => {
  it('everySeconds (o relógio cru, sem bloco) saiu; everySecondsLoop continua', async () => {
    const { GAME3D_CALL_ARITIES: arities } = await import('../../../three/game3dContract')
    expect(arities.everySeconds).toBeUndefined()
    expect(arities.everySecondsLoop).toBe(2)
    // Sem a entrada, a chamada fica como chamada genérica e volta inteira na Ponte.
    const { parseJS } = await import('../../../parsers/js')
    const { compileStatements } = await import('#generators')
    const code = 'if (SZGame3D.everySeconds("x", 2)) {\n  SZGame3D.addScore(1);\n}'
    expect(compileStatements(parseJS(code), 0)).toContain('SZGame3D.everySeconds("x", 2)')
  })
})
