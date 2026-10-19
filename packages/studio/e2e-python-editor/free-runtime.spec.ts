import type {} from './fixtures/free'
import { expect, test } from './fixtures/pythonLanguageSessions'

test.beforeEach(async ({ page, pythonLanguageSessions }) => {
  pythonLanguageSessions.releaseWith(async () => {
    if (!page.isClosed()) await page.evaluate(() => globalThis.studioFreeProbe?.close())
  })
})

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
    const source =
      'import turtle\nscreen = turtle.Screen()\nscreen.setup(640, 480)\nscreen.bgcolor("white")\nturtle.hideturtle()\nturtle.pensize(6)\nturtle.pencolor("#dc2626")\nturtle.forward(60)\nprint("free-python")\nturtle.done()\n'
    await page.evaluate((source) => studioFreeProbe.source(source), source)
    const editedSource = await page.evaluate(() => studioFreeProbe.read())
    // Monaco applies the existing model's EOL when executeEdits inserts LF text.
    expect(editedSource?.replaceAll('\r\n', '\n')).toBe(source)
    await page.keyboard.press('Control+s')
    await expect
      .poll(async () => JSON.stringify(await page.evaluate(() => studioFreeProbe.saved())))
      .toContain('free-python')
    await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
    const consoleMenu = page.getByRole('menuitem', { name: 'Console', exact: true })
    if ((await consoleMenu.getAttribute('aria-current')) !== 'true') await consoleMenu.click()
    else await page.keyboard.press('Escape')
    if (kind === 'pro') {
      const consoleTab = page.getByRole('button', { name: 'Console', exact: true })
      if ((await consoleTab.getAttribute('aria-expanded')) !== 'true') await consoleTab.click()
    }
    const clearConsole = page.getByRole('button', { name: 'Limpar', exact: true })
    await expect(clearConsole).toBeVisible()
    const consoleOutput =
      kind === 'pro'
        ? page.getByRole('region', { name: 'Problemas e saída do jogo', exact: true })
        : page.getByRole('tabpanel').filter({ has: clearConsole })
    const previousFrames = await page
      .locator('iframe[title="Pré-visualização Python"]')
      .elementHandles()
    try {
      // The real host may already have auto-started the previous version.
      await page.getByRole('button', { name: /^(Executar|Reiniciar)$/ }).click()
      for (const previous of previousFrames)
        await expect
          .poll(() => previous.evaluate((frame) => frame.isConnected).catch(() => false))
          .toBe(false)
    } finally {
      await Promise.all(previousFrames.map((frame) => frame.dispose()))
    }
    const started = Date.now()
    const frame = page.locator('iframe[title="Pré-visualização Python"]')
    await expect(frame).toHaveCount(1)
    const canvas = frame.contentFrame().locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 30_000 })
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected Turtle canvas')
          const context = element.getContext('2d')
          if (!context) throw new Error('Canvas pixels unavailable')
          const pixel = context.getImageData(
            Math.floor(element.width * (0.5 + 25 / 640)),
            Math.floor(element.height / 2),
            1,
            1,
          ).data
          return pixel[0]! > 180 && pixel[1]! < 80 && pixel[2]! < 80 && pixel[3] === 255
        }),
      )
      .toBe(true)
    await expect(consoleOutput.getByText('free-python', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Seu código mudou. Clique em Reiniciar para executar a nova versão.'),
    ).toHaveCount(0)
    await testInfo.attach('first-drawing-ms', {
      body: JSON.stringify({
        milliseconds: Date.now() - started,
        qualification: 'functional-only: fresh execution, edited-source pixels and stdout',
      }),
      contentType: 'application/json',
    })
    const before = await page.evaluate(() => studioFreeProbe.read())
    expect(before).toBe(editedSource)
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
