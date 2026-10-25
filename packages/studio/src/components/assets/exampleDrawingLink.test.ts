import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import type {
  PintaImageRecipe,
  PintaImageSelectionSummary,
} from '@sistemazero/core/studio/pinta-image'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { useProjectStore } from '../../state/projectStore'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import type { StudioPintaLibraryAdapter } from '../../studio/pinta-library'
import { linkExampleDrawing } from './exampleDrawingLink'

const plain = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
  'base64',
)
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function sheetPng(): Buffer {
  const body = Buffer.concat([
    Buffer.from('pinta'),
    Buffer.from([0, 1, 0, 0, 0]),
    deflateSync(Buffer.from('{}')),
  ])
  const typed = Buffer.concat([Buffer.from('iTXt'), body])
  const chunk = Buffer.alloc(12 + body.length)
  chunk.writeUInt32BE(body.length, 0)
  typed.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(typed), 8 + body.length)
  return Buffer.concat([plain.subarray(0, 33), chunk, plain.subarray(33)])
}

async function seed(kind: 'classic' | 'pro' = 'classic') {
  const raw = documentFixture('python', kind)
  raw.installedExtensions = [{ id: 'python-pygame', version: '1.0.0', installedAt: 1 }]
  raw.assets = [
    {
      id: 'mapa-asset',
      name: 'fase-1',
      kind: 'image',
      source: 'library',
      libId: 'example-pygame:jogo:fase-1',
      dataUrl: `data:image/png;base64,${plain.toString('base64')}`,
      proPath: 'assets/fase-1.png',
    },
  ]
  useProjectStore.setState({
    project: await refinePythonProjectDocument(raw),
    editingAccess: 'author',
    isDirty: false,
    saveError: null,
  })
}

function fakeAdapter(facts: PintaImageSelectionSummary, failImportOnce = false) {
  const copies: string[][] = []
  const origins: Array<string | undefined> = []
  const recipes: PintaImageRecipe[] = []
  let failing = failImportOnce
  // Like Pinta with an origin: the copy still in the gallery is reused, a deleted one is copied
  // again with a new id.
  const gallery = new Set<string>()
  let copyId: string | null = null
  let made = 0
  const adapter: StudioPintaLibraryAdapter = {
    list: async () => [],
    importDrawings: async ({ ids, origin }) => {
      copies.push([...ids])
      origins.push(origin)
      const reused = copyId !== null && gallery.has(copyId)
      if (!reused) {
        made += 1
        copyId = made === 1 ? 'pinta-fase' : `pinta-fase-${made}`
        gallery.add(copyId)
      }
      return {
        ok: true,
        drawings: [
          { sourceId: ids[0]!, id: copyId!, name: 'fase-1', reused, imageSelection: facts },
        ],
      }
    },
    import: async (id, options) => {
      const recipe = options!.image!.recipe
      recipes.push(structuredClone(recipe))
      if (!gallery.has(id)) return { ok: false, error: 'Este desenho não está mais no Pinta.' }
      if (failing) {
        failing = false
        return { ok: false, error: 'Não consegui preparar esse desenho agora. Tente de novo.' }
      }
      const bytes = sheetPng()
      const dependencies =
        recipe.selection.kind === 'map'
          ? [{ drawingId: 'pinta-terreno', sha256: 'c'.repeat(64) }]
          : []
      return {
        ok: true,
        asset: {
          id,
          name: 'fase-1',
          dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
          width: 1,
          height: 1,
          pintaImage: {
            recipe,
            provenance: { sourceSha256: 'a'.repeat(64), dependencies },
            output: {
              mime: 'image/png',
              width: 1,
              height: 1,
              bytes: bytes.length,
              sha256: createHash('sha256').update(bytes).digest('hex'),
            },
          },
        },
      }
    },
  }
  return { adapter, copies, origins, recipes, gallery }
}

const loadJson = async () => '{"format":"pinta-gallery"}'
const mapFacts: PintaImageSelectionSummary = {
  kind: 'tilemap',
  width: 1,
  height: 1,
  sheet: { width: 1, height: 1 },
}

afterEach(() => useProjectStore.setState({ project: null, isDirty: false, saveError: null }))

describe('linkExampleDrawing — the first edit of a gallery drawing', () => {
  test('a map becomes the "map" recipe at scale 2, keeping name, id and file', async () => {
    await seed('pro')
    const fake = fakeAdapter(mapFacts)
    const result = await linkExampleDrawing('mapa-asset', {
      adapter: fake.adapter,
      store: useProjectStore,
      loadJson,
    })
    expect(result).toEqual({ ok: true, drawingId: 'pinta-fase' })
    expect(fake.copies).toEqual([['jogo-fase-1']])
    // One copy per example document: the origin lets Pinta reuse the tilesets of other maps.
    expect(fake.origins).toEqual(['example-pygame:jogo'])
    expect(fake.recipes.map((recipe) => [recipe.selection, recipe.scale])).toEqual([
      [{ kind: 'map' }, 2],
    ])
    const [asset] = useProjectStore.getState().project!.assets!
    expect(asset).toMatchObject({
      id: 'mapa-asset',
      name: 'fase-1',
      proPath: 'assets/fase-1.png',
      libId: 'personal:pinta-fase',
      libOrigin: 'pinta',
    })
    expect(asset?.pintaImage?.provenance.dependencies).toHaveLength(1)
    expect(useProjectStore.getState().isDirty).toBe(true)
  })

  test('each drawing kind takes the whole-drawing recipe of the gallery', async () => {
    const cases: Array<[PintaImageSelectionSummary, PintaImageRecipe['selection']]> = [
      [
        {
          kind: 'frame',
          width: 1,
          height: 1,
          animations: [{ id: 'a', name: 'voar', frameCount: 2 }],
          sheet: { width: 2, height: 1 },
        },
        { kind: 'spritesheet' },
      ],
      [
        { kind: 'tile', width: 1, height: 1, tileCount: 3, sheet: { width: 3, height: 1 } },
        { kind: 'tileset' },
      ],
      [{ kind: 'background', width: 1, height: 1 }, { kind: 'background' }],
    ]
    for (const [facts, selection] of cases) {
      await seed()
      const fake = fakeAdapter(facts)
      const result = await linkExampleDrawing('mapa-asset', {
        adapter: fake.adapter,
        store: useProjectStore,
        loadJson,
      })
      expect(result.ok).toBe(true)
      expect(fake.recipes[0]?.selection).toEqual(selection)
    }
  })

  test('a failure after the copy keeps the material, and the retry reuses the same copy', async () => {
    await seed()
    const fake = fakeAdapter(mapFacts, true)
    const deps = { adapter: fake.adapter, store: useProjectStore, loadJson }
    expect(await linkExampleDrawing('mapa-asset', deps)).toEqual({
      ok: false,
      error: 'Não consegui preparar esse desenho agora. Tente de novo.',
    })
    expect(useProjectStore.getState().project!.assets![0]!.libId).toBe('example-pygame:jogo:fase-1')
    expect(await linkExampleDrawing('mapa-asset', deps)).toEqual({
      ok: true,
      drawingId: 'pinta-fase',
    })
    // Each attempt asks Pinta again with the origin; Pinta answers with the copy it already has.
    expect(fake.copies).toHaveLength(2)
    expect(new Set(fake.origins)).toEqual(new Set(['example-pygame:jogo']))
    expect([...fake.gallery]).toEqual(['pinta-fase'])
    expect(fake.recipes).toHaveLength(2)
  })

  test('a copy deleted in Pinta between attempts does not break every retry', async () => {
    await seed()
    const fake = fakeAdapter(mapFacts, true)
    const deps = { adapter: fake.adapter, store: useProjectStore, loadJson }
    expect((await linkExampleDrawing('mapa-asset', deps)).ok).toBe(false)
    fake.gallery.delete('pinta-fase')
    expect(await linkExampleDrawing('mapa-asset', deps)).toEqual({
      ok: true,
      drawingId: 'pinta-fase-2',
    })
    expect(useProjectStore.getState().project!.assets![0]!.libId).toBe('personal:pinta-fase-2')
  })

  test('a material edited during the preparation is not overwritten', async () => {
    await seed()
    const fake = fakeAdapter(mapFacts)
    const original = fake.adapter.import
    fake.adapter.import = async (id, options) => {
      const result = await original(id, options)
      useProjectStore.getState().renameAsset('mapa-asset', 'outro-nome')
      return result
    }
    const result = await linkExampleDrawing('mapa-asset', {
      adapter: fake.adapter,
      store: useProjectStore,
      loadJson,
    })
    expect(result.ok).toBe(false)
    expect(useProjectStore.getState().project!.assets![0]!.libId).toBe('example-pygame:jogo:fase-1')
  })

  test('refuses what is not a gallery drawing, and a material already linked', async () => {
    await seed()
    const fake = fakeAdapter(mapFacts)
    const deps = { adapter: fake.adapter, store: useProjectStore, loadJson }
    expect((await linkExampleDrawing('sumiu', deps)).ok).toBe(false)
    expect(await linkExampleDrawing('mapa-asset', deps)).toMatchObject({ ok: true })
    // Linked now: the store refuses a second link, and the reference is gone.
    expect((await linkExampleDrawing('mapa-asset', deps)).ok).toBe(false)
    expect(fake.copies).toHaveLength(1)
    expect(
      useProjectStore.getState().linkAssetToPintaImage('mapa-asset', {
        dataUrl: useProjectStore.getState().project!.assets![0]!.dataUrl,
        libId: 'personal:outro',
        pintaImage: {},
      }),
    ).toBe('Esta imagem já está ligada a um desenho do Pinta.')
  })
})
