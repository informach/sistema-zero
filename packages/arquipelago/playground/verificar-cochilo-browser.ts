/**
 * O cochilo da energia no zero (lacunas, 01/11/2026) no navegador, com a plataforma falsa: num
 * jogo novo com a energia no zero, longe de casa, a tela escurece ali mesmo ("Cochilando", com o
 * Zzz), os comandos esperam e, uns segundos depois, ela acorda em casa com a energia de volta. No
 * computador e no celular emulado.
 *
 *   bun build playground/verificar-cochilo-browser.ts --target=node --external playwright-core \
 *     --outdir .cache/cochilo-build && node .cache/cochilo-build/verificar-cochilo-browser.js
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { CENTRO_DA_CASA } from '../src/mundo/medidas'
import { FALA_DE_ACORDAR_EM_CASA, FALA_DO_COCHILO } from '../src/sistemas/descanso'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/cochilo')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

type Ponto = { x: number; y: number; z: number }
const posicao = () =>
  (globalThis as { __arquipelagoDesenho?: { posicao?: Ponto } }).__arquipelagoDesenho?.posicao ??
  null

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const prazo = Date.now() + 45_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const ctx = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: celular,
      hasTouch: celular,
    })
    const page = await ctx.newPage()
    const erros: string[] = []
    page.setDefaultTimeout(90_000)
    page.on('pageerror', (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    // Longe de casa, na praia perto do píer, com a energia no zero.
    await page.goto(`${base}/?novo=1&persistir=0&posicao=2&qualidade=leve&energia=0&em=4,22`)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
    )
    const longe = await page.evaluate(posicao)
    assert(longe, 'sem posição')
    // Cochila ali mesmo: a tela escurece com o Zzz e o corpo continua no lugar.
    await page.getByText(FALA_DO_COCHILO).first().waitFor()
    const veu = page.locator('.arq-cochilo')
    await veu.waitFor()
    await page.waitForTimeout(1300)
    assert.match((await veu.textContent()) ?? '', /Cochilando/)
    const cochilando = await page.evaluate(posicao)
    assert(cochilando, 'sem posição cochilando')
    assert(
      Math.hypot(cochilando.x - CENTRO_DA_CASA.x, cochilando.z - CENTRO_DA_CASA.z) > 5,
      'foi para casa antes de cochilar',
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-cochilando.png`) })
    // Acorda em casa, sem o véu, com a fala de acordar.
    await page.getByText(FALA_DE_ACORDAR_EM_CASA).first().waitFor()
    await veu.waitFor({ state: 'detached' })
    await page.waitForTimeout(1500)
    const casa = await page.evaluate(posicao)
    assert(casa, 'sem posição em casa')
    assert(
      Math.hypot(casa.x - CENTRO_DA_CASA.x, casa.z - CENTRO_DA_CASA.z) < 4,
      `não acordou em casa (${casa.x.toFixed(1)}, ${casa.z.toFixed(1)})`,
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-acordou.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: cochilou na praia e acordou em casa`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
