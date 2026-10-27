import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { chromium } from 'playwright-core'

const port = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const base = `http://127.0.0.1:${port}`
const probe = createServer()
await new Promise((resolve, reject) => {
  probe.once('error', reject)
  probe.listen(port, '127.0.0.1', resolve)
})
await new Promise((resolve, reject) => probe.close((error) => (error ? reject(error) : resolve())))
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let browser
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null)
      throw new Error('O servidor do playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('O playground não iniciou')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put
    let falhar = true
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'eventos' && falhar) {
        falhar = false
        throw new DOMException('Falha de teste', 'QuotaExceededError')
      }
      return original.apply(this, args)
    }
  })
  await page.goto(`${base}/?novo=1`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForSelector('dialog[open]', { timeout: 45_000 })
  const estado = await page.evaluate(() => ({
    titulo: document.querySelector('dialog h1')?.textContent,
    foco: document.activeElement?.textContent,
    modal: document.querySelector('dialog')?.matches(':modal'),
  }))
  if (
    !estado.modal ||
    estado.titulo !== 'Vamos tentar de novo' ||
    estado.foco !== 'Tentar novamente'
  )
    throw new Error(`Diálogo de recuperação inesperado: ${JSON.stringify(estado)}`)
  await page.keyboard.press('Escape')
  if (!(await page.locator('dialog[open]').isVisible()))
    throw new Error('Escape fechou a pausa antes de guardar')
  await page.getByRole('button', { name: 'Tentar novamente' }).press('Space')
  await page.waitForSelector('dialog[open]', { state: 'hidden', timeout: 15_000 })
  if (await page.getByRole('dialog', { name: 'Menu do jogo' }).count())
    throw new Error('Escape abriu o menu por trás da pausa')
  console.log(
    'PASS: falha de armazenamento pausa o jogo; diálogo acessível permite recuperação pelo teclado',
  )
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve()
    server.once('exit', resolve)
    setTimeout(resolve, 3000).unref()
  })
}
