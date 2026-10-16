import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { build, type PreviewServer, preview } from 'vite'

let server: PreviewServer
test.beforeAll(async () => {
  test.setTimeout(180_000)
  const configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  const root = fileURLToPath(new URL('./fixtures/pro-workspace', import.meta.url))
  const outDir = fileURLToPath(new URL('../.cache/e2e-pro-performance', import.meta.url))
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

test('records real editor input, openings and layout lifecycle with controlled services', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000)
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark server')
  const url = `http://127.0.0.1:${address.port}/?performance=1`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const samples: number[] = []
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          !(event.target instanceof HTMLTextAreaElement) ||
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey
        )
          return
        const start = performance.now()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            samples.push(performance.now() - start)
            document.documentElement.dataset.inputFrameSamples = JSON.stringify(samples)
          }),
        )
      },
      true,
    )
  })
  const openings: number[] = []
  for (let index = 0; index < 30; index++) {
    const start = performance.now()
    await page.goto(url)
    await expect(page.locator('.monaco-editor textarea.inputarea').first()).toBeVisible({
      timeout: 30_000,
    })
    openings.push(performance.now() - start)
  }
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await input.focus()
  await input.press('Control+End')
  await page.keyboard.type(`\n// ${'x'.repeat(200)}`)
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]').length,
      ),
    )
    .toBeGreaterThanOrEqual(203)
  const inputFrames: number[] = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.inputFrameSamples ?? '[]'),
  )
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
  await expect(page.getByLabel('Buffers da sessão')).toContainText('x'.repeat(200))
  const before = await page.getByLabel('Buffers da sessão').textContent()
  const layouts: number[] = []
  for (let index = 0; index < 30; index++) {
    const start = performance.now()
    await page.getByRole('button', { name: 'Ampliar código', exact: true }).click()
    await page.getByRole('button', { name: 'Código e jogo', exact: true }).click()
    layouts.push(performance.now() - start)
  }
  await page.getByRole('button', { name: 'Inspecionar buffers' }).click()
  expect(await page.getByLabel('Buffers da sessão').textContent()).toBe(before)
  expect(errors).toEqual([])
  const stats = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b)
    return {
      samples,
      p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      max: sorted.at(-1),
    }
  }
  const report = {
    browser: browser.version(),
    fixture: '78-source-files-controlled-remote-runtime',
    limitations: [
      'Production fixture, not authenticated Kids route or physical 8GB device.',
      'Input to second animation frame is a presentation proxy, not INP or exact pixel latency.',
      'Opening/layout duration includes Playwright transport and auto-wait; first opening cold, remaining cached.',
      'No paid AI, real WebContainer install or GPU-heavy game in this fixture.',
    ],
    opening: stats(openings),
    inputFrames: stats(inputFrames),
    layoutRoundTrip: stats(layouts),
    errors,
  }
  const output =
    process.env.STUDIO_BROWSER_BENCH_OUTPUT ??
    '../../.audits/studio-pro-evolution/browser-current.json'
  await mkdir(fileURLToPath(new URL('../../../.audits/studio-pro-evolution/', import.meta.url)), {
    recursive: true,
  })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    JSON.stringify({
      openingP95: report.opening.p95,
      inputFrameP95: report.inputFrames.p95,
      layoutP95: report.layoutRoundTrip.p95,
    }),
  )
})
