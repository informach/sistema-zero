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
  await page.getByRole('dialog').getByText('Com código', { exact: true }).click()
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
  await page.getByRole('tab', { name: /^Terminal/ }).click()
  await page.getByRole('button', { name: 'Abrir o terminal' }).click()
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

// Lote 6 da missão (seção 7, "ensaio com dependências"; homologação F): uma biblioteca de
// verdade instalada pelo terminal entra no projeto, roda na prévia, não deixa problema no editor,
// passa pelo build e continua no projeto depois de recarregar.
/** Abre um arquivo da seção "Configuração" da lista, que começa recolhida. */
async function openConfigFile(page: Page, path: string): Promise<void> {
  const item = page.getByRole('treeitem', { name: path, exact: true })
  if (!(await item.isVisible()))
    await page.locator('button[aria-expanded="false"]', { hasText: 'Configuração' }).click()
  await item.dblclick()
}

test('Pro project with a real npm dependency: install, import, build and reopen', async ({
  page,
}) => {
  test.setTimeout(900_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('dialog').getByText('Com código', { exact: true }).click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  const editorUrl = page.url()
  await waitForPreview(page, 'Editado em JavaScript ✨')

  await page.getByRole('tab', { name: /^Terminal/ }).click()
  await page.getByRole('button', { name: 'Abrir o terminal' }).click()
  const rows = page.locator('.xterm-rows')
  await expect(rows).toContainText('Arquivos do projeto montados', { timeout: 120_000 })
  await page.locator('.xterm').click()
  await page.keyboard.type('npm install nanoid@5.0.9\n')
  await expect(rows).toContainText(/added \d+ package/, { timeout: 180_000 })

  // O package.json que o npm reescreveu volta para o projeto (alteração externa reconhecida).
  await openConfigFile(page, 'package.json')
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('"nanoid"', {
    timeout: 60_000,
  })

  await page.getByRole('treeitem', { name: 'src/main.js', exact: true }).dblclick()
  await replaceActiveFile(
    page,
    "import { nanoid } from 'nanoid'\nconst app = document.getElementById('app')\nif (app) app.textContent = `id com ${nanoid(6).length} letras`\n",
  )
  await waitForPreview(page, 'id com 6 letras')
  // O editor leu as bibliotecas instaladas sem erro e não acusa a importação.
  await expect(page.getByText('Não consegui ler as bibliotecas instaladas')).toHaveCount(0)
  await expect(page.getByText('Reconhecendo bibliotecas instaladas…')).toHaveCount(0, {
    timeout: 60_000,
  })
  await expect(page.getByRole('tab', { name: /^Problemas/ })).toHaveAccessibleName(
    /Nenhum problema/,
    { timeout: 60_000 },
  )

  // A aba Terminal já aberta fecha a gaveta se for clicada de novo: só abre se o terminal sumiu.
  if (!(await page.locator('.xterm').isVisible()))
    await page.getByRole('tab', { name: /^Terminal/ }).click()
  await page.locator('.xterm').click()
  await page.keyboard.type('npm run build\n')
  await expect(rows).toContainText(/built in/, { timeout: 180_000 })

  // Recarregar: a dependência está no projeto guardado e o jogo volta a rodar com ela.
  await page.reload()
  await expect(page).toHaveURL(editorUrl)
  await waitForPreview(page, 'id com 6 letras')
  await openConfigFile(page, 'package.json')
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('"nanoid"')

  expect(errors).toEqual([])
})
