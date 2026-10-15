import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { build, type PreviewServer, preview } from 'vite'

let root: string, server: PreviewServer, url: string
test.beforeAll(async () => {
  test.setTimeout(180000)
  root = await mkdtemp(join(tmpdir(), 'sz-zappy-assistance-'))
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  const fixture = fileURLToPath(new URL('./fixtures/zappy-assistance', import.meta.url))
  await build({
    configFile,
    root: fixture,
    logLevel: 'warn',
    build: { outDir: root, emptyOutDir: true, target: 'esnext' },
  })
  server = await preview({
    configFile,
    root: fixture,
    build: { outDir: root },
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server is not listening')
  url = `http://127.0.0.1:${address.port}`
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((done, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : done())),
    )
  if (
    root &&
    dirname(resolve(root)) === resolve(tmpdir()) &&
    basename(root).startsWith('sz-zappy-assistance-')
  )
    await rm(root, { recursive: true, force: true })
})
const proof = async (page: Page) =>
  JSON.parse((await page.getByLabel('Dados da prova').textContent()) ?? '{}')
test.beforeEach(async ({ page }) => {
  await page.goto(url)
  await expect(page.locator('.monaco-editor textarea').first()).toBeVisible()
})

test('manual: escrever no Monaco não abre assistência nem inicia pedidos', async ({ page }) => {
  const editor = page.locator('.monaco-editor textarea').first()
  await editor.press('Control+Home')
  await editor.press('Control+A')
  await editor.fill('export const goal = 11\nexport const speed = 3\n')
  await expect.poll(async () => (await proof(page)).source).toContain('goal = 11')
  expect((await proof(page)).asked).toEqual([])
  expect((await proof(page)).created).toEqual([])
  await expect(page.getByRole('dialog', { name: 'Zappy Pro' })).toHaveCount(0)
})

test('orientação: ação real do Monaco captura seleção e referência stale avisa sem editar', async ({
  page,
}) => {
  const editor = page.locator('.monaco-editor textarea').first()
  await editor.press('Control+Home')
  await editor.press('ArrowDown')
  await editor.press('Home')
  await editor.press('Shift+End')
  await editor.press('Shift+F10')
  await page.getByRole('menuitem', { name: 'Explicar seleção com Zappy Pro', exact: true }).click()
  await expect(page.getByLabel('Sua dúvida para o Zappy')).toHaveValue('Me explique este trecho.')
  await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  await expect(
    page.getByText(
      'A variável selecionada controla a velocidade; você pode ajustar o valor manualmente.',
    ),
  ).toBeVisible()
  const captured = await proof(page)
  expect(captured.asked[0].context.pro.selection).toMatchObject({
    path: 'src/main.ts',
    startLine: 2,
    endLine: 2,
  })
  expect(captured.created).toEqual([])
  await editor.press('Control+Home')
  await editor.press('Control+A')
  await editor.fill('export const goal = 11\nexport const speed = 4\n')
  await page.getByRole('button', { name: 'src/main.ts:2', exact: true }).click()
  await expect(page.getByText(/não corresponde mais à versão analisada/)).toBeVisible()
  expect((await proof(page)).source).toContain('speed = 4')
})

test('investigação: resposta passa ao construtor sem iniciar job', async ({ page }) => {
  await page.getByRole('button', { name: 'Abrir Zappy Pro' }).click()
  await page.getByRole('button', { name: 'Investigar', exact: true }).click()
  await page.getByLabel('Sua dúvida para o Zappy').fill('Era para pular, mas atravessa o chão')
  await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
  await expect(
    page.getByText(
      'Compare o movimento esperado com a posição observada antes de alterar a regra.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Preparar alteração a partir desta resposta' }).click()
  await expect(page.getByLabel('O que vamos construir?')).toBeVisible()
  expect((await proof(page)).asked[0].context.pro.intent).toBe('investigate')
  expect((await proof(page)).created).toEqual([])
  expect((await proof(page)).source).toContain('goal = 10')
})

for (const [scope, objective] of [
  ['part', 'Ajustar a meta para doze sem alterar os controles'],
  ['game', 'Criar o jogo completo com a meta de doze e os controles atuais'],
] as const)
  test(`${scope}: proposta exige aplicação explícita e permite voltar à autoria manual`, async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Abrir Zappy Pro' }).click()
    await page.getByRole('button', { name: 'Construir', exact: true }).click()
    await page.getByLabel('Tamanho do pedido').selectOption(scope)
    await page.getByLabel('O que vamos construir?').fill(objective)
    expect((await proof(page)).created).toEqual([])
    await page.getByRole('button', { name: 'Preparar proposta', exact: true }).click()
    await expect(page.getByText('Proposta pronta para revisar')).toBeVisible()
    expect((await proof(page)).created[0].request.scope).toBe(scope)
    expect((await proof(page)).source).toContain('goal = 10')
    await page.getByRole('button', { name: 'Conversar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Aplicar alterações' })).toBeVisible()
    await page.getByRole('button', { name: 'Aplicar alterações' }).click()
    await expect.poll(async () => (await proof(page)).source).toContain('goal = 12')
    await page.getByRole('button', { name: 'Desfazer alterações' }).click()
    await expect.poll(async () => (await proof(page)).source).toContain('goal = 10')
    expect((await proof(page)).asked).toEqual([])
  })
