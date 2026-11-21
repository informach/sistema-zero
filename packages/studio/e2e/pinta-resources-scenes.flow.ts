import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { isObjectLayer, isTilesetKind, type TilemapAsset } from '../../pinta/src/core/project'
import { importPintaJson } from '../../pinta/src/export/projectJson'

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
  const rate = Number(info.project.metadata.cpuSlowdown ?? (info.project.name === 'cpu4x' ? 4 : 1))
  if (rate > 1) {
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate })
  }
  await info.attach('perfil-de-cpu', {
    body: JSON.stringify({ rate, emulated: true }),
    contentType: 'application/json',
  })
})

test('espalhar arte privada religa cada cópia e conserva recursos no cancelamento, histórico e reabertura', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120000)
  await page.goto(`/?namespace=scatter-references-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(fixture, '../resources-object-references.pinta.json'))
  await page.getByRole('button', { name: 'Abrir vinculos-qa (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Placa QA', exact: true }).click()
  async function saved() {
    const map = importPintaJson(JSON.stringify(await backup(page))).assets.find(
      (a) => a.kind === 'tilemap' && a.name === 'vinculos-qa',
    )
    if (map?.kind !== 'tilemap') throw Error('Mapa esperado')
    return map
  }
  const original = await saved()
  await page.getByRole('button', { name: 'Espalhar desenhos', exact: true }).click()
  await page.getByLabel('Tamanho do pincel (casas)', { exact: true }).selectOption('1')
  const density = page.getByRole('slider', { name: /^Densidade/ })
  await density.focus()
  await density.press('End')
  const spacing = page.getByRole('slider', { name: /^Distância entre centros:/ })
  await spacing.focus()
  await spacing.press('Home')
  const cdp = await page.context().newCDPSession(page)
  async function begin() {
    const overlay = page.locator('[data-pin-objects-overlay]')
    await overlay.scrollIntoViewIfNeeded()
    const points = await overlay.evaluate((element) => {
      const matrix = (element as SVGSVGElement).getScreenCTM()
      if (!matrix) throw Error('Transformação esperada')
      return [new DOMPoint(56, 56), new DOMPoint(72, 56)].map((point) => {
        const p = point.matrixTransform(matrix)
        return { x: p.x, y: p.y }
      })
    })
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(page.viewportSize()!.width)
      expect(p.y).toBeLessThan(page.viewportSize()!.height)
    }
    if (isMobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]!] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [points[1]!] })
    } else {
      await page.mouse.move(points[0]!.x, points[0]!.y)
      await page.mouse.down()
      await page.mouse.move(points[1]!.x, points[1]!.y, { steps: 3 })
    }
    const preview = page.locator('[data-pin-scatter-preview]')
    await expect(preview).toHaveCount(2)
    await expect(preview.locator('image')).toHaveCount(2)
    await expect(preview.first().locator('image')).toHaveAttribute('href', /^data:image\//)
    return preview.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-pin-scatter-preview')),
    )
  }
  await begin()
  if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  else {
    await page.keyboard.press('Escape')
    await page.mouse.up()
  }
  expect((await saved()).resources).toEqual(original.resources)
  expect((await saved()).layers).toEqual(original.layers)
  const previewIds = await begin()
  if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  else await page.mouse.up()
  await expect(page.locator('[data-pin-scatter-preview]')).toHaveCount(0)
  const placed = await saved(),
    objects = placed.layers.filter(isObjectLayer).flatMap((l) => l.objects)
  expect(objects).toHaveLength(3)
  expect(objects.slice(1).map((o) => o.id)).toEqual(previewIds)
  expect(placed.resources).toHaveLength(6)
  for (const object of objects) {
    const dependent = placed.resources!.find((v) => v.asset.id === object.art?.assetId)!.asset
    if (!isTilesetKind(dependent)) throw Error('Peças esperadas')
    const ref = dependent.tileProperties!['0']!.linked
    if (typeof ref !== 'object' || ref.type !== 'asset') throw Error('Vínculo esperado')
    const direct = placed.resources!.find((v) => v.asset.id === ref.value)!.asset
    if (!isTilesetKind(direct)) throw Error('Peças esperadas')
    expect(direct.tileProperties!['0']!.marker).toEqual({ type: 'object', value: object.id })
  }
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect((await saved()).layers).toEqual(original.layers)
  expect((await saved()).resources).toEqual(original.resources)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect((await saved()).resources).toEqual(placed.resources)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir vinculos-qa (Mapa)', exact: true }).click()
  const reopened = await saved()
  expect(reopened.layers).toEqual(placed.layers)
  expect(reopened.resources).toEqual(placed.resources)
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

test('colar entre mapas religa propriedades de objetos e a cadeia de versões privadas com um histórico', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000)
  await page.goto(`/?namespace=object-references-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(fixture, '../resources-object-references.pinta.json'))
  await page.getByRole('button', { name: 'Abrir vinculos-qa (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Escolher o objeto Placa QA', exact: true }).click()
  async function saved(name: string) {
    const parsed = importPintaJson(JSON.stringify(await backup(page))),
      map = parsed.assets.find((a) => a.kind === 'tilemap' && a.name === name)
    if (map?.kind !== 'tilemap') throw Error('Mapa esperado')
    return map
  }
  function refs(map: TilemapAsset) {
    const object = map.layers.filter(isObjectLayer).flatMap((l) => l.objects)[0]!,
      dependent = map.resources!.find((v) => v.asset.id === object.art?.assetId)!.asset
    if (!isTilesetKind(dependent)) throw Error('Peças esperadas')
    const linked = dependent.tileProperties!['0']!.linked
    if (typeof linked !== 'object' || linked.type !== 'asset') throw Error('Vínculo esperado')
    const direct = map.resources!.find((v) => v.asset.id === linked.value)!.asset
    if (!isTilesetKind(direct)) throw Error('Peças esperadas')
    return { object, dependent, direct }
  }
  const original = refs(await saved('vinculos-qa'))
  await page.getByRole('button', { name: 'Copiar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir destino-vinculos-qa (Mapa)', exact: true }).click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByRole('button', { name: /^Objetos/ }).click()
  await page.getByRole('button', { name: 'Colar', exact: true }).click()
  const pasted = await saved('destino-vinculos-qa'),
    copy = refs(pasted)
  expect(copy.object.id).not.toBe(original.object.id)
  expect(copy.dependent.id).not.toBe(original.dependent.id)
  expect(copy.direct.id).not.toBe(original.direct.id)
  expect(copy.direct.tileProperties!['0']!.marker).toEqual({
    type: 'object',
    value: copy.object.id,
  })
  expect(copy.direct.tileProperties!['0']!.literal).toBe('qa-object-reference-source')
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  const undone = await saved('destino-vinculos-qa')
  expect(undone.layers.filter(isObjectLayer).flatMap((l) => l.objects)).toHaveLength(0)
  expect(undone.resources ?? []).toHaveLength(0)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect(refs(await saved('destino-vinculos-qa'))).toEqual(copy)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir destino-vinculos-qa (Mapa)', exact: true }).click()
  expect(refs(await saved('destino-vinculos-qa'))).toEqual(copy)
})
