/**
 * O Quadro das Cores da sua ilha (C03a) no navegador, com a plataforma falsa e sem banco: o
 * cavalete fica na grama ao lado da trilha do píer, "Ver o Quadro das Cores" abre o painel com os
 * quadros da sua ilha (um feito, um pronto), e nada fala em pintar a ilha.
 *
 * No Windows: `bun build playground/verificar-quadro-da-sua-ilha-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-quadro-da-sua-ilha-browser.mjs && node
 * .cache/verificar-quadro-da-sua-ilha-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { lugarDoQuadroNaSuaIlha } from '../src/mundo/lugar-do-quadro'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/quadro-da-sua-ilha')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

const lugar = lugarDoQuadroNaSuaIlha()
// Na frente do cavalete, olhando para ele.
const frente = {
  x: lugar.x + Math.sin(lugar.giro) * 1.8,
  z: lugar.z + Math.cos(lugar.giro) * 1.8,
}
// O giro do transporte é para onde o corpo olha: de frente para o cavalete.
const olhar = lugar.giro

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
    page.setDefaultTimeout(60_000)
    page.on('pageerror', (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(`${base}/?novo=1&posicao=1&qualidade=leve&em=${frente.x},${frente.z}`)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
    )
    await page.evaluate(
      ({ f, olhar }) => {
        const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void })
          .__arquipelagoLevar
        if (!ir) throw new Error('Sem transporte de conferência')
        ir(f.x, 2, f.z, olhar)
      },
      { f: frente, olhar },
    )
    await page.locator('.arq-acao').filter({ hasText: 'Ver o Quadro das Cores' }).waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-1-cavalete.png`) })
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('e')
    await page.getByText('Passos na areia').first().waitFor()
    await page.getByText('A primeira concha').first().waitFor()
    assert.equal(await page.getByText('pinta um pedaço da ilha').count(), 0)
    assert.equal(await page.getByText('Cor de volta').count(), 0)
    await page.getByText('Desafio concluído').first().waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-2-painel.png`) })
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: o cavalete da praia abre os quadros da sua ilha`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
