import { expect, type Page, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { scenePivotTargets } from '../src/scene/modelGuides'
import { setScenePieceCoordinates } from '../src/scene/pieceCoordinates'
import { ViewportCamera } from '../src/viewport/viewportCamera'
import { savedProject } from './paint-project'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

async function openRig(page: Page) {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Meu braço' }),
    'box',
    'braço',
  )
  const nodeId = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, nodeId, 'dimensions', [2, 6, 2])
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'braco.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Meu braço', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Modelar', exact: true })).toBeVisible()
  const pieces = page.getByRole('tab', { name: 'Peças', exact: true })
  if (await pieces.isVisible()) await pieces.click()
  await page.getByRole('button', { name: 'Escolher braço', exact: true }).click()
  const details = page.getByRole('tab', { name: 'Ajustar', exact: true })
  if (await details.isVisible()) await details.click()
  await page.getByRole('button', { name: 'Ossos e pesos', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Área Ossos e pesos', exact: true })
  await expect(panel.getByRole('spinbutton')).toHaveCount(0)
  await expect(panel.locator('details')).not.toHaveAttribute('open')
  await panel.getByRole('button', { name: 'Montar ossos', exact: true }).click()
  const canvas = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const rect = (await canvas.boundingBox())!
  const camera = new ViewportCamera('orthographic')
  camera.aspect = rect.width / rect.height
  camera.setView('front', sceneBounds(indexSceneDocument(source))!)
  const target = scenePivotTargets(source, nodeId)
  const point = (y: number) => {
    const screen = new Vector3(target.center[0], y, target.center[2]).project(camera.camera)
    return {
      x: rect.x + ((screen.x + 1) * rect.width) / 2,
      y: rect.y + ((1 - screen.y) * rect.height) / 2,
    }
  }
  return { source, panel, canvas, point, target }
}

test('marking, binding and trying bones stays a preview until one undoable confirmation', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { source, panel, canvas, point, target } = await openRig(page)
  for (const y of [
    target.bottom[1] + 1,
    target.center[1],
    2 * target.center[1] - target.bottom[1] - 1,
  ]) {
    const p = point(y)
    await page.mouse.click(p.x, p.y)
  }
  await expect(
    panel.getByRole('list', { name: 'Articulações marcadas' }).getByRole('listitem'),
  ).toHaveCount(3)
  await expect(page.locator('.mld-rig-labels > span')).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('rig-mark.png') })
  await panel.getByRole('button', { name: 'Ligar à peça', exact: true }).click()
  await expect(panel.getByRole('slider', { name: 'Dobrar o osso' })).toBeVisible()
  const restImage = await canvas.screenshot()
  await panel.getByRole('slider', { name: 'Dobrar o osso' }).focus()
  await page.keyboard.press('End')
  await expect(panel.getByRole('slider')).toHaveValue('70')
  expect((await canvas.screenshot()).equals(restImage)).toBe(false)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
  await menu.click()
  await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
  const transition = page.getByRole('dialog', { name: 'A montagem dos ossos ainda está em prévia' })
  await expect(transition).toBeVisible()
  await transition.getByRole('button', { name: 'Continuar ajustando', exact: true }).click()
  await menu.click()
  await page.screenshot({ path: info.outputPath('rig-try.png') })
  const bounds = await panel.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
  }))
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width)
  await panel.getByRole('button', { name: 'Usar montagem', exact: true }).click()
  await expect(panel.getByText('Montagem pronta', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('rig-visible-bones.png') })
  const bound = await savedProject(page)
  expect(bound.skins).toHaveLength(1)
  expect(bound.nodes).toHaveLength(4)
  expect(bound.animations).toEqual(source.animations)
  expect(bound.nodes.slice(0, 1)).toEqual(source.nodes)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  const undone = await savedProject(page)
  expect(undone.nodes).toEqual(source.nodes)
  expect(undone.geometries).toEqual(source.geometries)
  expect(undone.skins).toBeUndefined()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  expect((await savedProject(page)).skins).toEqual(bound.skins)
  const middle = point(target.center[1])
  await page.mouse.click(middle.x, middle.y)
  await expect(panel.getByText('Osso escolhido.', { exact: false })).toBeVisible()
  await panel.getByRole('button', { name: 'Animar este osso', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Animar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(errors).toEqual([])
})

test('camera drags do not mark points, correcting and cancelling do not edit the piece', async ({
  page,
}) => {
  const { source, panel, point, target } = await openRig(page)
  const p = point(target.center[1])
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(p.x + 30, p.y, { steps: 5 })
  await page.mouse.up()
  await expect(panel.getByRole('list', { name: 'Articulações marcadas' })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Frente', exact: true }).click()
  await page.mouse.click(p.x, p.y)
  await expect(panel.getByRole('listitem').filter({ hasText: 'Começo' })).toHaveCount(1)
  await panel.getByRole('button', { name: 'Mudar ponto 1', exact: true }).click()
  await panel.getByRole('button', { name: 'Lado', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Lado', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await panel.getByRole('button', { name: 'Cancelar montagem', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Montar ossos', exact: true })).toBeVisible()
  await expect(page.locator('.mld-rig-labels > span')).toHaveCount(0)
  const unchanged = await savedProject(page)
  expect(unchanged.nodes).toEqual(source.nodes)
  expect(unchanged.geometries).toEqual(source.geometries)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
})

test('the guided panel keeps its actions reachable on a smaller screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  const { panel, point, target, canvas } = await openRig(page)
  expect((await canvas.boundingBox())!.height).toBeGreaterThan(450)
  const p = point(target.center[1])
  await page.mouse.click(p.x, p.y)
  await expect(panel.getByRole('list', { name: 'Articulações marcadas' })).toBeVisible()
  await panel.getByRole('button', { name: 'Cancelar montagem', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Montar ossos', exact: true })).toBeVisible()
  const size = await panel.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
  }))
  expect(size.scroll).toBeLessThanOrEqual(size.width)
  await page.screenshot({ path: info.outputPath('rig-compact.png') })
})
