import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { build, type PreviewServer, preview } from 'vite'

let root: string, server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(120_000)
  root = await mkdtemp(join(tmpdir(), 'sz-builder-browser-'))
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  const fixture = fileURLToPath(new URL('./fixtures/pro-builder', import.meta.url))
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
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    )
  if (root) await rm(root, { recursive: true, force: true })
})
test('real browser compares, applies, undoes and disposes/reopens the review under StrictMode', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server is not listening')
  await page.goto(`http://127.0.0.1:${address.port}`)
  await expect(page.getByText('Proposta pronta para revisar')).toBeVisible()
  await expect(page.getByLabel('Código persistido')).toContainText('goal = 10')
  await page.getByRole('button', { name: 'Destacar diferenças', exact: true }).click()
  await expect(page.locator('.monaco-diff-editor')).toBeVisible()
  await expect(page.locator('.monaco-diff-editor .char-insert').first()).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar alterações' }).click()
  await expect(page.getByLabel('Código persistido')).toContainText('goal = 12')
  await page.getByRole('button', { name: 'Desfazer alterações' }).click()
  await expect(page.getByLabel('Código persistido')).toContainText('goal = 10')
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: 'Fechar painel' }).click()
    await expect(page.locator('.monaco-diff-editor')).toHaveCount(0)
    await page.getByRole('button', { name: 'Contar modelos da revisão' }).click()
    await expect(page.getByLabel('Modelos da revisão')).toHaveText('0')
    await page.getByRole('button', { name: 'Abrir painel' }).click()
    await page.getByRole('button', { name: 'Destacar diferenças', exact: true }).click()
    await expect(page.locator('.monaco-diff-editor')).toHaveCount(1)
    await page.getByRole('button', { name: 'Contar modelos da revisão' }).click()
    await expect(page.getByLabel('Modelos da revisão')).toHaveText('2')
  }
  await page.setViewportSize({ width: 360, height: 740 })
  await expect(page.getByRole('button', { name: 'Aplicar alterações' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('builder-review.png'), fullPage: true })
  expect(errors).toEqual([])
})
