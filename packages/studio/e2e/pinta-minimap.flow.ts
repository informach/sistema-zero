import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'
import { openPintaAuthorityProof } from './helpers/pintaAuthorityRealm'

test('minimapa existente navega por teclado e ponteiro sem alterar as células', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  const rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await openPintaAuthorityProof(page)
  const namespace = `minimap-${info.project.name}-${Date.now()}`
  const before = await page.evaluate(async (namespace) => {
    const p = window.pinta026
    const tiles = p.createTilesetAsset({ name: 'cores-navegacao', tileSize: 16 })
    tiles.tiles = [1, 2].map((color) => ({
      ...tiles.tiles[0]!,
      data: new Uint8Array(256).fill(color),
    }))
    tiles.solid = tiles.platform = [false, false]
    const map = p.createTilemapAsset({
      name: 'navegar-mapa',
      tilesetId: tiles.id,
      cols: 192,
      rows: 128,
    })
    map.layers = Array.from({ length: 2 }, (_, index) => ({
      id: `navigation-${index}`,
      name: `Camada ${index + 1}`,
      visible: true,
      cells: Int16Array.from({ length: 192 * 128 }, (_, cell) =>
        index ? Number(cell % 192 >= 96) : 0,
      ),
    }))
    const client = p.createPintaPersistence({ namespace })
    await client.persistAssets([tiles, map])
    const saved = await client.loadAssetById(map.id)
    if (saved?.kind !== 'tilemap') throw new Error('Mapa não foi guardado')
    return { id: map.id, layers: JSON.stringify(saved.layers) }
  }, namespace)
  await page.goto(`/?namespace=${namespace}`)
  await page.getByRole('button', { name: 'Abrir navegar-mapa (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  const panels = page.getByText(COPY.scene.mapPanels, { exact: true })
  if (await panels.isVisible()) await panels.click()
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('create')
  const minimap = page.getByRole('button', { name: COPY.scene.navegarPeloMinimapa, exact: true })
  await expect(minimap).toBeVisible()
  const rect = page.locator('[data-pin-minimap-view]')
  const position = () =>
    rect.evaluate((element) => ({
      x: parseFloat((element as HTMLElement).style.left),
      y: parseFloat((element as HTMLElement).style.top),
    }))
  const box = await minimap.boundingBox()
  if (!box) throw new Error('Minimapa sem tamanho')
  const point = { x: box.width * 0.8, y: box.height * 0.8 }
  if (info.project.name === 'touch') await minimap.tap({ position: point })
  else await minimap.click({ position: point })
  await expect.poll(async () => (await position()).x).toBeGreaterThan(40)
  const clicked = await position()
  await minimap.focus()
  await minimap.press('ArrowLeft')
  await expect.poll(async () => (await position()).x).toBeLessThan(clicked.x)
  const moved = await position()
  await minimap.press('Enter')
  await expect.poll(async () => Math.abs((await position()).x - moved.x)).toBeLessThan(0.01)
  await minimap.press('Space')
  await expect.poll(async () => Math.abs((await position()).x - moved.x)).toBeLessThan(0.01)
  await minimap.press('Home')
  await expect.poll(async () => (await position()).x).toBeLessThan(1)
  await minimap.press('End')
  await expect.poll(async () => (await position()).x).toBeGreaterThan(70)
  await expect.poll(async () => (await position()).y).toBeGreaterThan(70)
  expect(await minimap.getAttribute('aria-describedby')).toBeTruthy()
  await info.attach('minimapa', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Abrir navegar-mapa (Mapa)', exact: true }),
  ).toBeVisible()
  await openPintaAuthorityProof(page)
  const after = await page.evaluate(
    async ({ namespace, id }) => {
      const saved = await window.pinta026.createPintaPersistence({ namespace }).loadAssetById(id)
      if (saved?.kind !== 'tilemap') throw new Error('Mapa não reabriu')
      return JSON.stringify(saved.layers)
    },
    { namespace, id: before.id },
  )
  expect(after).toBe(before.layers)
  await cdp.detach()
})
