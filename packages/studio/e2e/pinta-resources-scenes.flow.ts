import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const fixture = resolve(root, '.tmp/pinta-resources-e2e/resources.pinta.json')
test.beforeAll(() => {
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/resources.ts'), resolve(fixture, '..')],
    { cwd: root },
  )
})
test.use({ actionTimeout: 15000 })
test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'cpu4x') {
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
})
async function backup(page: Page) {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const path = await (await download).path()
  if (!path) throw new Error('Backup missing')
  const content = JSON.parse(await readFile(path, 'utf8'))
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return content
}
test('recursos: escolher animação, fixar, desfazer/refazer e reabrir com os mesmos pixels', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`/?namespace=resources-${Date.now()}`)
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  const open = page.getByRole('button', { name: 'Abrir recursos-qa (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: /^Objetos/ }).click()
  const picture = page.getByRole('img', { name: 'Árvore QA', exact: true })
  await expect(picture).toBeVisible()
  const overlay = page.locator('[data-pin-objects-overlay]')
  await overlay.scrollIntoViewIfNeeded()
  const position = await overlay.evaluate((element) => {
    const matrix = (element as SVGSVGElement).getScreenCTM()
    if (!matrix) throw new Error('Map transform missing')
    const point = new DOMPoint(24, 24).matrixTransform(matrix)
    return { x: point.x, y: point.y }
  })
  if (isMobile) await page.touchscreen.tap(position.x, position.y)
  else await page.mouse.click(position.x, position.y)
  const animation = page.getByRole('combobox', { name: 'Animação deste objeto', exact: true })
  await animation.selectOption({ label: 'vento' })
  // A three-frame row follows a one-frame row: this catches packing drift in the live SVG.
  await expect(picture).toHaveAttribute('viewBox', '32 16 16 16')
  const pixel = await picture.evaluate(async (el) => {
    const image = el.querySelector('image')!
    const source = new Image()
    source.src = image.getAttribute('href')!
    await source.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const [x, y] = el.getAttribute('viewBox')!.split(' ').map(Number)
    ctx.drawImage(source, x!, y!, 1, 1, 0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data]
  })
  expect(pixel).toEqual([0, 0, 255, 255])
  await page.getByRole('button', { name: 'Guardar esta versão', exact: true }).click()
  const frozen = await backup(page)
  expect(frozen.version).toBe(6)
  let map = frozen.assets.find((a: { kind: string }) => a.kind === 'tilemap')
  expect(map.resources).toHaveLength(1)
  const version = map.resources[0].asset.id
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Guardar esta versão', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Guardar a versão mais recente', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Guardar as peças deste mapa', exact: true }).click()
  map = (await backup(page)).assets.find((a: { kind: string }) => a.kind === 'tilemap')
  expect(map.resources).toHaveLength(2)
  expect(map.resources.some((r: { asset: { id: string } }) => r.asset.id === map.tilesetId)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await open.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await expect(picture).toHaveAttribute('viewBox', '32 16 16 16')
  const reopened = (await backup(page)).assets.find((a: { kind: string }) => a.kind === 'tilemap')
  expect(reopened.resources[0].asset.id).toBe(version)
  expect(reopened.resources).toHaveLength(2)
  expect(reopened.layers).toEqual(map.layers)
  await info.attach('versao-e-animacao', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  expect(errors).toEqual([])
})

test('mapa autocontido de 48 px abre sem originais e cola objetos na grade correta', async ({
  page,
  isMobile,
}) => {
  await page.goto(`/?namespace=closed-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(fixture, '../resources-frozen.pinta.json'))
  await page.getByRole('button', { name: 'Abrir recursos-qa (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Árvore QA', exact: true }).click()
  await page.getByRole('button', { name: 'Copiar', exact: true }).click()
  await page.getByRole('button', { name: 'Afastar', exact: true }).click()
  await page.getByRole('button', { name: 'Afastar', exact: true }).click()
  const overlay = page.locator('[data-pin-objects-overlay]')
  await overlay.scrollIntoViewIfNeeded()
  const point = await overlay.evaluate((element) => {
    const matrix = (element as SVGSVGElement).getScreenCTM()
    if (!matrix) throw new Error('Map transform missing')
    const target = new DOMPoint(120, 120).matrixTransform(matrix)
    return { x: target.x, y: target.y }
  })
  expect(
    await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-pin-objects-overlay]'),
      point,
    ),
  ).toBe(true)
  if (isMobile) await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.move(point.x, point.y)
  await page.getByRole('button', { name: 'Colar', exact: true }).click()
  const saved = await backup(page)
  expect(saved.assets).toHaveLength(1)
  const map = saved.assets[0]
  const objects = map.layers.flatMap(
    (l: { objects?: Array<{ name: string; x: number; y: number }> }) => l.objects ?? [],
  )
  const trees = objects.filter((o: { name: string }) => o.name.startsWith('Árvore QA'))
  expect(trees).toHaveLength(2)
  expect(trees.map((o: { x: number; y: number }) => [o.x, o.y])).toContainEqual([96, 96])
  expect(
    map.resources.find((r: { asset: { id: string } }) => r.asset.id === map.tilesetId).asset
      .tileSize,
  ).toBe(48)
})

test('copiar para outro mapa após reabrir leva a versão privada e desfaz os dados juntos', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000)
  await page.goto(`/?namespace=cross-map-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(fixture, '../resources-cross-map.pinta.json'))
  await page.getByRole('button', { name: 'Abrir recursos-qa (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Árvore QA', exact: true }).click()
  await page.getByRole('button', { name: 'Copiar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir destino-qa (Mapa)', exact: true }).click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Colar', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Árvore QA', exact: true })).toHaveAttribute(
    'viewBox',
    '32 16 16 16',
  )
  const pasted = (await backup(page)).assets.find((a: { kind: string }) => a.kind === 'tilemap')
  expect(pasted.resources).toHaveLength(2)
  const object = pasted.layers.flatMap((l: { objects?: unknown[] }) => l.objects ?? [])[0]
  expect(
    pasted.resources.some((v: { asset: { id: string } }) => v.asset.id === object.art.assetId),
  ).toBe(true)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  const undone = (await backup(page)).assets.find((a: { kind: string }) => a.kind === 'tilemap')
  expect(undone.resources).toHaveLength(1)
  expect(undone.layers.flatMap((l: { objects?: unknown[] }) => l.objects ?? [])).toHaveLength(0)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect(
    (await backup(page)).assets.find((a: { kind: string }) => a.kind === 'tilemap').resources,
  ).toHaveLength(2)
})
