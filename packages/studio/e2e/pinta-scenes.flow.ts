import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const fixture = resolve(root, '.tmp/pinta-scenes-e2e/vila-e-floresta.pinta.json')
type BackupAsset = {
  kind: string
  name: string
  schema?: number
  layers: Array<{ name: string; cells: number[]; offsetX?: number }>
}
test.beforeAll(() => {
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/generate.ts'), resolve(fixture, '..')],
    { cwd: root },
  )
})

async function backup(page: Page, expectedVersion?: number) {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const download = await event
  const path = await download.path()
  if (!path) throw new Error('O backup não foi gravado')
  const content = JSON.parse(await readFile(path, 'utf8'))
  if (expectedVersion !== undefined) expect(content.version).toBe(expectedVersion)
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return content.assets as BackupAsset[]
}
const mapOf = (assets: BackupAsset[]) => {
  const map = assets.find((a) => a.kind === 'tilemap' && a.name === 'vila-e-floresta')
  if (!map) throw new Error('O backup perdeu o mapa')
  return map
}

test('Vila: importar, editar, desfazer, refazer, reabrir e testar o mapa real', async ({
  page,
  isMobile,
  browser,
}, testInfo) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`/?namespace=e2e-${Date.now()}`)
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  const open = page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true })
  await expect(open).toBeVisible()
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Chão', exact: true }).click()
  const initial = await backup(page, 4)
  const before = mapOf(initial)
  expect(before.layers).toHaveLength(18)
  expect(initial.some((a) => a.kind === 'map-set')).toBe(true)
  expect(initial.filter((a) => a.kind === 'tileset')).toHaveLength(2)
  const floor = (m: BackupAsset) => {
    const l = m.layers.find((l) => l.name === 'Chão')
    if (!l) throw new Error('O mapa perdeu o chão')
    return l
  }
  expect(floor(before).cells[0]).toBeGreaterThanOrEqual(0)
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await canvas.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'start' }))
  if (isMobile) await canvas.tap({ position: { x: 8, y: 8 } })
  else await canvas.click({ position: { x: 8, y: 8 } })
  expect(floor(mapOf(await backup(page))).cells[0]).toBe(-1)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(mapOf(await backup(page)).layers).toEqual(before.layers)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await page.getByRole('button', { name: 'Sombras', exact: true }).click()
  await page.getByText('Deslocamento e distância', { exact: true }).click()
  await page.getByLabel('Deslocar X', { exact: true }).fill('2.5')
  await page.getByLabel('Deslocar X', { exact: true }).press('Tab')
  const after = mapOf(await backup(page, 5))
  expect(floor(after).cells[0]).toBe(-1)
  expect(after.schema).toBe(5)
  expect(after.layers.find((l) => l.name === 'Sombras')?.offsetX).toBe(2.5)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.reload()
  await open.click()
  expect(mapOf(await backup(page, 5)).layers).toEqual(after.layers)
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: 'Testar com personagem', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('canvas')).toBeVisible()
  await expect(dialog.getByRole('status')).toContainText('vila-e-floresta')
  // Mede o corpo azul do boneco, não a água animada do cenário.
  const heroX = () =>
    dialog.locator('canvas').evaluate((c: HTMLCanvasElement) => {
      const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      let sum = 0,
        count = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 37 && data[i + 1] === 99 && data[i + 2] === 235 && data[i + 3] === 255) {
          sum += (i / 4) % c.width
          count++
        }
      }
      return count ? sum / count : -1
    })
  await expect.poll(heroX).toBeGreaterThan(0)
  const still = await heroX()
  await page
    .getByRole('button', { name: 'Andar para a direita', exact: true })
    .dispatchEvent('pointerdown', { pointerId: 1 })
  await expect.poll(heroX).toBeGreaterThan(still + 1)
  await page
    .getByRole('button', { name: 'Andar para a direita', exact: true })
    .dispatchEvent('pointerup', { pointerId: 1 })
  expect(errors).toEqual([])
  await testInfo.attach('pinta-vila', { body: await page.screenshot(), contentType: 'image/png' })
  await testInfo.attach('ambiente', {
    body: Buffer.from(
      JSON.stringify(
        {
          browser: browser.version(),
          viewport: page.viewportSize(),
          isMobile,
          userAgent: await page.evaluate(() => navigator.userAgent),
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })
})
