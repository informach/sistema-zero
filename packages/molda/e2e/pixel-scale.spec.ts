import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { resolvePaletteColors } from '../src/core/sanitize'
import { SCENE_PAINT_COPY as paintCopy } from '../src/core/scenePaintCopy'
import { addSceneShape } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { ensureScenePaintSurface } from '../src/scene/paintSurface'
import { sceneGeometryMesh } from '../src/scene/parametricGeometry'
import { setScenePieceCoordinates } from '../src/scene/pieceCoordinates'
import { openPainting, savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

test('initial painting settings explain pixels per unit, select 1 by default and respect a deliberate 4 px choice', async ({
  page,
}, info) => {
  await page.goto('/?nivel=god')
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByText('Mais opções para começar', { exact: true }).click()
  await page.getByRole('button', { name: 'Configurar modelo', exact: true }).click()
  await expect(page.getByText('Detalhes da pintura', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^1 pixel por unidade/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.screenshot({ path: info.outputPath('painting-grid-settings.png') })
  await page.getByRole('button', { name: /^4 pixels por unidade/ }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('grade-detalhada')
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
  expect((await savedProject(page)).settings.texelsPerUnit).toBe(4)
})

test('Create new in the gallery gives the starter cube two painting pixels across its two units', async ({
  page,
}) => {
  await page.goto('/?nivel=god')
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByRole('button', { name: 'Criar modelo', exact: true }).click()
  const fresh = await savedProject(page)
  expect(fresh.settings.texelsPerUnit).toBe(1)
  await page.getByRole('button', { name: paintCopy.tab, exact: true }).click()
  await page.getByRole('button', { name: paintCopy.width[1], exact: true }).click()
  await page
    .getByRole('button', {
      name: COPY.a11y.colorSwatch(2, resolvePaletteColors(fresh)[2]!),
      exact: true,
    })
    .click()
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error('Missing new model canvas')
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  const painted = await savedProject(page)
  const node = painted.nodes.find((n) => n.kind === 'mesh')!
  if (node.kind !== 'mesh') throw new Error('Missing starter piece')
  const mesh = sceneGeometryMesh(painted.geometries.find((g) => g.id === node.geometryId)!)
  const image = painted.images[0]!
  expect(image).toBeDefined()
  for (const face of Object.values(mesh.faces)) {
    const u = face.corners.map((c) => c.uv[0] * image.width),
      v = face.corners.map((c) => c.uv[1] * image.height)
    expect(Math.max(...u) - Math.min(...u)).toBeCloseTo(2)
    expect(Math.max(...v) - Math.min(...v)).toBeCloseTo(2)
  }
  expect(image.layers[0]!.pixels.filter((color) => color === 2)).toHaveLength(1)
})

test('a 16-unit cube has 16 by 16 texels per face and a 1 px 3D click paints exactly one', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let source = addSceneShape(
    createSceneProject({ kind: 'empty', name: 'Cubo de 16 pixels' }),
    'box',
    'Cubo 16',
  )
  const id = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, id, 'dimensions', [16, 16, 16])
  await openPainting(page, false, source)
  await page.getByRole('button', { name: COPY.scene.select('Cubo 16'), exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: 'Frente', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Frente' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.frame, exact: true }).click()
  await page.getByRole('button', { name: paintCopy.width[1], exact: true }).click()
  await page
    .getByRole('button', {
      name: COPY.a11y.colorSwatch(2, resolvePaletteColors(source)[2]!),
      exact: true,
    })
    .click()
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Missing cube viewport')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const painted = await savedProject(page)
  expect(painted.images).toHaveLength(1)
  const mesh = sceneGeometryMesh(painted.geometries[0]!)
  expect(Object.keys(mesh.faces)).toHaveLength(6)
  const image = painted.images[0]!
  for (const face of Object.values(mesh.faces)) {
    const u = face.corners.map((corner) => corner.uv[0] * image.width)
    const v = face.corners.map((corner) => corner.uv[1] * image.height)
    expect(Math.max(...u) - Math.min(...u)).toBeCloseTo(16)
    expect(Math.max(...v) - Math.min(...v)).toBeCloseTo(16)
  }
  expect(image.layers[0]!.pixels.filter((value) => value === 2)).toHaveLength(1)
  expect(image.layers[0]!.pixels.filter((value) => value !== 0)).toHaveLength(1)
  const stageSettings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  await stageSettings.click()
  await page.getByRole('button', { name: 'Mostrar quadradinhos', exact: true }).click()
  await stageSettings.click()
  await page.screenshot({ path: info.outputPath('cube-16-one-pixel.png') })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await savedProject(page)).images).toHaveLength(0)
  expect(errors).toEqual([])
})

test('resizing painted new pieces expands the grid and keeps one painted pixel through undo and redo', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let source = addSceneShape(
    createSceneProject({ kind: 'empty', name: 'Um pixel por unidade' }),
    'plane',
    'Plano',
  )
  const id = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, id, 'dimensions', [4, 0, 2])
  const result = ensureScenePaintSurface(source, { nodeId: id })
  if (result.status !== 'ready') throw new Error('Missing paint surface')
  source = result.document
  const geometry = source.geometries[0]!
  if (geometry.kind !== 'mesh') throw new Error('Missing plane')
  const image = source.images[0]!
  const corners = Object.values(geometry.faces)[0]!.corners
  const x = Math.floor(Math.min(...corners.map((c) => c.uv[0])) * image.width + 0.5)
  const y = Math.floor(Math.min(...corners.map((c) => c.uv[1])) * image.height + 0.5)
  image.layers[0]!.pixels[y * image.width + x] = 2
  await openPainting(page, false, source)
  await page.getByRole('button', { name: 'Modelar', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.select('Plano'), exact: true }).click()
  const width = page.getByRole('spinbutton', { name: 'Tamanho X', exact: true })
  await expect(width).toHaveValue('4.00')
  await width.fill('8')
  await width.press('Enter')
  await expect(width).toHaveValue('8.00')
  const resized = await savedProject(page)
  expect(resized.settings.texelsPerUnit).toBe(1)
  expect(resized.images[0]!.layers[0]!.pixels.filter((value) => value === 2)).toHaveLength(1)
  const mapped = resized.geometries[0]!
  if (mapped.kind !== 'mesh') throw new Error('Missing resized plane')
  const uv = Object.values(mapped.faces)[0]!.corners.map((c) => c.uv)
  const spans = [
    (Math.max(...uv.map((p) => p[0])) - Math.min(...uv.map((p) => p[0]))) *
      resized.images[0]!.width,
    (Math.max(...uv.map((p) => p[1])) - Math.min(...uv.map((p) => p[1]))) *
      resized.images[0]!.height,
  ].sort((a, b) => a - b)
  expect(spans[0]).toBeCloseTo(2)
  expect(spans[1]).toBeCloseTo(8)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(width).toHaveValue('4.00')
  const undone = await savedProject(page)
  expect(undone.images).toEqual(source.images)
  expect(undone.geometries).toEqual(source.geometries)
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  await expect(width).toHaveValue('8.00')
  await page.getByRole('button', { name: paintCopy.tab, exact: true }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.frame, exact: true }).click()
  await page.screenshot({ path: info.outputPath('pixel-scale-resized.png') })
  expect(errors).toEqual([])
})
