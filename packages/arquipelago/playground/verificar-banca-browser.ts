/**
 * A banca da feira no playground (§6.28, A22), com o serviço simulado local. Nunca acessa banco.
 *
 * Um jogo com a Vila Doce aberta, o avatar diante da barraca e pratos na mochila: abre a feira,
 * escolhe dois pães de queijo e um bolo de fubá, vende por 5 moedas, confere a mochila e a
 * carteira, e vê a banca dizer que já vendeu hoje. No computador e no celular.
 *
 * No Windows: `bun build playground/verificar-banca-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-banca-browser.mjs && node
 * .cache/verificar-banca-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { criarSalvamentoInicial, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { chromium } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FALAS_DA_BANCA } from '../src/interface/banca-da-feira'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { ANCORA_DA_FEIRA } from '../src/sistemas/feira'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/banca')
mkdirSync(prints, { recursive: true })
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
if (!vila) throw new Error('Sem a Vila Doce no anel.')
const giroIlha = giroDaIlha(vila.ilha)
const glb = readFileSync(path.resolve('src', 'assets', 'ilhas', 'vila-doce.glb'))
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
const ancora = (nome: string) => {
  const o = modelo.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  const { x, y, z } = o.position
  return {
    x: vila.centro.x + x * Math.cos(giroIlha) + z * Math.sin(giroIlha),
    y,
    z: vila.centro.z - x * Math.sin(giroIlha) + z * Math.cos(giroIlha),
  }
}
const barraca = ancora(ANCORA_DA_FEIRA)

/** Pratos na mochila, a Vila aberta e o avatar diante da barraca. */
function semente() {
  const s = criarSalvamentoInicial(new Date())
  return {
    revisao: 1,
    atualizadoEm: new Date().toISOString(),
    salvamento: {
      ...s,
      casa: { portaNova: true },
      pontesVistas: ilhasDoAnel().map((i) => i.id),
      posicao: { x: barraca.x, y: barraca.y + 1.2, z: barraca.z },
      inventario: { ...s.inventario, 'pao-de-queijo': 3, 'bolo-de-fuba': 1 },
    },
  }
}

const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar.')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('Playground não iniciou.')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true]) {
    const nome = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 0.5,
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(60_000)
    await context.addInitScript((salvo) => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
      if (!sessionStorage.getItem('banca-semeada')) {
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('banca-semeada', '1')
      }
    }, JSON.stringify(semente()))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    // Posição 8: todas as ilhas abertas.
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Ver a feira da semana', { exact: false }).first().waitFor({
      timeout: 180_000,
    })
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).click()
    else await page.keyboard.press('KeyE')
    const feira = page.getByRole('dialog', { name: 'Feira da Vila Doce', exact: true })
    await feira.waitFor()
    const banca = feira.getByRole('region', { name: 'Banca da feira' })
    await banca.scrollIntoViewIfNeeded()
    const saldoAntes = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null')?.saldo ?? 80,
    )
    await banca.getByRole('button', { name: 'Um pão de queijo a mais' }).click()
    await banca.getByRole('button', { name: 'Um pão de queijo a mais' }).click()
    await banca.getByRole('button', { name: 'Um bolo de fubá a mais' }).click()
    const vender = banca.getByRole('button', { name: 'Vender 3 pratos por 5 moedas' })
    await vender.waitFor()
    await page.screenshot({ path: path.join(prints, `${nome}-1-escolha.png`) })
    const largura = await feira.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
    if (!largura) throw Error('A banca não cabe na largura da feira')
    await vender.click()
    await page.getByText(FALAS_DA_BANCA.vendeu(5)).first().waitFor()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
          ?.inventario?.['pao-de-queijo'] === 1,
    )
    const depois = await page.evaluate(() => ({
      jogo: JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null'),
      carteira: JSON.parse(localStorage.getItem('arquipelago-playground:galeria') ?? 'null'),
    }))
    if (depois.jogo.salvamento.inventario['bolo-de-fuba'] !== undefined)
      throw Error('O bolo vendido continuou na mochila')
    if (depois.carteira?.saldo !== saldoAntes + 5)
      throw Error(`Carteira ${depois.carteira?.saldo}, esperado ${saldoAntes + 5}`)
    await banca.getByText(FALAS_DA_BANCA.jaVendeu).waitFor()
    await page.screenshot({ path: path.join(prints, `${nome}-2-vendido.png`) })
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: vendeu 3 pratos por 5 moedas e a banca fechou o dia`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
