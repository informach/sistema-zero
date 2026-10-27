import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { resolvePaletteColors } from '../src/core/sanitize'
import { SCENE_PAINT_COPY as paintCopy } from '../src/core/scenePaintCopy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { sceneBentPaint } from '../src/testing/sceneBentPaint'
import { openPainting, savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

for (const dark of [false, true]) {
  test(`pixel details open with one face click and stay beside the live model (${dark ? 'dark' : 'light'})`, async ({
    page,
  }) => {
    const empty = createSceneProject({ kind: 'empty', name: 'Pintura simples' })
    const source = await openPainting(
      page,
      dark,
      addScenePrimitive(
        { ...empty, settings: { ...empty.settings, texelsPerUnit: 8 } },
        'box',
        'caixa',
      ),
    )
    await expect(page.getByRole('button', { name: '1 px', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: paintCopy.closeUp, exact: true }).click()
    const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
    const bounds = (await stage.boundingBox())!
    await page.mouse.click(bounds.x + bounds.width / 2 - 20, bounds.y + bounds.height / 2 + 20)
    const details = page.getByRole('region', { name: paintCopy.closeUp, exact: true })
    await expect(details).toBeVisible()
    const drawing = details.getByRole('button', { name: paintCopy.closeUpSheet, exact: true })
    const image = drawing.locator('canvas')
    const detailBounds = (await details.boundingBox())!
    const modelBounds = (await stage.boundingBox())!
    expect(detailBounds.x + detailBounds.width).toBeLessThanOrEqual(modelBounds.x + 1)
    await expect(details.getByRole('checkbox', { name: paintCopy.pixelGrid })).toBeChecked()
    const red = resolvePaletteColors(source)[2]!
    await page.getByRole('button', { name: COPY.a11y.colorSwatch(2, red), exact: true }).click()
    const hit = async (column: number, row: number) => {
      const box = (await image.boundingBox())!
      const width = Number(await image.getAttribute('width'))
      const height = Number(await image.getAttribute('height'))
      await page.mouse.click(
        box.x + ((column + 0.5) * box.width) / width,
        box.y + ((row + 0.5) * box.height) / height,
      )
    }
    await hit(0, 0)
    const painted = await savedProject(page)
    expect(inkCount(painted)).toBe(1)
    await page.screenshot({
      path: `.cache/pintura-pixel-detalhes-${dark ? 'escura' : 'clara'}.png`,
    })
    const originalWidth = (await image.boundingBox())!.width
    await details.getByRole('button', { name: paintCopy.zoomIn }).click()
    expect((await image.boundingBox())!.width).toBeGreaterThan(originalWidth)
    await hit(1, 1)
    expect(inkCount(await savedProject(page))).toBe(2)
    await details.locator('.mld-checkerboard').evaluate((element) => {
      element.scrollLeft = 48
    })
    const box = (await image.boundingBox())!
    const size = box.width / Number(await image.getAttribute('width'))
    await page.mouse.move(box.x + 1.5 * size, box.y + 2.5 * size)
    await page.mouse.down()
    await page.mouse.move(box.x + 3.5 * size, box.y + 2.5 * size, { steps: 2 })
    await page.mouse.up()
    expect(inkCount(await savedProject(page))).toBe(5)
    await page.getByRole('button', { name: '2 px', exact: true }).click()
    await hit(2, 4)
    expect(inkCount(await savedProject(page))).toBe(9)
    await page.getByRole('button', { name: 'Borracha', exact: true }).click()
    await page.getByRole('button', { name: '1 px', exact: true }).click()
    await hit(1, 1)
    expect(inkCount(await savedProject(page))).toBe(8)
    await page.getByRole('button', { name: 'Pincel', exact: true }).click()
    await drawing.focus()
    await drawing.press('ArrowDown')
    // A focus/zoom scroll must not discard the pixel selected by the keyboard.
    await details.locator('.mld-checkerboard').dispatchEvent('scroll')
    await drawing.press('Space')
    expect(inkCount(await savedProject(page))).toBe(9)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    for (let undo = 0; undo < 3; undo++)
      await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect(inkCount(await savedProject(page))).toBe(2)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(painted.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(source.images)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('pixel details keep a usable canvas and return to the model on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPainting(page)
  await page.getByRole('button', { name: paintCopy.closeUp, exact: true }).click()
  const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  await stage.scrollIntoViewIfNeeded()
  const bounds = (await stage.boundingBox())!
  await page.mouse.click(bounds.x + bounds.width / 2 - 20, bounds.y + bounds.height / 2 + 20)
  const details = page.getByRole('region', { name: paintCopy.closeUp, exact: true })
  await expect(details).toBeVisible()
  const pixels = details.getByRole('button', { name: paintCopy.closeUpSheet, exact: true })
  await pixels.scrollIntoViewIfNeeded()
  await page.screenshot({ path: '.cache/pintura-pixel-detalhes-celular.png' })
  expect((await details.locator('.mld-checkerboard').boundingBox())!.height).toBeGreaterThan(120)
  await details.getByRole('button', { name: paintCopy.closeUpBack, exact: true }).click()
  await expect(details).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

function inkCount(project: MoldaSceneDocument) {
  return project.images.reduce(
    (total, image) =>
      total +
      image.layers.reduce(
        (count, layer) =>
          count +
          [...layer.pixels].filter((value, index) =>
            image.encoding === 'indexed' ? value !== 0 : index % 4 === 3 && value !== 0,
          ).length,
        0,
      ),
    0,
  )
}

for (const dark of [false, true]) {
  test(`ready colors, direct drawing, bucket, eraser and undo (${dark ? 'dark' : 'light'})`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const source = await openPainting(page, dark)
    const advanced = page.locator('details').filter({
      has: page.locator('summary').getByText(paintCopy.more, { exact: true }),
    })
    expect(await advanced.evaluate((element) => element.hasAttribute('open'))).toBe(false)
    await expect(page.getByLabel('Cor hexadecimal')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Materiais', exact: true })).toBeHidden()
    const hex = resolvePaletteColors(source)[2]!
    const red = page.getByRole('button', { name: COPY.a11y.colorSwatch(2, hex), exact: true })
    await red.click()
    await expect(red).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(paintCopy.instructions.pencil, { exact: true })).toBeVisible()
    const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
    const bounds = (await stage.boundingBox())!
    const point = { x: bounds.x + bounds.width / 2 - 20, y: bounds.y + bounds.height / 2 + 20 }
    const stroke = async () => {
      await page.mouse.move(point.x - 6, point.y)
      await page.mouse.down()
      await page.mouse.move(point.x + 6, point.y + 4, { steps: 6 })
      await page.mouse.up()
    }
    // No selection, layer, image or UV setup before the first stroke.
    await stroke()
    const painted = await savedProject(page)
    expect(inkCount(painted)).toBeGreaterThan(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(await advanced.evaluate((element) => element.hasAttribute('open'))).toBe(false)
    await page.screenshot({ path: `.cache/pintura-simples-${dark ? 'escura' : 'clara'}.png` })

    await page.getByRole('button', { name: 'Borracha', exact: true }).click()
    await expect(page.getByText(paintCopy.instructions.eraser, { exact: true })).toBeVisible()
    await stroke()
    expect(inkCount(await savedProject(page))).toBeLessThan(inkCount(painted))
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(painted.images)

    await page.getByRole('button', { name: 'Balde', exact: true }).click()
    const yellow = resolvePaletteColors(source)[5]!
    await page.getByRole('button', { name: COPY.a11y.colorSwatch(5, yellow), exact: true }).click()
    await expect(page.getByText(paintCopy.instructions.fill, { exact: true })).toBeVisible()
    await page.mouse.click(point.x, point.y)
    expect((await savedProject(page)).images).not.toEqual(painted.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(painted.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(source.images)
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    expect((await savedProject(page)).images).toEqual(painted.images)

    await page.locator('summary').getByText(paintCopy.customColor, { exact: true }).click()
    await expect(page.getByLabel('Cor hexadecimal')).toBeVisible()
    await page.getByLabel('Cor hexadecimal').fill('#123456')
    await page.getByLabel('Cor hexadecimal').blur()
    await page.getByRole('button', { name: paintCopy.saveColor, exact: true }).click()
    await expect(
      page.getByRole('button', { name: paintCopy.saveColor, exact: true }),
    ).toBeDisabled()
    expect((await savedProject(page)).images).toEqual(painted.images)
    await page.locator('summary').getByText(paintCopy.customColor, { exact: true }).click()

    await page.getByRole('button', { name: 'Escolher caixa', exact: true }).click()
    await page.getByRole('button', { name: 'Folha de pintura', exact: true }).click()
    await expect(
      page.getByRole('button', { name: COPY.scene.paintCanvas, exact: true }),
    ).toBeVisible()
    expect(await advanced.evaluate((element) => element.hasAttribute('open'))).toBe(false)
    expect(errors).toEqual([])
  })
}

test('ready colors fit a narrow screen and advanced workspaces remain optional', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const source = await openPainting(page)
  const colors = page.getByRole('tab', { name: 'Cores', exact: true })
  if (await colors.isVisible()) await colors.click()
  const red = page.getByRole('button', {
    name: COPY.a11y.colorSwatch(2, resolvePaletteColors(source)[2]!),
    exact: true,
  })
  await expect(page.getByText(paintCopy.chooseColor, { exact: true })).toBeVisible()
  await red.click()
  await expect(red).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Cor hexadecimal')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '.cache/pintura-simples-celular.png' })
  await page.getByRole('button', { name: 'Opções', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Materiais', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Materiais', exact: true }).click()
  const more = page.getByRole('button', { name: 'Opções', exact: true })
  await page.getByRole('button', { name: 'Fechar área', exact: true }).click()
  await expect(more).toBeFocused()
})

test('a bent piece changes its base color directly and offers one visible preparation before drawing', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { document: source, nodeId } = sceneBentPaint()
  await openPainting(page, false, source)
  const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const bounds = (await stage.boundingBox())!
  const point = { x: bounds.x + bounds.width / 2 - 20, y: bounds.y + bounds.height / 2 + 20 }
  await page.getByRole('button', { name: 'Balde', exact: true }).click()
  await page.getByRole('radio', { name: 'Cor de fundo da peça', exact: true }).check()
  await page
    .getByRole('button', {
      name: COPY.a11y.colorSwatch(2, resolvePaletteColors(source)[2]!),
      exact: true,
    })
    .click()
  await page.mouse.click(point.x, point.y)
  const colored = await savedProject(page)
  expect(colored.geometries).toEqual(source.geometries)
  expect(colored.images).toEqual(source.images)
  const node = colored.nodes.find((entry) => entry.id === nodeId)!
  if (node.kind !== 'mesh') throw new Error('Missing painted body')
  expect(colored.materials.find((entry) => entry.id === node.materialId)!.baseColor).toEqual({
    kind: 'rgba',
    value: [1, 33 / 255, 33 / 255, 1],
  })
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByRole('button', { name: 'Pincel', exact: true }).click()
  const stroke = async () => {
    await page.mouse.move(point.x - 6, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + 6, point.y + 4, { steps: 6 })
    await page.mouse.up()
  }
  await stroke()
  const colors = page.getByRole('region', { name: paintCopy.colors, exact: true })
  const prepare = colors.getByRole('button', { name: paintCopy.split, exact: true })
  await expect(prepare).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.screenshot({ path: '.cache/pintura-preparar-peca.png' })
  expect((await savedProject(page)).images).toEqual(source.images)
  await prepare.click()
  await expect(prepare).toHaveCount(0)
  await page
    .getByRole('button', {
      name: COPY.a11y.colorSwatch(5, resolvePaletteColors(source)[5]!),
      exact: true,
    })
    .click()
  await stroke()
  const painted = await savedProject(page)
  expect(inkCount(painted)).toBeGreaterThan(0)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const restored = await savedProject(page)
  expect(restored.geometries).toEqual(colored.geometries)
  expect(restored.images).toEqual(colored.images)
  expect(restored.materials).toEqual(colored.materials)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('intermediate texture creation returns to painting on the model', async ({ page }) => {
  await openPainting(page, false, undefined, 'architect')
  await page.getByRole('button', { name: COPY.scene.select('caixa') }).click()
  await page.getByText(COPY.scene.appearanceTitle, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.imageCreate, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: COPY.scene.imageCreate })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: COPY.scene.imageName })).toHaveValue(
    COPY.scene.imageDefaultName,
  )
  await dialog.getByRole('button', { name: COPY.scene.imageCreateApply }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText(`Pintando no modelo: ${COPY.scene.imageDefaultName}`)).toBeVisible()
  const document = await savedProject(page)
  expect(document.images.some((image) => image.name === COPY.scene.imageDefaultName)).toBe(true)
  await page.screenshot({ path: '.cache/pintura-textura-intermediaria.png' })
})

test('advanced painting keeps texture and layer tools available', async ({ page }) => {
  await openPainting(page, false, undefined, 'god')
  await page.getByRole('button', { name: COPY.scene.select('caixa') }).click()
  await page.getByText(COPY.scene.appearanceTitle, { exact: true }).click()
  await expect(page.getByText('Pintura do modelo')).toBeVisible()
  await expect(
    page.getByRole('button', { name: COPY.scene.imageCreate, exact: true }),
  ).toBeVisible()
})

test('gradient shows both opacity controls, preview and contextual help', async ({ page }) => {
  await openPainting(page, false, undefined, 'architect')
  await page.getByRole('button', { name: COPY.scene.select('caixa') }).click()
  await page.getByText(COPY.scene.appearanceTitle, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.imageCreate, exact: true }).click()
  const create = page.getByRole('dialog', { name: COPY.scene.imageCreate })
  await create.getByText('Tamanho e cores da textura').click()
  await create.getByRole('combobox', { name: COPY.scene.imageEncoding }).selectOption('rgba')
  await create.getByRole('button', { name: COPY.scene.imageCreateApply }).click()
  await page.getByText(COPY.scene.paintShapes, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.paintShapeTools.gradient }).click()
  const gradient = page.getByRole('region', { name: COPY.scene.paintGradientColors })
  await expect(gradient).toBeVisible()
  const start = gradient.getByRole('slider', { name: COPY.scene.paintGradientStartAlpha })
  const end = gradient.getByRole('slider', { name: COPY.scene.paintGradientEndAlpha })
  await expect(start).toHaveValue('100')
  await start.fill('50')
  await end.fill('0')
  await expect(gradient.getByText('50%')).toBeVisible()
  await expect(gradient.getByText('0%', { exact: true })).toBeVisible()
  await expect(gradient.getByRole('img', { name: COPY.scene.paintGradientPreview })).toBeVisible()
  await gradient.getByRole('button', { name: COPY.scene.paintGradientHelp }).click()
  await expect(page.getByRole('dialog', { name: COPY.scene.paintGradientHelp })).toBeVisible()
  await page.getByRole('dialog', { name: COPY.scene.paintGradientHelp }).press('Escape')
  await page.screenshot({ path: '.cache/pintura-gradiente-opacidade.png' })
  const transparentBase = gradient.getByRole('button', { name: COPY.scene.paintTransparentBase })
  await transparentBase.click()
  await expect(transparentBase).toHaveAttribute('aria-pressed', 'true')
  const transparent = await savedProject(page)
  const node = transparent.nodes.find((entry) => entry.name === 'caixa')
  if (node?.kind !== 'mesh') throw new Error('Painted piece missing')
  const material = transparent.materials.find((entry) => entry.id === node.materialId)
  expect(material?.baseColor).toEqual({ kind: 'rgba', value: [0, 0, 0, 0] })
  expect(material?.alphaMask).toBeUndefined()
  await page.screenshot({ path: '.cache/pintura-gradiente-base-transparente.png' })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(transparentBase).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Ajustes' }).click()
  await expect(gradient).toBeVisible()
  await gradient.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '.cache/pintura-gradiente-opacidade-celular.png' })
})

test('short paint inspector keeps texture and gradient available while custom colors are open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 640 })
  await openPainting(page, false, undefined, 'architect')
  await page.getByRole('button', { name: COPY.scene.select('caixa') }).click()
  await page.getByText(COPY.scene.appearanceTitle, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.imageCreate, exact: true }).click()
  const create = page.getByRole('dialog', { name: COPY.scene.imageCreate })
  await create.getByText('Tamanho e cores da textura').click()
  await create.getByRole('combobox', { name: COPY.scene.imageEncoding }).selectOption('rgba')
  await create.getByRole('button', { name: COPY.scene.imageCreateApply }).click()
  await page.getByText(paintCopy.customColor, { exact: true }).click()
  const details = page.getByRole('region', { name: 'Ajustes do contexto' })
  await expect(details.getByText(COPY.scene.appearanceTitle, { exact: true })).toBeInViewport()
  await expect(
    details.getByRole('button', { name: COPY.scene.paintShapeTools.gradient }),
  ).toBeInViewport()
  await page.screenshot({ path: '.cache/painel-pintar-altura-640.png' })
})
