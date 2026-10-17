import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { sceneLocalBounds } from '../src/scene/pivot'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

test('surface knife closes an interior contour, extrudes its center and undoes both edits on one piece', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Faca de faces' }),
    'box',
    'corpo',
  )
  const nodeId = source.nodes[0]!.id
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'faca.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Faca de faces', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.front, exact: true }).click()
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.front}` })
    .click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page.getByRole('button', { name: 'Cortar', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Cortar', exact: true })
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeDisabled()
  const canvas = page.locator('canvas').first(),
    box = (await canvas.boundingBox())!
  const index = indexSceneDocument(source),
    bounds = sceneBounds(index)!,
    local = sceneLocalBounds(source, nodeId)!,
    world = index.scene.worldMatrices.get(nodeId)!
  const rig = new ViewportCamera('orthographic')
  rig.aspect = box.width / box.height
  rig.setView('front', bounds)
  rig.frame(bounds)
  function screen(x: number, y: number) {
    const p = new Vector3(
      ...transformPoint(world, [
        local.min[0] + x * local.size[0],
        local.min[1] + y * local.size[1],
        local.max[2],
      ]),
    ).project(rig.camera)
    return { x: box.x + ((p.x + 1) * box.width) / 2, y: box.y + ((1 - p.y) * box.height) / 2 }
  }
  const points = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.75, 0.75],
    [0.25, 0.75],
  ].map(([x, y]) => screen(x!, y!))
  await page.mouse.click(points[0]!.x, points[0]!.y)
  await expect(panel.getByText('1 ponto marcado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(panel.getByText('0 pontos marcados', { exact: true })).toBeVisible()
  for (const p of points) await page.mouse.click(p.x, p.y)
  // Closing snaps to the first authored point, rather than creating an almost-closed contour.
  await page.mouse.click(points[0]!.x + 4, points[0]!.y + 3)
  await expect(panel.getByText('5 pontos marcados', { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeEnabled()
  await page.screenshot({ path: '.cache/knife-preview.png' })
  await canvas.focus()
  await page.keyboard.press('Enter')
  const component = page.locator('.mld-component-root')
  await expect(component.getByRole('heading', { name: 'Editar peça' })).toBeVisible()
  const center = screen(0.5, 0.5)
  await page.mouse.click(center.x, center.y)
  await expect(component.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await component.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await component
    .getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true })
    .fill('0.5')
  await component.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  await page.screenshot({ path: '.cache/knife-extruded.png' })
  async function snapshot() {
    const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
    await menu.click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
    const download = await pending
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8')) as MoldaSceneJson
    await menu.click()
    return data
  }
  const extruded = await snapshot()
  expect(extruded.nodes).toEqual(sceneToJson(source).nodes)
  const shape = extruded.geometries[0]!
  if (shape.kind !== 'mesh') throw new Error('Knife must create an editable surface mesh')
  expect(Object.values(shape.vertices).filter((p) => p[2] > local.max[2])).toHaveLength(4)
  const faceCount = Object.keys(shape.faces).length
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const cut = await snapshot(),
    cutShape = cut.geometries[0]!
  if (cutShape.kind !== 'mesh') throw new Error('Surface cut missing')
  expect(Object.keys(cutShape.faces)).toHaveLength(faceCount - 4)
  expect(Object.values(cutShape.vertices).every((p) => p[2] <= local.max[2])).toBe(true)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const undone = await snapshot()
  expect(undone.geometries).toEqual(sceneToJson(source).geometries)
  expect(undone.nodes).toEqual(sceneToJson(source).nodes)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})
