import { expect, test } from '@playwright/test'
import type {} from './fixtures/free'

for (const kind of ['classic', 'pro'] as const) {
  test(`free ${kind} creates Python without Turtle, installs it and preserves source on revocation`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(90_000)
    await page.goto('/')
    await page.waitForFunction(() => !!globalThis.studioFreeProbe)
    await page.evaluate(() => studioFreeProbe.create())
    await page.getByRole('button', { name: '+ Novo projeto' }).click()
    await expect(page.getByRole('radio', { name: 'JavaScript (padrão)' })).toBeChecked()
    if (kind === 'pro') await page.getByRole('radio', { name: /Pro \(código\)/ }).click()
    await page.getByRole('radio', { name: 'Python', exact: true }).click()
    await page.getByRole('button', { name: 'Criar e abrir', exact: true }).click()
    await expect
      .poll(() => page.evaluate(() => studioFreeProbe.saved()))
      .toMatchObject({ programmingLanguage: 'python', kind, installedExtensions: [] })
    if (kind === 'classic') {
      await expect(page.locator('.blocklySvg').first()).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Ponte', exact: true }).click()
    }
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
    const extensions = page.getByRole('dialog', { name: 'Extensões Python' })
    await expect(extensions.getByText('Turtle', { exact: true })).toBeVisible()
    await extensions.getByRole('button', { name: 'Instalar', exact: true }).click()
    await expect(extensions.getByText('Instalada', { exact: true })).toBeVisible()
    await extensions.getByRole('button', { name: /Fechar/ }).click()
    const source = 'import turtle\nturtle.forward(60)\nprint("free-python")\nturtle.done()\n'
    await page.evaluate((source) => studioFreeProbe.source(source), source)
    await page.keyboard.press('Control+s')
    await expect
      .poll(async () => JSON.stringify(await page.evaluate(() => studioFreeProbe.saved())))
      .toContain('free-python')
    await page.getByRole('button', { name: 'Executar', exact: true }).click()
    const started = Date.now()
    await expect(
      page.frameLocator('iframe[title="Pré-visualização Python"]').locator('canvas'),
    ).toBeVisible({ timeout: 30_000 })
    await testInfo.attach('first-drawing-ms', {
      body: JSON.stringify({ milliseconds: Date.now() - started, targetMs: 12_000 }),
      contentType: 'application/json',
    })
    const before = await page.evaluate(() => studioFreeProbe.read())
    expect(before).toContain('free-python')
    await request.post('/free-probe/revoke')
    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
    await expect(page.locator('iframe[title="Pré-visualização Python"]')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => studioFreeProbe.read())).toBe(before)
    const calls = await (await request.get('/free-probe/requests')).json()
    expect(calls.some((entry: { operation: string }) => entry.operation === 'execute')).toBe(true)
    expect(calls.every((entry: { bytes: number }) => entry.bytes < 3000)).toBe(true)
    await page.evaluate(() => studioFreeProbe.close())
  })
}

test('a transient free discovery failure can recover without closing or clearing the creation dialog', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.studioFreeProbe)
  await page.evaluate(() => studioFreeProbe.create(true))
  await expect(page.getByRole('alert')).toContainText('consultar')
  await page.getByRole('button', { name: '+ Novo projeto' }).click()
  await page.getByRole('textbox').fill('Meu nome preservado')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(page.getByRole('radio', { name: 'Python', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('Meu nome preservado')
  await page.evaluate(() => studioFreeProbe.close())
})
