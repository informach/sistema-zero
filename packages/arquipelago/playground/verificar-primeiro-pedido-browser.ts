/** Primeiro pedido pelos controles reais. Só plataforma local e relógio do navegador. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  CRESCIMENTO_MS,
  criarSalvamentoInicial,
  type Salvamento,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { type BrowserContext, chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'

const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-primeiro-pedido/r1')
mkdirSync(prints, { recursive: true })
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const base = `http://127.0.0.1:${port}`
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((r) => server.once('close', () => r()))
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const limite = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 10 * 60_000)
const resultados: unknown[] = []
try {
  const prazo = Date.now() + 60_000
  while (true) {
    if (server.exitCode !== null) throw Error('Playground encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > prazo) throw Error('Playground não abriu')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const publico of ['kids', 'adulto'] as const) {
    const celular = publico === 'adulto'
    const context: BrowserContext = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      deviceScaleFactor: 0.5,
      isMobile: celular,
      hasTouch: celular,
      reducedMotion: 'reduce',
    })
    const s = criarSalvamentoInicial(new Date())
    const h = posicaoDoCanteiro(0)
    s.casa.portaNova = true
    s.posicao = { x: h.x, y: 2.2, z: h.z - 1.4 }
    await context.addInitScript(
      ({ salvo, origem }) => {
        if (location.origin !== origem) return
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem(
          'arquipelago:conforto',
          JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
        )
        if (!localStorage.getItem('arquipelago-playground'))
          localStorage.setItem(
            'arquipelago-playground',
            JSON.stringify({
              revisao: 1,
              atualizadoEm: new Date().toISOString(),
              salvamento: salvo,
            }),
          )
      },
      { salvo: s, origem: base },
    )
    const page: Page = await context.newPage()
    page.setDefaultTimeout(45_000)
    const erros: string[] = [],
      externas: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) {
        externas.push(url.origin)
        return route.abort()
      }
      return route.continue()
    })
    const nome = `${publico}-${celular ? 'celular' : 'computador'}`
    const ler = async (): Promise<Salvamento> =>
      SalvamentoSchema.parse(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento,
        ),
      )
    const usar = async () => {
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
      else await page.keyboard.press('KeyE')
    }
    try {
      await page.goto(`${base}/?publico=${publico}&posicao=0&qualidade=leve`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
      await page.getByRole('button', { name: 'Diário', exact: true }).click()
      const diario = page.getByRole('dialog', { name: 'Diário', exact: true })
      await diario.getByRole('heading', { name: 'Seu primeiro pedido', exact: true }).waitFor()
      assert.ok(await diario.evaluate((e) => e.scrollWidth <= e.clientWidth + 1))
      await page.screenshot({ path: path.join(prints, `${nome}-pedido.png`) })
      await diario.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
      await page.locator('canvas').click()
      await page.evaluate(({ x, z }) => {
        ;(globalThis as { __arquipelagoLevar?: (...n: number[]) => void }).__arquipelagoLevar?.(
          x,
          2.2,
          z - 1.4,
          Math.PI,
        )
      }, h)
      await page.getByText('Plantar alface', { exact: false }).first().waitFor()
      await usar()
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento.horta[0]
            .semente === 'alface',
      )
      assert.equal((await ler()).projetos.geladeira, undefined)
      await page.getByText('Regar', { exact: false }).first().waitFor()
      await usar()
      await page.waitForFunction(() =>
        Boolean(
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento.horta[0]
            .regadoEm,
        ),
      )
      const regado = await ler()
      assert.equal(regado.projetos.geladeira, undefined)
      const regadoEm = regado.horta[0]?.regadoEm
      assert.ok(regadoEm)
      await page.screenshot({ path: path.join(prints, `${nome}-regado.png`) })
      // Kids mede tempo parental: salto de data invalida a sessão por segurança.
      // Nesse público esperamos os três minutos reais; adulto não tem essa sessão.
      if (publico === 'adulto')
        await page.clock.setSystemTime(
          new Date(Date.parse(regadoEm) + CRESCIMENTO_MS.alface + 1000),
        )
      await page
        .getByText('Colher alface', { exact: false })
        .first()
        .waitFor({
          timeout: CRESCIMENTO_MS.alface + 60_000,
        })
      await usar()
      await page.waitForFunction(() =>
        Boolean(
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento.projetos
            .geladeira,
        ),
      )
      const colhido = await ler()
      assert.equal(colhido.horta[0]?.semente, null)
      assert.equal(colhido.inventario['semente-alface'], s.inventario['semente-alface'])
      assert.ok((colhido.inventario.alface ?? 0) >= 2)
      assert.ok(colhido.projetos.geladeira)
      assert.equal(colhido.projetos.geladeira.aparencia, null)
      await page.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
      await page.screenshot({ path: path.join(prints, `${nome}-colhido.png`) })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Abrir o menu', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
      await page.getByRole('button', { name: 'Diário', exact: true }).click()
      await diario.waitFor()
      assert.equal(
        await diario.getByRole('heading', { name: 'Seu primeiro pedido', exact: true }).count(),
        0,
      )
      assert.deepEqual((await ler()).projetos.geladeira, colhido.projetos.geladeira)
      assert.deepEqual(erros, [])
      assert.deepEqual(externas, [])
      await page.screenshot({ path: path.join(prints, `${nome}-reaberto.png`) })
      resultados.push({
        publico,
        celular,
        crescimento: publico === 'kids' ? 'três minutos reais' : 'data do navegador adiantada',
        projeto: colhido.projetos.geladeira,
        colhido: colhido.inventario.alface,
        erros,
        externas,
      })
    } catch (e) {
      await page.screenshot({ path: path.join(prints, `${nome}-falha.png`) }).catch(() => {})
      writeFileSync(
        path.join(prints, `${nome}-falha.txt`),
        `${String(e)}\n${await page
          .locator('body')
          .innerText()
          .catch(() => '')}`,
      )
      throw e
    } finally {
      await context.close()
    }
  }
  writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log('Primeiro pedido conferido nos dois públicos.')
} finally {
  clearTimeout(limite)
  await browser?.close()
  server.kill()
  await encerrado
}
