import { expect, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { sceneToJson } from '../src/scene/documentJson'
import { createSceneSkin } from '../src/scene/skinCommands'
import { makeSceneSkinFixture } from '../src/testing/sceneSkin'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

test('Suavizar forças mistura os pontos escolhidos, um passo por clique', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const fixture = makeSceneSkinFixture()
  const { id, ...input } = fixture.input
  const source = createSceneSkin(
    {
      ...fixture.document,
      name: 'Braço macio',
      nodes: fixture.document.nodes.map((node) =>
        node.id === 'part-0' ? { ...node, name: 'braço' } : node,
      ),
    },
    input,
    () => id,
  )
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'braco.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Braço macio', exact: true }).click()
  const pieces = page.getByRole('tab', { name: 'Peças', exact: true })
  if (await pieces.isVisible()) await pieces.click()
  await page.getByRole('button', { name: 'Escolher braço', exact: true }).click()

  await page.getByRole('button', { name: COPY.scene.editSkinBase, exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.componentModes.vertex, exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.componentAll.vertex, exact: true }).click()
  await page.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
  await page
    .getByRole('region', { name: 'Mais ferramentas' })
    .getByRole('button', { name: 'Ossos e pesos', exact: true })
    .click()
  const copy = COPY.scene.skinWeights
  const details = page.locator('details', { has: page.getByText(copy.title, { exact: true }) })
  await details.locator('summary').click()
  const smooth = details.getByRole('region', { name: copy.smooth })
  await expect(smooth.getByText(copy.smoothHint)).toBeVisible()
  await smooth.getByRole('button', { name: copy.smooth, exact: true }).click()
  await expect(smooth.getByRole('status')).toHaveText(copy.smoothed(4))
  // Os quatro cantos já ficaram iguais aos vizinhos? Uma segunda vez ainda mistura um pouco.
  await smooth.getByRole('button', { name: copy.smooth, exact: true }).click()
  await expect(smooth.getByRole('status')).toContainText('Forças suavizadas')
  expect(errors).toEqual([])
})
