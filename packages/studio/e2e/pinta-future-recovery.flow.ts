import { expect, type Page, test } from '@playwright/test'
import { openPintaAuthorityProof as proof } from './helpers/pintaAuthorityRealm'

async function record(page: Page, namespace: string, id: string, value?: unknown) {
  return page.evaluate(
    ({ namespace, id, value }) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-pinta-${namespace}`)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('kv', value === undefined ? 'readonly' : 'readwrite')
          const store = tx.objectStore('kv'),
            key = `pinta:local:document:${id}`
          const result = value === undefined ? store.get(key) : store.put(value, key)
          tx.oncomplete = () => {
            db.close()
            resolve(value === undefined ? result.result : null)
          }
          tx.onabort = tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    { namespace, id, value },
  )
}

test('two tabs preserve opaque data and recover stale RAM offline, then reopen and save the physical fork', async ({
  page,
  context,
}) => {
  const namespace = `future-offline-${Date.now()}`
  await proof(page)
  const id = await page.evaluate(async (namespace) => {
    const p = window.pinta026
    window.client026 = p.createPintaPersistence({ namespace })
    const source = p.createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 256, rows: 256 })
    await window.client026.persistAsset(source)
    window.ram026 = (await window.client026.loadAssetById(source.id))!
    return source.id
  }, namespace)
  const newer = await context.newPage()
  await proof(newer)
  const opaque = {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id, schema: 8, data: ['não perder'] },
  }
  await record(newer, namespace, id, opaque)
  const forkId = await page.evaluate(async () => {
    const next = { ...window.ram026, name: 'edicao-offline' }
    if (next.kind !== 'tilemap') throw Error('Mapa ausente')
    const layer = next.layers[0]
    if (!layer || !('cells' in layer) || !layer.cells) throw Error('Camada ausente')
    next.layers = [{ ...layer, cells: new Int16Array(layer.cells) }, ...next.layers.slice(1)]
    const first = next.layers[0]
    if (first && 'cells' in first && first.cells) first.cells[0] = 3
    try {
      await window.client026.persistAsset(next)
    } catch (error) {
      if (!(error instanceof window.pinta026.PintaLocalConflictError)) throw error
      return error.forks.get(next.id)!.id
    }
    throw Error('A edição substituiu o original')
  })
  expect(await record(newer, namespace, id)).toEqual(opaque)
  expect(await record(newer, namespace, forkId)).toMatchObject({
    version: 2,
    isolation: { version: 1, readerSchema: 7 },
  })
  await page.close()
  const reopened = await context.newPage()
  await proof(reopened)
  expect(
    await reopened.evaluate(
      async ({ namespace, forkId }) => {
        const local = window.pinta026.createPintaPersistence({ namespace })
        const copy = await local.loadAssetById(forkId)
        if (copy?.kind !== 'tilemap') throw Error('Recuperação ausente')
        const layer = copy.layers[0]
        const cell = layer && 'cells' in layer ? layer.cells?.[0] : undefined
        await local.persistAsset({ ...copy, name: 'continuada' })
        return {
          cell,
          ids: (await local.listAllAssets()).map((asset) => asset.id),
          name: (await local.loadAssetById(forkId))?.name,
        }
      },
      { namespace, forkId },
    ),
  ).toEqual({ cell: 3, ids: [forkId], name: 'continuada' })
  expect(await record(newer, namespace, id)).toEqual(opaque)
  // Revoking the exact inventory prevents a later unknown consumer from losing this fork.
  await record(newer, namespace, id, {
    ...opaque,
    revision: 'future-next',
    asset: { ...opaque.asset, reference: forkId },
  })
  expect(
    await reopened.evaluate(
      async ({ namespace, forkId }) => {
        const local = window.pinta026.createPintaPersistence({ namespace })
        const copy = await local.loadAssetById(forkId)
        if (!copy) throw Error('Cópia ausente')
        try {
          await local.persistAsset({ ...copy, name: 'nova' })
        } catch (error) {
          if (!(error instanceof window.pinta026.PintaLocalConflictError)) throw error
          return {
            recovered: error.forks.size,
            original: (await local.loadAssetById(forkId))?.name,
          }
        }
        throw Error('Referência futura sobrescrita')
      },
      { namespace, forkId },
    ),
  ).toEqual({ recovered: 1, original: 'continuada' })
})

test('a future map with another ID cannot lose its sheet when an older tab reindexes tiles', async ({
  page,
  context,
}) => {
  const namespace = `future-dependency-${Date.now()}`
  await proof(page)
  const ids = await page.evaluate(async (namespace) => {
    const p = window.pinta026
    window.client026 = p.createPintaPersistence({ namespace })
    const sheet = p.createTilesetAsset({ name: 'ground', tileSize: 16 })
    sheet.tiles = [p.createBitmap(16, 16), p.createBitmap(16, 16)]
    sheet.solid = [false, true]
    sheet.platform = [false, false]
    const source = p.createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
    await window.client026.persistAssets([sheet, source])
    window.ram026 = (await window.client026.loadAssetById(source.id))!
    return { sheet: sheet.id, map: source.id }
  }, namespace)
  const newer = await context.newPage()
  await proof(newer)
  const opaque = {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id: 'future-map', tilesetId: ids.sheet, cells: [1] },
  }
  await record(newer, namespace, 'future-map', opaque)
  expect(
    await page.evaluate(async (ids) => {
      const local = window.client026,
        sheet = await local.loadAssetById(ids.sheet)
      if (sheet?.kind !== 'tileset' || window.ram026.kind !== 'tilemap') throw Error('Arte ausente')
      const next = { ...sheet, tiles: sheet.tiles.slice(1), solid: [true], platform: [false] }
      try {
        await local.persistAssets([next, { ...window.ram026, name: 'remapeada' }])
      } catch (error) {
        if (!(error instanceof window.pinta026.PintaLocalConflictError)) throw error
        const copiedSheet = error.forks.get(ids.sheet),
          copiedMap = error.forks.get(ids.map)
        const original = await local.loadAssetById(ids.sheet)
        return {
          forks: error.forks.size,
          linked: copiedMap?.kind === 'tilemap' && copiedMap.tilesetId === copiedSheet?.id,
          originalCount: original?.kind === 'tileset' ? original.tiles.length : -1,
        }
      }
      throw Error('Folha original alterada')
    }, ids),
  ).toEqual({ forks: 2, linked: true, originalCount: 2 })
  expect(await record(newer, namespace, 'future-map')).toEqual(opaque)
})

test('the existing workshop adopts the offline recovery and saves a second gesture without making another copy', async ({
  page,
  context,
}) => {
  const namespace = `future-workshop-${Date.now()}`
  await proof(page)
  const id = await page.evaluate(async (namespace) => {
    const p = window.pinta026,
      local = p.createPintaPersistence({ namespace })
    const sheet = p.createTilesetAsset({ name: 'ground', tileSize: 16 })
    const source = p.createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
    const layer = source.layers[0]
    if (layer && 'cells' in layer && layer.cells) layer.cells[0] = 0
    await local.persistAssets([sheet, source])
    return source.id
  }, namespace)
  const newer = await context.newPage()
  await proof(newer)
  await page.goto(`/?namespace=${namespace}`)
  await page.getByRole('button', { name: 'Abrir vila (Mapa)', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await expect(canvas).toBeVisible()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  const opaque = {
    version: 3,
    capability: 8,
    revision: 'future',
    asset: { id, schema: 8, newData: ['intacto'] },
  }
  await record(newer, namespace, id, opaque)
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await canvas.click({ position: { x: 8, y: 8 } })
  await expect(page.getByText('vila-copia', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Lápis', exact: true }).click()
  await canvas.click({ position: { x: 48, y: 16 } })
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meus desenhos', exact: true })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Abrir vila-copia (Mapa)', exact: true }),
  ).toBeVisible()
  expect(
    await newer.evaluate(async (namespace) => {
      const assets = await window.pinta026.createPintaPersistence({ namespace }).listAllAssets()
      return assets
        .filter((asset) => asset.kind === 'tilemap')
        .map((asset) => ({
          name: asset.name,
          cells: asset.layers.flatMap((layer) =>
            'cells' in layer && layer.cells ? [...layer.cells] : [],
          ),
        }))
    }, namespace),
  ).toEqual([{ name: 'vila-copia', cells: [-1, 0, -1, -1] }])
  expect(await record(newer, namespace, id)).toEqual(opaque)
})
