import fs from 'node:fs'
import { expect, type Locator, type Page, test } from '@playwright/test'
import sharp from 'sharp'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import type { MoldaSceneDocument } from '../src/scene/document'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { type MoldaSceneJson, sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { sceneLocalBounds } from '../src/scene/pivot'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

async function openKnife(page: Page, source: MoldaSceneDocument) {
  const nodeId = source.nodes[0]!.id
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'faca.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.front, exact: true }).click()
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.front}` })
    .click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page
    .getByRole('button', { name: 'Cortar', exact: true })
    .and(page.locator('[aria-keyshortcuts="K"]'))
    .click()
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
  return { panel, canvas, screen, local, nodeId }
}

async function expectVisibleCut(canvas: Locator, point: { x: number; y: number }) {
  await expect
    .poll(
      async () => {
        const box = await canvas.boundingBox()
        if (!box) return false
        const { data, info } = await sharp(await canvas.screenshot())
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        const x = Math.round(((point.x - box.x) * info.width) / box.width)
        const y = Math.round(((point.y - box.y) * info.height) / box.height)
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const offset = ((y + dy) * info.width + x + dx) * info.channels
            if (
              data[offset]! > 210 &&
              data[offset + 1]! > 140 &&
              data[offset + 1]! < 230 &&
              data[offset + 2]! < 100
            )
              return true
          }
        return false
      },
      { message: 'A nova aresta deve continuar destacada em amarelo sobre a face azul' },
    )
    .toBe(true)
}

async function downloadProject(page: Page): Promise<MoldaSceneJson> {
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const download = await pending
  const file = await download.path()
  if (!file) throw new Error('O projeto não foi baixado')
  const data: MoldaSceneJson = JSON.parse(fs.readFileSync(file, 'utf8'))
  await menu.click()
  return data
}

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
  const { panel, canvas, screen, local } = await openKnife(page, source)
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
  await expectVisibleCut(canvas, screen(0.25, 0.5))
  await page.screenshot({ path: '.cache/knife-cut-visible.png' })
  const center = screen(0.5, 0.5)
  await page.mouse.click(center.x, center.y)
  await expect(component.getByText('1 face escolhida', { exact: true })).toBeVisible()
  await component.getByRole('button', { name: COPY.scene.facePreview.extrude, exact: true }).click()
  await component
    .getByRole('spinbutton', { name: COPY.scene.extrudeAmount, exact: true })
    .fill('0.5')
  await component.getByRole('button', { name: COPY.scene.previewConfirm, exact: true }).click()
  await page.screenshot({ path: '.cache/knife-extruded.png' })
  const extruded = await downloadProject(page)
  expect(extruded.nodes).toEqual(sceneToJson(source).nodes)
  const shape = extruded.geometries[0]!
  if (shape.kind !== 'mesh') throw new Error('Knife must create an editable surface mesh')
  expect(Object.values(shape.vertices).filter((p) => p[2] > local.max[2])).toHaveLength(4)
  const faceCount = Object.keys(shape.faces).length
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const cut = await downloadProject(page),
    cutShape = cut.geometries[0]!
  if (cutShape.kind !== 'mesh') throw new Error('Surface cut missing')
  expect(Object.keys(cutShape.faces)).toHaveLength(faceCount - 4)
  expect(Object.values(cutShape.vertices).every((p) => p[2] <= local.max[2])).toBe(true)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const undone = await downloadProject(page)
  expect(undone.geometries).toEqual(sceneToJson(source).geometries)
  expect(undone.nodes).toEqual(sceneToJson(source).nodes)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})

test('Loop cut is available from Cortar, previews three shifted loops and applies one undoable surface edit', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Loop cut' }),
    'box',
    'corpo',
  )
  const { panel, canvas, screen } = await openKnife(page, source)
  await panel.getByRole('button', { name: 'Loop cut', exact: true }).click()
  const seed = screen(0, 0.5)
  await page.mouse.move(seed.x, seed.y)
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeDisabled()
  await page.mouse.click(seed.x, seed.y)
  await expect(panel.getByText('Faixa escolhida', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Aumentar quantidade de cortes' }).click()
  await panel.getByRole('button', { name: 'Aumentar quantidade de cortes' }).click()
  await panel.getByRole('spinbutton', { name: 'Posição do conjunto (%)' }).fill('10')
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeEnabled()
  await page.screenshot({ path: '.cache/loop-cut-preview.png' })
  const draft = await downloadProject(page)
  expect(draft.geometries).toEqual(sceneToJson(source).geometries)
  // Downloading blurs the window, so the surface draft is discarded; the settings remain.
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeDisabled()
  await page.mouse.click(seed.x, seed.y)
  await expect(panel.getByRole('button', { name: 'Aplicar corte' })).toBeEnabled()
  await panel.getByRole('button', { name: 'Aplicar corte' }).click()
  await expect(page.getByText('16 faces escolhidas', { exact: true })).toBeVisible()
  await expectVisibleCut(canvas, screen(0.5, 0.6))
  await page.screenshot({ path: '.cache/loop-cut-applied.png' })
  const cut = await downloadProject(page)
  expect(cut.nodes).toEqual(sceneToJson(source).nodes)
  const mesh = cut.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Loop cut não criou uma malha editável')
  expect(Object.keys(mesh.faces)).toHaveLength(18)
  expect(Object.keys(mesh.vertices)).toHaveLength(20)
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.front}` })
    .click()
  await page.getByRole('button', { name: COPY.editor.model.views.free, exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page.screenshot({ path: '.cache/loop-cut-isometric.png' })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const undone = await downloadProject(page)
  expect(undone.geometries).toEqual(sceneToJson(source).geometries)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: 'Cortar', exact: true })
    .and(page.locator('[aria-keyshortcuts="K"]'))
    .click()
  await panel.getByRole('button', { name: 'Loop cut', exact: true }).click()
  await panel.getByRole('button', { name: 'Aumentar quantidade de cortes' }).click()
  await expect(panel.getByLabel('Quantidade de cortes', { exact: true })).toHaveText('2')
  const position = panel.getByRole('spinbutton', { name: 'Posição do conjunto (%)' })
  await position.fill('10')
  const field = await position.boundingBox()
  expect(field).not.toBeNull()
  expect((field?.x ?? 0) + (field?.width ?? 0)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '.cache/loop-cut-mobile.png' })
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(panel).toHaveCount(0)
  expect(errors).toEqual([])
})
