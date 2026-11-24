import { expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { readPintaPngText } from '@sistemazero/core/studio/pinta-region-png-text'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { pngWithPintaData } from '../../../pinta/src/export/pngText'
import { regionalSceneMaterial } from '../testing/pintaRegionalMaterialFixture'
import { admitLegacyPintaPngMetadata } from './pintaPngMetadataAdmission'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAALSURBVAiZY2AAAgAABQABYlUyiAAAAABJRU5ErkJggg==',
  'base64',
)
const image = async (data: unknown) =>
  `data:image/png;base64,${Buffer.from(await pngWithPintaData(png, data)).toString('base64')}`
const budget = 16 * 1024 * 1024
const { createCanvas } = createRequire(new URL('../../../pinta/package.json', import.meta.url))(
  '@napi-rs/canvas',
) as typeof import('../../../pinta/node_modules/@napi-rs/canvas')

test('a leitura legada preserva folhas grandes e não aplica a política regional a PNG comum', async () => {
  const bytes = new Uint8Array(
    await pngWithPintaData(createCanvas(8192, 1).toBuffer('image/png'), {
      format: 'pinta',
      version: 1,
      kind: 'sprite',
      animations: [],
    }),
  )
  expect(() => readPintaPngText(bytes)).toThrow('resolução')
  expect(
    admitLegacyPintaPngMetadata(
      `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,
      budget,
    ),
  ).toBeGreaterThan(0)
  const generic = new Uint8Array(png)
  new DataView(generic.buffer).setUint32(33, 0x7fffffff)
  expect(
    admitLegacyPintaPngMetadata(
      `data:image/png;base64,${Buffer.from(generic).toString('base64')}`,
      budget,
    ),
  ).toBe(0)
})

test('lê os metadados antigos inteiros com orçamento UTF-8 e mantém a imagem comum', async () => {
  const data = { format: 'pinta', version: 2, kind: 'map', name: 'Ilha do coração', layers: [] }
  const url = await image(data)
  expect(admitLegacyPintaPngMetadata(url, budget)).toBe(Buffer.byteLength(JSON.stringify(data)))
  expect(() => admitLegacyPintaPngMetadata(url, 20)).toThrow()
  expect(
    admitLegacyPintaPngMetadata(`data:image/png;base64,${png.toString('base64')}`, budget),
  ).toBe(0)
})

test('um mundo PNG4 não pode esconder um destino PNG5 ou uma cena regional sem marcador', async () => {
  const child = await regionalSceneMaterial()
  const root = await image({
    format: 'pinta',
    version: 4,
    kind: 'map-world',
    world: {
      version: 1,
      rootId: 'root',
      maps: [{ id: 'child', name: 'Destino', png: child.dataUrl }],
    },
  })
  expect(() => admitLegacyPintaPngMetadata(root, budget)).toThrow('identificação completa')
  const relabeled = await image({
    format: 'pinta',
    version: 4,
    kind: 'map',
    scene: scene4Fixture(),
  })
  expect(() => admitLegacyPintaPngMetadata(relabeled, budget)).toThrow('não corresponde')
})

test('um PNG4 com cena legada completa continua legível', async () => {
  const scene = {
    version: 3,
    id: 'scene',
    name: 'Mapa',
    tileSize: 1,
    cols: 1,
    rows: 1,
    tilesets: [
      {
        id: 'tiles',
        name: 'Peças',
        image: `data:image/png;base64,${png.toString('base64')}`,
        columns: 1,
        count: 1,
        solid: [],
        platform: [],
      },
    ],
    layers: [],
  }
  expect(
    admitLegacyPintaPngMetadata(
      await image({ format: 'pinta', version: 4, kind: 'map', scene }),
      budget,
    ),
  ).toBeGreaterThan(0)
})
