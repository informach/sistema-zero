import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { resolvePaletteColors } from '../src/core/sanitize'
import { createSceneColorImage } from '../src/scene/appearanceCommands'
import { addScenePrimitive, convertSceneNodesToMesh, editSceneMesh } from '../src/scene/commands'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../src/scene/composite'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'
import { paintSceneImage } from '../src/scene/imagePaint'
import { mirrorMeshFaces } from '../src/scene/meshComponentOperations'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'

test.use({ hasTouch: false, viewport: { width: 1440, height: 1000 } })

test('the UV sheet displays every original texel of a rectangular 17 by 9 image without resampling', async ({
  page,
}) => {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Pixels exatos' }),
    'box',
    'placa',
  )
  const nodeId = source.nodes.at(-1)!.id
  source = convertSceneNodesToMesh(source, [nodeId])
  source = editSceneMesh(source, nodeId, (mesh) => makeSceneGridGeometry(1, mesh.id))
  const node = source.nodes.find((entry) => entry.id === nodeId)!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  source = createSceneColorImage(source, node.materialId, {
    name: '17 por 9',
    width: 17,
    height: 9,
    encoding: 'indexed',
  })
  let image = source.images.at(-1)!
  source = paintSceneImage(
    source,
    { nodeId, materialId: node.materialId, imageId: image.id, layerId: image.layers[0]!.id },
    { from: [3, 2], to: [3, 2], color: 2, brush: 1 },
  )
  image = source.images.at(-1)!
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'pixels.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Pixels exatos', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher placa', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await page.getByRole('button', { name: 'Folha de pintura', exact: true }).click()
  await page.getByRole('button', { name: 'Ajustar mapa', exact: true }).click()
  const canvas = page
    .locator('[data-workspace-area="uv"]')
    .getByRole('img', { name: COPY.scene.uvCanvas })
  const raster = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Missing bitmap')
    return {
      width: element.width,
      height: element.height,
      pixels: [...element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data],
    }
  })
  expect([raster.width, raster.height]).toEqual([17, 9])
  const palette = scenePalette(source)
  const expected = compositeSceneImage(
    image,
    palette,
    sceneBaseColor(source.materials.find((material) => material.id === node.materialId)!, palette),
  )
  const rows: number[] = []
  for (let y = image.height - 1; y >= 0; y--)
    rows.push(...expected.subarray(y * image.width * 4, (y + 1) * image.width * 4))
  expect(raster.pixels).toEqual(rows)
  const box = (await canvas.boundingBox())!
  expect(Math.abs(box.width / 17 - box.height / 9)).toBeLessThan(0.01)
  expect((await saved(page)).images).toEqual(source.images)
})

async function saved(page: Page) {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar projeto', exact: true }).click(),
  ])
  const path = await download.path()
  if (!path) throw new Error('Missing project')
  await menu.click()
  const read = readSceneDocument(JSON.parse(await readFile(path, 'utf8')))
  if (read.status !== 'valid') throw new Error('Invalid project')
  return read.document
}

for (const dark of [false, true])
  test(`simple UV aligns cut faces, transfers old paint and undoes once (${dark ? 'dark' : 'light'})`, async ({
    page,
  }) => {
    let source = addScenePrimitive(
      createSceneProject({ kind: 'empty', name: 'UV simples' }),
      'box',
      'carroceria',
    )
    // Existing projects retain the original 4 px/unit density; the new default is tested separately.
    source = { ...source, settings: { ...source.settings, texelsPerUnit: 4 } }
    const nodeId = source.nodes.at(-1)!.id
    source = convertSceneNodesToMesh(source, [nodeId])
    source = editSceneMesh(source, nodeId, (mesh) => {
      const grid = makeSceneGridGeometry(2, mesh.id)
      for (const point of Object.values(grid.vertices))
        for (const axis of [0, 1, 2] as const) point[axis] *= 8
      return grid
    })
    if (dark)
      source = editSceneMesh(
        source,
        nodeId,
        (mesh) =>
          mirrorMeshFaces(mesh, Object.keys(mesh.faces), {
            axis: 0,
            center: 0,
            copy: true,
            continuous: true,
          }).mesh,
      )
    const node = source.nodes.find((entry) => entry.id === nodeId)!
    if (node.kind !== 'mesh') throw new Error('Missing node')
    source = createSceneColorImage(source, node.materialId, {
      name: 'desenho',
      width: 8,
      height: 8,
      encoding: 'indexed',
    })
    const oldImage = source.images.at(-1)!
    source = paintSceneImage(
      source,
      {
        nodeId,
        materialId: node.materialId,
        imageId: oldImage.id,
        layerId: oldImage.layers[0]!.id,
      },
      { from: [0, 0], to: [7, 7], color: 2, brush: 1 },
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/?nivel=god${dark ? '&tema=escuro' : ''}`)
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'uv.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo UV simples', exact: true }).click()
    await page.getByRole('button', { name: 'Escolher carroceria', exact: true }).click()
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Mais ajustes do palco' }).click()
    await page.getByRole('button', { name: 'Organizar mapa…' }).click()
    await page
      .getByRole('dialog', { name: 'Organizar mapa' })
      .getByRole('button', { name: 'Organizar mapa' })
      .click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    const mapped = await saved(page)
    const mappedNode = mapped.nodes.find((entry) => entry.id === nodeId)!
    if (mappedNode.kind !== 'mesh') throw new Error('Missing mapped node')
    const mesh = mapped.geometries.find((entry) => entry.id === mappedNode.geometryId)!
    if (mesh.kind !== 'mesh') throw new Error('Missing mapped mesh')
    const imageId = mapped.materials.find(
      (entry) => entry.id === mappedNode.materialId,
    )!.colorImageId
    const image = mapped.images.find((entry) => entry.id === imageId)!
    expect(image.id).not.toBe(oldImage.id)
    expect(image.layers[0]!.pixels.filter((value) => value === 2).length).toBe(32)
    const shared = new Map<string, number[]>()
    for (const face of Object.values(mesh.faces))
      for (const { vertexId, uv } of face.corners) {
        const pixel = [uv[0] * image.width, uv[1] * image.height]
        for (const value of pixel) expect(value).toBeCloseTo(Math.round(value), 10)
        if (shared.has(vertexId)) expect(pixel).toEqual(shared.get(vertexId)!)
        shared.set(vertexId, pixel)
      }
    const stageSettings = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
    await expect(page.getByRole('button', { name: 'Mostrar quadradinhos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await stageSettings.click()
    await page.screenshot({ path: `.cache/uv-simples-${dark ? 'escuro' : 'claro'}.png` })
    await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
    await page.getByRole('button', { name: 'Frente', exact: true }).click()
    await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
    await page
      .getByRole('button', {
        name: COPY.a11y.colorSwatch(5, resolvePaletteColors(mapped)[5]!),
        exact: true,
      })
      .click()
    const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
    const box = (await stage.boundingBox())!
    await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 30)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 30, { steps: 8 })
    await page.mouse.up()
    const drawn = await saved(page)
    const yellow = drawn.images
      .find((entry) => entry.id === image.id)!
      .layers[0]!.pixels.filter((value) => value === 5).length
    expect(yellow).toBeGreaterThan(1)
    expect(yellow).toBeLessThan(20)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).images).toEqual(mapped.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    const undone = await saved(page)
    expect(undone.images).toEqual(source.images)
    expect(undone.materials).toEqual(source.materials)
    expect(undone.geometries).toEqual(source.geometries)
    await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
    expect((await saved(page)).images).toEqual(mapped.images)
    expect(errors).toEqual([])
  })

for (const dark of [false, true])
  test(`visual UV edits real pixels without decimal fields (${dark ? 'dark' : 'light'})`, async ({
    page,
    browserName,
  }) => {
    test.setTimeout(90_000)
    let source = addScenePrimitive(
      createSceneProject({ kind: 'empty', name: 'Mapa visual' }),
      'box',
      'placa',
    )
    const nodeId = source.nodes.at(-1)!.id
    source = convertSceneNodesToMesh(source, [nodeId])
    source = editSceneMesh(source, nodeId, (mesh) => makeSceneGridGeometry(1, mesh.id))
    const node = source.nodes.find((entry) => entry.id === nodeId)!
    if (node.kind !== 'mesh') throw new Error('Missing node')
    source = createSceneColorImage(source, node.materialId, {
      name: 'pixels',
      width: 16,
      height: 8,
      encoding: 'indexed',
    })
    const image = source.images.at(-1)!
    source = paintSceneImage(
      source,
      { nodeId, materialId: node.materialId, imageId: image.id, layerId: image.layers[0]!.id },
      { from: [0, 0], to: [15, 7], color: 2, brush: 1 },
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/?nivel=god${dark ? '&tema=escuro' : ''}`)
    await page.locator('input[name="molda-backup"]').setInputFiles({
      name: 'visual.molda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
    })
    await page.getByRole('button', { name: 'Modelo Mapa visual', exact: true }).click()
    await page.getByRole('button', { name: 'Escolher placa', exact: true }).click()
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    const navigation = page.getByRole('navigation', { name: 'Áreas da oficina' })
    const barBefore = (await navigation.boundingBox())!
    expect(barBefore.height).toBeLessThanOrEqual(52)
    await navigation.getByRole('button', { name: 'Opções', exact: true }).click()
    const menu = page.getByRole('group', { name: 'Opções', exact: true })
    await expect(menu.getByRole('button', { name: 'Materiais', exact: true })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Mapa da pintura', exact: true })).toHaveCount(0)
    expect((await navigation.boundingBox())!.height).toBe(barBefore.height)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Folha de pintura', exact: true }).click()
    const sheet = page.getByRole('region', { name: 'Área Folha de pintura', exact: true })
    const paintCanvas = sheet.locator('.mld-sheet-paint canvas')
    await expect(paintCanvas).toBeVisible()
    const sheetRect = (await sheet.boundingBox())!
    expect(sheetRect.x + sheetRect.width).toBeLessThanOrEqual(
      (await page.locator('.mld-stage-viewport').boundingBox())!.x,
    )
    await sheet.getByRole('button', { name: 'Aumentar zoom da folha' }).click()
    const beforeWheel = (await paintCanvas.boundingBox())!
    const anchor = {
      x: beforeWheel.x + beforeWheel.width * 0.4,
      y: beforeWheel.y + beforeWheel.height * 0.6,
    }
    await page.mouse.move(anchor.x, anchor.y)
    await page.mouse.wheel(0, -100)
    await expect
      .poll(async () => (await paintCanvas.boundingBox())!.width)
      .toBeGreaterThan(beforeWheel.width)
    const afterWheel = (await paintCanvas.boundingBox())!
    expect(Math.abs(anchor.x - (afterWheel.x + afterWheel.width * 0.4))).toBeLessThan(1)
    expect(Math.abs(anchor.y - (afterWheel.y + afterWheel.height * 0.6))).toBeLessThan(1)
    await sheet.getByRole('button', { name: 'Mover visualização' }).click()
    await page.mouse.move(anchor.x, anchor.y)
    await page.mouse.down()
    await page.mouse.move(anchor.x + 20, anchor.y + 12, { steps: 3 })
    await page.mouse.up()
    const afterPan = (await paintCanvas.boundingBox())!
    expect(afterPan.x).toBeCloseTo(afterWheel.x + 20, 4)
    expect(afterPan.y).toBeCloseTo(afterWheel.y + 12, 4)
    // Zoom during a hand drag must survive the final pointer sample.
    await page.mouse.move(anchor.x + 20, anchor.y + 12)
    await page.mouse.down()
    await page.mouse.wheel(0, -100)
    await expect
      .poll(async () => (await paintCanvas.boundingBox())!.width)
      .toBeGreaterThan(afterPan.width)
    const zoomDuringPan = (await paintCanvas.boundingBox())!
    await page.mouse.move(anchor.x + 26, anchor.y + 16)
    await page.mouse.up()
    const afterCombined = (await paintCanvas.boundingBox())!
    expect(afterCombined.width).toBeCloseTo(zoomDuringPan.width, 4)
    expect(afterCombined.x).toBeCloseTo(zoomDuringPan.x + 6, 4)
    expect(afterCombined.y).toBeCloseTo(zoomDuringPan.y + 4, 4)
    expect((await saved(page)).images).toEqual(source.images)
    await sheet.getByRole('button', { name: 'Mover visualização' }).click()
    const hoverBox = (await paintCanvas.boundingBox())!
    await page.mouse.move(
      hoverBox.x + (5.5 * hoverBox.width) / 16,
      hoverBox.y + (2.5 * hoverBox.height) / 8,
    )
    const pixelCursor = sheet.locator('.mld-sheet-paint rect[stroke="white"]')
    await expect(pixelCursor).toHaveAttribute('x', '5')
    await expect(pixelCursor).toHaveAttribute('y', '2')
    await page
      .getByRole('button', {
        name: COPY.a11y.colorSwatch(5, resolvePaletteColors(source)[5]!),
        exact: true,
      })
      .click()
    await page.mouse.click(
      afterPan.x + (3.5 / 16) * afterPan.width,
      afterPan.y + (1 - 2.5 / 8) * afterPan.height,
    )
    const painted = await saved(page)
    expect(painted.images[0]!.layers[0]!.pixels[2 * 16 + 3]).toBe(5)
    expect(
      [...painted.images[0]!.layers[0]!.pixels].filter(
        (pixel, i) => pixel !== source.images[0]!.layers[0]!.pixels[i],
      ),
    ).toHaveLength(1)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).images).toEqual(source.images)
    const retainedZoom = await sheet.getByLabel('Zoom da folha', { exact: true }).textContent()
    await page.getByRole('button', { name: 'Ajustar mapa', exact: true }).click()
    const area = page.locator('[data-workspace-area="uv"]')
    await expect(area.getByRole('spinbutton')).toHaveCount(0)
    await expect(area.getByRole('button', { name: COPY.scene.uvPixelSnap })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const canvas = area.getByRole('img', { name: COPY.scene.uvCanvas })
    await expect(area.getByRole('button', { name: 'Ver mapa' })).toBeVisible()
    await expect(area.getByRole('button', { name: 'Folha inteira' })).toBeVisible()
    const box = (await canvas.boundingBox())!
    const at = (u: number, v: number) => ({ x: box.x + u * box.width, y: box.y + v * box.height })
    const center = at(0.5, 0.5)
    await page.mouse.click(center.x, center.y)
    await expect(area.getByRole('button', { name: COPY.scene.uvRotateQuarter })).toBeEnabled()
    await page.screenshot({ path: `.cache/uv-visual-${dark ? 'escuro' : 'claro'}.png` })
    const texel = box.width / 16
    const start = at(0.001, 0.999)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 2.2 * texel, start.y - 1.2 * texel, { steps: 3 })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    expect((await saved(page)).geometries).toEqual(source.geometries)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 2.2 * texel, start.y - 1.2 * texel, { steps: 4 })
    await page.mouse.up()
    const changed = await saved(page)
    const changedMesh = changed.geometries.find((g) => g.id === node.geometryId)!
    if (changedMesh.kind !== 'mesh') throw new Error('Missing mesh')
    expect(changedMesh.faces.f_0_0!.corners[0]!.uv).toEqual([2 / 16, 1 / 8])
    expect(changed.images).toEqual(source.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    await area.getByRole('button', { name: 'Folha inteira', exact: true }).click()
    const scaleHandle = area.getByRole('button', { name: 'Redimensionar mapa, canto 3' })
    const handleBox = (await scaleHandle.boundingBox())!
    const scaleBox = (await canvas.boundingBox())!
    const handleX = handleBox.x + handleBox.width / 2,
      handleY = handleBox.y + handleBox.height / 2
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX - scaleBox.width / 16, handleY + scaleBox.height / 8, {
      steps: 3,
    })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(area).toBeVisible()
    expect((await saved(page)).geometries).toEqual(source.geometries)
    await page.mouse.move(handleX, handleY)
    await page.mouse.down()
    await page.mouse.move(handleX - (scaleBox.width / 16) * 2, handleY + scaleBox.height / 8, {
      steps: 3,
    })
    await page.mouse.up()
    const resized = await saved(page)
    const resizedMesh = resized.geometries.find((g) => g.id === node.geometryId)!
    if (resizedMesh.kind !== 'mesh') throw new Error('Missing mesh')
    expect(Math.max(...resizedMesh.faces.f_0_0!.corners.map((corner) => corner.uv[0]))).toBeCloseTo(
      0.875,
      10,
    )
    expect(Math.max(...resizedMesh.faces.f_0_0!.corners.map((corner) => corner.uv[1]))).toBeCloseTo(
      0.875,
      10,
    )
    expect(resized.images).toEqual(source.images)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).geometries).toEqual(source.geometries)
    const rotationHandle = area.getByRole('button', { name: 'Girar mapa livremente', exact: true })
    async function rotateSelection(degrees: number, cancel = false, snap = false) {
      const handle = (await rotationHandle.boundingBox())!
      const bitmap = (await canvas.boundingBox())!
      const pivot = { x: bitmap.x + bitmap.width / 2, y: bitmap.y + bitmap.height / 2 }
      const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }
      const dx = start.x - pivot.x,
        dy = start.y - pivot.y
      await page.mouse.move(start.x, start.y)
      if (snap) await page.keyboard.down('Shift')
      await page.mouse.down()
      for (let i = 1; i <= 8; i++) {
        const angle = (((degrees * Math.PI) / 180) * i) / 8
        await page.mouse.move(
          pivot.x + dx * Math.cos(angle) + dy * Math.sin(angle),
          pivot.y - dx * Math.sin(angle) + dy * Math.cos(angle),
        )
      }
      await expect(area.locator('[data-uv-rotation-preview]')).toBeVisible()
      if (cancel) await page.keyboard.press('Escape')
      await page.mouse.up()
      if (snap) await page.keyboard.up('Shift')
    }
    await rotateSelection(37, true)
    expect((await saved(page)).geometries).toEqual(source.geometries)
    await rotateSelection(dark ? 397 : 37)
    const freeRotation = await saved(page)
    const freeMesh = freeRotation.geometries.find((g) => g.id === node.geometryId)!
    if (freeMesh.kind !== 'mesh') throw new Error('Missing rotated mesh')
    const freeCorners = freeMesh.faces.f_0_0!.corners
    const freeEdge = [
      (freeCorners[1]!.uv[0] - freeCorners[0]!.uv[0]) * 16,
      (freeCorners[1]!.uv[1] - freeCorners[0]!.uv[1]) * 8,
    ]
    expect(Math.abs((Math.atan2(freeEdge[1]!, freeEdge[0]!) * 180) / Math.PI - 37)).toBeLessThan(
      0.75,
    )
    expect(Math.hypot(...freeEdge)).toBeCloseTo(16, 9)
    expect(freeRotation.images).toEqual(source.images)
    const originalGeometry = source.geometries.find((g) => g.id === node.geometryId)!
    if (originalGeometry.kind !== 'mesh') throw new Error('Missing original mesh')
    expect(freeMesh.vertices).toEqual(originalGeometry.vertices)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).geometries).toEqual(source.geometries)
    await rotateSelection(34, false, true)
    const snappedRotation = await saved(page)
    const snappedMesh = snappedRotation.geometries.find((g) => g.id === node.geometryId)!
    if (snappedMesh.kind !== 'mesh') throw new Error('Missing rotated mesh')
    const snapCorners = snappedMesh.faces.f_0_0!.corners
    const snapAngle =
      (Math.atan2(
        (snapCorners[1]!.uv[1] - snapCorners[0]!.uv[1]) * 8,
        (snapCorners[1]!.uv[0] - snapCorners[0]!.uv[0]) * 16,
      ) *
        180) /
      Math.PI
    expect(snapAngle).toBeCloseTo(30, 9)
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).geometries).toEqual(source.geometries)
    // Fit changed the camera, so subsequent movements derive their screen coordinates again.
    const fittedBox = (await canvas.boundingBox())!
    center.x = fittedBox.x + fittedBox.width / 2
    center.y = fittedBox.y + fittedBox.height / 2
    expect((await saved(page)).geometries).toEqual(source.geometries)
    await page.mouse.move(center.x, center.y)
    await page.mouse.down()
    await page.mouse.move(center.x + (2.2 * fittedBox.width) / 16, center.y, { steps: 4 })
    await page.mouse.up()
    const moved = await saved(page)
    const movedMesh = moved.geometries.find((g) => g.id === node.geometryId)!
    if (movedMesh.kind !== 'mesh') throw new Error('Missing mesh')
    const beforeMesh = source.geometries.find((g) => g.id === node.geometryId)!
    if (beforeMesh.kind !== 'mesh') throw new Error('Missing mesh')
    for (const [i, corner] of movedMesh.faces.f_0_0!.corners.entries())
      expect(corner.uv).toEqual([
        beforeMesh.faces.f_0_0!.corners[i]!.uv[0] + 2 / 16,
        beforeMesh.faces.f_0_0!.corners[i]!.uv[1],
      ])
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    await area.getByRole('button', { name: COPY.scene.uvRotateQuarter }).click()
    const turned = await saved(page)
    const turnedMesh = turned.geometries.find((g) => g.id === node.geometryId)!
    if (turnedMesh.kind !== 'mesh') throw new Error('Missing mesh')
    const points = turnedMesh.faces.f_0_0!.corners.map((c) => [c.uv[0] * 16, c.uv[1] * 8])
    expect(Math.max(...points.map((p) => p[0]!)) - Math.min(...points.map((p) => p[0]!))).toBe(8)
    expect(Math.max(...points.map((p) => p[1]!)) - Math.min(...points.map((p) => p[1]!))).toBe(16)
    for (const point of points) for (const value of point) expect(value).toBe(Math.round(value))
    expect(turned.images).toEqual(source.images)
    const outsideCorner = turnedMesh.faces.f_0_0!.corners[0]!.uv
    const outsideBox = (await canvas.boundingBox())!
    const outsidePoint = {
      x: outsideBox.x + outsideCorner[0] * outsideBox.width,
      y: outsideBox.y + (1 - outsideCorner[1]) * outsideBox.height,
    }
    await page.mouse.move(outsidePoint.x, outsidePoint.y)
    await page.mouse.down()
    await page.mouse.move(outsidePoint.x + outsideBox.width / 16, outsidePoint.y, { steps: 3 })
    await page.mouse.up()
    const outsideEdit = await saved(page)
    const outsideMesh = outsideEdit.geometries.find((g) => g.id === node.geometryId)!
    if (outsideMesh.kind !== 'mesh') throw new Error('Missing mesh')
    expect(outsideMesh.faces.f_0_0!.corners[0]!.uv).toEqual([
      outsideCorner[0] + 1 / 16,
      outsideCorner[1],
    ])
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    expect((await saved(page)).geometries).toEqual(turned.geometries)
    await area.getByRole('button', { name: 'Seleção e ajustes', exact: true }).click()
    const options = page.getByRole('group', { name: 'Seleção e ajustes', exact: true })
    await options.locator('summary').filter({ hasText: COPY.scene.uvAdvanced }).click()
    await expect(options.getByRole('spinbutton').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
    const divider = page.getByRole('separator', { name: 'Largura da folha' })
    const previousWidth = (await area.boundingBox())!.width
    await divider.press('ArrowRight')
    await expect.poll(async () => (await area.boundingBox())!.width).toBeGreaterThan(previousWidth)
    const dividerBox = (await divider.boundingBox())!
    const dragWidth = (await area.boundingBox())!.width
    expect(dividerBox.height).toBeGreaterThan(300)
    await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(dividerBox.x + 40, dividerBox.y + dividerBox.height / 2, { steps: 3 })
    await page.mouse.up()
    await expect.poll(async () => (await area.boundingBox())!.width).toBeGreaterThan(dragWidth + 30)
    const viewBeforeExpand = await area.getByLabel('Zoom da folha', { exact: true }).textContent()
    await area.getByRole('button', { name: 'Ampliar folha' }).click()
    await expect(page.locator('.mld-stage-viewport')).toBeHidden()
    await expect(area.getByLabel('Zoom da folha', { exact: true })).toHaveText(viewBeforeExpand!)
    await page.screenshot({ path: `.cache/folha-ampliada-${dark ? 'escura' : 'clara'}.png` })
    await area.getByRole('button', { name: 'Restaurar folha' }).click()
    await expect(page.locator('.mld-stage-viewport')).toBeVisible()
    await area.getByRole('button', { name: 'Pintar na folha' }).click()
    await expect(sheet.getByLabel('Zoom da folha', { exact: true })).toHaveText(retainedZoom!)
    await sheet.getByRole('button', { name: 'Fechar folha de pintura' }).click()
    await page.getByRole('button', { name: 'Folha de pintura', exact: true }).click()
    await expect(sheet.getByLabel('Zoom da folha', { exact: true })).toHaveText(retainedZoom!)
    for (const dimensions of [
      { width: 1280, height: 720 },
      { width: 1024, height: 600 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(dimensions)
      await sheet.getByRole('button', { name: 'Ajustar', exact: true }).click()
      await expect(sheet.locator('.mld-texture-viewport')).toBeVisible()
      expect((await sheet.locator('.mld-texture-viewport').boundingBox())!.height).toBeGreaterThan(
        140,
      )
      if (dimensions.width < 1200) {
        await sheet.getByRole('button', { name: 'Ver modelo', exact: true }).click()
        await expect(page.locator('.mld-stage-viewport')).toBeVisible()
        await expect(sheet.locator('.mld-texture-viewport')).toBeHidden()
        await sheet.getByRole('button', { name: 'Ver folha', exact: true }).click()
        await expect(sheet.locator('.mld-texture-viewport')).toBeVisible()
        await expect(page.locator('.mld-stage-viewport')).toBeHidden()
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1)
      const close = sheet.getByRole('button', { name: 'Fechar folha de pintura' })
      const closeBox = (await close.boundingBox())!
      expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(dimensions.width)
      await page.screenshot({
        path: `.cache/folha-${dimensions.width}-${dark ? 'escura' : 'clara'}.png`,
      })
    }
    expect((await saved(page)).geometries).toEqual(source.geometries)
    expect((await saved(page)).images).toEqual(source.images)
    if (!dark && browserName === 'chromium') {
      const client = await page.context().newCDPSession(page)
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: true })
      const imageBox = (await sheet.locator('.mld-sheet-paint canvas').boundingBox())!
      const x = imageBox.x + imageBox.width / 2,
        y = imageBox.y + imageBox.height / 2
      const beforePinch = Number(
        (await sheet.getByLabel('Zoom da folha', { exact: true }).textContent())!.replace('%', ''),
      )
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: x - 30, y, id: 1 },
          { x: x + 30, y, id: 2 },
        ],
      })
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x - 45, y, id: 1 },
          { x: x + 45, y, id: 2 },
        ],
      })
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect
        .poll(async () =>
          Number(
            (await sheet.getByLabel('Zoom da folha', { exact: true }).textContent())!.replace(
              '%',
              '',
            ),
          ),
        )
        .toBeGreaterThan(beforePinch)
      expect((await saved(page)).images).toEqual(source.images)
      expect((await saved(page)).geometries).toEqual(source.geometries)
      await client.detach()
    }
    expect(errors).toEqual([])
  })
