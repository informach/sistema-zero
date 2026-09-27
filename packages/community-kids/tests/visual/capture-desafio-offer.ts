import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type Locator, type Page } from '@playwright/test'
import sharp from 'sharp'

const packageRoot = resolve(import.meta.dirname, '../..')
const workspaceRoot = resolve(packageRoot, '../..')
const outputDir = resolve(workspaceRoot, 'packages/funnel/public/img/desafio-primeiro-jogo')
const temporaryDir = resolve(packageRoot, 'tmp/desafio-offer-captures')
const port = 4324
const baseUrl = `http://127.0.0.1:${port}`
const sleep = (milliseconds: number) =>
  new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error('A prévia local não respondeu a tempo.')
}

async function stabilize(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForTimeout(350)
}

async function saveWebp(locator: Locator, filename: string): Promise<void> {
  const pngPath = resolve(temporaryDir, `${filename}.png`)
  await locator.screenshot({ path: pngPath, animations: 'disabled' })
  await sharp(pngPath)
    .webp({ quality: 86, smartSubsample: true })
    .toFile(resolve(outputDir, filename))
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  await stabilize(page)
}

await mkdir(outputDir, { recursive: true })
await rm(temporaryDir, { recursive: true, force: true })
await mkdir(temporaryDir, { recursive: true })

const server = spawn('bun', [resolve(import.meta.dirname, 'serve-desafio-preview.ts')], {
  cwd: workspaceRoot,
  env: { ...process.env, DESAFIO_PREVIEW_PORT: String(port) },
  stdio: 'inherit',
})

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const showcases = [
    ['trail', 'plataforma-trilha.webp'],
    ['lesson', 'plataforma-aula.webp'],
    ['experience', 'plataforma-experimento.webp'],
    ['materials', 'plataforma-materiais.webp'],
  ] as const

  for (const [showcase, filename] of showcases) {
    await open(page, `/?showcase=${showcase}`)
    const capture = page.locator(`[data-capture="${showcase}"]`)
    await capture.waitFor({ state: 'visible' })
    await saveWebp(capture, filename)
  }

  await open(page, '/?showcase=studio&day=4')
  await page.locator('[data-capture="studio"]').waitFor({ state: 'visible' })
  await page.locator('iframe[title="Pré-visualização"]').waitFor({ state: 'visible' })
  await page.waitForTimeout(1_200)
  await saveWebp(page.locator('[data-capture="studio-shell"]'), 'plataforma-estudio.webp')

  const gamePage = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  })
  gamePage.on('pageerror', (error) => pageErrors.push(error.message))
  for (let day = 1; day <= 5; day += 1) {
    await open(gamePage, `/?showcase=studio&day=${day}`)
    const frame = gamePage.locator('iframe[title="Pré-visualização"]')
    await frame.waitFor({ state: 'visible' })
    await gamePage.waitForTimeout(900)
    const canvas = gamePage
      .frameLocator('iframe[title="Pré-visualização"]')
      .locator('canvas')
      .first()
    const target = (await canvas.count()) > 0 ? canvas : frame
    await saveWebp(target, `print-dia${day}.webp`)
  }
  await gamePage.close()

  const unexpectedErrors = pageErrors.filter((message) => message !== 'Unable to decode audio data')
  if (unexpectedErrors.length > 0) {
    throw new Error(`Erros durante a captura:\n${unexpectedErrors.join('\n')}`)
  }
} finally {
  await browser?.close()
  server.kill()
  await Promise.race([
    new Promise<void>((resolvePromise) => server.once('exit', () => resolvePromise())),
    sleep(2_000),
  ])
  await rm(temporaryDir, { recursive: true, force: true })
}

console.log(`Capturas atualizadas em ${outputDir}`)
