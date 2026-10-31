import { expect, type Locator, type Page, test } from '@playwright/test'
import { COPY } from '../src/core/copy'
import { addScenePrimitive } from '../src/scene/commands'
import { createSceneProject } from '../src/scene/createProject'
import { sceneToJson } from '../src/scene/documentJson'
import { setScenePieceCoordinates } from '../src/scene/pieceCoordinates'

test.use({ hasTouch: false, viewport: { width: 1440, height: 900 } })

async function openMeasurements(page: Page) {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Medidas precisas' }),
    'box',
    'corpo',
  )
  source = setScenePieceCoordinates(source, source.nodes[0]!.id, 'position', [0.25, 0.35, 0.45])
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'medidas.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  return page.getByRole('spinbutton', { name: 'Tamanho X', exact: true })
}

async function fractions(page: Page, enabled: boolean) {
  const menu = page.locator('summary').filter({ hasText: 'Mais ajustes do palco' })
  await menu.click()
  const step = page.getByLabel('Passo ao mover e redimensionar')
  await step.selectOption(enabled ? '0.01' : '1')
  await expect(step).toHaveValue(enabled ? '0.01' : '1')
  await menu.click()
}

async function edit(field: Locator, value: string) {
  await field.fill(value)
  await field.press('Enter')
}

test('position and size fields accept hundredths and click steps follow the selected increment', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const size = await openMeasurements(page)
  const position = page.getByRole('spinbutton', { name: 'Posição X', exact: true })
  await expect(size).toHaveAttribute('step', '0.01')
  await edit(size, '3.7')
  await expect(size).toHaveValue('3.70')
  await edit(position, '-2.7')
  await expect(position).toHaveValue('-2.70')
  await fractions(page, true)
  await expect(size).toHaveAttribute('step', '0.01')
  await edit(size, '3.25')
  await expect(size).toHaveValue('3.25')
  await size.press('ArrowUp')
  await size.press('Enter')
  await expect(size).toHaveValue('3.26')
  await page.getByText('Ajustar por cliques', { exact: true }).click()
  await page
    .getByRole('button', { name: 'Tamanho', exact: true })
    .and(page.locator('[aria-keyshortcuts="S"]'))
    .click()
  await page.getByRole('button', { name: 'Maior', exact: true }).click()
  await expect(size).toHaveValue('3.27')
  await fractions(page, false)
  await expect(size).toHaveValue('3.27')
  await page.getByRole('button', { name: 'Maior', exact: true }).click()
  await expect(size).toHaveValue('4.00')
  const dimensions = page
    .locator('details')
    .filter({ has: page.locator('summary').getByText(COPY.scene.dimensions, { exact: true }) })
  await dimensions.locator('summary').click()
  await dimensions
    .getByRole('spinbutton', { name: `${COPY.scene.dimensions} X`, exact: true })
    .fill('3.7')
  await dimensions.getByRole('button', { name: COPY.scene.apply, exact: true }).click()
  await expect(
    dimensions.getByRole('spinbutton', { name: `${COPY.scene.dimensions} X`, exact: true }),
  ).toHaveValue('3.70')
  await fractions(page, true)
  await page.locator('summary').filter({ hasText: 'Mais ajustes do palco' }).click()
  await page.screenshot({ path: '.cache/medidas-desktop.png' })
  expect(errors).toEqual([])
})

test('size and move handles and body dragging obey the measurement precision', async ({ page }) => {
  const size = await openMeasurements(page)
  const position = page.getByRole('spinbutton', { name: 'Posição X', exact: true })
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.front, exact: true }).click()
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.front}` })
    .click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page
    .getByRole('button', { name: 'Tamanho', exact: true })
    .and(page.locator('[aria-keyshortcuts="S"]'))
    .click()
  const handle = page.getByRole('button', { name: 'Tamanho no eixo X', exact: true })
  // O padrão é o Fino (0,1); o Bloco prende o arrasto em números inteiros.
  await handle.press('ArrowRight')
  await expect(size).toHaveValue('2.10')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await fractions(page, false)
  await handle.press('ArrowRight')
  await expect(size).toHaveValue('3.00')
  const tip = await handle.locator('.mld-axis-hit-tip').boundingBox()
  if (!tip) throw new Error('Alça sem área visível')
  await page.mouse.move(tip.x + tip.width / 2, tip.y + tip.height / 2)
  await page.mouse.down()
  await page.mouse.move(tip.x + tip.width / 2 + 70, tip.y + tip.height / 2, { steps: 5 })
  await page.mouse.up()
  const enlarged = Number(await size.inputValue())
  expect(enlarged).toBeGreaterThan(3)
  expect(Number.isInteger(enlarged)).toBe(true)
  await fractions(page, true)
  await handle.press('ArrowRight')
  expect(Number(await size.inputValue())).toBeCloseTo(enlarged + 0.01, 10)
  await fractions(page, false)
  await page
    .getByRole('button', { name: 'Mover', exact: true })
    .and(page.locator('[aria-keyshortcuts="G"]'))
    .click()
  await page.getByRole('button', { name: 'Mover no eixo X', exact: true }).press('ArrowRight')
  await expect(position).toHaveValue('1.00')
  await expect(page.getByRole('spinbutton', { name: 'Posição Z', exact: true })).toHaveValue('0.45')
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  const canvas = await page.locator('canvas').first().boundingBox()
  if (!canvas) throw new Error('Palco sem área visível')
  const center = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 }
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 90, center.y + 35, { steps: 5 })
  await page.mouse.up()
  const moved = Number(await position.inputValue())
  expect(moved).not.toBe(1)
  expect(Number.isInteger(moved)).toBe(true)
  await fractions(page, true)
  await page.getByRole('button', { name: 'Mover no eixo X', exact: true }).press('ArrowLeft')
  expect(Number(await position.inputValue())).toBeCloseTo(moved - 0.01, 10)
})
