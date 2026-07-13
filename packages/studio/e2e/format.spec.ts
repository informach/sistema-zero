import { expect, type Page, test } from '@playwright/test'

// Prova REAL do Formatar: exige os language services vivos (provider de
// formatação registrado + worker), o que o bun test/happy-dom não exercita.
// Regressão coberta: contribuições carregadas DEPOIS dos models perdiam o
// evento one-shot `onLanguage` e o Formatar virava no-op silencioso.

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

async function replaceEditorContent(page: Page, code: string): Promise<void> {
  const editor = page.locator('.monaco-editor').first()
  await editor.waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(code)
}

test.describe('Formatar código — Monaco na Ponte', () => {
  test('formata o script.js (provider de JS do worker TS)', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'script.js' }).first().click()
    await replaceEditorContent(page, 'function soma(a,b){return a+b}')
    const lines = page.locator('.monaco-editor .view-lines').first()
    // Pré-check leve: só palavras (o suggest ao vivo pode retocar pontuação
    // durante a digitação — asserção byte-exata do texto digitado é flaky).
    await expect(lines).toContainText('soma')

    // aria-label = formatLabel — resolve o botão também no modo compacto (só ícone).
    await page.getByRole('button', { name: 'Formatar código' }).click()

    // Âncoras que SÓ o formatador do TS produz (a ação era no-op na regressão).
    await expect(lines).toContainText('soma(a, b)', { timeout: 10_000 })
    await expect(lines).toContainText('return a + b', { timeout: 10_000 })
  })

  test('formata o style.css (provider do cssMode)', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Ponte' }).click()
    await page.getByRole('button', { name: 'style.css' }).first().click()
    await replaceEditorContent(page, 'body{color:red;margin:0}')
    const lines = page.locator('.monaco-editor .view-lines').first()
    await expect(lines).toContainText('margin')

    await page.getByRole('button', { name: 'Formatar código' }).click()

    // "body {" (com espaço) só existe pós-formatação — o texto foi digitado
    // como "body{". O formatador de CSS abre o bloco e quebra as declarações.
    await expect(lines).toContainText('body {', { timeout: 10_000 })
    await expect(lines).toContainText('color: red;', { timeout: 10_000 })
  })
})
