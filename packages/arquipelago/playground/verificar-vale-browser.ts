/**
 * Vale dos Dinos real no playground (fase4-01). Executar no pacote:
 * bun build playground/verificar-vale-browser.ts --target=node --external playwright-core --outfile .cache/verificar-vale-browser.mjs
 * node .cache/verificar-vale-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { giroDaIlha, ilhasEmVolta, trajetoDaPonte } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { APRESENTACAO_DA_JADE } from '../src/sistemas/jade'

type P = { x: number; y: number; z: number }
type Desenho = {
  posicao: P
  camera: P
  giro: number
  ilhasCompletas: number
  modo: string
  noChao: boolean
}
const port = process.env.ARQUIPELAGO_TEST_PORT
  ? Number(process.env.ARQUIPELAGO_TEST_PORT)
  : await new Promise<number>((resolve, reject) => {
      const reserva = createServer()
      reserva.once('error', reject)
      reserva.listen(0, '127.0.0.1', () => {
        const endereco = reserva.address()
        if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
        reserva.close(() => resolve(endereco.port))
      })
    })
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-vale')
mkdirSync(prints, { recursive: true })
const vale = ilhasEmVolta().find((i) => i.ilha.id === 'vale-dos-dinos')
if (!vale) throw new Error('Vale fora do anel')
const giro = giroDaIlha(vale.ilha)
const bytes = readFileSync('src/assets/ilhas/vale-dos-dinos.glb')
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
  x: vale.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: vale.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
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
  for (const celular of [false, true]) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    const ponte = trajetoDaPonte(vale.ilha)
    const inicio = ponte[ponte.length - 5]
    if (!inicio) throw new Error('Ponte sem começo')
    await page.goto(`${baseURL}/?novo=1&posicao=6&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`, {
      waitUntil: 'domcontentloaded',
    })
    const ler = () =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
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
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await page.locator('canvas').click()
    // Em ?novo=1, as tábuas são montadas durante 4,5 s. A ilha pronta não significa
    // que a animação da ponte já terminou. Só começar a caminhada com apoio confirmado.
    await page.waitForTimeout(5000)
    await levar(inicio, rumo(inicio, mundo(local('chegada'))))
    await page.waitForFunction(
      ({ inicio, pe }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d?.noChao &&
          Math.hypot(d.posicao.x - inicio.x, d.posicao.z - inicio.z) < 0.3 &&
          Math.abs(d.posicao.y - pe - inicio.y) < 0.15
        )
      },
      { inicio, pe: PE },
    )
    const chegada = mundo(local('chegada'))
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(
        ({ chegada }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d &&
            Math.hypot(d.posicao.x - chegada.x, d.posicao.z - chegada.z) < 1 &&
            d.noChao &&
            d.posicao.y > chegada.y + 0.8
          )
        },
        { chegada },
        { timeout: 90_000 },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    console.log(`${tipo}: chegada pela ponte`, await ler())
    await page.screenshot({ path: path.join(prints, `vale-${tipo}-chegada.png`) })

    /** Leva e espera o corpo de pé no ponto (o pé a `PE` do centro; `subida`: um degrau a mais). */
    const dePe = async (p: P, olhar: number, rotulo: string, subida = 0) => {
      await levar(p, olhar)
      await page.waitForFunction(
        ({ p, pe, subida }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            d.posicao.y - pe - p.y > -0.15 &&
            d.posicao.y - pe - p.y < 0.15 + subida
          )
        },
        { p, pe: PE, subida },
        { timeout: 60_000 },
      )
      console.log(`${tipo}: de pé ${rotulo}`)
    }

    // A Jade fica no chão. Aproximação pelo rumo da chegada, dentro do alcance da conversa.
    const jade = mundo(local('morador'))
    const direcao = local('chegada').sub(local('morador')).setY(0).normalize()
    const encontro = mundo(local('morador').addScaledVector(direcao, 1.6))
    await dePe(encontro, rumo(encontro, jade), 'diante da Jade')
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Jade' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('KeyE')
    const conversa = page.getByRole('dialog', { name: 'Jade', exact: true })
    await conversa.getByText(APRESENTACAO_DA_JADE[0]).waitFor()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `vale-${tipo}-jade.png`) })
    await conversa.getByRole('button', { name: 'Continuar' }).click()
    await conversa.getByText(APRESENTACAO_DA_JADE[1]).waitFor()
    await conversa.getByRole('button', { name: 'Tchau, Jade' }).click()
    await conversa.waitFor({ state: 'detached' })
    console.log(`${tipo}: conversa abriu, avançou e fechou`)

    // O segundo degrau sustenta o corpo. O deslocamento de metade da meia largura evita
    // a Jade diante da escada; todas as medidas vêm do colisor existente no modelo.
    const degrau = lerColisores(modelo).find((c) => c.nome === 'col-degrau-observatorio-2')
    if (degrau?.forma !== 'caixa') throw new Error('Observatório sem o segundo degrau')
    const ponto = new Vector3(degrau.meio[0] / 2, degrau.meio[1], 0)
    const no = modelo.getObjectByName(degrau.nome)
    if (!no) throw new Error('Sem degrau no modelo')
    ponto.applyQuaternion(no.quaternion).add(no.position)
    const observatorio = mundo(ponto)
    await dePe(
      observatorio,
      rumo(observatorio, mundo(local('varanda'))),
      'nos degraus do observatório',
    )
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(prints, `vale-${tipo}-observatorio.png`) })

    // Afastar solta a ilha; voltar monta de novo e a Jade volta com a ilha.
    await levar({ x: 0, y: 1, z: 20 }, 0)
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ===
        0,
    )
    await dePe(encontro, rumo(encontro, jade), 'de volta, diante da Jade')
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Jade' }).waitFor()
    console.log(`${tipo}: saiu, soltou a ilha e voltou à Jade`)
    // A apresentação também abre depois de soltar o modelo, e Esc libera a câmera.
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('KeyE')
    await conversa.getByText(APRESENTACAO_DA_JADE[0]).waitFor()
    await page.keyboard.press('Escape')
    await conversa.waitFor({ state: 'detached' })
    if (celular && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      throw new Error('A interface ultrapassa a largura do celular')
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
