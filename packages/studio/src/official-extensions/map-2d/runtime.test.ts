import { expect, it } from 'bun:test'
import { PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { sceneSolidAt } from '@sistemazero/core/studio/pinta-scene-runtime'
import type { ExtensionBootstrapContext } from '#extensions'
import { compileStatements } from '#generators'
import { VILA_SCENE_ASSETS } from '../../examples/pintaScenes.generated'
import { gameTwoDRuntime } from '../game-2d/runtime'
import { gameKitRuntime } from '../game-2d-advanced/runtime'
import {
  MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS,
  MAP_TWO_D_WITHOUT_SCENE_VARIANT,
  mapTwoDBootstrap,
  mapTwoDBootstrapVariant,
} from './bootstrap'
import type { MapTwoDApi } from './contract'
import { pintaSceneExample } from './examples'
import { mapTwoDSource } from './runtime'

const scene = {
  version: 1,
  name: 'vila',
  id: 'vila',
  tileSize: 16,
  cols: 2,
  rows: 2,
  tilesets: [
    { id: 'ts', name: 'ts', image: 'pixels', columns: 1, count: 1, solid: [0], platform: [] },
  ],
  layers: [
    { id: 'g', kind: 'group', name: 'Grupo', visible: true, opacity: 0.5 },
    {
      id: 't',
      kind: 'tiles',
      parentId: 'g',
      name: 'Chão',
      visible: true,
      tilesetId: 'ts',
      cells: [4096, -1, -1, -1],
    },
    {
      id: 'o',
      kind: 'objects',
      name: 'Objetos',
      visible: true,
      objects: [
        {
          id: 's',
          name: 'Início',
          type: '',
          role: 'start',
          x: 24,
          y: 24,
          width: 0,
          height: 0,
          properties: {},
        },
        {
          id: 'a',
          name: 'Área',
          type: '',
          role: 'trigger',
          shape: 'ellipse',
          x: 16,
          y: 16,
          width: 16,
          height: 16,
          properties: { vida: { type: 'int', value: 3 } },
        },
      ],
    },
  ],
}
/**
 * O canvas nativo é opcional: sem `@napi-rs/canvas` instalado só os casos que LEEM PIXELS
 * ficam de fora, com aviso à vista. A lógica (grade, colisão, objetos, eventos) roda sempre,
 * com um contexto de mentira.
 */
type CanvasNativo = typeof import('@napi-rs/canvas')
const nativo: CanvasNativo | null = await import('@napi-rs/canvas').catch(() => null)
if (!nativo)
  console.warn(
    '[map-2d] @napi-rs/canvas não está instalado: os casos que leem pixels foram PULADOS. Os outros rodam com um contexto de mentira.',
  )

function contextoDeMentira() {
  const desenhos: number[][] = []
  return {
    desenhos,
    canvas: { width: 32, height: 32 },
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {},
    setTransform() {},
    drawImage(_img: unknown, ...a: number[]) {
      desenhos.push(a)
    },
  }
}

function tocador(
  ctx: unknown,
  folha: unknown,
  extras: Record<string, unknown> = {},
): { api: MapTwoDApi; grades: number[][][]; colisoes: () => number } {
  const grades: number[][][] = []
  let colisoes = 0
  const api = new Function(`${mapTwoDSource};return createMap2D;`)()({
    meta: () => ({ scene }),
    context: () => ctx,
    width: () => 32,
    height: () => 32,
    camera: () => ({ x: 0, y: 0 }),
    screen: () => {},
    image: () => folha,
    warn: (message: string) => {
      throw new Error(message)
    },
    collision: (_name: string, _scene: unknown, rows: number[][]) => {
      grades.push(rows)
      return rows
    },
    collide: () => colisoes++,
    ...extras,
  }) as MapTwoDApi
  return { api, grades, colisoes: () => colisoes }
}

it('os exemplos dos dois motores leem referências, imagem, camada e peça do cenário real', () => {
  for (const target of ['g2d', 'gk'] as const) {
    const example = pintaSceneExample(target)
    const map = example.assets?.find((asset) => asset.id === 'vila-e-floresta')
    expect(map?.scene).toBeDefined()
    const { api } = tocador(null, null, { meta: () => ({ scene: map!.scene }) })
    api.createMapScene('mapa', 'vila-e-floresta')
    expect(api.mapObjectById('mapa', 'door')?.name).toBe('Porta da cabana')
    expect(api.mapResourceImage('mapa', 'morador')?.startsWith('data:image/')).toBe(true)
    expect(api.mapLayerProperty('mapa', 'layer-0', 'descricao')).toBe('Chão da vila')
    expect(api.mapTileProperty('mapa', 'vila-pecas', 0, 'atrito')).toBe(0.8)
  }
})

it('scene references resolve inside their map without changing legacy property values', () => {
  const first = PintaSceneSchema.parse(scene)
  first.layers[0] = {
    ...first.layers[0]!,
    properties: { lives: { type: 'int', value: 0 } },
  }
  const ts = first.tilesets[0]!
  ts.tileProperties = {
    '0': { allowed: false, empty: '', related: { type: 'object', value: 'a' } },
  }
  const withArt = { ...first, art: [{ id: 'private', image: 'first.png', width: 16, height: 16 }] }
  const second = { ...withArt, id: 'second', art: [{ ...withArt.art[0], image: 'second.png' }] }
  const { api } = tocador(null, null, {
    meta: (name: string) => ({ scene: name === 'second' ? second : withArt }),
  })
  api.createMapScene('one', 'first')
  api.createMapScene('two', 'second')
  expect(api.mapResourceImage('one', 'private')).toBe('first.png')
  expect(api.mapResourceImage('two', 'private')).toBe('second.png')
  expect(api.mapResourceImage('one', 'ts')).toBe('pixels')
  expect(api.mapResourceImage('one', '__proto__')).toBeNull()
  const related = api.mapTileProperty('one', 'ts', 0, 'related')
  expect(related).toBe('a')
  expect(api.mapObjectById('one', String(related))?.name).toBe('Área')
  expect(api.mapObjectById('one', 'missing')).toBeNull()
  expect(api.mapLayerProperty('one', 'g', 'lives')).toBe(0)
  expect(api.mapLayerProperty('one', 'missing', 'lives')).toBeNull()
  expect(api.mapTileProperty('one', 'ts', 0, 'allowed')).toBe(false)
  expect(api.mapTileProperty('one', 'ts', 0, 'empty')).toBe('')
  expect(api.mapTileProperty('one', 'ts', 0, 'toString')).toBeNull()
  for (const invalid of [-1, 1, 0.5, Number.NaN])
    expect(api.mapTileProperty('one', 'ts', invalid, 'allowed')).toBeNull()
  expect(withArt.art[0]!.image).toBe('first.png')
})

for (const target of ['g2d', 'gk'] as const) {
  it(`${target}: o exemplo da Vila executa as referências e propriedades dos blocos novos`, async () => {
    const namespace = target === 'g2d' ? 'SZGame2D' : 'SZGameKit'
    const metadata = Object.fromEntries(VILA_SCENE_ASSETS.map((asset) => [asset.name, asset]))
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: metadata,
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const start = pintaSceneExample(target).ir.behavior.start.filter(
      (statement) =>
        statement.type === `${target}:sceneCommand` ||
        statement.type === 'var' ||
        statement.type === 'consoleLog',
    )
    const messages: unknown[] = []
    const run = new Function(
      namespace,
      'console',
      `${compileStatements(start, 0)}\nreturn { portaDoMorador, imagemDoMorador };`,
    )
    const result = run(win[namespace], { log: (value: unknown) => messages.push(value) })
    expect(result.portaDoMorador.id).toBe('door')
    expect(result.portaDoMorador.name).toBe('Porta da cabana')
    expect(result.imagemDoMorador).toBe(metadata['vila-e-floresta']?.scene?.art?.[0]?.image)
    expect(result.imagemDoMorador).toStartWith('data:image/png;base64,')
    expect(messages).toEqual(['Porta da cabana', 1, 'Porta da cabana', 'vila', 0.8])
  })

  it(`${target}: plataforma precisa conserva o piso pequeno, salto e apoio`, async () => {
    const precise = PintaSceneSchema.parse({
      ...scene,
      version: 3,
      cols: 16,
      rows: 12,
      tilesets: [{ ...scene.tilesets[0], solid: [], platform: [0] }],
      layers: [
        {
          id: 'objects',
          kind: 'objects',
          name: 'Objetos',
          visible: true,
          offsetY: 0.25,
          objects: [
            {
              id: 'floor',
              name: 'Piso pequeno',
              type: '',
              shape: 'set',
              setId: 'set',
              x: 40,
              y: 40,
              width: 4,
              height: 2,
              properties: {},
            },
          ],
        },
      ],
      sets: [
        {
          id: 'set',
          cols: 1,
          rows: 1,
          layers: [
            {
              id: 'cells',
              kind: 'tiles',
              name: 'Piso',
              visible: true,
              tilesetId: 'ts',
              cells: [0],
            },
          ],
        },
      ],
    })
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: { precise: { scene: precise } },
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
    api.createMapScene('map', 'precise')
    const falling = {
      x: 40,
      y: 100,
      w: 4,
      h: 4,
      vx: 0,
      vy: 90,
      _prevX: 40,
      _prevY: 10,
      onGround: false,
    }
    api.collideMapScene(falling, 'map')
    expect(falling.y).toBeCloseTo(36.25, 7)
    expect(falling.vy).toBe(0)
    expect(falling.onGround).toBe(true)
    falling.onGround = false
    api.collideMapScene(falling, 'map')
    expect(falling.onGround).toBe(true)
    const rising = { x: 40, y: 10, w: 4, h: 4, vx: 0, vy: -90, _prevX: 40, _prevY: 100 }
    api.collideMapScene(rising, 'map')
    expect(rising.y).toBe(10)
    if (target === 'gk') {
      const dropping = {
        x: 40,
        y: 100,
        w: 4,
        h: 4,
        vx: 0,
        vy: 90,
        _prevX: 40,
        _prevY: 10,
        _dropT: 0.25,
        onGround: false,
      }
      api.collideMapScene(dropping, 'map')
      expect(dropping.y).toBe(100)
      expect(dropping.onGround).toBe(false)
    } else {
      const setGravity = Reflect.get(api, 'setGravity')
      expect(typeof setGravity).toBe('function')
      setGravity(-0.6)
      const inverted = {
        x: 40,
        y: 10,
        w: 4,
        h: 4,
        vx: 0,
        vy: -90,
        _prevX: 40,
        _prevY: 100,
        onGround: false,
      }
      api.collideMapScene(inverted, 'map')
      expect(inverted.y).toBeCloseTo(42.25, 7)
      expect(inverted.onGround).toBe(true)
    }
  })
  it(`${target}: cena 3 não atravessa contornos finos e preserva a curva livre`, async () => {
    const precise = PintaSceneSchema.parse({
      ...scene,
      version: 3,
      cols: 16,
      rows: 12,
      layers: [
        {
          id: 'walls',
          kind: 'objects',
          name: 'Paredes',
          visible: true,
          objects: [
            {
              id: 'line',
              name: '',
              type: '',
              shape: 'polyline',
              x: 40,
              y: 0,
              width: 0,
              height: 100,
              points: [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
              ],
              collision: true,
              properties: {},
            },
            {
              id: 'ellipse',
              name: '',
              type: '',
              shape: 'ellipse',
              x: 64,
              y: 16,
              width: 32,
              height: 16,
              collision: true,
              properties: {},
            },
          ],
        },
      ],
    })
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: { precise: { scene: precise } },
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
    api.createMapScene('map', 'precise')
    const sprite = { x: 100, y: 20, w: 10, h: 10, vx: 90, vy: 0, _prevX: 10, _prevY: 20 }
    api.collideMapScene(sprite, 'map')
    expect(sprite.x).toBeCloseTo(30, 6)
    expect(sprite.vx).toBe(0)
    const free = { x: 64, y: 16, w: 1, h: 1, vx: 0, vy: 0, _prevX: 64, _prevY: 16 }
    api.collideMapScene(free, 'map')
    expect(free.x).toBe(64)
    expect(free.y).toBe(16)
    // Removing the explicit opt-in keeps the published scene 2 interpretation.
    precise.version = 2
    for (const layer of precise.layers)
      if (layer.kind === 'objects') for (const object of layer.objects) delete object.collision
    api.createMapScene('old', 'precise')
    const legacy = { x: 100, y: 20, w: 10, h: 10, vx: 90, vy: 0, _prevX: 10, _prevY: 20 }
    api.collideMapScene(legacy, 'old')
    expect(legacy.x).toBe(100)
  })
  it(`${target}: destinos antigos mantêm a ordem de busca entre nomes de cena e IDs`, async () => {
    const named = { ...scene, name: 'cabana' }
    const byId = { ...scene, id: 'cabana', name: 'outra-cena', cols: 1, rows: 1, layers: [] }
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: { primeiro: { scene: named }, segundo: { scene: byId } },
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
    api.createMapScene('mapa', 'cabana')
    expect(api.mapSize('mapa', 'width')).toBe(32)
  })

  it(`${target}: uma imagem comum não encobre o ID do mapa de destino`, async () => {
    const destination = {
      ...scene,
      id: 'cabana',
      name: 'cabana-nativa',
      cols: 1,
      rows: 1,
      layers: [],
    }
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: { cabana: {}, 'cabana-2': { scene: destination } },
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
    api.createMapScene('mapa', 'cabana')
    expect(api.mapSize('mapa', 'width')).toBe(16)
  })

  it(`${target}: portas preferem IDs sem mudar a escolha por nome dos blocos antigos`, async () => {
    const destination = {
      ...scene,
      id: 'cabana',
      name: 'cabana-nativa',
      cols: 1,
      rows: 1,
      layers: [],
    }
    const win: Record<string, unknown> = {
      addEventListener() {},
      performance: { now: () => 0 },
      devicePixelRatio: 1,
      __SZGAME_ASSETS: {},
      __SZGAME_ASSET_META: { cabana: { scene }, 'cabana-2': { scene: destination } },
    }
    new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(win, () => 0)
    const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
    api.createMapScene('mapa', 'cabana')
    expect(api.mapSize('mapa', 'width')).toBe(32)
    api.useMapDoor(
      'mapa',
      { x: 0, y: 0, w: 1, h: 1 },
      {
        id: 'legacy',
        name: 'Porta antiga',
        type: '',
        role: 'door',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        properties: { destino: 'cabana' },
      },
    )
    expect(api.mapSize('mapa', 'width')).toBe(32)
    api.useMapDoor(
      'mapa',
      { x: 0, y: 0, w: 1, h: 1 },
      {
        id: 'door',
        name: 'Porta',
        type: '',
        role: 'door',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        properties: { destino: { type: 'asset', value: 'cabana' } },
      },
    )
    expect(api.mapSize('mapa', 'width')).toBe(16)
  })
}

it('object references inside two instances resolve to the corresponding set child', () => {
  const sample = PintaSceneSchema.parse(scene)
  const local = {
    id: 'child',
    name: 'Child',
    type: '',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    properties: { sibling: { type: 'object' as const, value: 'sibling' } },
  }
  sample.sets = [
    {
      id: 'set',
      cols: 1,
      rows: 1,
      layers: [
        {
          id: 'children',
          name: 'Children',
          kind: 'objects',
          visible: true,
          objects: [local, { ...local, id: 'sibling', name: 'Sibling', properties: {} }],
        },
      ],
    },
  ]
  sample.layers = [
    {
      id: 'instances',
      name: 'Instances',
      kind: 'objects',
      visible: true,
      objects: ['left', 'right'].map((id, x) => ({
        id,
        name: id,
        type: '',
        shape: 'set',
        setId: 'set',
        x: x * 16,
        y: 0,
        width: 16,
        height: 16,
        properties: {},
      })),
    },
  ]
  const { api } = tocador(null, null, { meta: () => ({ scene: sample }) })
  api.createMapScene('map', 'fixture')
  for (const id of ['left', 'right']) {
    const child = api.mapObjectById('map', `${id}/child`)
    const ref = api.mapObjectProperty(child, 'sibling')
    expect(ref).toBe(`${id}/sibling`)
    expect(api.mapObjectById('map', String(ref))?.x).toBe(id === 'left' ? 0 : 16)
  }
})

it('scene 2 animates the selected sequence in both JavaScript game engines', () => {
  const sample = PintaSceneSchema.parse({
    ...scene,
    version: 2,
    art: [
      {
        id: 'tree',
        image: 'tree',
        width: 32,
        height: 32,
        sprite: {
          frameWidth: 16,
          frameHeight: 16,
          columns: 2,
          animations: [
            { id: 'idle', name: 'Parado', loop: true, frames: [{ tile: 0, duration: 100 }] },
            {
              id: 'wind',
              name: 'Vento',
              loop: false,
              frames: [
                { tile: 2, duration: 100 },
                { tile: 3, duration: 100 },
              ],
            },
          ],
        },
      },
    ],
    layers: [
      {
        id: 'objects',
        kind: 'objects',
        name: 'Árvores',
        visible: true,
        objects: [
          {
            id: 'tree-object',
            name: 'Árvore',
            type: '',
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            properties: {},
            art: { assetId: 'tree', animationId: 'wind' },
          },
        ],
      },
    ],
  })
  for (const elapsed of [0, 150, 10000]) {
    const ctx = contextoDeMentira()
    const realNow = Date.now
    let now = 1000
    Date.now = () => now
    try {
      const { api } = tocador(
        ctx,
        { complete: true, naturalWidth: 32 },
        { meta: () => ({ scene: sample }) },
      )
      api.createMapScene('map', 'asset')
      now += elapsed
      api.drawMapScene('map', 'back')
      expect(ctx.desenhos.at(-1)).toEqual([elapsed < 100 ? 0 : 16, 16, 16, 16, 0, 0, 16, 16])
    } finally {
      Date.now = realNow
    }
  }
})

// Proposta aprovada em 21/11/2026 (regiões, parte 2D): o tocador desenha só os objetos perto da
// câmera, como já fazia com as peças. Só o desenho muda: áreas, colisão e animação seguem iguais.
it('objects far from the camera are not drawn, and a rotation that brings one into view keeps it', () => {
  const tree = (id: string, x: number, rotation = 0) => ({
    id,
    name: id,
    type: '',
    x,
    y: 0,
    width: 16,
    height: 16,
    rotation,
    properties: {},
    art: { assetId: 'tree' },
  })
  const sample = PintaSceneSchema.parse({
    ...scene,
    version: 2,
    art: [{ id: 'tree', image: 'tree', width: 16, height: 16 }],
    layers: [
      {
        id: 'objects',
        kind: 'objects',
        name: 'Árvores',
        visible: true,
        objects: [
          tree('na-tela', 0),
          tree('longe-a-direita', 500),
          tree('longe-a-esquerda', -100),
          // Girada 180° em volta da origem: a caixa cobre x de 24 a 40, e a tela tem 32.
          tree('girada-para-dentro', 40, 180),
        ],
      },
    ],
  })
  const drawn = (camera: { x: number; y: number }) => {
    const ctx = contextoDeMentira()
    const { api } = tocador(
      ctx,
      { complete: true, naturalWidth: 16 },
      { meta: () => ({ scene: sample }), camera: () => camera },
    )
    api.createMapScene('map', 'asset')
    api.drawMapScene('map', 'back')
    return ctx.desenhos.length
  }
  expect(drawn({ x: 0, y: 0 })).toBe(2)
  // A câmera andou até o objeto da direita: agora só ele está perto.
  expect(drawn({ x: 480, y: 0 })).toBe(1)
})

it('tile objects animate in scene 2 while published scene 1 keeps its static behavior', () => {
  for (const version of [1, 2]) {
    const sample = PintaSceneSchema.parse({
      ...scene,
      version,
      tilesets: [
        {
          ...scene.tilesets[0],
          columns: 2,
          count: 2,
          animations: {
            0: [
              { tile: 0, duration: 16 },
              { tile: 1, duration: 10000 },
            ],
          },
        },
      ],
      layers: [
        {
          id: 'objects',
          kind: 'objects',
          name: 'Objects',
          visible: true,
          objects: [
            {
              id: 'tile-object',
              name: 'Tree',
              type: '',
              x: 0,
              y: 0,
              width: 16,
              height: 16,
              properties: {},
              art: { assetId: 'ts', tile: 0 },
            },
          ],
        },
      ],
    })
    const ctx = contextoDeMentira(),
      realNow = Date.now
    let now = 1000
    Date.now = () => now
    try {
      const { api } = tocador(
        ctx,
        { complete: true, naturalWidth: 32 },
        { meta: () => ({ scene: sample }) },
      )
      api.createMapScene('map', 'asset')
      now += 100
      api.drawMapScene('map', 'back')
      expect(ctx.desenhos.at(-1)?.[0]).toBe(version === 2 ? 16 : 0)
    } finally {
      Date.now = realNow
    }
  }
})

it('a collision set scaled 2 by 2 fills every covered root cell', () => {
  const sample = PintaSceneSchema.parse({
    ...scene,
    cols: 8,
    rows: 8,
    sets: [
      {
        id: 'set',
        cols: 1,
        rows: 1,
        layers: [
          { id: 'tile', name: 'Tile', visible: true, kind: 'tiles', tilesetId: 'ts', cells: [0] },
        ],
      },
    ],
    layers: [
      {
        id: 'objects',
        kind: 'objects',
        name: 'Objects',
        visible: true,
        objects: [
          {
            id: 'copy',
            name: 'Copy',
            type: '',
            shape: 'set',
            setId: 'set',
            x: 16,
            y: 16,
            width: 32,
            height: 32,
            properties: {},
          },
        ],
      },
    ],
  })
  const { api, grades } = tocador(null, null, { meta: () => ({ scene: sample }) })
  api.createMapScene('map', 'asset')
  expect(grades[0]?.flat().filter((cell) => cell === 0)).toHaveLength(4)
})

it('set collision grids agree with sceneSolidAt for aligned scales, quarter turns, reflection and clipped bounds', () => {
  for (const rotation of [0, 90, 180, 270])
    for (const width of [32, 64, 96])
      for (const height of [32, 64])
        for (const flipX of [false, true])
          for (const flipY of [false, true]) {
            const sample = PintaSceneSchema.parse({
              ...scene,
              cols: 8,
              rows: 8,
              tilesets: [{ ...scene.tilesets[0], count: 2, platform: [1] }],
              sets: [
                {
                  id: 'set',
                  cols: 2,
                  rows: 2,
                  layers: [
                    {
                      id: 'tile',
                      name: 'Tile',
                      visible: true,
                      kind: 'tiles',
                      tilesetId: 'ts',
                      cells: [0, 1, -1, 0],
                    },
                  ],
                },
              ],
              layers: [
                {
                  id: 'ground',
                  name: 'Ground',
                  visible: true,
                  kind: 'tiles',
                  tilesetId: 'ts',
                  cells: Array(64).fill(1),
                },
                {
                  id: 'objects',
                  kind: 'objects',
                  name: 'Objects',
                  visible: true,
                  objects: [
                    {
                      id: 'copy',
                      name: 'Copy',
                      type: '',
                      shape: 'set',
                      setId: 'set',
                      x: 64,
                      y: 64,
                      width,
                      height,
                      rotation,
                      ...(flipX ? { flipX } : {}),
                      ...(flipY ? { flipY } : {}),
                      properties: {},
                    },
                  ],
                },
              ],
            })
            const { api, grades } = tocador(null, null, { meta: () => ({ scene: sample }) })
            api.createMapScene('map', 'asset')
            for (let r = 0; r < sample.rows; r++)
              for (let c = 0; c < sample.cols; c++)
                expect(
                  grades[0]![r]![c],
                  JSON.stringify({ rotation, width, height, flipX, flipY, c, r }),
                ).toBe(sceneSolidAt(sample, (c + 0.5) * 16, (r + 0.5) * 16) ? 0 : 1)
          }
})

it('monta a grade de colisão, os objetos e os eventos sem perder dados', () => {
  const ctx = contextoDeMentira()
  const { api, grades, colisoes } = tocador(ctx, { complete: true, naturalWidth: 16 })
  api.createMapScene('mapa', 'vila')
  api.drawMapScene('mapa', 'back')
  expect(ctx.desenhos).toHaveLength(1)
  expect(grades).toEqual([
    [
      [0, -1],
      [-1, -1],
    ],
  ])
  api.collideMapScene({ x: 20, y: 20, w: 2, h: 2 }, 'mapa')
  expect(colisoes()).toBe(1)
  expect(api.mapSpawn('mapa', 'x')).toBe(24)
  expect(api.mapSize('mapa', 'height')).toBe(32)
  const area = api.mapObjectNamed('mapa', 'Área')
  expect(api.mapObjectProperty(area, 'vida')).toBe(3)
  expect(api.mapInArea({ x: 23, y: 23, w: 2, h: 2 }, area)).toBe(true)
  let enters = 0
  api.mapArea('mapa', { x: 23, y: 23, w: 2, h: 2 }, 'trigger', () => enters++)
  api.drawMapScene('mapa', 'back')
  api.drawMapScene('mapa', 'back')
  expect(enters).toBe(1)
})

it('confere as áreas a cada quadro do host, sem depender do desenho, e para no reinício', () => {
  const fila: Array<() => void> = []
  const { api } = tocador(null, null, { frame: (step: () => void) => fila.push(step) })
  const quadro = () => {
    for (const step of fila.splice(0)) step()
  }
  api.createMapScene('mapa', 'vila')
  const corpo = { x: 0, y: 0, w: 2, h: 2 }
  let enters = 0
  api.mapArea('mapa', corpo, 'trigger', () => enters++)
  // Um relógio só, por mais eventos que o jogo registre.
  api.mapArea('mapa', corpo, 'start', () => {})
  expect(fila).toHaveLength(1)
  quadro()
  expect(enters).toBe(0)
  corpo.x = 23
  corpo.y = 23
  quadro()
  quadro()
  expect(enters).toBe(1)
  // Só a frente desenhada, ou só a colisão: o evento chega do mesmo jeito.
  corpo.x = 0
  api.collideMapScene(corpo, 'mapa')
  corpo.x = 23
  api.collideMapScene(corpo, 'mapa')
  expect(enters).toBe(2)
  ;(api as unknown as { reset: () => void }).reset()
  quadro()
  expect(fila).toHaveLength(0)
})

it('caminhos e pontos usam seu contorno, inclusive após rotação', () => {
  const { api } = tocador(null, null)
  const path = {
    id: 'trilha',
    shape: 'polyline',
    x: 10,
    y: 20,
    width: 20,
    height: 20,
    rotation: 90,
    properties: {},
    points: [
      { x: 0, y: 0 },
      { x: 20, y: 20 },
    ],
  }
  expect(api.mapInArea({ x: 0, y: 30, w: 0, h: 0 }, path)).toBe(true)
  expect(api.mapInArea({ x: -8, y: 22, w: 0, h: 0 }, path)).toBe(false)
  const point = { ...path, shape: 'point', rotation: 0, width: 0, height: 0 }
  expect(api.mapInArea({ x: 10.5, y: 20, w: 0, h: 0 }, point)).toBe(true)
  expect(api.mapInArea({ x: 12, y: 20, w: 0, h: 0 }, point)).toBe(false)
})

it.skipIf(!nativo)('compõe camadas, espelho e opacidade nos pixels', () => {
  if (!nativo) return
  const canvas = nativo.createCanvas(32, 32),
    sheet = nativo.createCanvas(16, 16),
    s = sheet.getContext('2d')
  s.fillStyle = 'red'
  s.fillRect(0, 0, 8, 16)
  s.fillStyle = 'green'
  s.fillRect(8, 0, 8, 16)
  Object.assign(sheet, { complete: true, naturalWidth: 16 })
  const { api } = tocador(canvas.getContext('2d'), sheet)
  api.createMapScene('mapa', 'vila')
  api.drawMapScene('mapa', 'back')
  expect(canvas.getContext('2d').getImageData(1, 1, 1, 1).data[1]).toBeGreaterThan(100)
  expect(canvas.getContext('2d').getImageData(1, 1, 1, 1).data[3]).toBe(128)
})

it('sem bloco de cenário o motor é o de sempre; com cenário há um teto absoluto', async () => {
  const old = { code: 'SZGame2D.clear();' } as ExtensionBootstrapContext,
    newCode = {
      code: 'const g=SZGame2D;g["createMapScene"]("mapa","vila");',
    } as ExtensionBootstrapContext
  // A chave reduzida não é vazia: `''` é a variante padrão do host, que tira o contexto.
  expect(mapTwoDBootstrapVariant(old)).toBe(MAP_TWO_D_WITHOUT_SCENE_VARIANT)
  expect(MAP_TWO_D_WITHOUT_SCENE_VARIANT).not.toBe('')
  expect(mapTwoDBootstrapVariant(newCode)).toBe('')
  expect(mapTwoDBootstrapVariant()).toBe('')
  expect(await mapTwoDBootstrap('g2d', old)).toBe(gameTwoDRuntime)
  expect(await mapTwoDBootstrap('gk', old)).toBe(gameKitRuntime)
  for (const target of ['g2d', 'gk'] as const) {
    const full = await mapTwoDBootstrap(target, newCode)
    expect(await mapTwoDBootstrap(target)).toBe(full)
    expect(() => new Function(full)).not.toThrow()
    expect(full.length).toBeLessThanOrEqual(MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS[target])
    // O teto não é folga solta: fica a menos de 3% do que o motor mede hoje.
    expect(full.length).toBeGreaterThan(MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS[target] * 0.97)
    expect(full).toContain('createMapScene:_map2d.createMapScene')
  }
})
