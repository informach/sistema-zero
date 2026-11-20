import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { isTileLayer } from '../../pinta/src/core/project'
import { importPintaJson } from '../../pinta/src/export/projectJson'

import { openPintaAuthorityProof } from './helpers/pintaAuthorityRealm'

async function open(page: Page, version = 'current') {
  if (test.info().project.name === 'cpu-4x') {
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  await openPintaAuthorityProof(page, version)
}
async function seed(page: Page, namespace: string) {
  return page.evaluate(async (namespace) => {
    const realm = window,
      p = realm.pinta026
    const tiles = p.createTilesetAsset({ name: 'pecas-chunks', tileSize: 16 })
    const bitmap = tiles.tiles[0]!
    tiles.tiles = Array.from({ length: 256 }, () => ({
      ...bitmap,
      data: new Uint8Array(256).fill(1),
    }))
    tiles.solid = Array(256).fill(false)
    tiles.platform = Array(256).fill(false)
    const map = p.createTilemapAsset({
      name: 'mapa-chunks',
      tilesetId: tiles.id,
      cols: 256,
      rows: 256,
    })
    map.cols = map.rows = 256
    map.layers = [
      {
        id: 'chao',
        name: 'Chão',
        visible: true,
        cells: Int16Array.from({ length: 65536 }, (_, index) => (index * 73) % 256),
      },
    ]
    const client = p.createPintaPersistence({ namespace })
    await client.persistAssets([tiles, map])
    realm.chunkClient = client
    const saved = await client.loadAssetById(map.id)
    if (saved?.kind !== 'tilemap') throw new Error('Mapa não reabriu')
    realm.chunkMap = saved
    return map.id
  }, namespace)
}

test('oficina sob pressão: 32 camadas, rolagem, edição e histórico conservam os pixels', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  const namespace = `render-ui-${Date.now()}-${info.project.name}`
  await open(page)
  await page.evaluate(async (namespace) => {
    const p = window.pinta026
    const tiles = p.createTilesetAsset({ name: 'cores-pressao', tileSize: 48 })
    const bitmap = tiles.tiles[0]!
    tiles.tiles = [1, 2].map((color) => ({ ...bitmap, data: new Uint8Array(48 * 48).fill(color) }))
    tiles.solid = tiles.platform = [false, false]
    const map = p.createTilemapAsset({
      name: 'mapa-pressao',
      tilesetId: tiles.id,
      cols: 256,
      rows: 256,
    })
    map.cols = map.rows = 256
    map.layers = Array.from({ length: 32 }, (_, index) => ({
      id: `pressure-${index}`,
      name: `Camada ${index + 1}`,
      visible: true,
      cells: new Int16Array(256 * 256).fill(index % 2),
    }))
    await p.createPintaPersistence({ namespace }).persistAssets([tiles, map])
  }, namespace)
  await page.goto(`/?namespace=${namespace}`)
  await page.getByRole('button', { name: 'Abrir mapa-pressao (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  // The last layer covers the others; select it through the existing layer control.
  await page.getByRole('button', { name: 'Camada 32', exact: true }).click()
  const grid = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await grid.focus()
  await page.keyboard.press('Control+Home')
  const pixel = async () => {
    const box = await page.locator('[data-pin-keyboard-cell]').boundingBox()
    if (!box) throw new Error('Cursor ausente')
    return (
      await page.screenshot({
        clip: { x: box.x + box.width / 2, y: box.y + box.height / 2, width: 1, height: 1 },
      })
    ).toString('base64')
  }
  await expect(page.locator('[data-pin-keyboard-cell]')).toBeVisible()
  const before = await pixel()
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await grid.focus()
  await page.keyboard.press('Enter')
  await expect.poll(pixel).not.toBe(before)
  const erased = await pixel()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await grid.focus()
  await expect.poll(pixel).toBe(before)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await grid.focus()
  await expect.poll(pixel).toBe(erased)
  await page.keyboard.press('Control+End')
  await expect(page.locator('[data-pin-keyboard-cell]')).toBeVisible()
  await expect.poll(pixel).toBe(before)
  await page.keyboard.press('Control+Home')
  await expect.poll(pixel).toBe(erased)
  await info.attach('oficina-render-pressao', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
async function disk(page: Page, namespace: string, id: string) {
  return page.evaluate(
    async ({ namespace, id }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-pinta-${namespace}`)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        return await new Promise<{
          version: number
          chunks: number
          bytes: number
          headerArray: boolean
        }>((resolve, reject) => {
          const transaction = db.transaction('kv'),
            store = transaction.objectStore('kv')
          const header = store.get(`pinta:local:document:${id}`),
            all = store.getAllKeys()
          let chunks = 0,
            bytes = 0
          all.onsuccess = () => {
            for (const key of all.result)
              if (String(key).startsWith(`pinta:local:chunk:${encodeURIComponent(id)}:`)) {
                const request = store.get(key)
                request.onsuccess = () => {
                  chunks++
                  bytes += (request.result as Int16Array).byteLength
                }
              }
          }
          transaction.oncomplete = () =>
            resolve({
              version: header.result.version,
              chunks,
              bytes,
              headerArray: header.result.asset?.layers?.[0]?.cells instanceof Int16Array,
            })
          transaction.onabort = () => reject(transaction.error)
        })
      } finally {
        db.close()
      }
    },
    { namespace, id },
  )
}

test('IndexedDB: abertura fria conserva 65536 células e uma edição grava só um chunk', async ({
  page,
  context,
}, info) => {
  const namespace = `chunk-io-${Date.now()}-${info.project.name}`
  await open(page)
  const id = await seed(page, namespace)
  expect(await disk(page, namespace, id)).toEqual({
    version: 2,
    chunks: 64,
    bytes: 131072,
    headerArray: false,
  })
  const fresh = await context.newPage()
  await page.close()
  await open(fresh)
  const report = await fresh.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const map = await client.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa não reabriu no novo realm')
      const floor = map.layers[0]
      if (!floor || !p.isTileLayer(floor)) throw new Error('Falta o chão')
      const equal = floor.cells.every((value, index) => value === (index * 73) % 256)
      const original = IDBObjectStore.prototype.put,
        writes: Array<{ key: string; bytes: number }> = []
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.transaction.db.name === `sistema-zero-pinta-${namespace}`)
          writes.push({
            key: String(key),
            bytes: value instanceof Int16Array ? value.byteLength : 0,
          })
        return original.call(this, value, key)
      }
      try {
        floor.cells[0] = 7
        map.updatedAt++
        await client.persistAsset(map)
      } finally {
        IDBObjectStore.prototype.put = original
      }
      const read = await client.loadAssetById(id)
      const reopened = read?.kind === 'tilemap' ? read.layers[0] : null
      const capture = await p.capturePintaAssetForImage(id, { namespace, includeSceneMaps: true })
      const captured =
        capture.ok && capture.source.kind === 'tilemap' ? capture.source.layers[0] : null
      return {
        equal,
        writes,
        value: reopened && p.isTileLayer(reopened) ? reopened.cells[0] : null,
        capture: {
          tilesets: capture.ok ? capture.tilesets.length : 0,
          complete:
            !!captured &&
            p.isTileLayer(captured) &&
            captured.cells.length === 65536 &&
            captured.cells.every(
              (value, index) => value === (index === 0 ? 7 : (index * 73) % 256),
            ),
        },
      }
    },
    { namespace, id },
  )
  expect(report.equal).toBe(true)
  expect(report.value).toBe(7)
  expect(report.capture).toEqual({ tilesets: 1, complete: true })
  expect(report.writes.filter((write) => write.key.startsWith('pinta:local:chunk:'))).toHaveLength(
    1,
  )
  expect(
    report.writes.filter((write) => write.key.startsWith('pinta:local:chunk:'))[0]!.bytes,
  ).toBe(2048)
  expect(
    report.writes.filter((write) => write.key.startsWith('pinta:local:document:')),
  ).toHaveLength(1)
  expect(report.writes.filter((write) => write.key.startsWith('pinta:asset:'))).toHaveLength(1)
  await info.attach('chunks-io', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  })
})

test('quota após enfileirar o chunk aborta cabeçalho, espelho e células; retry conserva a revisão', async ({
  page,
}, info) => {
  const namespace = `chunk-abort-${Date.now()}-${info.project.name}`
  await open(page)
  const id = await seed(page, namespace)
  const result = await page.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const map = await client.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
      const floor = map.layers[0]
      if (!floor || !p.isTileLayer(floor)) throw new Error('Chão ausente')
      const snapshot = async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(`sistema-zero-pinta-${namespace}`)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        try {
          return await new Promise<string>((resolve, reject) => {
            const transaction = db.transaction('kv'),
              store = transaction.objectStore('kv')
            const keys = store.getAllKeys(),
              values = store.getAll()
            transaction.oncomplete = () =>
              resolve(JSON.stringify({ keys: keys.result, values: values.result }))
            transaction.onabort = () => reject(transaction.error)
          })
        } finally {
          db.close()
        }
      }
      const before = await snapshot(),
        original = IDBObjectStore.prototype.put
      let failed = '',
        queuedChunks = 0
      IDBObjectStore.prototype.put = function (value, key) {
        const request = original.call(this, value, key)
        if (
          this.transaction.db.name === `sistema-zero-pinta-${namespace}` &&
          String(key).startsWith('pinta:local:chunk:')
        ) {
          queuedChunks++
          throw new DOMException('Quota simulada depois do put', 'QuotaExceededError')
        }
        return request
      }
      floor.cells[0] = 7
      map.updatedAt++
      try {
        await client.persistAsset(map)
      } catch (error) {
        failed = error instanceof DOMException ? error.name : String(error)
      } finally {
        IDBObjectStore.prototype.put = original
      }
      const unchanged = before === (await snapshot())
      await client.persistAsset(map)
      const loaded = await client.loadAssetById(id)
      const read = loaded?.kind === 'tilemap' ? loaded.layers[0] : null
      return {
        failed,
        queuedChunks,
        unchanged,
        value: read && p.isTileLayer(read) ? read.cells[0] : null,
      }
    },
    { namespace, id },
  )
  expect(result).toEqual({
    failed: 'QuotaExceededError',
    queuedChunks: 1,
    unchanged: true,
    value: 7,
  })
})

test('leitor anterior real recusa o protocolo físico novo e preserva o mapa', async ({
  page,
  context,
}, info) => {
  const namespace = `chunk-dense-${Date.now()}-${info.project.name}`
  await open(page, 'dense-reader')
  const id = await seed(page, namespace)
  expect(await disk(page, namespace, id)).toEqual({
    version: 1,
    chunks: 0,
    bytes: 0,
    headerArray: true,
  })
  const modern = await context.newPage()
  await open(modern)
  await modern.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const map = await client.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
      const floor = map.layers[0]
      if (!floor || !p.isTileLayer(floor)) throw new Error('Chão ausente')
      floor.cells[0] = 7
      map.updatedAt++
      await client.persistAsset(map)
    },
    { namespace, id },
  )
  await expect(
    page.evaluate(async () => {
      const realm = window
      await realm.chunkClient!.persistAsset({
        ...realm.chunkMap!,
        name: 'edicao-do-leitor-anterior',
      })
    }),
  ).rejects.toThrow('Atualize a página antes de alterar este desenho.')
  expect(await page.evaluate(async (id) => window.chunkClient!.loadAssetById(id), id)).toBeNull()
  const preserved = await modern.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026
      const map = await p.createPintaPersistence({ namespace }).loadAssetById(id)
      const floor = map?.kind === 'tilemap' ? map.layers[0] : null
      return { name: map?.name, value: floor && p.isTileLayer(floor) ? floor.cells[0] : null }
    },
    { namespace, id },
  )
  expect(preserved).toEqual({ name: 'mapa-chunks', value: 7 })
})

test('aba legada escreve offline; realm sem RAM recupera as duas versões com chunks', async ({
  page,
  context,
}, info) => {
  const namespace = `chunk-legacy-${Date.now()}-${info.project.name}`
  const old = await context.newPage()
  await open(old, 'old')
  const id = await seed(old, namespace)
  await open(page)
  await page.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const map = await client.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
      const floor = map.layers[0]
      if (!floor || !p.isTileLayer(floor)) throw new Error('Chão ausente')
      floor.offsetX = 2.5
      floor.cells[0] = 7
      map.name = 'mapa-protegido'
      map.updatedAt++
      await client.persistAsset(map)
    },
    { namespace, id },
  )
  // Bootstrap the module, without reading a document, before disabling all networking.
  // This tests offline data recovery, not an offline HTTP/PWA bootstrap.
  const recovered = await context.newPage()
  await open(recovered)
  await context.setOffline(true)
  await page.close()
  await old.evaluate(async () => {
    const realm = window,
      map = realm.chunkMap!,
      floor = map.layers[0]
    if (!floor || !realm.pinta026.isTileLayer(floor)) throw new Error('RAM antiga ausente')
    floor.cells[1] = 9
    map.name = 'edicao-legada'
    map.updatedAt++
    await realm.chunkClient!.persistAsset(map)
  })
  await old.close()
  const maps = await recovered.evaluate(async (namespace) => {
    const p = window.pinta026
    const assets = await p.createPintaPersistence({ namespace }).listAllAssets()
    return assets
      .filter((asset) => asset.kind === 'tilemap')
      .map((map) => {
        const floor = map.layers[0]
        if (!floor || !p.isTileLayer(floor)) throw new Error('Chão não recuperado')
        return {
          id: map.id,
          name: map.name,
          offset: floor.offsetX ?? 0,
          first: floor.cells[0],
          second: floor.cells[1],
          cells: floor.cells.length,
        }
      })
  }, namespace)
  expect(maps).toHaveLength(2)
  expect(maps.find((map) => map.id === id)).toEqual({
    id,
    name: 'mapa-protegido',
    offset: 2.5,
    first: 7,
    second: 73,
    cells: 65536,
  })
  expect(maps.find((map) => map.id !== id)).toMatchObject({
    name: 'edicao-legada-copia',
    offset: 0,
    first: 0,
    second: 9,
    cells: 65536,
  })
  expect((await disk(recovered, namespace, id)).version).toBe(2)
  expect((await disk(recovered, namespace, maps.find((map) => map.id !== id)!.id)).version).toBe(2)
})

test('duas abas modernas mantêm CAS; apagar o original coleta só seus chunks', async ({
  page,
  context,
}, info) => {
  const namespace = `chunk-cas-${Date.now()}-${info.project.name}`
  await open(page)
  const id = await seed(page, namespace)
  const second = await context.newPage()
  await open(second)
  await second.evaluate(
    async ({ namespace, id }) => {
      const realm = window
      realm.chunkClient = realm.pinta026.createPintaPersistence({ namespace })
      const map = await realm.chunkClient.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
      realm.chunkMap = map
    },
    { namespace, id },
  )
  await page.evaluate(async () => {
    const realm = window,
      map = realm.chunkMap!,
      floor = map.layers[0]
    if (!floor || !realm.pinta026.isTileLayer(floor)) throw new Error('Chão ausente')
    floor.cells[0] = 7
    map.name = 'confirmado'
    map.updatedAt++
    await realm.chunkClient!.persistAsset(map)
  })
  const forkIds = await second.evaluate(async () => {
    const realm = window,
      map = realm.chunkMap!,
      floor = map.layers[0]
    if (!floor || !realm.pinta026.isTileLayer(floor)) throw new Error('Chão ausente')
    floor.cells[0] = 9
    map.name = 'minhas-mudancas'
    map.updatedAt++
    try {
      await realm.chunkClient!.persistAsset(map)
      return []
    } catch (error) {
      if (error instanceof realm.pinta026.PintaLocalConflictError)
        return [...error.forks.values()].map((asset) => asset.id)
      throw error
    }
  })
  expect(forkIds).toHaveLength(1)
  const maps = await page.evaluate(async (namespace) => {
    const p = window.pinta026
    return (await p.createPintaPersistence({ namespace }).listAllAssets())
      .filter((asset) => asset.kind === 'tilemap')
      .map((map) => {
        const floor = map.layers[0]
        return {
          id: map.id,
          name: map.name,
          first: floor && p.isTileLayer(floor) ? floor.cells[0] : null,
        }
      })
  }, namespace)
  expect(maps).toEqual(
    expect.arrayContaining([
      { id, name: 'confirmado', first: 7 },
      { id: forkIds[0], name: 'minhas-mudancas-copia', first: 9 },
    ]),
  )
  await page.evaluate(
    async ({ namespace, id }) => {
      const client = window.pinta026.createPintaPersistence({ namespace })
      await client.loadAssetById(id)
      await client.deleteAsset(id)
    },
    { namespace, id },
  )
  expect(await disk(page, namespace, id)).toEqual({
    version: 1,
    chunks: 0,
    bytes: 0,
    headerArray: false,
  })
  expect((await disk(page, namespace, forkIds[0]!)).chunks).toBe(64)
  await open(page)
  expect(
    await page.evaluate(
      async ({ namespace, id }) =>
        window.pinta026.createPintaPersistence({ namespace }).loadAssetById(id),
      { namespace, id },
    ),
  ).toBeNull()
})

test('oficina: apagar, desfazer, refazer e reabrir conserva o mapa em chunks', async ({
  page,
}, info) => {
  const namespace = `chunk-ui-${Date.now()}-${info.project.name}`
  await open(page)
  const id = await seed(page, namespace)
  await page.goto(`/?namespace=${namespace}`)
  const reopen = page.getByRole('button', { name: 'Abrir mapa-chunks (Mapa)', exact: true })
  await reopen.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  const grid = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  const cursor = async () => {
    await grid.focus()
    await page.keyboard.press('Control+Home')
    await expect(page.locator('[data-pin-keyboard-cell]')).toBeVisible()
  }
  const pixel = async () => {
    const box = await page.locator('[data-pin-keyboard-cell]').boundingBox()
    if (!box) throw new Error('Casa do teclado ausente')
    return (
      await page.screenshot({
        clip: { x: box.x + box.width / 2, y: box.y + box.height / 2, width: 1, height: 1 },
      })
    ).toString('base64')
  }
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await cursor()
  const filled = await pixel()
  await page.keyboard.press('Enter')
  await expect.poll(pixel).not.toBe(filled)
  const erased = await pixel()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await cursor()
  await expect.poll(pixel).toBe(filled)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await cursor()
  await expect.poll(pixel).toBe(erased)
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await download).path()
  if (!file) throw new Error('Backup ausente')
  const text = await readFile(file, 'utf8'),
    portable = importPintaJson(text)
  expect(portable.warnings).toEqual([])
  expect(text).not.toContain('pinta-cells-32-v1')
  expect(text).not.toContain('pinta:local:chunk:')
  const exported = portable.assets.find((asset) => asset.id === id)
  const cells = exported?.kind === 'tilemap' ? exported.layers[0] : null
  if (!cells || !isTileLayer(cells)) throw new Error('Células ausentes no backup')
  expect(cells.cells[0]).toBe(-1)
  expect(cells.cells.length).toBe(65536)
  expect(cells.cells.every((value, index) => index === 0 || value === (index * 73) % 256)).toBe(
    true,
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  await info.attach('oficina-chunks', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(reopen).toBeVisible()
  await page.reload()
  await reopen.click()
  await cursor()
  await expect.poll(pixel).toBe(erased)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(reopen).toBeVisible()
  await open(page)
  const saved = await page.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026
      const map = await p.createPintaPersistence({ namespace }).loadAssetById(id)
      const floor = map?.kind === 'tilemap' ? map.layers[0] : null
      if (!floor || !p.isTileLayer(floor)) throw new Error('Chão não reabriu')
      return {
        first: floor.cells[0],
        unchanged: floor.cells.every((value, index) => index === 0 || value === (index * 73) % 256),
      }
    },
    { namespace, id },
  )
  expect(saved).toEqual({ first: -1, unchanged: true })
  expect((await disk(page, namespace, id)).version).toBe(2)
})
