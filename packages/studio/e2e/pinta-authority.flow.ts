import { expect, type Page, test } from '@playwright/test'
import { openPintaAuthorityProof as proof } from './helpers/pintaAuthorityRealm'

async function seed(page: Page, namespace: string) {
  return page.evaluate(async (ns) => {
    const p = window.pinta026
    const client = p.createPintaPersistence({ namespace: ns })
    const tiles = p.createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = p.createTilemapAsset({
      name: 'vila',
      tilesetId: tiles.id,
      cols: 2,
      rows: 2,
      now: 1,
    })
    const floor = map.layers[0]
    if (floor && 'cells' in floor && floor.cells) floor.cells[0] = 0
    map.layers.push({
      id: 'objects',
      kind: 'objects',
      name: 'Lugares',
      visible: true,
      objects: [
        {
          id: 'danger',
          name: 'Lago',
          type: '',
          shape: 'ellipse',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
          properties: {},
        },
      ],
    })
    await client.persistAssets([tiles, map])
    return map.id
  }, namespace)
}

test('espelho 2 do clipboard conserva arte privada e é recusado pelos leitores antigos', async ({
  page,
  context,
}) => {
  await proof(page)
  const text = await page.evaluate(() => {
    const p = window.pinta026,
      asset = p.createPixelSpriteAsset({ name: 'tree', frameSize: 16 })
    const store = p.createClipboardStore({ namespace: 'clipboard-six' })
    store.getState().set({
      kind: 'objects',
      objects: [
        {
          id: 'tree',
          name: 'Tree',
          type: '',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
          properties: {},
          art: { assetId: asset.id, animationId: asset.animations[0]!.id },
        },
      ],
      resources: [{ sourceId: 'original-tree', capturedAt: 100, asset }],
    })
    return localStorage.getItem(`${p.CLIPBOARD_STORAGE_KEY}:clipboard-six`)!
  })
  expect(JSON.parse(text).v).toBe(2)
  expect(
    await page.evaluate((text) => window.pinta026.parseClipboardMirror(text)?.item.kind, text),
  ).toBe('objects')
  for (const version of ['old', 'previous']) {
    const older = await context.newPage()
    await proof(older, version)
    expect(
      await older.evaluate((text) => window.pinta026.parseClipboardMirror(text), text),
    ).toBeNull()
  }
})

test('leitor nativo 5 recusa leitura e gravação sobre a versão 6 offline', async ({
  context,
  page,
}) => {
  const namespace = `resource-026-${Date.now()}`
  const previous = await context.newPage()
  await proof(previous, 'previous')
  expect(await previous.evaluate(() => window.pinta026.PINTA_MAX_SCHEMA)).toBe(5)
  const id = await seed(previous, namespace)
  await previous.evaluate(
    async ({ id, namespace }) => {
      window.client026 = window.pinta026.createPintaPersistence({ namespace })
      const asset = await window.client026.loadAssetById(id)
      if (!asset) throw new Error('Previous RAM missing')
      window.ram026 = asset
    },
    { id, namespace },
  )
  await proof(page)
  await context.setOffline(true)
  await page.evaluate(
    async ({ id, namespace }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const asset = await client.loadAssetById(id)
      if (asset?.kind !== 'tilemap') throw new Error('Map missing')
      const sprite = p.createPixelSpriteAsset({ name: 'tree', frameSize: 16 })
      sprite.id = 'frozen-tree'
      await client.persistAsset({
        ...asset,
        name: 'native-six',
        resources: [{ sourceId: 'tree-source', capturedAt: 100, asset: sprite }],
      })
    },
    { id, namespace },
  )
  await page.close()
  expect(await previous.evaluate((id) => window.client026.loadAssetById(id), id)).toBeNull()
  await expect(
    previous.evaluate(async () => {
      await window.client026.persistAsset({ ...window.ram026, name: 'old-five-edit' })
    }),
  ).rejects.toThrow('Atualize a página antes de alterar este desenho.')
  await context.setOffline(false)
  const reopened = await context.newPage()
  await proof(reopened)
  const maps = await reopened.evaluate(async (namespace) => {
    const assets = await window.pinta026.createPintaPersistence({ namespace }).listAllAssets()
    return assets.filter((a) => a.kind === 'tilemap')
  }, namespace)
  expect(
    maps.some(
      (a) =>
        a.id === id &&
        a.name === 'native-six' &&
        a.kind === 'tilemap' &&
        a.resources?.[0]?.asset.id === 'frozen-tree',
    ),
  ).toBe(true)
  expect(maps).toHaveLength(1)
})

test('026: RAM4 real, promoção5, páginas fechadas e recuperação offline na galeria', async ({
  context,
  page,
}, info) => {
  const namespace = `old-026-${Date.now()}`
  const old = await context.newPage()
  await proof(old, 'old')
  expect(await old.evaluate(() => window.pinta026.PINTA_MAX_SCHEMA)).toBe(4)
  const id = await seed(old, namespace)
  await old.evaluate(
    async ({ namespace, id }) => {
      window.client026 = window.pinta026.createPintaPersistence({ namespace })
      const ram = await window.client026.loadAssetById(id)
      if (!ram) throw new Error('RAM antiga ausente')
      window.ram026 = ram
    },
    { namespace, id },
  )
  await proof(page)
  await context.setOffline(true)
  await page.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const base = await client.loadAssetById(id)
      if (base?.kind !== 'tilemap') throw new Error('Mapa ausente')
      await client.persistAsset({
        ...base,
        name: 'rico-promovido',
        updatedAt: 2,
        layers: base.layers.map((l, i) => (i ? l : { ...l, offsetX: 2.5 })),
      })
    },
    { namespace, id },
  )
  expect(await old.evaluate((id) => window.client026.loadAssetById(id), id)).toBeNull()
  await page.close() // No modern page retains the authoritative document in RAM.
  await old.evaluate(async () => {
    await window.client026.persistAsset({ ...window.ram026, name: 'edicao-antiga', updatedAt: 3 })
  })
  await old.close()
  await context.setOffline(false) // Only serves the local JS; no cloud is configured/imported.
  const reopened = await context.newPage()
  await reopened.goto(`/?namespace=${namespace}`)
  await expect(
    reopened.getByRole('button', { name: 'Abrir rico-promovido (Mapa)', exact: true }),
  ).toBeVisible()
  await expect(
    reopened.getByRole('button', { name: 'Abrir edicao-antiga-copia (Mapa)', exact: true }),
  ).toBeVisible()
  await expect(
    reopened.getByText(
      'Recuperei uma edição de outra janela numa cópia. Seus desenhos foram protegidos.',
      { exact: true },
    ),
  ).toBeVisible()
  await reopened.screenshot({ path: info.outputPath('offline-reopened.png') })
  await proof(reopened)
  const assets = await reopened.evaluate(
    async (ns) =>
      (await window.pinta026.createPintaPersistence({ namespace: ns }).listAllAssets()).map(
        (a) => ({
          id: a.id,
          name: a.name,
          schema: 'schema' in a ? a.schema : undefined,
          kind: a.kind,
          offset: a.kind === 'tilemap' ? a.layers[0]?.offsetX : null,
        }),
      ),
    namespace,
  )
  expect(assets.find((a) => a.id === id)).toMatchObject({
    name: 'rico-promovido',
    schema: 5,
    offset: 2.5,
  })
  expect(assets.filter((a) => a.kind === 'tilemap')).toHaveLength(2)
  expect(assets.some((a) => a.name === 'edicao-antiga-copia' && a.id !== id)).toBe(true)
})

test('duas abas atuais conservam revisão concorrente; downgrade e lápide após reinício', async ({
  context,
  page,
}) => {
  await proof(page)
  const namespace = `cas-026-${Date.now()}`,
    id = await seed(page, namespace)
  const second = await context.newPage()
  await proof(second)
  for (const tab of [page, second])
    await tab.evaluate(
      async ({ namespace, id }) => {
        window.client026 = window.pinta026.createPintaPersistence({ namespace })
        const ram = await window.client026.loadAssetById(id)
        if (!ram) throw new Error('Mapa ausente')
        window.ram026 = ram
      },
      { namespace, id },
    )
  await page.evaluate(async () => {
    const map = window.ram026
    if (map.kind !== 'tilemap') throw new Error('Mapa ausente')
    await window.client026.persistAsset({
      ...map,
      name: 'confirmado',
      layers: map.layers.map((l, i) => (i ? l : { ...l, offsetX: 2.5 })),
    })
  })
  expect(
    await second.evaluate(async () => {
      try {
        await window.client026.persistAsset({ ...window.ram026, name: 'minhas-mudancas' })
        return []
      } catch (e) {
        if (e instanceof window.pinta026.PintaLocalConflictError)
          return [...e.forks.values()].map((a) => a.name)
        throw e
      }
    }),
  ).toEqual(['minhas-mudancas-copia'])
  await page.evaluate(async () => {
    const map = await window.client026.loadAssetById(window.ram026.id)
    if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
    await window.client026.persistAsset({
      ...map,
      layers: map.layers.map(({ offsetX, ...l }) => l),
    })
    await window.client026.deleteAsset(map.id)
  })
  await page.reload()
  await page.waitForFunction(() => !!window.pinta026)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const client = window.pinta026.createPintaPersistence({ namespace })
        const missing = await client.loadAssetById(id)
        return missing === null
      },
      { namespace, id },
    ),
  ).toBe(true)
  // Use the actual old writer on the same database after the modern deletion.
  await proof(second, 'old')
  await second.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        map = p.createTilemapAsset({ name: 'tardia', tilesetId: 'pecas', cols: 2, rows: 2 })
      await p.createPintaPersistence({ namespace }).persistAsset({ ...map, id })
    },
    { namespace, id },
  )
  const outcome = await page.evaluate(
    async ({ namespace, id }) => {
      const client = window.pinta026.createPintaPersistence({ namespace })
      return {
        original: await client.loadAssetById(id),
        names: (await client.listAllAssets()).map((a) => a.name),
      }
    },
    { namespace, id },
  )
  expect(outcome.original).toBeNull()
  expect(outcome.names).toContain('tardia-copia')
})

test('falha no segundo put aborta IndexedDB real e permite tentar novamente', async ({ page }) => {
  await proof(page)
  const namespace = `abort-026-${Date.now()}`,
    id = await seed(page, namespace)
  expect(
    await page.evaluate(
      async ({ namespace, id }) => {
        const client = window.pinta026.createPintaPersistence({ namespace })
        const base = await client.loadAssetById(id)
        if (!base) throw new Error('Mapa ausente')
        const rawSnapshot = async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(`sistema-zero-pinta-${namespace}`)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          try {
            return await new Promise<string>((resolve, reject) => {
              const tx = db.transaction('kv', 'readonly'),
                store = tx.objectStore('kv')
              const keys = store.getAllKeys(),
                values = store.getAll()
              tx.oncomplete = () =>
                resolve(JSON.stringify({ keys: keys.result, values: values.result }))
              tx.onabort = tx.onerror = () => reject(tx.error)
            })
          } finally {
            db.close()
          }
        }
        const before = await rawSnapshot()
        const original = IDBObjectStore.prototype.put
        let puts = 0,
          failure = ''
        IDBObjectStore.prototype.put = function (...args) {
          if (++puts === 2) throw new DOMException('Quota simulada', 'QuotaExceededError')
          return original.apply(this, args)
        }
        try {
          await client.persistAsset({ ...base, name: 'nao-confirmou' })
        } catch (e) {
          failure = e instanceof DOMException ? e.name : String(e)
        } finally {
          IDBObjectStore.prototype.put = original
        }
        const sameRecords = before === (await rawSnapshot())
        const unchanged = await client.loadAssetById(id)
        await client.persistAsset({ ...base, name: 'retry-confirmou' })
        return {
          puts,
          failure,
          sameRecords,
          nameAfterAbort: unchanged?.name,
          retry: (await client.loadAssetById(id))?.name,
        }
      },
      { namespace, id },
    ),
  ).toEqual({
    puts: 2,
    failure: 'QuotaExceededError',
    sameRecords: true,
    nameAfterAbort: 'vila',
    retry: 'retry-confirmou',
  })
})

test('editor adota a cópia confirmada e permite continuar, voltar e reabrir', async ({
  context,
  page,
}, info) => {
  await proof(page)
  const namespace = `editor-026-${Date.now()}`,
    id = await seed(page, namespace)
  const other = await context.newPage()
  await proof(other)
  await page.goto(`/?namespace=${namespace}`)
  await page.getByRole('button', { name: 'Abrir vila (Mapa)', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await expect(canvas).toBeVisible()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await other.evaluate(
    async ({ namespace, id }) => {
      const p = window.pinta026,
        client = p.createPintaPersistence({ namespace })
      const map = await client.loadAssetById(id)
      if (map?.kind !== 'tilemap') throw new Error('Mapa ausente')
      await client.persistAsset({
        ...map,
        name: 'outra-aba',
        layers: map.layers.map((l, i) => (i ? l : { ...l, offsetX: 2.5 })),
      })
    },
    { namespace, id },
  )
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await canvas.click({ position: { x: 8, y: 8 } })
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible()
  await expect(page.getByText('vila-copia', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled()
  const pencil = page.getByRole('button', { name: 'Lápis', exact: true })
  await pencil.click()
  await expect(pencil).toHaveAttribute('aria-pressed', 'true')
  await canvas.click({ position: { x: 48, y: 16 } })
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  // Voltar só fecha o editor depois de o flush confirmar a edição. Não interromper
  // essa gravação com um reload antes de a galeria reaparecer.
  await expect(page.getByRole('heading', { name: 'Meus desenhos', exact: true })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Abrir vila-copia (Mapa)', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Abrir outra-aba (Mapa)', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: info.outputPath('editor-recovered.png') })
  const contents = await other.evaluate(async (namespace) => {
    const assets = await window.pinta026.createPintaPersistence({ namespace }).listAllAssets()
    return assets
      .filter((a) => a.kind === 'tilemap')
      .map((a) => ({
        name: a.name,
        cells: a.layers.flatMap((l) => ('cells' in l && l.cells ? [...l.cells] : [])),
      }))
  }, namespace)
  expect(contents.find((a) => a.name === 'vila-copia')?.cells.slice(0, 2)).toEqual([-1, 0])
  expect(contents.find((a) => a.name === 'outra-aba')?.cells[0]).toBe(0)
})

test('orçamento da transação com 500 sprites; captura e revisões preservadas', async ({
  page,
}, info) => {
  await proof(page)
  const namespace = `budget-026-${Date.now()}`
  const measured = await page.evaluate(async (namespace) => {
    const p = window.pinta026,
      client = p.createPintaPersistence({ namespace })
    const sprites = Array.from({ length: 500 }, (_, i) =>
      p.createPixelSpriteAsset({ name: `sprite-${i}`, frameSize: 16 }),
    )
    const tiles = p.createTilesetAsset({ name: 'pecas', tileSize: 16 })
    const map = p.createTilemapAsset({ name: 'mapa', tilesetId: tiles.id, cols: 16, rows: 16 })
    await client.persistAssets([...sprites, tiles, map])
    await client.listAllAssets()
    const elapsed: number[] = []
    for (let i = 0; i < 10; i++) {
      const start = performance.now()
      await client.persistAsset({ ...map, name: `mapa-${i}` })
      elapsed.push(performance.now() - start)
    }
    const capture = await p.capturePintaAssetForImage(map.id, { namespace })
    return {
      elapsed,
      count: (await client.listAllAssets()).length,
      captured: capture.ok ? { name: capture.source.name, tiles: capture.tileset?.id } : capture,
      tilesId: tiles.id,
    }
  }, namespace)
  expect(measured.count).toBe(502)
  expect(measured.captured).toEqual({ name: 'mapa-9', tiles: measured.tilesId })
  await info.attach('indexeddb-budget.json', {
    body: JSON.stringify(measured, null, 2),
    contentType: 'application/json',
  })
})
