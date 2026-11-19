import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'
import { isObjectLayer, isTileLayer, type PintaAsset } from '../../pinta/src/core/project'

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

async function cursorPixel(page: Page): Promise<number[]> {
  const box = await page.locator('[data-pin-keyboard-cell]').boundingBox()
  if (!box) throw new Error('Casa do teclado esperada')
  const png = await page.screenshot({
    clip: { x: box.x + box.width / 2, y: box.y + box.height / 2, width: 1, height: 1 },
  })
  return page.evaluate(
    async (data) => {
      const image = new Image()
      image.src = data
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
    },
    `data:image/png;base64,${png.toString('base64')}`,
  )
}

test('pintar por teclado: pixel real, linha, cancelamento, seleção, cópia e reabertura', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=keyboard-paint-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'biblioteca.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('create')
  await page.getByRole('button', { name: 'Chão', exact: true }).click()
  const grid = page.getByRole('img', { name: COPY.tiles.mapGrid, exact: true })
  await page.getByRole('button', { name: 'Voltar', exact: true }).focus()
  await tabTo(page, grid)
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Enter')
  await expect.poll(() => cursorPixel(page)).toEqual([145, 70, 61])
  await page.keyboard.press('l')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-pin-keyboard-area]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-pin-keyboard-area]')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.keyboard.press('m')
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('button', { name: COPY.tiles.copyPiece, exact: true }))
  await page.keyboard.press('Enter')
  await tabTo(page, grid)
  await page.keyboard.press('Control+Home')
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect.poll(() => cursorPixel(page)).toEqual([145, 70, 61])
  await info.attach('pintura-por-teclado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  const assets = await backup(page),
    map = assets.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  const cells = map.layers.find(isTileLayer)!.cells
  expect(cells[0]).toBe(0)
  expect(cells[1 * 8 + 2]).toBe(0)
  expect(cells[2 * 8 + 2]).toBe(0)
  expect(cells[3 * 8 + 4]).toBe(0)
  expect(cells.filter((c) => c >= 0)).toHaveLength(4)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(open).toBeVisible()
  await page.reload()
  await open.click()
  const reopened = (await backup(page)).find((a) => a.kind === 'tilemap')
  if (reopened?.kind !== 'tilemap') throw new Error('Mapa esperado')
  expect(reopened.layers).toEqual(map.layers)
  await cdp.detach()
})

test('mapa rolado: cursor visível e deslocamento herdado aplicado uma vez', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=keyboard-scroll-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'teclado-grande.pinta.json'))
  await page
    .getByRole('button', { name: 'Abrir mapa-grande-do-teclado (Mapa)', exact: true })
    .click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: 'Chão', exact: true }).click()
  const grid = page.getByRole('img', { name: COPY.tiles.mapGrid, exact: true })
  await page.getByRole('button', { name: 'Voltar', exact: true }).focus()
  await tabTo(page, grid)
  await page.keyboard.press('Control+Home')
  const origin = await page.locator('.pin-paper').boundingBox(),
    cursor = await page.locator('[data-pin-keyboard-cell]').boundingBox()
  if (!origin || !cursor) throw new Error('Papel e casa esperados')
  const scale = cursor.width / 16
  expect(cursor.x - origin.x).toBeCloseTo(6.5 * scale, 1)
  expect(cursor.y - origin.y).toBeCloseTo(8.5 * scale, 1)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  const end = await page.locator('[data-pin-keyboard-cell]').boundingBox(),
    viewport = page.viewportSize()!
  if (!end) throw new Error('Casa final esperada')
  expect(end.x + end.width / 2).toBeGreaterThanOrEqual(0)
  expect(end.y + end.height / 2).toBeGreaterThanOrEqual(0)
  expect(end.x + end.width / 2).toBeLessThan(viewport.width)
  expect(end.y + end.height / 2).toBeLessThan(viewport.height)
  await expect.poll(() => cursorPixel(page)).toEqual([145, 70, 61])
  await info.attach('cursor-no-mapa-rolado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  const map = (await backup(page)).find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  const cells = map.layers.find(isTileLayer)!.cells
  expect(cells[0]).toBe(0)
  expect(cells[64 * 48 - 1]).toBe(0)
  expect(cells.filter((c) => c >= 0)).toHaveLength(2)
  await cdp.detach()
})

test('terreno pronto por teclado: materiais, borracha, retângulo, balde e histórico', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=keyboard-terrain-${info.project.name}-${Date.now()}`)
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByRole('button', { name: /Modelos prontos/ }).click()
  await page.getByRole('button', { name: /Bosque com terrenos/ }).click()
  await page.getByRole('textbox', { name: 'Qual o nome?', exact: true }).fill('bosque-pelo-teclado')
  await page.getByRole('button', { name: 'Começar a desenhar', exact: true }).click()
  const grid = page.getByRole('img', { name: COPY.tiles.mapGrid, exact: true })
  await expect(grid).toBeVisible()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  const readMap = async () => {
    const map = (await backup(page)).find((a) => a.kind === 'tilemap')
    if (map?.kind !== 'tilemap') throw new Error('Bosque esperado')
    return map
  }
  const initial = await readMap()
  await page.getByLabel('Terreno', { exact: true }).selectOption({ label: 'Grama e terra' })
  const grass = page.getByRole('button', { name: 'Pintar Grama e terra, cor 1', exact: true })
  await grass.focus()
  await grass.press('Enter')
  await tabTo(page, grid)
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  const painted = await readMap()
  expect(painted.layers).not.toEqual(initial.layers)
  await page.keyboard.press('Control+z')
  expect((await readMap()).layers).toEqual(initial.layers)
  await page.keyboard.press('Control+y')
  expect((await readMap()).layers).toEqual(painted.layers)
  await tabTo(page, grid)
  await page.keyboard.press('e')
  await page.keyboard.press('Enter')
  expect((await readMap()).layers).not.toEqual(painted.layers)
  await page.keyboard.press('Control+z')
  expect((await readMap()).layers).toEqual(painted.layers)
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('create')
  const earth = page.getByRole('button', { name: 'Pintar Grama e terra, cor 2', exact: true })
  await earth.focus()
  await earth.press('Enter')
  await tabTo(page, grid)
  await page.keyboard.press('u')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  const rectangle = await readMap()
  expect(rectangle.layers).not.toEqual(painted.layers)
  await tabTo(page, grid)
  await page.keyboard.press('g')
  await page.keyboard.press('Enter')
  const filled = await readMap()
  await info.attach('mapa-depois-do-balde', {
    body: JSON.stringify(filled),
    contentType: 'application/json',
  })
  expect(filled.layers).not.toEqual(rectangle.layers)
  await tabTo(page, grid)
  await page.keyboard.press('i')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: COPY.tools.pencil, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await info.attach('terreno-pelo-teclado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Abrir bosque-pelo-teclado (Mapa)', exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir bosque-pelo-teclado (Mapa)', exact: true }).click()
  const reopened = await readMap()
  await info.attach('mapa-reaberto', {
    body: JSON.stringify(reopened),
    contentType: 'application/json',
  })
  expect(reopened.layers).toEqual(filled.layers)
  await cdp.detach()
})

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
  await expect(open).toBeVisible()
  await page.reload()
  await open.click()
  const reopened = (await backup(page)).find((a) => a.kind === 'tilemap')
  if (reopened?.kind !== 'tilemap') throw new Error('Mapa reaberto esperado')
  expect(reopened.layers).toEqual(map.layers)
  await cdp.detach()
})
