import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'
import { isObjectLayer, type PintaAsset } from '../../pinta/src/core/project'

const root = resolve(import.meta.dirname, '../../..')
const directory = resolve(root, '.tmp/pinta-keyboard-e2e')
test.beforeAll(() =>
  execFileSync('bun', [resolve(root, 'packages/pinta/scripts/homologacao/library.ts'), directory], {
    cwd: root,
  }),
)

async function backup(page: Page): Promise<PintaAsset[]> {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await pending).path()
  if (!file) throw new Error('Backup esperado')
  const assets = JSON.parse(await readFile(file, 'utf8')).assets
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return assets
}

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 100; step++) {
    if (await target.evaluate((node) => node === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Controle não alcançado por Tab')
}

test('marcador sem ponteiro: Tab, Enter, campos, Esc, histórico e reabertura', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=keyboard-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'biblioteca.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('start')
  const objects = page.getByRole('button', { name: 'Objetos', exact: true })
  await objects.focus()
  await objects.press('Enter')
  // A partir da camada, alcançar e acionar o marcador somente pelo teclado.
  const marker = page.getByRole('button', { name: COPY.tiles.addMarker, exact: true })
  await tabTo(page, marker)
  const focus = await marker.evaluate((node) => ({
    style: getComputedStyle(node).outlineStyle,
    width: parseFloat(getComputedStyle(node).outlineWidth),
  }))
  expect(focus.style).not.toBe('none')
  expect(focus.width).toBeGreaterThan(0)
  const rect = await marker.boundingBox()
  expect(rect).not.toBeNull()
  expect(rect!.y).toBeGreaterThanOrEqual(0)
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.keyboard.press('Enter')
  const name = page.getByLabel(COPY.tiles.objectName, { exact: true })
  await tabTo(page, name)
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('Chegada pelo teclado')
  await page.keyboard.press('Tab')
  await tabTo(page, page.getByLabel(COPY.tiles.objectRole, { exact: true }))
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(COPY.tiles.objectRole, { exact: true })).toHaveValue('start')
  await tabTo(page, page.getByLabel('X', { exact: true }))
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('24')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('32')
  await page.keyboard.press('Enter')
  await tabTo(page, name)
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText('Rascunho cancelado')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Tab')
  await expect(name).toHaveValue('Chegada pelo teclado')
  await tabTo(page, page.getByRole('button', { name: COPY.editor.undo, exact: true }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Y', { exact: true })).not.toHaveValue('32')
  await tabTo(page, page.getByRole('button', { name: COPY.editor.redo, exact: true }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Y', { exact: true })).toHaveValue('32')
  const viewport = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    width: innerWidth,
  }))
  expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.width)
  await info.attach('marcador-e-foco', { body: await page.screenshot(), contentType: 'image/png' })
  const assets = await backup(page)
  const map = assets.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  const point = map.layers
    .filter(isObjectLayer)
    .flatMap((l) => l.objects)
    .find((o) => o.name === 'Chegada pelo teclado')
  expect(point).toMatchObject({ x: 24, y: 32, role: 'start', width: 0, height: 0 })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.reload()
  await open.click()
  const reopened = (await backup(page)).find((a) => a.kind === 'tilemap')
  if (reopened?.kind !== 'tilemap') throw new Error('Mapa reaberto esperado')
  expect(reopened.layers).toEqual(map.layers)
  await cdp.detach()
})
