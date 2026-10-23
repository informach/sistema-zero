import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { resolvePaletteColors } from '../src/core/sanitize'
import { SCENE_PAINT_COPY as paintCopy } from '../src/core/scenePaintCopy'
import { sceneBounds } from '../src/scene/bounds'
import { addSceneShape } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { openPainting, savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

test('Plano can be added, resized, duplicated, extruded and undone through the workshop', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?nivel=god')
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByRole('button', { name: 'Criar modelo', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.plane, exact: true }).click()
  const select = (name: string) =>
    page.getByRole('button', { name: COPY.scene.select(name), exact: true })
  await expect(select('Plano')).toHaveAttribute('aria-pressed', 'true')
  const size = (axis: string) =>
    page.getByRole('spinbutton', { name: `Tamanho ${axis}`, exact: true })
  await expect(size('Y')).toHaveValue('0.00')
  await expect(size('Y')).toBeDisabled()
  await size('X').fill('6')
  await size('X').press('Enter')
  await size('Z').fill('4')
  await size('Z').press('Enter')
  await expect(size('X')).toHaveValue('6.00')
  await expect(size('Z')).toHaveValue('4.00')
  await page.getByRole('button', { name: COPY.scene.duplicate, exact: true }).click()
  await expect(select('Plano (cópia)')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(select('Plano (cópia)')).toHaveCount(0)
  await select('Plano').click()
  const before = await savedProject(page)
  const node = before.nodes.find((item) => item.name === 'Plano')!
  const ownBounds = (document: typeof before) =>
    sceneBounds(indexSceneDocument(document), { nodeIds: new Set([node.id]) })!
  expect(ownBounds(before).max[1] - ownBounds(before).min[1]).toBe(0)
  await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
  await page.getByRole('button', { name: 'Faces', exact: true }).click()
  const panel = page.locator('.mld-component-root')
  await panel.getByRole('button', { name: COPY.scene.faceAll, exact: true }).click()
  await expect(panel.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await panel.getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true }).fill('2')
  await panel.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  const volume = await savedProject(page)
  expect(ownBounds(volume).max[1] - ownBounds(volume).min[1]).toBe(2)
  await page.screenshot({ path: info.outputPath('plane-extruded.png') })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await savedProject(page)).geometries).toEqual(before.geometries)
  expect(errors).toEqual([])
})

test('a plane is paintable in pixels through the same close-up editor', async ({ page }, info) => {
  const source = addSceneShape(
    createSceneProject({ kind: 'empty', name: 'Pintar no plano' }),
    'plane',
    'Plano',
  )
  await openPainting(page, false, source)
  await page.getByRole('button', { name: COPY.scene.select('Plano'), exact: true }).click()
  await page.getByRole('button', { name: paintCopy.closeUp, exact: true }).click()
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Missing plane stage')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const closeup = page.getByRole('region', { name: paintCopy.closeUp, exact: true })
  await expect(closeup).toBeVisible()
  const red = resolvePaletteColors(source)[2]!
  await page.getByRole('button', { name: COPY.a11y.colorSwatch(2, red), exact: true }).click()
  await closeup
    .getByRole('button', { name: paintCopy.closeUpSheet, exact: true })
    .locator('canvas')
    .click()
  const painted = await savedProject(page)
  expect(painted.images).toHaveLength(1)
  expect(painted.images[0]!.layers[0]!.pixels.some((value) => value !== 0)).toBe(true)
  expect(painted.materials[0]!.doubleSided).toBe(true)
  await page.screenshot({ path: info.outputPath('plane-painted.png') })
})
