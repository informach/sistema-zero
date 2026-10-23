import type {} from './fixtures/free'
import { expect, test } from './fixtures/pythonLanguageSessions'

test.beforeEach(async ({ page, pythonLanguageSessions }) => {
  pythonLanguageSessions.releaseWith(async () => {
    if (!page.isClosed()) await page.evaluate(() => globalThis.studioFreeProbe?.close())
  })
})

for (const kind of ['classic', 'pro'] as const)
  test(`Turtle removal ${kind} checks actual CPython imports before changing the document`, async ({
    page,
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
    const extensions = page.getByRole('dialog', { name: 'Extensões Python', exact: true })
    const confirmation = page.getByRole('dialog', { name: 'Remover extensão?', exact: true })
    async function savedState() {
      return page.evaluate(async () => {
        const project = await studioFreeProbe.saved()
        if (project?.programmingLanguage !== 'python') throw new Error('Python project missing')
        const node = project.kind === 'pro' ? project.tree['main.py'] : undefined
        const source =
          project.kind === 'classic'
            ? project.files['main.py']
            : node?.kind === 'file'
              ? node.content
              : undefined
        return { extensions: project.installedExtensions, source: source?.replaceAll('\r\n', '\n') }
      })
    }
    async function openExtensions() {
      await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
      await expect(extensions).toBeVisible()
    }
    await openExtensions()
    await extensions.getByRole('button', { name: 'Instalar', exact: true }).click()
    await expect(extensions.getByText('Instalada', { exact: true })).toBeVisible()
    await extensions.getByRole('button', { name: 'Fechar', exact: true }).click()
    const inUse =
      '# R20: import is inspected, not executed\nfrom turtle import Turtle as Pen\nprint("preserved")\n'
    await page.evaluate((source) => studioFreeProbe.source(source), inUse)
    await page.keyboard.press('Control+s')
    await openExtensions()
    await extensions.getByRole('button', { name: 'Remover', exact: true }).click()
    await confirmation.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(confirmation.getByRole('alert')).toContainText('main.py:2', { timeout: 30_000 })
    await expect
      .poll(savedState)
      .toMatchObject({ extensions: [{ id: 'python-turtle' }], source: inUse })
    expect((await page.evaluate(() => studioFreeProbe.read()))?.replaceAll('\r\n', '\n')).toBe(
      inUse,
    )
    await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await extensions.getByRole('button', { name: 'Fechar', exact: true }).click()
    const independent = '# Turtle is no longer required\nprint("preserved")\n'
    await page.evaluate((source) => studioFreeProbe.source(source), independent)
    await page.keyboard.press('Control+s')
    await openExtensions()
    await extensions.getByRole('button', { name: 'Remover', exact: true }).click()
    await confirmation.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(confirmation).toHaveCount(0, { timeout: 30_000 })
    await expect(extensions.getByText('Instalada', { exact: true })).toHaveCount(0)
    await expect.poll(savedState).toMatchObject({ extensions: [], source: independent })
    expect((await page.evaluate(() => studioFreeProbe.read()))?.replaceAll('\r\n', '\n')).toBe(
      independent,
    )
    await page.screenshot({ path: testInfo.outputPath('turtle-removed-source-preserved.png') })
    await page.evaluate(() => studioFreeProbe.close())
  })
