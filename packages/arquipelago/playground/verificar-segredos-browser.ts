/**
 * O segredo da sua ilha (N12) no navegador, com a plataforma falsa e sem banco: sem planador, o
 * pé do vento só conta que lá no alto tem um baú; com o planador, a criança cai por cima do vento,
 * abre o planador, o vento a segura lá no alto e ela abre o baú. A estrela cintilante e o bit
 * ficam no salvamento e o vento some.
 *
 * No Windows: `bun build playground/verificar-segredos-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-segredos-browser.mjs && node .cache/verificar-segredos-browser.mjs`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { peDoSegredo, ventoDoSegredo } from '../src/mundo/lugares-dos-segredos'
import { CORPO } from '../src/sistemas/corpo'
import { SEGREDOS } from '../src/sistemas/segredos'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; modo: string; noChao: boolean }
const PE = CORPO.doCentroAoPe + CORPO.folga
const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/segredos')
mkdirSync(prints, { recursive: true })
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

const segredo = SEGREDOS[0]
if (!segredo || segredo.ilha !== 'sua-ilha') throw new Error('o primeiro segredo é o da sua ilha')
const pe = peDoSegredo(segredo)
const { corrente, bau } = ventoDoSegredo(segredo, pe)

const levar = (page: Page, p: P) =>
  page.evaluate((p) => {
    const ir = (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar
    if (!ir) throw new Error('Sem transporte de conferência')
    // Olhando para o baú, que fica a +x do vento.
    ir(p.x, p.y + 1.2, p.z, -Math.PI / 2)
  }, p)
const desenho = (page: Page) =>
  page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
const salvo = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento ?? {},
  )

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
    const novoContexto = () =>
      browser!.newContext({
        viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: celular,
        hasTouch: celular,
        reducedMotion: celular ? 'reduce' : 'no-preference',
      })
    const abrir = async (url: string) => {
      const ctx = await novoContexto()
      const page = await ctx.newPage()
      const erros: string[] = []
      page.setDefaultTimeout(60_000)
      page.on('pageerror', (e) => erros.push(e.message))
      await page.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
      await page.goto(`${base}${url}`)
      await page.waitForFunction(
        () => (globalThis as { __arquipelagoDesenho?: unknown }).__arquipelagoDesenho,
      )
      const usar = async (texto: string) => {
        await page.locator('.arq-acao').filter({ hasText: texto }).waitFor()
        if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
        else await page.keyboard.press('e')
      }
      return { ctx, page, erros, usar }
    }

    // ── Sem planador: o pé do vento só conta o segredo ────────────────────────────────────────
    {
      const { ctx, page, erros, usar } = await abrir(
        `/?novo=1&posicao=2&qualidade=leve&em=${pe.x - 0.4},${pe.z},2`,
      )
      await levar(page, { x: pe.x - 0.4, y: pe.y, z: pe.z })
      await usar('Olhar o vento')
      await page.getByText('Só que ele só leva quem plana.').first().waitFor()
      await page.screenshot({ path: path.join(prints, `${tipo}-1-pe-do-vento.png`) })
      assert.equal((await salvo(page)).segredos ?? 0, 0)
      assert.deepEqual(erros, [])
      await ctx.close()
    }

    // ── Com planador: cair por cima do vento, abrir, subir e abrir o baú ──────────────────────
    const { ctx, page, erros, usar } = await abrir(
      `/?novo=1&posicao=5&planador=1&qualidade=leve&em=${pe.x - 0.4},${pe.z},2`,
    )
    const botaoPular = celular
      ? await page.getByRole('button', { name: 'Pular', exact: true }).boundingBox()
      : null
    const pular = () =>
      botaoPular
        ? page.touchscreen.tap(
            botaoPular.x + botaoPular.width / 2,
            botaoPular.y + botaoPular.height / 2,
          )
        : page.keyboard.press('Space')
    const alto = { x: corrente.x, y: corrente.topo + 10, z: corrente.z }
    for (let t = 0; t < 6 && (await desenho(page))?.modo !== 'planar'; t++) {
      await levar(page, alto)
      const caindo = await page
        .waitForFunction(
          ({ topo, pe }) => {
            const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
            const y = (d?.posicao.y ?? 0) - pe
            return d?.noChao === false && y < topo + 9 && y > topo + 1
          },
          { topo: corrente.topo, pe: PE },
          { timeout: 20_000, polling: 'raf' },
        )
        .then(() => true)
        .catch(() => false)
      if (!caindo) continue
      await pular()
      await page.waitForTimeout(1500)
    }
    assert.equal((await desenho(page))?.modo, 'planar', 'o planador não abriu')
    // O vento segura lá no alto, ao alcance do baú.
    await page.waitForFunction(
      ({ b }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d?.modo === 'planar' &&
          Math.hypot(d.posicao.x - b.x, d.posicao.y - b.y, d.posicao.z - b.z) < 2.2
        )
      },
      { b: bau },
      { timeout: 60_000 },
    )
    await page.screenshot({ path: path.join(prints, `${tipo}-2-no-alto-do-vento.png`) })
    await usar('Abrir o baú')
    await page.getByText('No alto do vento tinha um baú da Íris.').first().waitFor()
    await page.screenshot({ path: path.join(prints, `${tipo}-3-bau-aberto.png`) })
    await page.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento
      return s?.segredos === 1 && s?.inventario?.['estrela-cintilante'] === 1
    })
    assert.equal(await page.locator('.arq-acao').filter({ hasText: 'Abrir o baú' }).count(), 0)
    assert.deepEqual(erros, [])
    console.log(`PASS ${tipo}: o vento só conta o segredo sem planador; com ele, sobe e abre o baú`)
    await ctx.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
