import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { SCENE_PAINT_COPY as paintCopy } from '../src/core/scenePaintCopy'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../src/scene/composite'
import type { MoldaSceneDocument } from '../src/scene/document'
import { openPainting, savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

test('pixel cutouts work in 3D and on the sheet, repaint, and undo as one stroke', async ({
  page,
}) => {
  await openPainting(page)
  const holes = (project: MoldaSceneDocument) => {
    const image = project.images[0]!
    const material = project.materials.find((entry) => entry.colorImageId === image.id)!
    const palette = scenePalette(project)
    const pixels = compositeSceneImage(image, palette, sceneBaseColor(material, palette))
    return [...pixels].filter((value, i) => i % 4 === 3 && value === 0).length
  }
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Apagar tinta', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Deixar vazado', exact: true }).click()
  await expect(page.getByText(paintCopy.instructions.cutout, { exact: true })).toBeVisible()
  const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const bounds = (await stage.boundingBox())!
  const point = { x: bounds.x + bounds.width / 2 - 20, y: bounds.y + bounds.height / 2 + 20 }
  await page.mouse.click(point.x, point.y)
  const cut = await savedProject(page)
  expect(holes(cut)).toBe(1)
  await page.getByRole('button', { name: 'Pincel', exact: true }).click()
  await page.mouse.click(point.x, point.y)
  expect(holes(await savedProject(page))).toBe(0)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await savedProject(page)).images).toEqual(cut.images)
  await page.getByRole('button', { name: 'Escolher caixa', exact: true }).click()
  await page.getByRole('button', { name: 'Folha de pintura', exact: true }).click()
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Deixar vazado', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const sheet = page.getByRole('button', { name: COPY.scene.paintCanvas, exact: true })
  const canvas = sheet.locator('canvas')
  const sheetBounds = (await canvas.boundingBox())!
  await page.mouse.click(
    sheetBounds.x + sheetBounds.width * 0.75,
    sheetBounds.y + sheetBounds.height * 0.75,
  )
  const sheetCut = await savedProject(page)
  expect(holes(sheetCut)).toBe(2)
  await page.screenshot({ path: '.cache/pintura-pixels-vazados.png' })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await savedProject(page)).images).toEqual(cut.images)
  await sheet.focus()
  await sheet.press('ArrowRight')
  await sheet.press('Space')
  expect(holes(await savedProject(page))).toBe(2)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await savedProject(page)).images).toEqual(cut.images)
  await expect(page.getByRole('alert')).toHaveCount(0)
})
