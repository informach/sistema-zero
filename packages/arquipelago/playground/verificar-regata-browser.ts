/**
 * A volta das boias (lacunas, 01/11/2026) no navegador, com a plataforma falsa: no cais da sua
 * ilha, o painel do barco oferece "Volta das boias"; ao sair do cais, o cronômetro da regata
 * aparece e as boias de presente ficam no mar, e "Parar" termina a regata. A volta inteira (uns
 * 1.200 m) não cabe numa conferência no SwiftShader: o caminho até a chegada tem a prova dele em
 * `tests/regata-das-boias.test.ts`. No computador e no celular emulado.
 *
 *   bun build playground/verificar-regata-browser.ts --target=node --external playwright-core \
 *     --outdir .cache/regata-build && node .cache/regata-build/verificar-regata-browser.js
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { PERCURSO_DA_REGATA } from '../src/sistemas/percurso'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/regata')
mkdirSync(prints, { recursive: true })
type Desenho = { modo?: string; noChao?: boolean; barco?: { fase?: string } }

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
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(`${base}/?novo=1&persistir=0&qualidade=leve&posicao=8&barco=central`)
    await page.waitForFunction(() => {
      const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
      return d?.noChao && d.modo === 'chao'
    })
    await page.waitForFunction(() =>
      document.querySelector('.arq-acao')?.textContent?.includes('Embarcar'),
    )
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
    else await page.keyboard.press('KeyE')
    const painel = page.getByRole('dialog', { name: 'Viagem de barco' })
    await painel.waitFor()
    await painel.getByRole('button', { name: 'Volta das boias', exact: true }).click()
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo === 'barco',
    )
    const cronometro = page.getByRole('timer', { name: PERCURSO_DA_REGATA.nome })
    await cronometro.waitFor({ timeout: 120_000 })
    assert.match((await cronometro.textContent()) ?? '', /Boias 0 de 8/)
    await page.screenshot({ path: path.join(prints, `${tipo}-regata.png`) })
    // "Parar" termina a regata; o barco segue de volta ao cais sem cronômetro.
    await cronometro.getByRole('button', { name: 'Parar' }).click()
    await cronometro.waitFor({ state: 'detached', timeout: 60_000 }).catch(() => {})
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: a volta das boias sai do cais com o cronômetro e as boias`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
