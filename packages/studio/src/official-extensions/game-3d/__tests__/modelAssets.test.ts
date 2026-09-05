import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { compileStatements } from '#generators'
import { type JSStatement, JSStatementSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import {
  GAME3D_CALL_ARITIES,
  GAME3D_SEMANTIC_DECLARATION_FIELDS,
  GAME3D_SEMANTIC_REFERENCE_FIELDS,
  GAME3D_START_ONLY_STATEMENT_TYPES,
} from '../../../three/game3dContract'
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
    const modelPicker = model?.args0?.find((a) => a.name === 'MODEL') as
      | { type: string; kind?: string; filter?: string }
      | undefined
    expect(modelPicker).toMatchObject({ type: 'field_asset_picker', kind: '3d', filter: 'model3d' })
    const skyPicker = sky?.args0?.find((a) => a.name === 'PHOTO') as
      | { type: string; kind?: string; filter?: string }
      | undefined
    expect(skyPicker).toMatchObject({
      type: 'field_asset_picker',
      kind: '3d',
      filter: 'environment3d',
    })
    const gavetas = new Map(
      (gameThreeDToolboxCategory.contents ?? []).map((c) => [
        'name' in c ? c.name : '',
        'contents' in c ? (c.contents ?? []).map((b) => ('type' in b ? b.type : '')) : [],
      ]),
    )
    expect(gavetas.get('🧊 Formas & modelos')).toContain('sz_g3d_create_model_file')
    expect(gavetas.get('💡 Luz & céu')).toContain('sz_g3d_sky_photo')
  })

  it('os dois addons do three entram no importmap do kit (mesma origem pinada do three)', () => {
    const imports = gameThreeDExtension.runtime.esmImports ?? {}
    expect(imports['three/addons/loaders/GLTFLoader.js']).toContain(
      '/examples/jsm/loaders/GLTFLoader.js',
    )
    expect(imports['three/addons/loaders/HDRLoader.js']).toContain(
      '/examples/jsm/loaders/HDRLoader.js',
    )
    for (const url of Object.values(imports)) expect(url.startsWith(imports.three ?? '')).toBe(true)
  })
})

describe('runtime — a parte síncrona', () => {
  type Api = {
    createModelFile: (world: unknown, name: string, size: number) => unknown
    createSwarm: (world: unknown) => unknown
    spawnInSwarm: (swarm: unknown, original: unknown, x: number, y: number, z: number) => unknown
    removeFromSwarm: (swarm: unknown, item: unknown) => void
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
      completeModel() {
        if (!startModelParse) throw new Error('o parse do modelo ainda não começou')
        startModelParse()
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
    runtime.completeModel()

    const imported = mesh.children[0]?.children[0]
    expect(imported?.material?.color.value).toBe('#ff00aa')
    expect(imported?.material?.map?.url).toBe('data:image/png;base64,AAAA')
    expect(imported?.material?.metalness).toBe(1)
    expect(imported?.material?.roughness).toBe(0.25)
    expect(imported?.material?.transparent).toBe(true)
    expect(imported?.material?.opacity).toBe(0.4)
  })

  it('uma cópia de enxame criada durante a carga recebe o GLB quando o parse termina', async () => {
    const runtime = loadRuntime({
      nave: {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const original = runtime.api.createModelFile(world, 'nave', 2) as FakeMesh
    await runtime.modelParseStarted
    const swarm = runtime.api.createSwarm(world)
    const copy = runtime.api.spawnInSwarm(swarm, original, 4, 0, 0) as FakeMesh

    runtime.completeModel()

    expect(original.children[0]?.children[0]?.isMesh).toBe(true)
    expect(copy.children[0]?.children[0]?.isMesh).toBe(true)
  })

  it('remover do enxame durante a carga cancela o encaixe tardio do GLB', async () => {
    const runtime = loadRuntime({
      nave: {
        kind: 'model3d',
        dataUrl: 'data:model/gltf-binary;base64,Z2xURgIAAAAMAAAA',
      },
    })
    const world = fakeWorld()
    const original = runtime.api.createModelFile(world, 'nave', 2) as FakeMesh
    await runtime.modelParseStarted
    const swarm = runtime.api.createSwarm(world)
    const copy = runtime.api.spawnInSwarm(swarm, original, 4, 0, 0) as FakeMesh
    runtime.api.removeFromSwarm(swarm, copy)

    runtime.completeModel()

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
