/** Mapa e descoberta no jogo real, apenas serviço de playground local e descartável. */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'

const prints = process.env.ARQUIPELAGO_PRINTS
if (!prints) throw Error('Defina ARQUIPELAGO_PRINTS para uma pasta nova.')
mkdirSync(prints, { recursive: true })
const publico = process.env.ARQUIPELAGO_PUBLICO === 'adulto' ? 'adulto' : 'kids'
const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local.'))
    s.close(() => resolve(a.port))
  })
})
const origem = `http://127.0.0.1:${port}`
const bosque = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')
if (!bosque) throw Error('Bosque ausente.')
const arquivo = readFileSync('src/assets/ilhas/bosque.glb')
const gltf = JSON.parse(arquivo.subarray(20, 20 + arquivo.readUInt32LE(12)).toString('utf8')) as {
  nodes: { name?: string; translation?: [number, number, number] }[]
}
const chegada = gltf.nodes.find((n) => n.name === 'chegada')?.translation
if (!chegada) throw Error('Âncora de chegada ausente.')
const g = giroDaIlha(bosque.ilha)
const alvo = {
  x: bosque.centro.x + chegada[0] * Math.cos(g) + chegada[2] * Math.sin(g),
  y: chegada[1] + 1.2,
  z: bosque.centro.z - chegada[0] * Math.sin(g) + chegada[2] * Math.cos(g),
}
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const encerrado = new Promise<void>((resolve) => server.once('close', () => resolve()))
let logs = ''
server.stdout.on('data', (d) => {
  logs += String(d)
})
server.stderr.on('data', (d) => {
  logs += String(d)
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const limite = setTimeout(() => {
  void browser?.close()
  server.kill()
}, 5 * 60_000)
const resultados: unknown[] = []
try {
  const prazo = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw Error('Servidor encerrou antes da leitura.')
    try {
      if ((await fetch(origem)).ok) break
    } catch {}
    if (Date.now() >= prazo) throw Error('Servidor não ficou pronto.')
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true]) {
    const nome = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 844 },
      isMobile: celular,
      hasTouch: celular,
      deviceScaleFactor: 0.5,
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const erros: string[] = []
    const externas: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (url.origin !== origem) {
          externas.push(url.origin)
          return route.abort()
        }
      }
      return route.continue()
    })
    await context.addInitScript((base) => {
      if (location.origin !== base) return
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem(
        'arquipelago:conforto',
        JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
      )
    }, origem)
    page.setDefaultTimeout(30_000)
    try {
      await page.goto(`${origem}/?novo=1&posicao=8&publico=${publico}&em=0,8,2.2`, {
        waitUntil: 'domcontentloaded',
      })
      await page.evaluate(() => {
        const u = new URL(location.href)
        u.searchParams.delete('novo')
        u.searchParams.delete('em')
        history.replaceState(null, '', u)
      })
      await page.waitForFunction(
        () => {
          const salvo = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
          return salvo?.salvamento?.ilhasVisitadas === 1
        },
        undefined,
        { timeout: 180_000 },
      )
      const abrirMapa = async () => {
        await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
        await page.getByRole('button', { name: 'Mapa do arquipélago', exact: true }).click()
        return page.getByRole('dialog', { name: 'Mapa do arquipélago', exact: true })
      }
      let mapa = await abrirMapa()
      await mapa
        .getByText('1 de 8 ilhas visitadas. 8 abertas para explorar.', { exact: true })
        .waitFor()
      await page.screenshot({ path: path.join(prints, `${nome}-01-abertas.png`) })
      await mapa.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
      // A ferramenta de medição move o corpo; a descoberta continua dependendo da física real.
      await page.evaluate(({ x, y, z }) => {
        const levar = (
          globalThis as {
            __arquipelagoLevar?: (x: number, y: number, z: number, g: number) => void
          }
        ).__arquipelagoLevar
        if (!levar) throw Error('Medição indisponível.')
        levar(x, y, z, 0)
      }, alvo)
      await page.waitForFunction(
        () => {
          const salvo = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
          return salvo?.salvamento?.ilhasVisitadas === 3
        },
        undefined,
        { timeout: 90_000 },
      )
      mapa = await abrirMapa()
      await mapa
        .getByText('2 de 8 ilhas visitadas. 8 abertas para explorar.', { exact: true })
        .waitFor()
      await mapa
        .locator('li')
        .filter({ hasText: 'Bosque dos Bichos' })
        .getByText('Visitada.', { exact: false })
        .waitFor()
      await mapa
        .locator('li')
        .filter({ hasText: 'Recife Coral' })
        .getByText('Aberta para explorar.', { exact: false })
        .waitFor()
      const limites = await mapa.evaluate((e) => ({
        largura: e.clientWidth,
        conteudo: e.scrollWidth,
        esquerda: e.getBoundingClientRect().left,
        direita: e.getBoundingClientRect().right,
        tela: innerWidth,
      }))
      if (
        limites.conteudo > limites.largura + 1 ||
        limites.esquerda < 0 ||
        limites.direita > limites.tela + 1
      )
        throw Error('Mapa transborda a tela.')
      await page.screenshot({ path: path.join(prints, `${nome}-02-visitada.png`) })
      await page.reload({ waitUntil: 'domcontentloaded' })
      mapa = await abrirMapa()
      await mapa
        .getByText('2 de 8 ilhas visitadas. 8 abertas para explorar.', { exact: true })
        .waitFor()
      await page.screenshot({ path: path.join(prints, `${nome}-03-reaberta.png`) })
      const salvo = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null'),
      )
      if (salvo?.salvamento?.versao !== 18 || salvo?.salvamento?.ilhasVisitadas !== 3)
        throw Error('Descoberta não persistiu.')
      if (erros.length || externas.length) throw Error(JSON.stringify({ erros, externas }))
      resultados.push({ nome, publico, versao: 18, visitas: 3, limites, erros, externas })
    } catch (error) {
      await page.screenshot({ path: path.join(prints, `${nome}-falha.png`) }).catch(() => {})
      writeFileSync(
        path.join(prints, `${nome}-falha.txt`),
        `${String(error)}\n${await page
          .locator('body')
          .innerText()
          .catch(() => '')}\n${JSON.stringify({ erros, externas })}`,
      )
      throw error
    } finally {
      await context.close()
    }
  }
  writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(`Mapa conferido em ${prints}`)
} finally {
  clearTimeout(limite)
  await browser?.close()
  server.kill()
  await encerrado
  writeFileSync(path.join(prints, 'servidor.log'), logs)
}
