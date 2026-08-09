import { expect, type Page, test } from '@playwright/test'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 })
}

async function replaceBridgeScript(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'script.js' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  const input = editor.getByRole('textbox', { name: 'Editor content' })
  await editor.locator('.view-line').first().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await expect(input).toHaveValue('')
  await page.evaluate((text) => navigator.clipboard.writeText(text), code)
  await page.keyboard.press('Control+V')
  await expect(input).toHaveValue(code)
}

async function replaceBridgeHtml(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: 'Ponte' }).click()
  await page.getByRole('button', { name: 'index.html' }).first().click()
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  const input = editor.getByRole('textbox', { name: 'Editor content' })
  await editor.locator('.view-line').first().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await expect(input).toHaveValue('')
  await page.evaluate((text) => navigator.clipboard.writeText(text), code)
  await page.keyboard.press('Control+V')
  await expect(input).toHaveValue(code)
}

test.describe('segurança do preview', () => {
  test('handlers HTML exatos funcionam, preservam return false e têm guarda de loop', async ({
    page,
  }) => {
    await createProject(page)
    await replaceBridgeHtml(
      page,
      [
        '<a id="acao" href="#nao-navegar" onclick="this.dataset.executou=\'sim\'; return false">agir</a>',
        '<button id="loop" onclick="while (true) {}">loop</button>',
        '<button id="depois" onclick="this.dataset.executou=\'sim\'">depois</button>',
      ].join('\n'),
    )

    const preview = page.frameLocator('iframe[title="Pré-visualização"]')
    const action = preview.locator('#acao')
    await expect(action).toBeVisible({ timeout: 15_000 })
    await action.click()
    await expect(action).toHaveAttribute('data-executou', 'sim')
    await expect.poll(() => preview.locator('body').evaluate(() => location.hash)).toBe('')

    await preview.locator('#loop').click()
    const after = preview.locator('#depois')
    await after.click()
    await expect(after).toHaveAttribute('data-executou', 'sim')
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.locator('.blocklySvg')).toBeVisible()
  })

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

    const body = page.frameLocator('iframe[title="Pré-visualização"]').locator('body')
    await expect(body).toHaveAttribute('data-after-dynamic-script', 'responsive', {
      timeout: 15_000,
    })
    await expect(body).not.toHaveAttribute('data-dynamic-script', 'executed')

    // Uma ação no documento hospedeiro prova que a tentativa não travou a aba.
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.locator('.blocklySvg')).toBeVisible()
  })

  test('script externo criado em execução é recusado e a IDE continua responsiva', async ({
    page,
  }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      [
        'const codigo = document.createElement("script");',
        'codigo.src = "data:text/javascript," + encodeURIComponent(\'document.body.dataset.dynamicExternal="executed"\');',
        'document.body.appendChild(codigo);',
        'document.body.dataset.afterDynamicExternal = "responsive";',
      ].join('\n'),
    )

    const body = page.frameLocator('iframe[title="Pré-visualização"]').locator('body')
    await expect(body).toHaveAttribute('data-after-dynamic-external', 'responsive', {
      timeout: 15_000,
    })
    await expect(body).not.toHaveAttribute('data-dynamic-external', 'executed')
    await page.getByRole('button', { name: 'Blocos' }).click()
    await expect(page.locator('.blocklySvg')).toBeVisible()
  })
})
