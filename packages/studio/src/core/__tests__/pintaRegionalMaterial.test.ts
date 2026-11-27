import { beforeAll, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { pngCrc32 } from '@sistemazero/core/studio/pinta-png-binary'
import { pngWithPintaData } from '../../../../pinta/src/export/pngText'
import { image, pngWorld, regional } from '../../official-extensions/map-2d/__tests__/regionFixture'
import { decodeProjectAsset, encodeAssetBase64 } from '../assetBinary'
import { admitPintaRegionalMaterial, readPintaRegionalMarker } from '../pintaRegionalMaterial'

const { createCanvas, loadImage }: typeof import('@napi-rs/canvas') = createRequire(
  new URL('../../../../pinta/package.json', import.meta.url),
)('@napi-rs/canvas')

const dataUrlOf = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

let original: Uint8Array<ArrayBuffer>
let dataUrl: string
let size: { width: number; height: number }
beforeAll(async () => {
  const world = await pngWorld()
  const root = world.maps.get(world.rootId)
  if (!root) throw Error('Vila ausente na fixture')
  original = root.png
  size = { width: root.width, height: root.height }
  dataUrl = dataUrlOf(original)
})

test('keeps the Vila PNG exact and admits Cabana and the sparse signed world in memory', async () => {
  const candidate = await admitPintaRegionalMaterial({ sourceId: 'vila', dataUrl, ...size })
  expect(candidate.dataUrl).toBe(dataUrl)
  expect(candidate.regional).toEqual({ dataVersion: 5, sourceId: 'vila', sha256: sha(original) })
  expect(Object.isFrozen(candidate.regional)).toBe(true)
  expect(Object.fromEntries(Object.entries(candidate))).toEqual({
    dataUrl,
    regional: candidate.regional,
  })
  expect([...candidate.world.maps.keys()]).toEqual(['vila', 'cabana'])
  const root = candidate.world.maps.get('vila')
  const child = candidate.world.maps.get('cabana')
  if (!root || !child) throw Error('Mundo incompleto')
  expect(root.png).toEqual(original)
  expect(root.data.scene).toMatchObject({
    version: 4,
    origin: { col: -32, row: -32 },
    cols: 10000,
    rows: 10000,
    physics: 'legacy',
  })
  expect(child.data.scene.physics).toBe('precise')
  if (root.data.scene.version !== 4) throw Error('A fixture qualifica a cena regional 4.')
  const tiles = root.data.scene.layers.find((layer) => layer.kind === 'tiles')
  if (!tiles?.cells.chunks[0]) throw Error('Camada esparsa ausente')
  expect(tiles.cells.chunks[0].cells).toBeInstanceOf(Int16Array)
  // Admission completed without a graphic API. A real decoder consumes the admitted PNGs now.
  for (const part of [...candidate.world.maps.values(), ...candidate.world.images.values()]) {
    const raster = await loadImage(Buffer.from(part.png))
    expect([raster.width, raster.height]).toEqual([part.width, part.height])
  }
  const verified = await admitPintaRegionalMaterial({
    sourceId: 'vila',
    dataUrl: candidate.dataUrl,
    ...size,
    regional: candidate.regional,
  })
  expect(verified.regional).toEqual(candidate.regional)
})

test('freezes bytes, origin, dimensions and marker before awaiting the digest', async () => {
  const png = Buffer.from(original)
  const marker = { dataVersion: 5, sourceId: 'vila', sha256: sha(original) }
  const input = { sourceId: 'vila', png, ...size, regional: marker }
  const pending = admitPintaRegionalMaterial(input)
  png.fill(0)
  marker.sha256 = 'f'.repeat(64)
  marker.sourceId = 'cabana'
  input.width++
  input.sourceId = 'cabana'
  const captured = await pending
  expect(captured.regional).toEqual({ dataVersion: 5, sourceId: 'vila', sha256: sha(original) })
  expect(captured.dataUrl).toBe(dataUrl)
  expect(captured.world.maps.get('vila')?.png).toEqual(original)
})

test('rejects an already cancelled capture and cancellation during the first asynchronous work', async () => {
  const input = { sourceId: 'vila', dataUrl, ...size }
  const stopped = new AbortController()
  const reason = new DOMException('Versão anterior', 'AbortError')
  stopped.abort(reason)
  await expect(admitPintaRegionalMaterial(input, stopped.signal)).rejects.toBe(reason)
  const controller = new AbortController()
  const publishing = admitPintaRegionalMaterial(input, controller.signal)
  queueMicrotask(() => controller.abort(reason))
  await expect(publishing).rejects.toBe(reason)
})

test('checks all marker fields, original digest and dimensions, and rejects a legacy scene beside a regional map', async () => {
  const correct = { dataVersion: 5, sourceId: 'vila', sha256: sha(original) }
  for (const marker of [
    { ...correct, scene: {} },
    { ...correct, dataVersion: 4 },
    { ...correct, sourceId: '' },
    { ...correct, sha256: 'A'.repeat(64) },
    null,
  ])
    expect(() => readPintaRegionalMarker(marker)).toThrow()
  const input = { sourceId: 'vila', dataUrl, ...size }
  for (const wrong of [
    { ...input, regional: { ...correct, sha256: '0'.repeat(64) } },
    { ...input, regional: { ...correct, sourceId: 'cabana' } },
    { ...input, sourceId: 'cabana' },
    { ...input, height: size.height + 1 },
    { ...input, scene: { version: 1 } },
    { ...input, tilemap: {} },
    { ...input, tilemapFront: {} },
    { ...input, sprite: {} },
    { ...input, tileset: {} },
    { ...input, pintaImage: {} },
  ])
    await expect(admitPintaRegionalMaterial(wrong)).rejects.toThrow()
})

test('rejects a corrupt PNG and over-budget encoded size or IHDR before yielding graphics', async () => {
  const corrupt = original.slice()
  corrupt[corrupt.length - 1]! ^= 1
  await expect(
    admitPintaRegionalMaterial({ sourceId: 'vila', png: corrupt, ...size }),
  ).rejects.toThrow('Integridade PNG inválida')
  const tooWide = original.slice()
  const view = new DataView(tooWide.buffer)
  const width = PINTA_IMAGE_WORLD_LIMITS.dimension + 1
  view.setUint32(16, width)
  view.setUint32(29, pngCrc32(tooWide, 12, 29))
  await expect(
    admitPintaRegionalMaterial({ sourceId: 'vila', png: tooWide, width, height: size.height }),
  ).rejects.toThrow('limite de resolução')
  await expect(
    admitPintaRegionalMaterial({ sourceId: 'vila', png: new Uint8Array(600_000), ...size }),
  ).rejects.toThrow()
  await expect(
    admitPintaRegionalMaterial({
      sourceId: 'vila',
      dataUrl: dataUrl + 'A'.repeat(800_000),
      ...size,
    }),
  ).rejects.toThrow('limite do projeto')
})

test('counts all linked covers and referenced art before admitting the world', async () => {
  const dimension = 2048
  const png = new Uint8Array(createCanvas(dimension, dimension).toBuffer('image/png'))
  const make = async (id: string, world?: { version: number; rootId: string; maps: unknown[] }) => {
    const scene = regional('precise', id)
    return pngWithPintaData(png, {
      format: 'pinta',
      version: 5,
      kind: 'map',
      name: scene.name,
      scale: 1,
      scene,
      ...(world ? { world } : {}),
    })
  }
  const children = await Promise.all(
    ['cabana', 'floresta', 'lago'].map(async (id) => {
      const scene = regional('precise', id)
      return { id, name: scene.name, png: dataUrlOf(await make(id)) }
    }),
  )
  const pngWithWorld = await make('vila', { version: 1, rootId: 'vila', maps: children })
  await expect(
    admitPintaRegionalMaterial({
      sourceId: 'vila',
      png: pngWithWorld,
      width: dimension,
      height: dimension,
    }),
  ).rejects.toThrow('cenário ficou grande demais')
})

test.each([
  [1, '2e2691d10917f570d9357bea1ad1bc208859f0dfbdd81c4be42ce9ea7d719dc9'],
  [2, '6ed58d321143403dbc2ff490850a8641a2318eeb47726f34f6cb91d50182ea4e'],
  [3, '2128109e178e2196d65cb47a4cc77555d11b0cf6f65693add817e9d6f09fcec3'],
  [4, '34e88bb015aedd39f38a8ff6bdf01cb81aa6cd6e67572cbcfb0d9185595aac84'],
] as const)('legacy PNG %i remains byte identical and is not promoted to regional', async (version, hash) => {
  const png = await pngWithPintaData(decodeProjectAsset(image).bytes, {
    format: 'pinta',
    kind: 'map',
    version,
    name: 'Vila',
    scale: 1,
    tileSize: 16,
    cols: 4,
    rows: 1,
    tilesets: [],
    layers: [],
    ...(version === 4
      ? {
          scene: {
            version: 3,
            id: 'vila',
            name: 'Vila',
            tileSize: 16,
            cols: 4,
            rows: 1,
            tilesets: [],
            layers: [],
            physics: 'precise',
          },
        }
      : {}),
  })
  expect(sha(png)).toBe(hash)
  await expect(
    admitPintaRegionalMaterial({ sourceId: 'vila', png, width: 64, height: 16 }),
  ).rejects.toThrow('conferir')
})
