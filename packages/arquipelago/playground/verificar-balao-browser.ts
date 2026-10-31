/**
 * O balão das Nuvens no playground (fase4-09). Executar no pacote:
 * bun build playground/verificar-balao-browser.ts --target=node --external playwright-core --outfile .cache/verificar-balao-browser.mjs
 * node .cache/verificar-balao-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta dos prints;
 * ARQUIPELAGO_TELA (computador ou celular) roda uma tela só.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { BALAO } from '../src/sistemas/balao'
import { CORPO } from '../src/sistemas/corpo'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  ilhasCompletas: number
  modo: string
  noChao: boolean
  balao: { fase: string; pousado: boolean; fogo: boolean; pe: P; casa: P; vel: P } | null
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
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-nuvens-balao')
mkdirSync(prints, { recursive: true })
const nuvens = ilhasEmVolta().find((i) => i.ilha.id === 'nuvens')
if (!nuvens) throw new Error('Nuvens fora do anel')
const giro = giroDaIlha(nuvens.ilha)
const bytes = readFileSync('src/assets/ilhas/nuvens.glb')
const modelo = (
  await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
).scene
const local = (nome: string) => {
  const no = modelo.getObjectByName(nome)
  if (!no) throw new Error(`Sem âncora ${nome}`)
  return no.position.clone()
}
const mundo = (p: P): P => ({
  x: nuvens.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y + 7,
  z: nuvens.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
const casa = mundo(local('balao'))
// Ao lado do cesto, do lado do meio da ilha (fora do cesto parado, dentro do alcance de subir).
const meio = { x: nuvens.centro.x, y: casa.y, z: nuvens.centro.z }
const paraOMeio = { x: meio.x - casa.x, z: meio.z - casa.z }
const m = Math.hypot(paraOMeio.x, paraOMeio.z)
const encosto = {
  x: casa.x + (paraOMeio.x / m) * 1.2,
  y: casa.y,
  z: casa.z + (paraOMeio.z / m) * 1.2,
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
  }, 12 * 60_000)
  const resultados: unknown[] = []
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
      const g = globalThis as unknown as {
        qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
      }
      g.qaPad = {
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 12 }, () => ({ pressed: false })),
      }
      Object.assign(g.qaPad, { connected: true, mapping: 'standard' })
      Object.defineProperty(navigator, 'getGamepads', { value: () => [g.qaPad] })
    }, celular)
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => {
      erros.push(e.message)
      console.error('pageerror', e.message)
    })
    await page.goto(
      `${baseURL}/?novo=1&posicao=7&em=${encosto.x},${encosto.z},${encosto.y + 1.2}`,
      {
        waitUntil: 'domcontentloaded',
      },
    )
    await esperar(page, (d) => d.ilhasCompletas > 0 && d.balao !== null, undefined, 180_000)
    await page.locator('canvas').click()
    const levar = (p: P, olhar: number) =>
      page.evaluate(
        ({ p, g }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          ir(p.x, p.y + 1.2, p.z, g)
        },
        { p, g: olhar + Math.PI },
      )
    const usar = async () => {
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('KeyE')
    }
    const pad = (eixoX: number, eixoZ: number, fogo: boolean) =>
      page.evaluate(
        ({ eixoX, eixoZ, fogo }) => {
          const g = globalThis as unknown as {
            qaPad: { axes: number[]; buttons: { pressed: boolean }[] }
          }
          g.qaPad.axes[0] = eixoX
          g.qaPad.axes[1] = eixoZ
          g.qaPad.buttons[0]!.pressed = fogo
        },
        { eixoX, eixoZ, fogo },
      )
    const subir = async () => {
      await levar(encosto, rumo(encosto, casa))
      await esperar(
        page,
        // O transporte larga o corpo 1,2 m acima: espera os pés no chão, não só a medida.
        (d, p) => {
          const a = p as P & { pe: number }
          return (
            d.noChao &&
            Math.hypot(d.posicao.x - a.x, d.posicao.z - a.z) < 0.3 &&
            Math.abs(d.posicao.y - a.pe - a.y) < 0.05
          )
        },
        { ...encosto, pe: PE },
      )
      await page.waitForTimeout(300)
      await page.locator('.arq-acao').filter({ hasText: 'Subir no balão' }).waitFor()
      // Com a máquina lenta o E às vezes se perde entre dois quadros: aperta de novo, como uma
      // criança faria (até três vezes).
      for (let tentativa = 1; ; tentativa++) {
        await usar()
        try {
          await esperar(page, (d) => d.modo === 'balao', undefined, 3000)
          break
        } catch (erro) {
          if (tentativa === 3) throw erro
        }
      }
      await esperar(page, (d) => d.modo === 'balao' && d.balao?.fase === 'voo' && d.balao.pousado)
    }

    // 1. Sobe no cesto parado, pelo E ou pelo Usar.
    await subir()
    const noCesto = await ler(page)
    if (!noCesto?.balao) throw new Error('Sem balão')
    if (Math.hypot(noCesto.posicao.x - casa.x, noCesto.posicao.z - casa.z) > 0.15)
      throw new Error(`Fora do cesto: ${JSON.stringify(noCesto)}`)
    if (celular) await page.getByRole('button', { name: 'Subir', exact: true }).waitFor()
    await page.locator('.arq-acao').filter({ hasText: 'Segure para subir' }).waitFor()
    console.log(`${tipo}: no cesto`)
    await page.screenshot({ scale: 'css', path: path.join(prints, `balao-${tipo}-cesto.png`) })

    // 2. Segura o fogo: sobe. Com o direcional, vai para o lado.
    await pad(0, 0, true)
    await esperar(page, (d, y) => !!d.balao?.fogo && d.posicao.y > (y as number), casa.y + PE + 3)
    await pad(0.8, 0, true)
    await page.waitForTimeout(2500)
    await pad(0, 0, true)
    const alto = await ler(page)
    if (!alto?.balao) throw new Error('Sem balão no alto')
    const andou = Math.hypot(alto.balao.pe.x - casa.x, alto.balao.pe.z - casa.z)
    if (andou < 1.5) throw new Error(`O direcional não empurrou: ${JSON.stringify(alto.balao)}`)
    console.log(`${tipo}: subiu e foi para o lado`, alto.balao)
    await page.screenshot({ scale: 'css', path: path.join(prints, `balao-${tipo}-voo.png`) })

    // 3. Pausa: nada anda.
    await page.getByRole('button', { name: 'Abrir o menu' }).click()
    await page.waitForTimeout(400)
    const pausado = await ler(page)
    await page.waitForTimeout(1200)
    const depois = await ler(page)
    if (JSON.stringify(pausado?.balao?.pe) !== JSON.stringify(depois?.balao?.pe))
      throw new Error('O balão andou na pausa')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (!celular) await page.locator('canvas').click()

    // 4. Solta o fogo: desce devagar até pousar; "Descer do balão" desce onde pousou.
    await pad(0, 0, false)
    await esperar(page, (d) => !!d.balao?.pousado && d.modo === 'balao', undefined, 90_000)
    await page.locator('.arq-acao').filter({ hasText: 'Descer do balão' }).waitFor()
    const pousou = await ler(page)
    await page.screenshot({ scale: 'css', path: path.join(prints, `balao-${tipo}-pousou.png`) })
    await usar()
    await esperar(page, (d) => d.modo === 'chao' && d.balao?.fase === 'parado')
    const fora = await ler(page)
    if (!fora || !pousou) throw new Error('Sem medida ao descer')
    if (Math.hypot(fora.posicao.x - pousou.posicao.x, fora.posicao.z - pousou.posicao.z) > 0.3)
      throw new Error('Longe do lugar do balão, devia ficar de pé onde pousou')
    console.log(`${tipo}: pousou longe e desceu ali`)

    // 5. De novo: sobe um pouco e pousa no lugar dele; a criança sai para o lado do cesto parado.
    await subir()
    await pad(0, 0, true)
    await esperar(page, (d, y) => d.posicao.y > (y as number), casa.y + PE + 1)
    await pad(0, 0, false)
    await esperar(page, (d) => !!d.balao?.pousado, undefined, 90_000)
    await usar()
    await esperar(
      page,
      (d, c) => {
        const k = c as P
        const r = Math.hypot(d.posicao.x - k.x, d.posicao.z - k.z)
        return d.modo === 'chao' && d.noChao && r > 1.2 && r < 1.7
      },
      casa,
    )
    console.log(`${tipo}: pousou em casa e saiu para o lado`)
    await page.screenshot({ scale: 'css', path: path.join(prints, `balao-${tipo}-de-volta.png`) })
    if (celular && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      throw new Error('A interface ultrapassa a largura do celular')
    if (erros.length) throw new Error(erros.join('\n'))
    resultados.push({ tipo, noCesto: noCesto.balao, alto: alto.balao, pousou, fora, erros })
    writeFileSync(
      path.join(prints, `resultado-${tipo}.json`),
      JSON.stringify(resultados.at(-1), null, 2),
    )
    await context.close()
  }
  console.log('balão aprovado:', BALAO.alcance, resultados.length, 'telas')
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
