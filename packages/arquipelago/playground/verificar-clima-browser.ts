/**
 * O clima da sua ilha no playground (fase4-08). Executar no pacote:
 * bun build playground/verificar-clima-browser.ts --target=node --external playwright-core --outfile .cache/verificar-clima-browser.mjs
 * node .cache/verificar-clima-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta dos prints;
 * ARQUIPELAGO_TELA (computador ou celular) roda uma tela só.
 *
 * O pedido de água espera o relógio de verdade: a alface pede aos 30% de 3 min (54 s).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { ILHAS } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'
import { ALTURA_DA_TERRA } from '../src/mundo/medidas'
import { CLIMA, FALA_DO_BONUS } from '../src/sistemas/clima'
import { CORPO } from '../src/sistemas/corpo'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  noChao: boolean
  clima: { escolhido: string; luz: number; cinza: number; gotas: boolean }
  horta: { semente: string | null; regado: boolean; progresso: number }[]
}
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const endereco = reserva.address()
    if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(endereco.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-clima-da-ilha')
mkdirSync(prints, { recursive: true })
const nuvens = ILHAS.find((i) => i.id === 'nuvens')
if (!nuvens) throw new Error('Sem as Nuvens no contrato')
const PE = CORPO.doCentroAoPe + CORPO.folga
/** Em pé a oeste do canteiro (−x), virado para ele. */
const juntoDo = (i: number): P => {
  const c = posicaoDoCanteiro(i)
  return { x: c.x - 1.3, y: ALTURA_DA_TERRA, z: c.z }
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let servidorPronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) servidorPronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let prazo: ReturnType<typeof setTimeout> | undefined

const ler = (page: Page) =>
  page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
/** Espera a medida do desenho cumprir `fn` (escrita aqui, sem nada de fora: vai como texto). */
const esperar = (page: Page, fn: (d: Desenho, a: unknown) => boolean, arg?: unknown, ms = 60_000) =>
  page.waitForFunction(
    `(() => { const d = globalThis.__arquipelagoDesenho; return !!d && (${fn.toString()})(d, ${JSON.stringify(arg ?? null)}) })()`,
    undefined,
    { timeout: ms },
  )

try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  prazo = setTimeout(() => {
    void browser?.close()
    server.kill()
  }, 15 * 60_000)
  for (const celular of [false, true].filter(
    (c) =>
      !process.env.ARQUIPELAGO_TELA ||
      process.env.ARQUIPELAGO_TELA === (c ? 'celular' : 'computador'),
  )) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      deviceScaleFactor: 0.5,
      reducedMotion: celular ? 'reduce' : 'no-preference',
      isMobile: celular,
      hasTouch: celular,
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript((celular) => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: celular, qualidade: 'leve' }),
      )
    }, celular)
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => {
      erros.push(e.message)
      console.error('pageerror', e.message)
    })
    const inicio = juntoDo(0)
    await page.goto(
      `${baseURL}/?novo=1&persistir=0&posicao=${nuvens.posicao}&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`,
      { waitUntil: 'domcontentloaded' },
    )
    await esperar(page, (d) => Array.isArray(d.horta) && d.horta.length > 0, undefined, 180_000)
    await page.locator('canvas').click()
    const usar = async () => {
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('KeyE')
    }
    const levar = (p: P) =>
      page.evaluate(
        ({ p }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          // Virado para +x (o canteiro): a câmera fica nas costas (giro + π).
          ir(p.x, p.y + 1.2, p.z, Math.PI / 2 + Math.PI)
        },
        { p },
      )
    const dePe = async (p: P) => {
      await levar(p)
      await esperar(
        page,
        (d, a) => {
          const q = a as P & { pe: number }
          return (
            d.noChao &&
            Math.hypot(d.posicao.x - q.x, d.posicao.z - q.z) < 0.35 &&
            Math.abs(d.posicao.y - q.pe - q.y) < 0.15
          )
        },
        { ...p, pe: PE },
      )
      await page.waitForTimeout(300)
    }
    const acao = (texto: string) => page.locator('.arq-acao').filter({ hasText: texto })
    const escolher = async (nome: string) => {
      await page.getByRole('button', { name: 'Abrir o menu' }).click()
      const secao = page.getByRole('region', { name: 'Clima da sua ilha' })
      await secao.getByRole('button', { name: nome }).click()
      await secao.getByRole('button', { name: nome, pressed: true }).waitFor()
      await page.keyboard.press('Escape')
      if (!celular) await page.locator('canvas').click()
    }

    // 1. Planta e rega o canteiro 0; só planta o 3 (a chuva rega depois).
    await dePe(juntoDo(0))
    await acao('Plantar').waitFor()
    await usar()
    await acao('Regar').waitFor()
    await usar()
    await esperar(page, (d) => d.horta[0]?.regado === true)
    await dePe(juntoDo(3))
    await acao('Plantar').waitFor()
    await usar()
    await esperar(page, (d) => d.horta[3]?.semente !== null && d.horta[3]?.regado === false)
    console.log(`${tipo}: plantou e regou um, plantou outro`)

    // 2. Chuva: o céu fecha, as gotas caem (não com menos movimento) e a chuva rega o canteiro 3.
    await escolher('Chuva')
    await esperar(
      page,
      (d, a) => {
        const k = a as { celular: boolean; luz: number }
        return (
          d.clima.escolhido === 'chuva' &&
          Math.abs(d.clima.luz - k.luz) < 0.01 &&
          d.clima.gotas === !k.celular &&
          d.horta[3]?.regado === true
        )
      },
      { celular, luz: CLIMA.luz.chuva },
      20_000,
    )
    await page.getByText('🌧️', { exact: false }).first().waitFor()
    // O print da chuva de um lugar aberto, a leste da horta, olhando para o mar.
    const aberto = posicaoDoCanteiro(2)
    await dePe({ x: aberto.x + 3, y: ALTURA_DA_TERRA, z: aberto.z })
    await page.waitForTimeout(800)
    await page.screenshot({ scale: 'css', path: path.join(prints, `clima-${tipo}-chuva.png`) })
    console.log(`${tipo}: a chuva caiu e regou o canteiro plantado`)

    // 3. Nublado: sem gotas, com o céu cinza.
    await escolher('Nublado')
    await esperar(
      page,
      (d, a) =>
        d.clima.escolhido === 'nublado' &&
        !d.clima.gotas &&
        Math.abs(d.clima.cinza - (a as number)) < 0.01,
      CLIMA.cinza.nublado,
    )
    await page.screenshot({ scale: 'css', path: path.join(prints, `clima-${tipo}-nublado.png`) })
    console.log(`${tipo}: nublado`)

    // 4. Sol: a alface regada pede água aos 30% (gota em cima) e regar adianta o crescimento.
    await escolher('Sol')
    await dePe(juntoDo(0))
    await esperar(page, (d) => (d.horta[0]?.progresso ?? 0) >= 0.31, undefined, 120_000)
    await acao('Regar').waitFor()
    await page.screenshot({ scale: 'css', path: path.join(prints, `clima-${tipo}-sede.png`) })
    const antes = (await ler(page))?.horta[0]?.progresso ?? 0
    await usar()
    await page.getByText(FALA_DO_BONUS).first().waitFor()
    await esperar(page, (d, a) => (d.horta[0]?.progresso ?? 0) >= (a as number) + 0.14, antes)
    console.log(`${tipo}: a planta pediu água e regar adiantou`)

    if (celular && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      throw new Error('A interface ultrapassa a largura do celular')
    if (erros.length) throw new Error(erros.join('\n'))
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify({ tipo, chuva: true, nublado: true, sede: true, antes }, null, 2),
    )
    await context.close()
  }
  console.log('clima da sua ilha aprovado')
} catch (erro) {
  for (const c of browser?.contexts() ?? [])
    for (const p of c.pages()) {
      console.error('Última medida', await ler(p).catch(() => null))
      await p.screenshot({ path: path.join(prints, 'falha.png') }).catch(() => {})
    }
  throw erro
} finally {
  clearTimeout(prazo)
  await browser?.close()
  server.kill()
}
