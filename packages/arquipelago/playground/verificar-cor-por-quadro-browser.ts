/**
 * A cor da sua ilha por quadro (lacunas, 01/11/2026) no navegador, com a plataforma falsa: o
 * shader do chão (gramado e praia desbotados por parte, pela cor dos vértices) compila sem erro; com
 * o quadro 4 feito (a plataforma falsa) a praia tem cor e o gramado, sem o quadro 5, segue cinza. As regras ficam em
 * `tests/cor-da-sua-ilha.test.ts`. No computador e no celular emulado.
 *
 *   bun build playground/verificar-cor-por-quadro-browser.ts --target=node --external \
 *     playwright-core --outdir .cache/cor-sua-ilha-build && \
 *     node .cache/cor-sua-ilha-build/verificar-cor-por-quadro-browser.js
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/cor-sua-ilha')
mkdirSync(prints, { recursive: true })

const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

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
    page.setDefaultTimeout(120_000)
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (/shader|WebGLProgram|THREE\.WebGL/i.test(m.text())) erros.push(m.text())
    })
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    // Na praia, de frente para o gramado: os dois aparecem na tela.
    await page.goto(`${base}/?novo=1&persistir=0&qualidade=leve&posicao=2&em=0,20,2`)
    await page
      .waitForFunction(
        () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
      )
      .catch((e) => {
        console.error(erros)
        throw e
      })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(prints, `${tipo}-praia-com-cor.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: o chão da sua ilha desbota por parte sem erro de shader`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
