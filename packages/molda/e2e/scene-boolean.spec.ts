import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addSceneBox, transformSceneNodes } from '../src/scene/commands'
import { sceneToJson } from '../src/scene/documentJson'
import { identityMatrix } from '../src/scene/matrix'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { makeModel } from '../src/testing/fixtures'

test('união, interseção e diferença mostram prévia antes de alterar o projeto', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let next = 0
  const id = () => `boolean-e2e-${++next}`
  let source = migrateLegacyModel(makeModel({ parts: [] })).document
  source = addSceneBox(source, 'Base', id)
  source = addSceneBox(source, 'Cortador', id)
  const cutter = source.nodes.at(-1)!.id
  const offset = identityMatrix()
  offset[12] = 1
  source = { ...transformSceneNodes(source, [cutter], offset), name: 'Booleanos' }
  await page.goto('/?nivel=architect')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'booleanos.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Booleanos', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher Base', exact: true }).click()
  await page
    .getByRole('button', { name: 'Escolher Cortador', exact: true })
    .click({ modifiers: ['Shift'] })
  for (const operation of ['União', 'Interseção', 'Diferença']) {
    await page.getByRole('button', { name: operation, exact: true }).click()
    await expect(page.getByRole('button', { name: 'Confirmar resultado' })).toBeVisible()
    await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  }
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher Cortador', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Diferença', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar resultado' }).click()
  await expect(page.getByRole('button', { name: 'Escolher Cortador', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher Cortador', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
