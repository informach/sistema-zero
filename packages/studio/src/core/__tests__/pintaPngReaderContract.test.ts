import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageDerivation,
} from '@sistemazero/core/studio/pinta-image'
import { pngWithPintaData } from '../../../../pinta/src/export/pngText'
import { assertPintaImageAssetBytes, assertPintaImageAssets } from '../pintaImageAsset'
import type { ProjectAsset } from '../projectAssets'

const plain = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
  'base64',
)
async function image(
  version: number,
  marker?: 2 | 3 | 4,
  world = false,
  extra: Record<string, unknown> = {},
): Promise<ProjectAsset> {
  const bytes = await pngWithPintaData(plain, {
    format: 'pinta',
    kind: 'map',
    version,
    ...(version === 4 ? { scene: { version: 3 } } : {}),
    ...extra,
  })
  const recipe: PintaImageDerivation['recipe'] = {
    version: world ? 2 : 1,
    algorithm: 'pinta-image-1',
    drawingId: 'original',
    selection: { kind: world ? 'map-world' : 'map' },
    scale: 1,
  }
  return {
    id: 'map',
    name: 'map',
    kind: 'image',
    source: 'library',
    libOrigin: 'pinta',
    libId: 'personal:original',
    width: 1,
    height: 1,
    proPath: 'assets/map.png',
    dataUrl: `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,
    pintaImage: {
      recipe,
      provenance: {
        sourceSha256: 'a'.repeat(64),
        dependencies: world ? [] : [{ drawingId: 'tiles', sha256: 'b'.repeat(64) }],
      },
      output: {
        mime: 'image/png',
        width: 1,
        height: 1,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        ...(marker ? { dataVersion: marker } : {}),
      },
    },
  }
}
test('retirar a exigência de leitor físico dos metadados não permite importar PNG 4', async () => {
  const asset = await image(4)
  const original = JSON.stringify(asset)
  await expect(assertPintaImageAssets([asset])).rejects.toThrow()
  expect(JSON.stringify(asset)).toBe(original)
})
test('a versão declarada precisa corresponder aos bytes comprimidos, não só ao hash', async () => {
  await expect(assertPintaImageAssets([await image(2, 4)])).rejects.toThrow()
})
test('receita map antiga não pode disfarçar dados de mundo 3 sem marcador', async () => {
  await expect(assertPintaImageAssets([await image(3)])).rejects.toThrow()
})
test('cena física não pode viajar disfarçada em dados 2', async () => {
  await expect(
    assertPintaImageAssets([await image(2, 2, false, { scene: { version: 3 } })]),
  ).rejects.toThrow()
})
test('o mundo anterior não pode carregar um destino físico sem promover sua versão', async () => {
  const child = await image(4, 4)
  await expect(
    assertPintaImageAssets([
      await image(3, 3, true, {
        world: {
          version: 1,
          rootId: 'root',
          maps: [{ id: 'child', name: 'child', png: child.dataUrl }],
        },
      }),
    ]),
  ).rejects.toThrow()
})
test('a descompressão recusa a expansão além do orçamento antes de aceitar o documento', async () => {
  const asset = await image(2, 2, false, {
    padding: 'x'.repeat(PINTA_IMAGE_WORLD_LIMITS.metadataBytes),
  })
  await expect(assertPintaImageAssets([asset])).rejects.toThrow()
})
test('os destinos compartilham o orçamento de descompressão do mundo', async () => {
  const first = await image(2, 2, false, { padding: 'x'.repeat(9 * 1024 * 1024) })
  const second = await image(2, 2, false, { padding: 'y'.repeat(9 * 1024 * 1024) })
  const root = await image(3, 3, true, {
    world: {
      version: 1,
      rootId: 'root',
      maps: [
        { id: 'one', name: 'one', png: first.dataUrl },
        { id: 'two', name: 'two', png: second.dataUrl },
      ],
    },
  })
  await expect(assertPintaImageAssets([root])).rejects.toThrow('grandes demais')
})
test('profundidade excessiva é recusada antes do JSON.parse, sem confundir chaves dentro de textos', async () => {
  let nested: unknown = 'value'
  for (let i = 0; i < 80; i++) nested = { nested }
  await expect(assertPintaImageAssets([await image(2, 2, false, { nested })])).rejects.toThrow()
  const padding = Array.from({ length: 4000 }, (_, i) => `"é🌳{${i}}\\`).join('')
  await expect(
    assertPintaImageAssets([await image(2, undefined, false, { padding })]),
  ).resolves.toBeUndefined()
})
test('cópias históricas e dados físicos corretos conservam bytes e metadados', async () => {
  for (const [version, marker, world] of [
    [1, undefined, false],
    [2, undefined, false],
    [3, undefined, true],
    [4, 4, false],
    [4, 4, true],
  ] as const) {
    const asset = await image(version, marker, world),
      original = JSON.stringify(asset)
    await expect(assertPintaImageAssets([asset])).resolves.toBeUndefined()
    expect(JSON.stringify(asset)).toBe(original)
  }
})
test('a leitura após carregar o decodificador usa os bytes capturados antes do await', async () => {
  const asset = await image(4, 4)
  const bytes = new Uint8Array(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64'))
  const check = assertPintaImageAssetBytes(asset, bytes, asset.pintaImage!.output.sha256)
  bytes.fill(0)
  await expect(Promise.resolve(check)).resolves.toBeUndefined()
})
