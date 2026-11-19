import { expect, test } from '@playwright/test'
import type { PreviewServer } from 'vite'
import { CONSERTADO, parar, previewPixel, replaceBridgeScript, rodar } from './helpers/previewShell'
import { startWorkspaceFixture, stopWorkspaceFixture } from './helpers/workspaceFixture'
import { inspectWorkspaceBuffers } from './proWorkspaceInspection'

// The child deliberately blocks before load. DOM snapshot instrumentation can
// wait behind that work; retain API/source/network tracing for this control.
test.use({
  channel: 'chromium',
  permissions: ['clipboard-read', 'clipboard-write'],
  trace: { mode: 'retain-on-failure', snapshots: false, screenshots: false, sources: true },
})
let server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(180_000)
  server = await startWorkspaceFixture()
})
test.afterAll(async () => {
  await stopWorkspaceFixture(server)
})

test('stops native work in the first startup before load and preserves the editor source', async ({
  page,
}) => {
  test.setTimeout(90_000)
  let started = false
  page.on('console', (message) => {
    if (message.text() === 'startup-first-run') started = true
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível')
  await page.goto(`http://127.0.0.1:${address.port}/?startup=1&noTutor=1`)
  await expect.poll(() => started, { timeout: 15000 }).toBe(true)
  const blockedFrame = await page.locator('iframe[title="Pré-visualização"]').elementHandle()
  expect(blockedFrame).not.toBeNull()
  await parar(page).click()
  await expect.poll(() => blockedFrame?.evaluate((node) => node.isConnected)).toBe(false)
  const buffers = await inspectWorkspaceBuffers(page)
  expect(buffers).toContain('startup-first-run')
  expect(buffers).toContain('function gastar')
  await replaceBridgeScript(page, CONSERTADO)
  await rodar(page).click()
  await expect.poll(() => previewPixel(page), { timeout: 15000 }).toEqual([0, 128, 0])
})
