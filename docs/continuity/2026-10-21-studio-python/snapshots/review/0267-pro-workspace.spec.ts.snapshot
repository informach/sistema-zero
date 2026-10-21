import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { build, type PreviewServer, preview } from 'vite'
import { inspectWorkspaceBuffers } from './proWorkspaceInspection'

let server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(180_000)
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  const root = fileURLToPath(new URL('./fixtures/pro-workspace', import.meta.url))
  const outDir = fileURLToPath(new URL('../.cache/e2e-pro-workspace', import.meta.url))
  await build({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir, emptyOutDir: true, target: 'esnext' },
  })
  server = await preview({
    configFile,
    root,
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    )
})

test('loads symbols opened before the language module arrives', async ({ page }) => {
  const requested = Promise.withResolvers<void>()
  const resume = Promise.withResolvers<void>()
  await page.route('**/session-*.js', async (route) => {
    requested.resolve()
    await resume.promise
    await route.continue()
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  try {
    await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: 'domcontentloaded' })
    await requested.promise
    await page.getByRole('button', { name: 'Símbolos do arquivo', exact: true }).click()
    resume.resolve()
    await expect(page.getByRole('button', { name: 'score', exact: true })).toBeVisible()
  } finally {
    resume.resolve()
  }
})

test('reports a language module loading failure in Problems instead of analysing forever', async ({
  page,
}) => {
  await page.route('**/session-*.js', (route) => route.abort())
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  await page.getByRole('button', { name: /^Problemas/ }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'A análise não pôde ser concluída' }),
  ).toBeVisible()
  await expect(page.getByText('Analisando o código…', { exact: true })).toBeHidden()
  await expect(page.getByText(/Salve o projeto antes de recarregar a página/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reiniciar análise', exact: true })).toBeHidden()
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await input.focus()
  await input.press('Control+End')
  await page.keyboard.type('// editing remains available')
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText('// editing remains available')
  await page.unroute('**/session-*.js')
  await page.reload()
  await page.getByRole('button', { name: /^Problemas/ }).click()
  await expect(page.getByRole('button', { name: 'src/closed.ts:1', exact: true })).toBeVisible()
  await expect(
    page.getByRole('alert').filter({ hasText: 'A análise não pôde ser concluída' }),
  ).toBeHidden()
})

test('downloads the current source and surfaces manifest warnings', async ({ page }) => {
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  await input.focus()
  await input.press('Control+End')
  await page.keyboard.type('// current source export')
  await page.getByRole('button', { name: 'Mais opções' }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /Baixar o código/ }).click()
  const download = await downloaded
  const path = await download.path()
  if (!path) throw new Error('Download ausente')
  const files = unzipSync(await readFile(path))
  expect(strFromU8(files['src/main.ts']!)).toContain('// current source export')
  expect(Object.keys(files).some((name) => name.startsWith('public/studio-assets/'))).toBe(true)
  expect(strFromU8(files['LEIA-ME.txt']!)).not.toContain('npm run dev')
  await expect(
    page.getByRole('dialog', { name: 'Fonte baixada: confira estes avisos' }),
  ).toContainText('package.json está ausente ou inválido')
})

test('recovers an open symbols panel when a failed language worker is restarted', async ({
  page,
}) => {
  await page.route('**/pro-language.worker-*.js', (route) => route.abort())
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  await page.getByRole('button', { name: 'Símbolos do arquivo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reiniciar análise', exact: true })).toBeVisible()
  await page.unroute('**/pro-language.worker-*.js')
  await page.getByRole('button', { name: 'Reiniciar análise', exact: true }).click()
  await expect(page.getByRole('button', { name: 'score', exact: true })).toBeVisible()
  await expect(page.getByText(/Salve o projeto antes de recarregar a página/)).toBeHidden()
})

test('reports a source worker failure visibly and does not download a partial archive', async ({
  page,
}) => {
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  let downloads = 0
  page.on('download', () => downloads++)
  await page.route('**/zip.worker-*.js', (route) => route.abort())
  await page.goto(`http://127.0.0.1:${address.port}/?performance=1`)
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('menuitem', { name: /Baixar o código/ }).click()
  await expect(page.getByRole('dialog', { name: 'Não foi possível baixar a fonte' })).toBeVisible()
  expect(downloads).toBe(0)
})

test('uses conventional keyboard navigation, native commands and reviewed symbol rename', async ({
  page,
}) => {
  const lifecycleErrors: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('InstantiationService has been disposed'))
      lifecycleErrors.push(message.text())
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  await input.focus()
  await input.press('Control+p')
  const quick = page.getByRole('dialog', { name: 'Abrir arquivo rapidamente' })
  await expect(quick).toBeVisible()
  await quick.getByRole('combobox').fill('config.ts')
  await quick.getByRole('combobox').press('Enter')
  await expect(quick).toBeHidden()
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText('src/config.ts')
  await expect(page.getByRole('treeitem', { name: 'src/config.ts', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText(
    /export\s+const\s+speed\s*=\s*4/,
  )
  await input.focus()
  await input.press('Control+Home')
  // Entre no nome, sem depender do limite de palavra const/espaço/speed.
  for (const _ of 'export const s') await input.press('ArrowRight')
  await input.press('F2')
  await expect(page.getByLabel('Novo nome do símbolo')).toBeVisible()
  await expect(page.getByLabel('Novo nome do símbolo')).toHaveValue('speed')
  await page.getByLabel('Novo nome do símbolo').fill('velocity')
  await page.getByRole('button', { name: 'Conferir referências', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Conferir mudança nos arquivos' })).toBeVisible()
  // Exercise disposal of the actual diff editor, not just its lazy loading placeholder.
  await expect(
    page
      .getByRole('dialog', { name: 'Conferir mudança nos arquivos' })
      .locator('.monaco-diff-editor'),
  ).toBeVisible()
  await page.getByRole('dialog', { name: 'Conferir mudança nos arquivos' }).press('Escape')
  await expect(page.getByRole('dialog', { name: 'Conferir mudança nos arquivos' })).toBeHidden()
  await input.focus()
  await expect(input).toBeFocused()
  await input.press('F1')
  const palette = page.locator('.quick-input-widget')
  await expect(palette).toBeVisible()
  await palette.getByRole('combobox').fill('>Studio: Localizar referências')
  await expect(palette).toContainText('Studio: Localizar referências')
  await palette.getByRole('combobox').press('Escape')
  await input.press('Control+f')
  await expect(page.locator('.find-widget')).toBeVisible()
  await page.keyboard.press('Escape')
  await input.press('Control+Shift+f')
  await expect(
    page.getByRole('searchbox', { name: 'Encontrar no código do projeto' }),
  ).toBeFocused()
  await page.getByRole('searchbox', { name: 'Encontrar no código do projeto' }).fill('speed')
  await expect(page.getByRole('button', { name: /src\/main.ts:1/ })).toBeVisible()
  await page.getByRole('button', { name: 'Guias', exact: true }).click()
  await expect(
    page.getByRole('searchbox', { name: 'Buscar nos guias deste projeto' }),
  ).toBeVisible()
  expect(lifecycleErrors).toEqual([])
})

test('updates language and removes obsolete markers when an open file changes extension', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('treeitem', { name: 'src/closed.ts', exact: true }).dblclick()
  const inspect = async (path: string) => {
    await inspectWorkspaceBuffers(page)
    const models = JSON.parse(
      (await page.getByLabel('Buffers da sessão').textContent())!,
    ) as Array<{ id: string; path: string; language: string; markers: string[] }>
    return models.find((model) => model.path.endsWith(`/${path}`))!
  }
  await expect.poll(async () => (await inspect('src/closed.ts')).markers.length).toBeGreaterThan(0)
  const original = await inspect('src/closed.ts')
  const rename = async (from: string, to: string) => {
    await page.getByRole('button', { name: `Renomear ou mover ${from}` }).click()
    const field = page.getByLabel(`Renomear ${from.split('/').at(-1)}`)
    await field.fill(to)
    await field.press('Enter')
    await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
    await expect(page.getByRole('treeitem', { name: to, exact: true })).toBeVisible()
  }
  await rename('src/closed.ts', 'src/closed.js')
  expect(await inspect('src/closed.js')).toMatchObject({
    id: original.id,
    language: 'sz-pro-javascript',
  })
  await rename('src/closed.js', 'src/closed.txt')
  expect(await inspect('src/closed.txt')).toMatchObject({
    id: original.id,
    language: 'plaintext',
    markers: [],
  })
  await page.getByRole('button', { name: 'Comandos…', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar arquivos e materiais', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar', exact: true }).first().click()
  await expect(page.getByRole('treeitem', { name: 'src/closed.js', exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Recuperar arquivos e materiais' })
    .getByRole('button', { name: /Fechar/ })
    .click()
  expect(await inspect('src/closed.js')).toMatchObject({
    id: original.id,
    language: 'sz-pro-javascript',
  })
  expect(errors).toEqual([])
})

test('keeps buffers and the game session across layout changes, reviews rename and diagnoses closed files', async ({
  page,
}, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: /Problemas/ }).click()
  await expect(page.getByRole('button', { name: 'src/closed.ts:1' })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole('button', { name: 'Investigar com Zappy', exact: true }).first().click()
  await expect(page.getByPlaceholder('O que deveria acontecer e o que aconteceu?')).toHaveValue(
    /TS2322/,
  )
  await expect(page.getByText('Confira o nome no arquivo.', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Fechar Zappy', exact: true }).first().click()
  await page.getByRole('button', { name: 'Recolher painéis' }).click()
  await inspectWorkspaceBuffers(page)
  const before = await page.getByLabel('Buffers da sessão').textContent()
  expect(before).not.toContain('src/closed.ts')
  const game = page.frameLocator('iframe').getByText(/Sessão \d+/)
  await expect(game).toBeVisible({ timeout: 30_000 })
  const gameSession = await game.textContent()
  await page.getByRole('button', { name: 'Ampliar código' }).click()
  await page.setViewportSize({ width: 700, height: 900 })
  await page.getByRole('button', { name: 'Jogo', exact: true }).click()
  await expect(game).toHaveText(gameSession!)
  await page
    .getByLabel('Organizar o editor')
    .getByRole('button', { name: 'Código', exact: true })
    .click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Código e jogo' }).click()
  await inspectWorkspaceBuffers(page)
  expect(await page.getByLabel('Buffers da sessão').textContent()).toBe(before)
  await page.getByRole('button', { name: 'Renomear ou mover src/config.ts' }).click()
  await page.getByLabel('Renomear config.ts').fill('src/settings.ts')
  await page.getByLabel('Renomear config.ts').press('Enter')
  await expect(page.getByRole('dialog', { name: 'Conferir mudança nos arquivos' })).toBeVisible()
  await page.getByRole('button', { name: 'Ampliar comparação' }).click()
  await expect(page.getByRole('dialog', { name: /Ver mudanças/ })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Lado a lado' }).check()
  await page.getByRole('button', { name: 'Voltar à revisão' }).click()
  await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'src/settings.ts' })).toBeVisible()
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText('./settings')
  await page.getByRole('button', { name: 'Comandos…', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar arquivos e materiais', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar', exact: true }).first().click()
  await page
    .getByRole('dialog', { name: 'Recuperar arquivos e materiais' })
    .getByRole('button', { name: /Fechar/ })
    .click()
  await expect(page.getByRole('treeitem', { name: 'src/config.ts' })).toBeVisible()
  await page.getByRole('button', { name: 'Comandos…', exact: true }).click()
  await page.getByRole('searchbox', { name: 'O que você quer fazer?' }).fill('placar')
  await page.getByRole('button', { name: 'Inserir exemplo: um placar' }).click()
  await expect(page.getByText(/Inserir um placar no fim/)).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText('function criarPlacar')
  await page.getByRole('button', { name: 'Materiais', exact: true }).click()
  await page.getByText('Como usar neste jogo', { exact: true }).click()
  const materialUrl = await page
    .locator('code')
    .filter({ hasText: /^studio-assets\/[a-f0-9]+\.png$/ })
    .textContent()
  await page.getByRole('button', { name: /Conferir inserção em src\/main.ts/ }).click()
  await expect(page.getByText(/Inserir carregar a imagem estrela/)).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await inspectWorkspaceBuffers(page)
  await expect(page.getByLabel('Buffers da sessão')).toContainText(materialUrl!)
  await page.getByRole('button', { name: 'Buscar caminho no código', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Encontrar no código do projeto' })).toHaveValue(
    materialUrl!,
  )
  await expect(page.getByRole('button', { name: /src\/main.ts:/ })).toBeVisible()
  await page.getByRole('button', { name: 'Arquivos', exact: true }).click()
  const codeInput = page.locator('.monaco-editor textarea.inputarea').first()
  await codeInput.focus()
  await codeInput.press('Control+Home')
  await codeInput.press('Shift+End')
  await codeInput.press('Control+Alt+k')
  await expect(page.getByText(/Trecho de origem: src\/main.ts:1–1/)).toBeVisible()
  await page.getByLabel('O que vamos construir?').fill('Quero mudar somente estas linhas')
  await expect(page.getByRole('button', { name: 'Preparar proposta', exact: true })).toBeDisabled()
  await page
    .getByRole('complementary', { name: 'Zappy Pro' })
    .getByRole('button', { name: 'Fechar Zappy', exact: true })
    .click()
  await page.getByRole('button', { name: 'Abrir Zappy', exact: true }).click()
  await expect(page.getByLabel('O que vamos construir?')).toHaveValue(
    'Quero mudar somente estas linhas',
  )
  await page.setViewportSize({ width: 700, height: 900 })
  await expect(page.getByRole('dialog', { name: /Zappy/ })).toBeVisible()
  await expect(page.getByLabel('O que vamos construir?')).toHaveValue(
    'Quero mudar somente estas linhas',
  )
  await page.screenshot({ path: info.outputPath('workspace-narrow-zappy.png'), fullPage: true })
  await page
    .getByRole('dialog', { name: 'Zappy Pro' })
    .getByRole('button', { name: 'Fechar Zappy', exact: true })
    .click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: info.outputPath('workspace-wide.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('observer hosts remain inert and tutor-free author hosts retain navigation', async ({
  page,
}) => {
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}/?observer=1&noTutor=1`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-editing-access="observer"] [inert]')).toHaveCount(1)
  await page.keyboard.press('F2')
  await expect(page.getByLabel('Novo nome do símbolo')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Abrir Zappy', exact: true })).toBeHidden()
  await page.goto(`http://127.0.0.1:${address.port}/?noTutor=1`)
  await expect(input).toBeVisible({ timeout: 30_000 })
  await input.focus()
  await input.press('Control+p')
  await expect(page.getByRole('dialog', { name: 'Abrir arquivo rapidamente' })).toBeVisible()
})

test('keeps continuous edits intact while the symbols panel is open', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}`)
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Símbolos do arquivo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'score', exact: true })).toBeVisible()
  await input.focus()
  await input.press('Control+End')
  const comment = `// ${'s'.repeat(1000)}`
  const declaration = 'export const continuousEdit = 1'
  await input.press('Enter')
  await page.keyboard.type(comment)
  // Enter should insert a line, not accept a word completion from the long comment.
  await page.keyboard.press('Escape')
  await page.keyboard.press('Enter')
  await page.keyboard.type(declaration)
  const text = `\n${comment}\n${declaration}`
  await inspectWorkspaceBuffers(page)
  const models = JSON.parse((await page.getByLabel('Buffers da sessão').textContent())!) as Array<{
    content: string
  }>
  expect(models.some((model) => model.content.endsWith(text))).toBe(true)
  await expect(page.getByRole('button', { name: 'continuousEdit', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
