import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function replaceBridgeScript(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(code)
}

test.describe('segurança do preview', () => {
  test('script inline criado em execução é bloqueado e a IDE continua responsiva', async ({
    page,
  }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      [
        'const codigo = document.createElement("script");',
        'codigo.textContent = \'document.body.dataset.dynamicScript="executed"; while (true) {}\';',
        'document.body.appendChild(codigo);',
        'document.body.dataset.afterDynamicScript = "responsive";',
      ].join('\n'),
    )

    const body = page.frameLocator('iframe').locator('body')
    await expect(body).toHaveAttribute('data-after-dynamic-script', 'responsive', {
      timeout: 15_000,
    })
    await expect(body).not.toHaveAttribute('data-dynamic-script', 'executed')

    // Uma ação no documento hospedeiro prova que a tentativa não travou a aba.
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.locator('.blocklySvg')).toBeVisible()
  })
})
