/**
 * As chaves dos cômodos (N11) no navegador, com a plataforma falsa e sem banco: o Construir começa
 * com cerca, caminho e canteiro trancados (pisos e janelas são livres desde 01/11/2026; a chave
 * de cômodo abre mais um cômodo, conferido em `tests/chaves-da-casa.test.ts`); a criança pega as
 * quatro chaves pela sua ilha (o Zappy diz o que cada uma abre) e tudo destranca.
 *
 * No Windows: `bun build playground/verificar-chaves-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-chaves-browser.mjs && node .cache/verificar-chaves-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { alturaDaIlha } from '../src/mundo/medidas'
import { CHAVES_DA_CASA } from '../src/sistemas/chaves-da-casa'
import { CORPO } from '../src/sistemas/corpo'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/chaves')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

async function levar(page: Page, p: { x: number; z: number }) {
  await page.waitForFunction(
    () => typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
  )
  const y = alturaDaIlha(p.x, p.z) + CORPO.doCentroAoPe + 0.1
  await page.evaluate(
    ({ x, y, z }) => {
      const g = globalThis as {
        __arquipelagoLevar?: (x: number, y: number, z: number, giro: number) => void
      }
      g.__arquipelagoLevar?.(x, y, z, Math.PI)
    },
    { x: p.x + 0.6, y, z: p.z },
  )
}

const chavesGuardadas = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento?.chaves ?? -1,
  )

/** Abre o Construir e devolve o que está trancado (ferramentas e escolhas de piso e janela). */
async function trancados(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: 'Construir', exact: true }).click()
  const obra = page.getByRole('region', { name: 'Ferramentas de construir' })
  await obra.waitFor()
  const lista: string[] = []
  for (const f of await obra.locator('.arq-ferramenta[aria-disabled=true] b').allTextContents())
    lista.push(f)
  await obra.locator('.arq-ferramenta[data-ferramenta=piso]').click()
  for (const e of await obra.locator('.arq-obra-escolha[aria-disabled=true] b').allTextContents())
    lista.push(`Piso ${e}`)
  await obra.locator('.arq-ferramenta[data-ferramenta=janela]').click()
  for (const e of await obra.locator('.arq-obra-escolha[aria-disabled=true] b').allTextContents())
    lista.push(`Janela ${e}`)
  return lista
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
    await page.goto(`${base}/?novo=1&posicao=2&qualidade=leve&em=0,20,2`)
    await page.waitForFunction(
      () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
    )

    // ── Antes das chaves: só o quintal está trancado; pisos e janelas são livres ──────────────
    const antes = await trancados(page)
    assert.deepEqual(antes.sort(), ['Caminho', 'Canteiro', 'Cerca'])
    await page.getByText('Chaves da casa: 0 de 4').waitFor()
    await page
      .getByRole('region', { name: 'Ferramentas de construir' })
      .locator('.arq-ferramenta[data-ferramenta=cerca]')
      .click({ force: true })
    await page.getByText('Precisa da chave do quintal.').first().waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-1-construir-trancado.png`) })
    await page.keyboard.press('Escape')
    await page
      .getByRole('region', { name: 'Ferramentas de construir' })
      .waitFor({ state: 'hidden' })

    // ── As quatro chaves pela ilha ─────────────────────────────────────────────────────────────
    let esperado = 0
    for (const [i, c] of CHAVES_DA_CASA.entries()) {
      await levar(page, c)
      const rotulo = `Pegar a ${c.nome}`
      await page.locator('.arq-acao').filter({ hasText: rotulo }).waitFor()
      if (i === 0) await page.screenshot({ path: path.join(prints, `${tipo}-2-chave.png`) })
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('e')
      esperado |= 1 << ['cozinha', 'sala', 'banheiro', 'quintal'].indexOf(c.comodo)
      // O recado vem na hora; o salvamento local é gravado alguns segundos depois.
      await page.getByText(`Você achou a ${c.nome}.`).first().waitFor()
      if (i === 0) await page.screenshot({ path: path.join(prints, `${tipo}-2b-chave-pega.png`) })
      await page.waitForFunction((n) => {
        const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento
        return s?.chaves === n
      }, esperado)
      await page.locator('.arq-acao').filter({ hasText: rotulo }).waitFor({ state: 'hidden' })
    }
    assert.equal(await chavesGuardadas(page), 15)

    // ── Depois: nada trancado e a contagem some ────────────────────────────────────────────────
    assert.deepEqual(await trancados(page), [])
    assert.equal(await page.getByText(/Chaves da casa:/).count(), 0)
    await page.locator('.arq-obra-escolha', { hasText: 'Grande' }).click()
    await page.screenshot({ path: path.join(prints, `${tipo}-3-construir-destrancado.png`) })
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${tipo}: três trancas do quintal sem chave, quatro chaves pegas, Construir destrancado`,
    )
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
