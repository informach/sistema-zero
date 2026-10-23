import { beforeEach, describe, expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import type { PintaImageRecipe, PintaImageTargetLimits } from '@sistemazero/core/studio/pinta-image'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from '../core/project'
import {
  clearIdbMock,
  idbMockDb,
  idbMockStats,
  resetIdbMockStats,
  setIdbReadGuard,
} from '../testing/idbMock'

const { capturePintaAssetForImage, getPintaStorageNamespace, setPintaStorageNamespace } =
  await import('../state/persistence')
const { exportPintaImageForStudio } = await import('./portableImage')
const { exportImageForStudio, inspectImageForStudio } = await import('./studioLibrary')
const { browserPintaImageRaster } = await import('./portableImageRender')
const limits: PintaImageTargetLimits = {
  dimension: 4096,
  imagePixels: 4194304,
  totalImagePixels: 16777216,
  imageBytes: 16777216,
  dataUrlChars: 800000,
}

function seed(namespace: string, ...assets: PintaAsset[]) {
  const db = idbMockDb(namespace ? `sistema-zero-pinta-${namespace}` : 'sistema-zero-pinta')
  for (const asset of assets) db.set(`pinta:asset:${asset.id}`, structuredClone(asset))
}
function mapFixture() {
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const source = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 2, rows: 1 })
  source.layers[0]!.cells[0] = 0
  return { source, tileset }
}
function spriteFixture() {
  const source = createPixelSpriteAsset({ name: 'heroi', frameSize: 8 })
  source.paletteId = 'custom'
  source.customPalette = {
    name: 'cores',
    colors: ['', '#ff0000', '#0000ff', ...Array<string>(13).fill('')],
  }
  source.animations[0]!.frames[0]![0]!.data.fill(1)
  const recipe: PintaImageRecipe = {
    version: 1,
    algorithm: 'pinta-image-1',
    drawingId: source.id,
    selection: { kind: 'frame', animationId: source.animations[0]!.id, frameIndex: 0 },
    scale: 1,
  }
  return { source, recipe }
}

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('native-source capture uses one profile and one map/dependency transaction', () => {
  test('profile change after discovery cannot redirect either member of the captured pair', async () => {
    const { source, tileset } = mapFixture()
    seed('a', source, tileset)
    seed('b', { ...source, name: 'outro mapa' }, { ...tileset, name: 'outras pecas' })
    setPintaStorageNamespace('a')
    setIdbReadGuard(() => {
      setPintaStorageNamespace('b')
    })
    const captured = await capturePintaAssetForImage(source.id)
    expect(captured.ok).toBe(true)
    if (!captured.ok) throw new Error('capture required')
    expect([captured.source.name, captured.tileset?.name]).toEqual(['mapa', 'pecas'])
    expect(idbMockStats()).toMatchObject({ get: 1, getMany: 1, getManyKeys: 2, set: 0, setMany: 0 })
    expect(getPintaStorageNamespace()).toBe('b')
  })

  test('a source and dependency update between discovery and transaction yields the same new pair', async () => {
    const { source, tileset } = mapFixture()
    seed('a', source, tileset)
    setIdbReadGuard(() => {
      seed('a', { ...source, name: 'mapa novo' }, { ...tileset, name: 'pecas novas' })
    })
    const captured = await capturePintaAssetForImage(source.id, { namespace: 'a' })
    if (!captured.ok) throw new Error('capture required')
    expect([captured.source.name, captured.tileset?.name]).toEqual(['mapa-novo', 'pecas-novas'])
    expect(idbMockStats()).toMatchObject({ get: 1, getMany: 1, getManyKeys: 2 })
  })

  test('a changed dependency reference fails closed instead of mixing or retrying', async () => {
    const { source, tileset } = mapFixture()
    const other = createTilesetAsset({ name: 'outro', tileSize: 16 })
    seed('a', source, tileset, other)
    setIdbReadGuard(() => {
      seed('a', { ...source, tilesetId: other.id })
    })
    expect(await capturePintaAssetForImage(source.id, { namespace: 'a' })).toEqual({
      ok: false,
      reason: 'source-changed',
    })
    expect(idbMockStats()).toMatchObject({ get: 1, getMany: 1, getManyKeys: 2 })
  })

  test('missing source/dependency and a dependency of the wrong kind are explicit failures', async () => {
    const { source, tileset } = mapFixture()
    expect(await capturePintaAssetForImage(source.id, { namespace: 'a' })).toEqual({
      ok: false,
      reason: 'not-found',
    })
    seed('a', source)
    expect(await capturePintaAssetForImage(source.id, { namespace: 'a' })).toEqual({
      ok: false,
      reason: 'needs-tileset',
    })
    seed('a', { ...spriteFixture().source, id: tileset.id })
    expect(await capturePintaAssetForImage(source.id, { namespace: 'a' })).toEqual({
      ok: false,
      reason: 'needs-tileset',
    })
  })

  test('cancellation before and after discovery prevents the dependent read and all writes', async () => {
    const { source, tileset } = mapFixture()
    seed('a', source, tileset)
    const before = new AbortController()
    before.abort()
    expect(
      await capturePintaAssetForImage(source.id, { namespace: 'a', signal: before.signal }).then(
        () => null,
        (error: unknown) => error,
      ),
    ).toBeInstanceOf(DOMException)
    expect(idbMockStats()).toMatchObject({ get: 0, getMany: 0 })
    const during = new AbortController()
    setIdbReadGuard(() => {
      during.abort()
    })
    expect(
      await capturePintaAssetForImage(source.id, { namespace: 'a', signal: during.signal }).then(
        () => null,
        (error: unknown) => error,
      ),
    ).toBeInstanceOf(DOMException)
    expect(idbMockStats()).toMatchObject({ get: 1, getMany: 0, set: 0, setMany: 0 })
  })
})

describe('completed-image cache requires a fresh native capture (real PNG canvas)', () => {
  async function withCanvas(action: (allocations: () => number) => Promise<void>) {
    const previousCreate = browserPintaImageRaster.createCanvas,
      previousRelease = browserPintaImageRaster.releaseCanvas
    let count = 0
    browserPintaImageRaster.createCanvas = (width, height) => {
      count++
      return createCanvas(width, height) as unknown as HTMLCanvasElement
    }
    browserPintaImageRaster.releaseCanvas = (canvas) => {
      canvas.width = canvas.height = 1
    }
    try {
      await action(() => count)
    } finally {
      browserPintaImageRaster.createCanvas = previousCreate
      browserPintaImageRaster.releaseCanvas = previousRelease
    }
  }

  test('sync inspection fingerprints source and tileset without raster or writes, even with unchanged timestamps', async () => {
    const { source, tileset } = mapFixture()
    seed('a', source, tileset)
    await withCanvas(async (allocations) => {
      const first = await inspectImageForStudio(source.id, { namespace: 'a' })
      expect(first.dependencies).toHaveLength(1)
      expect(first.dependencies[0]?.drawingId).toBe(tileset.id)
      const timestamps = [source.updatedAt, tileset.updatedAt]
      tileset.tiles[0]!.data[0] = 1
      seed('a', tileset)
      const second = await inspectImageForStudio(source.id, { namespace: 'a' })
      expect([source.updatedAt, tileset.updatedAt]).toEqual(timestamps)
      expect(second.sourceSha256).toBe(first.sourceSha256)
      expect(second.dependencies[0]?.sha256).not.toBe(first.dependencies[0]?.sha256)
      expect(allocations()).toBe(0)
      expect(idbMockStats()).toMatchObject({ get: 2, getMany: 2, set: 0, setMany: 0 })
    })
  })

  test('expected sync provenance is captured before await and a changed source refuses before raster or a cache hit', async () => {
    const { source, recipe } = spriteFixture()
    seed('a', source)
    const provenance = await inspectImageForStudio(source.id, { namespace: 'a' })
    await withCanvas(async (allocations) => {
      const requested = structuredClone(provenance)
      const pending = exportImageForStudio(recipe, limits, {
        namespace: 'a',
        expectedProvenance: requested,
      })
      requested.sourceSha256 = 'f'.repeat(64)
      const first = await pending
      expect(first.derivation.provenance).toEqual(provenance)
      const count = allocations()
      const mismatch = await exportImageForStudio(recipe, limits, {
        namespace: 'a',
        expectedProvenance: requested,
      }).then(
        () => null,
        (error: unknown) => error,
      )
      expect(mismatch).toBeInstanceOf(Error)
      expect(mismatch instanceof Error && mismatch.message.includes('mudou')).toBe(true)
      expect(allocations()).toBe(count)
      source.animations[0]!.frames[0]![0]!.data.fill(2)
      seed('a', source)
      const changed = await exportImageForStudio(recipe, limits, {
        namespace: 'a',
        expectedProvenance: provenance,
      }).then(
        () => null,
        (error: unknown) => error,
      )
      expect(changed).toBeInstanceOf(Error)
      expect(allocations()).toBe(count)
      expect(idbMockStats()).toMatchObject({ set: 0, setMany: 0 })
    })
  })

  test('sync inspection respects the captured namespace and aborts after native discovery', async () => {
    const { source } = spriteFixture()
    seed('a', source)
    setPintaStorageNamespace('a')
    const pending = inspectImageForStudio(source.id)
    setPintaStorageNamespace('b')
    expect((await pending).sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    const controller = new AbortController()
    setIdbReadGuard(() => controller.abort())
    const result = await inspectImageForStudio(source.id, {
      namespace: 'a',
      signal: controller.signal,
    }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(result).toBeInstanceOf(DOMException)
    expect(idbMockStats()).toMatchObject({ set: 0, setMany: 0 })
  })

  test('public lazy entry captures namespace, recipe and limits before loading the PNG implementation', async () => {
    const { source, recipe } = spriteFixture()
    const requestedLimits = { ...limits }
    seed('a', source)
    setPintaStorageNamespace('a')
    const reads: string[] = []
    setIdbReadGuard((_key, database) => {
      reads.push(database)
    })
    await withCanvas(async () => {
      const pending = exportImageForStudio(recipe, requestedLimits)
      setPintaStorageNamespace('b')
      recipe.scale = 999
      requestedLimits.imageBytes = 1
      const image = await pending
      expect(image.derivation.recipe.scale).toBe(1)
      expect(image.derivation.output.width).toBe(8)
      expect(image.derivation.output.bytes).toBeGreaterThan(1)
      expect(reads).toEqual(['sistema-zero-pinta-a'])
      expect(getPintaStorageNamespace()).toBe('b')
      expect(idbMockStats()).toMatchObject({ set: 0, setMany: 0 })
    })
  })

  test('same bytes reuse raster, metadata cannot poison the cache, same timestamp changed bytes invalidate it', async () => {
    const { source, recipe } = spriteFixture()
    seed('a', source)
    const before = structuredClone(idbMockDb('sistema-zero-pinta-a'))
    await withCanvas(async (allocations) => {
      const first = await exportPintaImageForStudio(recipe, limits, { namespace: 'a' })
      const count = allocations(),
        originalHash = first.derivation.output.sha256
      first.derivation.output.sha256 = '0'.repeat(64)
      first.derivation.recipe.scale = 999
      const second = await exportPintaImageForStudio(recipe, limits, { namespace: 'a' })
      expect(allocations()).toBe(count)
      expect(second.derivation.output.sha256).toBe(originalHash)
      expect(second.derivation.recipe.scale).toBe(1)
      expect(idbMockStats()).toMatchObject({ get: 2, set: 0, setMany: 0 })
      expect(idbMockDb('sistema-zero-pinta-a')).toEqual(before)
      const oldTimestamp = source.updatedAt
      source.animations[0]!.frames[0]![0]!.data.fill(2)
      seed('a', source)
      const third = await exportPintaImageForStudio(recipe, limits, { namespace: 'a' })
      expect(source.updatedAt).toBe(oldTimestamp)
      expect(allocations()).toBeGreaterThan(count)
      expect(third.derivation.provenance.sourceSha256).not.toBe(
        second.derivation.provenance.sourceSha256,
      )
      expect(third.derivation.output.sha256).not.toBe(originalHash)
    })
  })

  test('another profile cannot use a cached image without owning the source; cancellation cannot use a hit', async () => {
    const { source, recipe } = spriteFixture()
    seed('a', source)
    await withCanvas(async (allocations) => {
      await exportPintaImageForStudio(recipe, limits, { namespace: 'a' })
      const count = allocations()
      expect(
        await exportPintaImageForStudio(recipe, limits, { namespace: 'b' }).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
      expect(allocations()).toBe(count)
      const controller = new AbortController()
      setIdbReadGuard(() => {
        controller.abort()
      })
      expect(
        await exportPintaImageForStudio(recipe, limits, {
          namespace: 'a',
          signal: controller.signal,
        }).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(DOMException)
      expect(allocations()).toBe(count)
      expect(idbMockStats()).toMatchObject({ set: 0, setMany: 0 })
    })
  })

  test('only the latest image is retained and a tighter byte limit cannot reuse a prior result', async () => {
    const a = spriteFixture(),
      b = spriteFixture()
    seed('a', a.source, b.source)
    await withCanvas(async (allocations) => {
      const first = await exportPintaImageForStudio(a.recipe, limits, { namespace: 'a' })
      await exportPintaImageForStudio(b.recipe, limits, { namespace: 'a' })
      const before = allocations()
      await exportPintaImageForStudio(a.recipe, limits, { namespace: 'a' })
      expect(allocations()).toBeGreaterThan(before)
      resetIdbMockStats()
      expect(
        await exportPintaImageForStudio(
          a.recipe,
          { ...limits, imageBytes: first.derivation.output.bytes - 1 },
          { namespace: 'a' },
        ).then(
          () => null,
          (error: unknown) => error,
        ),
      ).toBeInstanceOf(Error)
      expect(idbMockStats()).toMatchObject({ get: 1, set: 0, setMany: 0 })
    })
  })
})
