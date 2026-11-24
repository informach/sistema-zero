import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'
import { isTileLayer, type MapSetAsset } from '../../pinta/src/core/project'
import { galleryToPintaJson, importPintaJson } from '../../pinta/src/export/projectJson'

const root = resolve(import.meta.dirname, '../../..'),
  directory = resolve(root, '.tmp/pinta-brush-workshop')
test.beforeAll(() =>
  execFileSync('bun', [resolve(root, 'packages/pinta/scripts/homologacao/library.ts'), directory], {
    cwd: root,
  }),
)

test('conjunto na oficina: apagar por ponteiro, desfazer/refazer e reabrir conserva o documento', async ({
  page,
}, info) => {
  test.setTimeout(150000)
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  const assets = importPintaJson(
      await readFile(resolve(directory, 'biblioteca.pinta.json'), 'utf8'),
    ).assets,
    original = assets.find((asset): asset is MapSetAsset => asset.kind === 'map-set')
  if (!original) throw Error('Conjunto ausente')
  const first = original.map.layers.find(isTileLayer)
  if (!first) throw Error('Camada ausente')
  first.cells[0] = 0
  await page.goto(`/?namespace=brush-set-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'conjunto.pinta.json',
      mimeType: 'application/json',
      buffer: Buffer.from(galleryToPintaJson(assets)),
    })
  const open = page.getByRole('button', { name: new RegExp(`^Abrir ${original.name} \\(`) })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  let importedId: string | undefined
  const backup = async (): Promise<MapSetAsset> => {
    await page.getByRole('button', { name: 'Baixar', exact: true }).click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
    const path = await (await pending).path()
    if (!path) throw Error('Backup ausente')
    const result = importPintaJson(await readFile(path, 'utf8')).assets.find((asset) =>
      importedId
        ? asset.id === importedId
        : asset.kind === 'map-set' && asset.name === original.name,
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Fechar', exact: true })
      .last()
      .click()
    if (result?.kind !== 'map-set') throw Error('Conjunto não reabriu')
    importedId ??= result.id
    return result
  }
  // Import deliberately creates new IDs and relinks the graph. The edit
  // baseline is the actual imported document, whose ID stays fixed from here.
  const baseline = await backup(),
    baselineFirst = baseline.map.layers.find(isTileLayer)
  if (!baselineFirst) throw Error('Camada importada ausente')
  const grid = page.getByRole('img', { name: COPY.tiles.mapGrid, exact: true })
  await grid.focus()
  await page.keyboard.press('Control+Home')
  const cursor = page.locator('[data-pin-keyboard-cell]')
  await expect(cursor).toBeVisible()
  const box = await cursor.boundingBox()
  if (!box) throw Error('Casa inicial ausente')
  await page.getByRole('button', { name: COPY.tools.eraser, exact: true }).click()
  if (info.project.name === 'touch')
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const check = (actual: MapSetAsset, erased: boolean) => {
    const expected: MapSetAsset = {
      ...baseline,
      map: {
        ...baseline.map,
        layers: baseline.map.layers.map((layer) => {
          if (!isTileLayer(layer) || layer.id !== baselineFirst.id) return layer
          const cells = new Int16Array(layer.cells)
          cells[0] = erased ? -1 : 0
          return { ...layer, cells }
        }),
      },
    }
    expect({
      ...actual,
      updatedAt: expected.updatedAt,
      map: { ...actual.map, updatedAt: expected.map.updatedAt },
    }).toEqual(expected)
  }
  check(await backup(), true)
  await page.keyboard.press('Control+z')
  check(await backup(), false)
  await page.keyboard.press('Control+Shift+z')
  check(await backup(), true)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(open).toBeVisible()
  await page.reload()
  await open.click()
  check(await backup(), true)
  await info.attach('conjunto-editado', {
    body: JSON.stringify({
      cpuSlowdown: rate,
      source: baseline.id,
      exactNativeComparisons: 4,
      reopened: true,
    }),
    contentType: 'application/json',
  })
  await info.attach('conjunto-na-oficina', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await cdp.detach()
})
