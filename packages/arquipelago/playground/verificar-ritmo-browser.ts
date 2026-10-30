/** O ritmo básico com energia baixa, no movimento real do playground. Sem serviços remotos. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { CORPO } from '../src/sistemas/corpo'

type Corpo = { x: number; y: number; z: number; velocidade: number; noChao: boolean }
type Inspecao = { __arquipelagoLerCorpo?: () => Corpo; __arquipelagoDesenho?: { energia: number } }
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const a = reserva.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(a.port))
  })
})
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-ritmo-basico')
mkdirSync(prints, { recursive: true })
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const limite = Date.now() + 30_000
  while (!pronto) {
    if (server.exitCode !== null || Date.now() > limite) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
      localStorage.setItem('arquipelago:camera-dica', '1')
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(
      `http://127.0.0.1:${port}/?novo=1&persistir=0&energia=10&posicao=2&em=0,12&dia=nenhum&qualidade=leve`,
    )
    await page.waitForFunction(() => (globalThis as Inspecao).__arquipelagoLerCorpo?.().noChao)
    const ler = () => page.evaluate(() => (globalThis as Inspecao).__arquipelagoLerCorpo!())
    const antes = await ler()
    await page.locator('canvas').click()
    await page.keyboard.down('KeyW')
    await page.waitForFunction((base) => {
      const c = (globalThis as Inspecao).__arquipelagoLerCorpo?.()
      return c && Math.abs(c.velocidade - base) < 0.001
    }, CORPO.andar)
    const andando = await ler()
    await page.keyboard.down('ShiftLeft')
    await page.waitForFunction((base) => {
      const c = (globalThis as Inspecao).__arquipelagoLerCorpo?.()
      return c && Math.abs(c.velocidade - base) < 0.001
    }, CORPO.correr)
    await page.waitForFunction((inicio) => {
      const c = (globalThis as Inspecao).__arquipelagoLerCorpo?.()
      return c && Math.hypot(c.x - inicio.x, c.z - inicio.z) > 1
    }, antes)
    const correndo = await ler()
    await page.keyboard.up('ShiftLeft')
    await page.keyboard.up('KeyW')
    assert.ok(
      Math.hypot(correndo.x - antes.x, correndo.z - antes.z) > 1,
      'movimento de verdade, sem ficar contra uma parede',
    )
    const energia = await page.evaluate(
      () => (globalThis as Inspecao).__arquipelagoDesenho?.energia,
    )
    assert.ok(energia !== undefined && energia > 0 && energia < 15)
    await page.keyboard.press('Space')
    await page.waitForFunction(
      (chao) => (globalThis as Inspecao).__arquipelagoLerCorpo!().y > chao + 0.6,
      correndo.y,
    )
    const pulo = await ler()
    await page.screenshot({ path: path.join(prints, `movimento-${tipo}.png`) })
    await page.waitForFunction(() => (globalThis as Inspecao).__arquipelagoLerCorpo?.().noChao)
    assert.deepEqual(erros, [])
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify({ energia, antes, andando, correndo, pulo, erros }, null, 2),
    )
    console.log(
      `${tipo}: energia ${energia?.toFixed(1)}, andar ${andando.velocidade.toFixed(3)}, correr ${correndo.velocidade.toFixed(3)} m/s, pulo e pouso`,
    )
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
