import { expect, type Page, test } from '@playwright/test'

/** Regressão: o preview abria no Firefox, mas o código do aluno não executava. */
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

test.describe('preview executa o código do aluno', () => {
  test('o script canônico roda e pinta a tela', async ({ page }) => {
    await createProject(page)
    await replaceBridgeScript(
      page,
      [
        'document.body.style.background = "rgb(0, 128, 0)";',
        'document.body.dataset.rodouCodigoDoAluno = "sim";',
      ].join('\n'),
    )

    const body = page.frameLocator('iframe[title="Pré-visualização"]').locator('body')
    await expect(body).toHaveAttribute('data-rodou-codigo-do-aluno', 'sim', { timeout: 15_000 })
    await expect(body).toHaveCSS('background-color', 'rgb(0, 128, 0)')
  })

  test('um `<script>` inline no index.html também executa', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'index.html' }).first().click()
    const editor = page.locator('.monaco-editor').first()
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    const code =
      '<p id="alvo">oi</p>\n<script>document.getElementById("alvo").dataset.inline = "rodou"</script>'
    const input = editor.getByRole('textbox', { name: 'Editor content' })
    await editor.locator('.view-line').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await expect(input).toHaveValue('')
    await page.evaluate((text) => navigator.clipboard.writeText(text), code)
    await page.keyboard.press('Control+V')
    await expect(input).toHaveValue(code)

    // A Ponte pode manter o parágrafo inicial enquanto o reverse-parse estabiliza;
    // o contrato deste cenário é que ao menos o elemento tocado pelo script prove
    // a execução no Firefox.
    const executedTarget = page
      .frameLocator('iframe[title="Pré-visualização"]')
      .locator('#alvo[data-inline="rodou"]')
      .first()
    await expect(executedTarget).toBeVisible({ timeout: 15_000 })
  })
})
