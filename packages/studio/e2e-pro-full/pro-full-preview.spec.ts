import { expect, type Page, test } from '@playwright/test'

// Percurso de gravação do Estúdio Completo Pro, sem atalhos: o projeto nasce pela UI,
// sobe no WebContainer real (npm install + Vite), a edição no Monaco chega ao preview
// pelo dev-server, o terminal roda npm de verdade e a página recarregada reabre o mesmo
// projeto com a fonte editada. O reparo de documento antigo (Vite 8.0.16) precisa do
// serviço hospedado de preparação e é homologado no ambiente de staging.

const PREVIEW = 'Pré-visualização (dev-server)'

async function waitForPreview(page: Page, text: string): Promise<void> {
  const frame = page.frameLocator(`iframe[title="${PREVIEW}"]`)
  await expect(frame.locator('#app')).toHaveText(text, { timeout: 240_000 })
}

async function replaceActiveFile(page: Page, content: string): Promise<void> {
  const editor = page.locator('.monaco-editor').first()
  await expect(editor).toBeVisible({ timeout: 30_000 })
  await page.locator('.monaco-editor .view-line').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(content)
}

test('Pro project runs, reflects edits, uses the real terminal and reopens with its source', async ({
  page,
}) => {
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByText('Pro (código)', { exact: true }).click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  const editorUrl = page.url()

  // Primeiro resultado visual: o main.js do template padrão (vanilla-js) troca o texto do #app.
  await waitForPreview(page, 'Editado em JavaScript ✨')

  // Edição pelo teclado chega ao preview pelo dev-server em execução: o Estúdio não volta
  // a instalar dependências nem a subir o Vite para mostrar a mudança.
  await page.evaluate(() => {
    const restarted = /Instalando dependências|Subindo o servidor de desenvolvimento/
    new MutationObserver(() => {
      if (restarted.test(document.body.innerText))
        (globalThis as { __proRestarted?: boolean }).__proRestarted = true
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  const marker = `Gravação ${Date.now()}`
  await page.getByRole('treeitem', { name: 'src/main.js', exact: true }).dblclick()
  await replaceActiveFile(
    page,
    `const app = document.getElementById('app')\nif (app) app.textContent = '${marker}'\n`,
  )
  await waitForPreview(page, marker)
  expect(
    await page.evaluate(() => (globalThis as { __proRestarted?: boolean }).__proRestarted ?? false),
  ).toBe(false)

  // Terminal real no mesmo WebContainer: npm executa e enxerga os arquivos do projeto.
  await page.getByRole('button', { name: 'Terminal', exact: true }).click()
  await page.getByRole('button', { name: 'Carregar terminal real' }).click()
  const rows = page.locator('.xterm-rows')
  await expect(rows).toContainText('Arquivos do projeto montados', { timeout: 120_000 })
  await page.locator('.xterm').click()
  await page.keyboard.type('npm run build\n')
  await expect(rows).toContainText(/built in/, { timeout: 180_000 })

  // Reabrir: a mesma URL depois de recarregar traz a fonte editada e o preview dela.
  await page.reload()
  await expect(page).toHaveURL(editorUrl)
  await waitForPreview(page, marker)
  await page.getByRole('treeitem', { name: 'src/main.js', exact: true }).dblclick()
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(marker)

  expect(errors).toEqual([])
})
