/**
 * O mapa que se revela andando (E02) no navegador, com a plataforma falsa e sem banco: ao chegar
 * na sua ilha o mapa dela já mostra as partes à vista; andando, mais partes se revelam; o painel
 * do mapa conta as partes e a lista mostra a porcentagem da ilha.
 *
 * No Windows: `bun build playground/verificar-mapa-da-ilha-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-mapa-da-ilha-browser.mjs && node .cache/verificar-mapa-da-ilha-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/mapa-da-ilha')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

async function partes(page: Page, tipo: string, n: number): Promise<number> {
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  await page
    .getByRole('dialog', { name: 'Menu do jogo' })
    .getByRole('button', { name: 'Mapa do arquipélago' })
    .click()
  const mapa = page.getByRole('dialog', { name: 'Mapa do arquipélago' })
  await mapa.waitFor()
  const legenda = (await mapa.locator('.arq-mapa-ilha figcaption').textContent()) ?? ''
  const m = /Mapa desta ilha: (\d+) de (\d+) partes descobertas\./.exec(legenda)
  assert(m, `legenda: ${legenda}`)
  assert((await mapa.getByText(/Sua ilha/).count()) > 0)
  assert.match(
    (await mapa.locator('.arq-mapa-lista').textContent()) ?? '',
    /Mapa \d+% descoberto\./,
  )
  await page.screenshot({ path: path.join(prints, `${tipo}-${n}-mapa.png`) })
  await mapa.getByRole('button', { name: 'Voltar ao jogo' }).click()
  await mapa.waitFor({ state: 'hidden' })
  return Number(m[1])
}

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
      reducedMotion: celular ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    const erros: string[] = []
    page.setDefaultTimeout(60_000)
    page.on('pageerror', (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    await page.goto(`${base}/?novo=1&posicao=2&qualidade=leve&em=0,14,2`)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
    )
    await page.waitForTimeout(2000)
    const antes = await partes(page, tipo, 1)
    assert(antes > 0, 'nada descoberto ao chegar')
    // Ir a três pontos da ilha, um de cada vez (o transporte da conferência; o mapa só conta
    // depois que o corpo pousa, como quem chegou andando).
    for (const { x, z } of [
      { x: 10, z: 14 },
      { x: 18, z: 4 },
      { x: 14, z: -10 },
    ]) {
      await page.evaluate(
        ({ x, z }) =>
          (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
            x,
            3,
            z,
            0,
          ),
        { x, z },
      )
      await page.waitForTimeout(1500)
    }
    const depois = await partes(page, tipo, 2)
    assert(depois > antes, `andar não revelou nada (${antes} → ${depois})`)
    // O salvamento local é gravado alguns segundos depois.
    await page.waitForFunction(() =>
      /^[0-9a-f]{16}$/.test(
        String(
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.mapa?.[
            'sua-ilha'
          ] ?? '',
        ),
      ),
    )
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: ${antes} partes ao chegar, ${depois} depois de andar, salvas`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
