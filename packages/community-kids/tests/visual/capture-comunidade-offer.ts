import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type Locator, type Page } from '@playwright/test'
import sharp from 'sharp'

const packageRoot = resolve(import.meta.dirname, '../..')
const workspaceRoot = resolve(packageRoot, '../..')
const outputDir = resolve(workspaceRoot, 'packages/funnel/public/img/comunidade-dos-criadores')
const temporaryDir = resolve(packageRoot, 'tmp/comunidade-offer-captures')
const port = 4325
const baseUrl = `http://127.0.0.1:${port}`
const sleep = (milliseconds: number) =>
  new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error('A prévia local da Comunidade não respondeu a tempo.')
}

async function stabilize(page: Page): Promise<void> {
  await page.evaluate(async () => document.fonts.ready)
  await page.waitForTimeout(300)
}

async function saveWebp(locator: Locator, filename: string): Promise<void> {
  const pngPath = resolve(temporaryDir, `${filename}.png`)
  await locator.screenshot({ path: pngPath, animations: 'disabled' })
  await sharp(pngPath)
    .webp({ quality: 88, smartSubsample: true })
    .toFile(resolve(outputDir, filename))
}

await mkdir(outputDir, { recursive: true })
await rm(temporaryDir, { recursive: true, force: true })
await mkdir(temporaryDir, { recursive: true })

const server = spawn('bun', [resolve(import.meta.dirname, 'serve-comunidade-preview.ts')], {
  cwd: workspaceRoot,
  env: { ...process.env, COMUNIDADE_PREVIEW_PORT: String(port) },
  stdio: 'inherit',
})

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 820 },
    deviceScaleFactor: 1,
  })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const captures = [
    ['career', 'print-carreira.webp'],
    ['lesson', 'print-aula.webp'],
    ['workshop', 'print-oficina.webp'],
    ['mural', 'print-mural.webp'],
    ['club', 'print-clube.webp'],
    ['messages', 'print-recados.webp'],
    ['space', 'print-espaco.webp'],
  ] as const

  for (const [screen, filename] of captures) {
    await page.goto(`${baseUrl}/?screen=${screen}`, { waitUntil: 'networkidle' })
    await stabilize(page)
    const target = page.locator(`[data-capture="${screen}"]`)
    await target.waitFor({ state: 'visible' })
    await saveWebp(target, filename)
  }

  if (pageErrors.length > 0) throw new Error(`Erros durante a captura:\n${pageErrors.join('\n')}`)
} finally {
  await browser?.close()
  server.kill()
  await Promise.race([
    new Promise<void>((resolvePromise) => server.once('exit', () => resolvePromise())),
    sleep(2_000),
  ])
  await rm(temporaryDir, { recursive: true, force: true })
}

console.log(`Capturas da Comunidade atualizadas em ${outputDir}`)
