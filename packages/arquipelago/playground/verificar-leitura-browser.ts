/** Leitura manual, automática opcional e teclado, só no playground local. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { CENAS } from '../src/sistemas/abertura'

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
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-leitura-abertura')
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
    if (process.env.ARQUIPELAGO_TELA && process.env.ARQUIPELAGO_TELA !== tipo) continue
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
      localStorage.setItem('arquipelago:camera-dica', '1')
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(
      `http://127.0.0.1:${port}/?novo=1&persistir=0&abertura=1&qualidade=leve&dia=nenhum`,
    )
    const abertura = page.getByRole('dialog', { name: 'Abertura: O Cinza' })
    const legenda = page.locator('.arq-abertura-legenda p')
    const proxima = page.getByRole('button', { name: 'Próxima', exact: true })
    const anterior = page.getByRole('button', { name: 'Anterior', exact: true })
    const auto = page.locator('.arq-abertura-auto')
    await legenda.filter({ hasText: CENAS[0]!.falas[0]!.texto }).waitFor()
    assert.equal(await anterior.isDisabled(), true)
    await page.waitForTimeout(9_000)
    assert.equal(
      await legenda.textContent(),
      CENAS[0]!.falas[0]!.texto,
      'manual não tem prazo de oito segundos',
    )
    // Ativação nativa de cada botão, sem o listener global convertê-la em próximo.
    await proxima.focus()
    await page.keyboard.press('Enter')
    await legenda.filter({ hasText: CENAS[1]!.falas[0]!.texto }).waitFor()
    await anterior.focus()
    await page.keyboard.press('Space')
    await legenda.filter({ hasText: CENAS[0]!.falas[0]!.texto }).waitFor()
    await auto.focus()
    await page.keyboard.press('Enter')
    assert.equal(await auto.getAttribute('aria-pressed'), 'true')
    assert.equal(await legenda.textContent(), CENAS[0]!.falas[0]!.texto)
    await auto.click()
    assert.equal(await auto.getAttribute('aria-pressed'), 'false')
    await page.waitForTimeout(9_000)
    assert.equal(await legenda.textContent(), CENAS[0]!.falas[0]!.texto, 'pausa da leitura espera')
    await auto.click()
    await legenda.filter({ hasText: CENAS[1]!.falas[0]!.texto }).waitFor()
    await auto.click()
    await anterior.click()
    await legenda.evaluate(async (p) => {
      await Promise.all(p.getAnimations().map((a) => a.finished))
    })
    await page.screenshot({ path: path.join(prints, `inicio-${tipo}.png`), animations: 'disabled' })
    const textos = CENAS.flatMap((c) => c.falas.map((f) => f.texto))
    for (const texto of textos.slice(1)) {
      await proxima.click()
      await legenda.filter({ hasText: texto }).waitFor()
    }
    await page.getByRole('button', { name: 'Começar', exact: true }).waitFor()
    await legenda.evaluate(async (p) => {
      await Promise.all(p.getAnimations().map((a) => a.finished))
    })
    const leituraVisual = await legenda.evaluate((p) => ({
      opacidade: getComputedStyle(p).opacity,
      cor: getComputedStyle(p).color,
      baixo: p.getBoundingClientRect().bottom,
      controles: document.querySelector('.arq-abertura-controles')!.getBoundingClientRect().top,
    }))
    assert.equal(leituraVisual.opacidade, '1')
    assert.equal(leituraVisual.cor, 'rgb(255, 255, 255)')
    assert.ok(leituraVisual.baixo < leituraVisual.controles, 'legenda não cobre os controles')
    await page.screenshot({ path: path.join(prints, `zappy-${tipo}.png`), animations: 'disabled' })
    const medidas = await page.locator('.arq-abertura-controles button').evaluateAll((bs) =>
      bs.map((b) => {
        const r = b.getBoundingClientRect()
        return { texto: b.textContent, x: r.x, y: r.y, width: r.width, height: r.height }
      }),
    )
    for (const b of medidas) {
      assert.ok(b.width >= 44 && b.height >= 44)
      assert.ok(b.x >= 0 && b.x + b.width <= (celular ? 390 : 1280))
      assert.ok(b.y >= 0 && b.y + b.height <= (celular ? 844 : 720))
    }
    await anterior.click()
    await legenda.filter({ hasText: 'E nele, uma luz piscava.' }).waitFor()
    await proxima.click()
    await page.getByRole('button', { name: 'Começar', exact: true }).click()
    await abertura.waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Abrir o menu' }).click()
    await page.getByRole('button', { name: 'Diário', exact: true }).click()
    await page.getByRole('button', { name: 'Rever a abertura: O Cinza', exact: true }).click()
    await legenda.filter({ hasText: textos[0]! }).waitFor()
    assert.equal(await auto.getAttribute('aria-pressed'), 'false', 'rever também começa manual')
    // Segurar no palco mantém o atalho de pular e não pula com o personagem por baixo.
    await page.locator('.arq-abertura-palco').focus()
    await page.keyboard.down('Space')
    await abertura.waitFor({ state: 'detached' })
    await page.keyboard.up('Space')
    assert.deepEqual(erros, [])
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify({ leituras: textos.length, leituraVisual, medidas, erros }, null, 2),
    )
    console.log(`${tipo}: leitura manual, automática, teclado, nove falas, voltar e rever passaram`)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
