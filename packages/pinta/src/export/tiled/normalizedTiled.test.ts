import { expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { sha256Hex } from '@sistemazero/core/creations'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { tiledMap } from './export'
import { importTiledScene, TiledImportError, tiledXmlToJson } from './import'
import { sceneToNative } from './native'

const directory = resolve(import.meta.dirname, '__fixtures__/tiled-normalized')
const image = async (path: string) =>
  `data:image/png;base64,${(await readFile(resolve(directory, path))).toString('base64')}`
const stored = JSON.parse(await readFile(resolve(directory, 'expected.json'), 'utf8')) as PintaScene
const expected: PintaScene = {
  ...stored,
  tilesets: await Promise.all(
    stored.tilesets.map(async (ts) => ({ ...ts, image: await image(ts.image) })),
  ),
}
const resolver = {
  text: (path: string) => readFile(resolve(directory, path), 'utf8'),
  image,
}

for (const file of ['normalized.tmj', 'normalized.tmx'])
  it(`conserva a cena inteira após a normalização real do Tiled em ${file}`, async () => {
    const text = await readFile(resolve(directory, file), 'utf8')
    const document = file.endsWith('.tmx') ? tiledXmlToJson(text) : JSON.parse(text)
    const imported = await importTiledScene(document, resolver)
    expect(imported.warnings).toEqual([])
    expect(imported.scene).toEqual(expected)
  })

interface ExportedFixture {
  tilesets: {
    firstgid: number
    properties: { name: string; value: unknown }[]
    wangsets: { properties: { name: string; value: unknown }[] }[]
  }[]
  layers: { data: number[] }[]
}
it('reserva o preenchimento físico do atlas no GID da próxima folha', async () => {
  const exported = (await tiledMap(expected)) as unknown as ExportedFixture
  expect(exported.tilesets[1]!.firstgid).toBe(7)
  expect(exported.layers[1]!.data[0]).toBe(7)
})

it('exporta o snapshot do atlas parcial e as regras de terreno que o Tiled omite', async () => {
  const exported = (await tiledMap(expected)) as unknown as ExportedFixture
  const atlas = exported.tilesets[0]!.properties.find((p) => p.name === 'pinta:atlas')
  expect(atlas).toBeDefined()
  expect(JSON.parse(String(atlas!.value))).toEqual({
    version: 1,
    count: 5,
    columns: 3,
    tileSize: 16,
    imageDataUrlSha256: await sha256Hex(expected.tilesets[0]!.image),
  })
  const empty = exported.tilesets[0]!.wangsets[0]!.properties.find(
    (p) => p.name === 'pinta:emptyTiles',
  )
  expect(empty).toBeDefined()
  expect(JSON.parse(String(empty!.value))).toEqual([0])
})

it('o exportador usa a entrada que foi validada pela ferramenta nativa', async () => {
  const source = JSON.parse(await readFile(resolve(directory, 'source.tmj'), 'utf8'))
  expect(await tiledMap(expected)).toEqual(source)
})

interface NativeProperty {
  name: string
  type: string
  value: unknown
}
interface NativeTile {
  id: number
  properties?: NativeProperty[]
  animation?: { tileid: number; duration: number }[]
}
interface NativeDocument {
  width: number
  height: number
  properties: NativeProperty[]
  layers: Record<string, unknown>[]
  tilesets: (Record<string, unknown> & {
    properties: NativeProperty[]
    tiles?: NativeTile[]
    wangsets: { properties: NativeProperty[]; wangtiles: { tileid: number; wangid: number[] }[] }[]
  })[]
}
const nativeDocument = async (): Promise<NativeDocument> =>
  JSON.parse(await readFile(resolve(directory, 'normalized.tmj'), 'utf8'))
function addTile(document: NativeDocument, tile: NativeTile): void {
  const tileset = document.tilesets[0]!
  tileset.tiles ??= []
  tileset.tiles.push(tile)
}
const mask = [0, 1, 0, 1, 0, 1, 0, 1]
const additions: readonly (readonly [string, (document: NativeDocument) => void])[] = [
  [
    'célula pintada',
    (document) => {
      ;(document.layers[0]!.data as number[])[4] = 6
    },
  ],
  [
    'arte de objeto',
    (document) => {
      document.layers.push({
        id: 3,
        type: 'objectgroup',
        draworder: 'index',
        name: 'New object',
        objects: [
          { id: 9, gid: 6, name: 'New tile', x: 0, y: 16, width: 16, height: 16, rotation: 0 },
        ],
      })
    },
  ],
  [
    'colisão',
    (document) => {
      addTile(document, {
        id: 5,
        properties: [{ name: 'solid', type: 'bool', value: true }],
      })
    },
  ],
  [
    'plataforma',
    (document) => {
      addTile(document, {
        id: 5,
        properties: [{ name: 'platform', type: 'bool', value: true }],
      })
    },
  ],
  [
    'propriedade de peça',
    (document) => {
      addTile(document, {
        id: 5,
        properties: [{ name: 'score', type: 'int', value: 2 }],
      })
    },
  ],
  [
    'quadro de animação',
    (document) => {
      addTile(document, {
        id: 0,
        animation: [{ tileid: 5, duration: 100 }],
      })
    },
  ],
  [
    'cabeçalho de animação',
    (document) => {
      addTile(document, {
        id: 5,
        animation: [{ tileid: 1, duration: 100 }],
      })
    },
  ],
  [
    'regra de terreno',
    (document) => {
      document.tilesets[0]!.wangsets[0]!.wangtiles.push({ tileid: 5, wangid: mask })
    },
  ],
  [
    'conjunto ainda não posicionado',
    (document) => {
      document.properties.push({
        name: 'pinta:sets',
        type: 'string',
        value: JSON.stringify([
          {
            id: 'saved-set',
            cols: 1,
            rows: 1,
            layers: [
              {
                kind: 'tiles',
                id: 'set-floor',
                name: 'Set floor',
                tilesetId: 'partial',
                visible: true,
                cells: [5],
              },
            ],
          },
        ]),
      })
    },
  ],
]
for (const [name, change] of additions)
  it(`conserva uma peça adicional usada em ${name}`, async () => {
    const document = await nativeDocument()
    change(document)
    const imported = await importTiledScene(document, resolver)
    expect(imported.warnings).toEqual([])
    expect(imported.scene.tilesets[0]!.count).toBe(6)
  })

it('não sobrescreve uma regra não nula criada no Tiled', async () => {
  const document = await nativeDocument()
  document.tilesets[0]!.wangsets[0]!.wangtiles.push({ tileid: 0, wangid: mask })
  const { scene } = await importTiledScene(document, resolver)
  expect(scene.tilesets[0]!.count).toBe(5)
  expect(scene.tilesets[0]!.terrains![0]!.tiles['0']).toEqual(mask)
})

it('conserva novos pixels fora da contagem original também no documento nativo', async () => {
  const original = await loadImage(expected.tilesets[0]!.image)
  const canvas = createCanvas(original.width, original.height),
    context = canvas.getContext('2d')
  context.drawImage(original, 0, 0)
  context.fillStyle = '#ff00ff'
  context.fillRect(32, 16, 16, 16)
  const edited = canvas.toDataURL('image/png')
  const { scene, warnings } = await importTiledScene(await nativeDocument(), {
    ...resolver,
    image: (path) => (path.endsWith('tiles-0.png') ? Promise.resolve(edited) : image(path)),
  })
  expect(warnings).toEqual([])
  expect(scene.tilesets[0]!.count).toBe(6)
  const native = await sceneToNative(scene, async (url) => {
    const decoded = await loadImage(url),
      bitmap = createCanvas(decoded.width, decoded.height)
    bitmap.getContext('2d').drawImage(decoded, 0, 0)
    return {
      width: bitmap.width,
      height: bitmap.height,
      data: bitmap.getContext('2d').getImageData(0, 0, bitmap.width, bitmap.height).data,
    }
  })
  expect(native.warnings).toEqual([])
  const sheet = native.assets.find((asset) => asset.kind === 'tileset' && asset.tiles.length === 6)
  if (!sheet) throw new Error('A peça adicional foi perdida')
  const exported = await loadImage((await nativeImageOf(sheet))!),
    raster = createCanvas(exported.width, exported.height)
  raster.getContext('2d').drawImage(exported, 0, 0)
  expect(Array.from(raster.getContext('2d').getImageData(88, 8, 1, 1).data)).toEqual([
    255, 0, 255, 255,
  ])
})

it('aceita uma folha recortada sem reaplicar sua contagem antiga', async () => {
  const document = await nativeDocument(),
    tileset = document.tilesets[0]!
  tileset.tilecount = 4
  tileset.columns = 2
  tileset.imagewidth = 32
  ;(document.layers[0]!.data as number[])[4] = 1
  const canvas = createCanvas(32, 32)
  canvas.getContext('2d').drawImage(await loadImage(expected.tilesets[0]!.image), 0, 0)
  const { scene } = await importTiledScene(document, {
    ...resolver,
    image: (path) =>
      path.endsWith('tiles-0.png') ? Promise.resolve(canvas.toDataURL('image/png')) : image(path),
  })
  expect(scene.tilesets[0]!.count).toBe(4)
  expect(scene.tilesets[0]!.columns).toBe(2)
})

for (const [name, raw] of [
  ['versão desconhecida', JSON.stringify({ version: 2 })],
  ['JSON incompleto', '{'],
  ['origem acima do orçamento', ' '.repeat(1025)],
] as const)
  it(`recusa ${name} antes de aceitar a conversão`, async () => {
    const document = await nativeDocument()
    document.tilesets[0]!.properties.find((p) => p.name === 'pinta:atlas')!.value = raw
    await expect(importTiledScene(document, resolver)).rejects.toBeInstanceOf(TiledImportError)
  })

for (const raw of ['[256]', '[0,0]', ' '.repeat(4097)])
  it('recusa índices ou orçamento inválidos das regras de origem', async () => {
    const document = await nativeDocument()
    document.tilesets[0]!.wangsets[0]!.properties.find(
      (p) => p.name === 'pinta:emptyTiles',
    )!.value = raw
    await expect(importTiledScene(document, resolver)).rejects.toBeInstanceOf(TiledImportError)
  })

it('restaura o atlas dentro do orçamento completo de células e 32 camadas', async () => {
  const document = await nativeDocument()
  document.width = 256
  document.height = 256
  document.layers = Array.from({ length: 32 }, (_, index) => ({
    type: 'tilelayer',
    id: index + 1,
    name: `Budget ${index}`,
    width: 256,
    height: 256,
    visible: true,
    data: Array(256 * 256).fill(1),
    properties: [{ name: 'pinta:id', type: 'string', value: `budget-${index}` }],
  }))
  const { scene, warnings } = await importTiledScene(document, resolver)
  expect(warnings).toEqual([])
  expect(scene.layers).toHaveLength(32)
  expect(
    scene.layers.reduce(
      (total, layer) => total + (layer.kind === 'tiles' ? layer.cells.length : 0),
      0,
    ),
  ).toBe(2_097_152)
  expect(scene.tilesets[0]!.count).toBe(5)
})
