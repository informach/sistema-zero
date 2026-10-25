import { expect, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { makeSceneKnifeLoop } from '../src/testing/sceneKnifeLoop'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

test('a selected internal line separates one piece into two solids and undo restores it', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { document: source, nodeId } = makeSceneKnifeLoop()
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'separar-linha.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.top, exact: true }).click()
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.top}` })
    .click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.editFaces, exact: true }).click()
  await page
    .getByRole('group', { name: 'Escolher', exact: true })
    .getByRole('button', { name: 'Linhas', exact: true })
    .click()
  const panel = page.locator('.mld-component-root')
  const separate = panel.getByRole('button', { name: 'Separar linha', exact: true })
  await expect(separate).toBeDisabled()
  const canvas = page.locator('canvas').first()
  const box = (await canvas.boundingBox())!
  const index = indexSceneDocument(source)
  const rig = new ViewportCamera('orthographic')
  rig.aspect = box.width / box.height
  rig.setView('top', sceneBounds(index)!)
  rig.frame(sceneBounds(index)!)
  const world = index.scene.worldMatrices.get(nodeId)!
  const projected = new Vector3(...transformPoint(world, [0, 1, 0])).project(rig.camera)
  await page.mouse.click(
    box.x + ((projected.x + 1) * box.width) / 2,
    box.y + ((1 - projected.y) * box.height) / 2,
  )
  await expect(panel.getByText('1 linha escolhida', { exact: true })).toBeVisible()
  await expect(separate).toBeEnabled()
  await separate.click()
  const cut = page.getByRole('region', { name: 'Separar a peça' })
  await expect(cut.getByText('Veja onde a peça será separada')).toBeVisible()
  await expect(cut.getByRole('button', { name: 'Separar', exact: true })).toBeEnabled()
  await cut.getByRole('button', { name: 'Separar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher corpo (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escolher corpo (2)', exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher corpo', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
