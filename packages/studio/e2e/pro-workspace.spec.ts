import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { build, type PreviewServer, preview } from 'vite'

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
    await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
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
  await page.getByRole('button', { name: 'Ferramentas…', exact: true }).click()
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
  await page.getByRole('button', { name: 'Recolher painéis' }).click()
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
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
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
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
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
  await expect(page.getByLabel('Buffers da sessão')).toContainText('./settings')
  await page.getByRole('button', { name: 'Ferramentas…', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar arquivos e materiais', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar', exact: true }).first().click()
  await page
    .getByRole('dialog', { name: 'Recuperar arquivos e materiais' })
    .getByRole('button', { name: /Fechar/ })
    .click()
  await expect(page.getByRole('treeitem', { name: 'src/config.ts' })).toBeVisible()
  await page.getByRole('button', { name: 'Ferramentas…', exact: true }).click()
  await page.getByRole('searchbox', { name: 'O que você quer fazer?' }).fill('placar')
  await page.getByRole('button', { name: 'Inserir exemplo: um placar' }).click()
  await expect(page.getByText(/Inserir um placar no fim/)).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
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
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
  await expect(page.getByLabel('Buffers da sessão')).toContainText(materialUrl!)
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
