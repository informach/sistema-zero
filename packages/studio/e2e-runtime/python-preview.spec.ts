import { expect, test } from '@playwright/test'
import type {} from './fixtures/previewHost'

test.beforeEach(async ({ page }) => {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.pythonPreviewProbe)
})

for (const fixture of ['portable', 'classic-portable'])
  test(`${fixture}: production React controls execute real Python and keep the old source until restart`, async ({
    page,
  }) => {
    await page.evaluate((fixture) => globalThis.pythonPreviewProbe.create(fixture), fixture)
    await page.getByRole('button', { name: 'Executar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Programa concluído')
    const before = await page.evaluate(() => globalThis.pythonPreviewProbe.events())
    expect(before.some((event) => event.type === 'console' && event.text.includes('ação 🐢'))).toBe(
      true,
    )
    await page.evaluate(() => globalThis.pythonPreviewProbe.source('print("versão nova")\n'))
    await expect(page.getByText(/Seu código mudou/)).toBeVisible()
    await page.getByRole('button', { name: 'Reiniciar' }).click()
    await expect(page.getByRole('status')).toHaveText('Programa concluído')
    const after = await page.evaluate(() => globalThis.pythonPreviewProbe.events())
    const result = after.find(
      (event) => event.type === 'console' && event.text.includes('versão nova'),
    )
    expect(result?.identity.revision).not.toBe(before[0]!.identity.revision)
    expect(result?.identity.runId).not.toBe(before[0]!.identity.runId)
    await expect(page.locator('iframe')).toHaveCount(1)
    await page.getByRole('button', { name: 'Parar' }).click()
    await expect(page.locator('iframe')).toHaveCount(0)
  })

test('Python input uses the visible form and a writer change stops the session', async ({
  page,
}) => {
  await page.evaluate(() => globalThis.pythonPreviewProbe.create('classic-input'))
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect(page.getByRole('textbox')).toBeVisible()
  await page.getByRole('textbox').fill('Ana 🐢')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.waitForFunction(() =>
    globalThis.pythonPreviewProbe
      .events()
      .some((event) => event.type === 'input-request' && event.requestId === 'input-2'),
  )
  await expect(page.getByRole('textbox')).toHaveValue('')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.waitForFunction(() =>
    globalThis.pythonPreviewProbe
      .events()
      .some((event) => event.type === 'input-request' && event.requestId === 'input-3'),
  )
  await page.getByRole('button', { name: 'Encerrar entrada' }).click()
  await expect(page.getByRole('status')).toHaveText('Programa concluído')
  expect(
    await page.evaluate(() =>
      globalThis.pythonPreviewProbe
        .events()
        .some((event) => event.type === 'console' && event.text.includes('Ana 🐢')),
    ),
  ).toBe(true)
  await page.evaluate(() => globalThis.pythonPreviewProbe.writer(2))
  await expect(page.getByRole('status')).toHaveText('Parado')
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('Turtle capture uses the presented runtime and rejects changed source', async ({ page }) => {
  await page.evaluate(() => globalThis.pythonPreviewProbe.create('classic-turtleDrawing'))
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await page.waitForFunction(() =>
    globalThis.pythonPreviewProbe
      .events()
      .some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
  )
  const cover = await page.evaluate(() => globalThis.pythonPreviewProbe.capture())
  expect(cover?.startsWith('data:image/png;base64,')).toBe(true)
  await page.evaluate(() => globalThis.pythonPreviewProbe.source('print("changed")\n'))
  expect(await page.evaluate(() => globalThis.pythonPreviewProbe.capture())).toBeNull()
  await page.evaluate(() => globalThis.pythonPreviewProbe.allow(false))
  await expect(page.getByRole('button', { name: 'Executar', exact: true })).toBeDisabled()
  await expect(page.locator('iframe')).toHaveCount(0)
})
