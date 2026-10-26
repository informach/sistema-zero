import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive, transformSceneNodes } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'
import { identityMatrix } from '../src/scene/matrix'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

test('Unir peças junta dois cilindros sobrepostos numa peça só', async ({ page }, info) => {
  let source = createSceneProject({ kind: 'empty', name: 'Unir' })
  source = addScenePrimitive(source, 'cylinder', 'Base')
  source = addScenePrimitive(source, 'cylinder', 'Ponta')
  const offset = identityMatrix()
  offset[12] = 0.5
  source = transformSceneNodes(source, [source.nodes.at(-1)!.id], offset)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'unir.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Unir', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.select('Base'), exact: true }).click()
  await page
    .getByRole('button', { name: COPY.scene.select('Ponta'), exact: true })
    .click({ modifiers: ['Shift'] })
  await expect(page.getByRole('region', { name: 'Ligar faces' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Unir peças', exact: true }).click()
  await expect(
    page.getByRole('button', { name: COPY.scene.select('Ponta'), exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: COPY.scene.select('Base'), exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: info.outputPath('unidas.png') })
  expect(errors).toEqual([])
})
