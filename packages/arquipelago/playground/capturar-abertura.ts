/**
 * As imagens da abertura "O Cinza" tiradas do jogo de verdade (pedido dela, 29/10/2026: "prints
 * reais do jogo"). Executar no pacote:
 * bun build playground/capturar-abertura.ts --target=node --external playwright-core --outfile .cache/capturar-abertura.mjs
 * node .cache/capturar-abertura.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta (padrão: a dos PNG crus no
 * scratch, que depois viram WebP em `src/assets/abertura/`); ARQUIPELAGO_SO roda só as cenas
 * listadas (ids separados por vírgula).
 *
 * Cada cena abre o playground com o que a história pede (posição na jornada, hora do dia, clima),
 * põe a câmera parada pelo `__arquipelagoPalco` do medidor (`mundo/palco-de-print.tsx`) e fotografa
 * só o canvas, sem a HUD.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import type { CenaDePrint } from '../src/mundo/palco-de-print'

type V3 = [number, number, number]
interface PecaNaCena {
  url: string
  em: V3
  giro?: number
  escala?: number
  clipe?: string
}
interface Tomada {
  id: string
  /** Parâmetros do playground (sem o `?`). */
  url: string
  palco: CenaDePrint
  pecas?: PecaNaCena[]
  /** Antes do palco (escolher clima, entrar no Farol). */
  preparar?: (page: Page) => Promise<void>
  /** Quanto esperar o mundo assentar depois do palco (ms de relógio). */
  espera?: number
}

const ESCONDER_TODOS = ['avatar-visual', 'zappy-3d']
/** De cima, a mesma vista colorida (Lenda) e cinza (começo), para a história ver a diferença. */
const DE_CIMA: CenaDePrint = {
  posicao: [34, 70, 118],
  alvo: [0, 0, 6],
  campo: 48,
  esconder: ESCONDER_TODOS,
  semNevoa: true,
}
/** A sala do alto do Farol fica 40 m acima do Farol (`ALTO_DO_FAROL`), em (-12, 40, -13). */
const SALA: V3 = [-12, 40, -13]
const naSala = (x: number, y: number, z: number): V3 => [SALA[0] + x, SALA[1] + y, SALA[2] + z]

async function subirOFarol(page: Page) {
  await page.locator('canvas').first().click()
  await page.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
  await page.keyboard.press('KeyE')
  await page.waitForFunction(() => {
    const d = (
      globalThis as {
        __arquipelagoDesenho?: { posicao: { y: number }; finalDoFarol: { etapa: string } }
      }
    ).__arquipelagoDesenho
    return d && d.finalDoFarol.etapa === 'sala' && d.posicao.y > 40
  })
  await page.locator('.arq-corte').waitFor({ state: 'detached' })
}

async function chuva(page: Page) {
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  const secao = page.getByRole('region', { name: 'Clima da sua ilha' })
  await secao.getByRole('button', { name: 'Chuva' }).click()
  await secao.getByRole('button', { name: 'Chuva', pressed: true }).waitFor()
  await page.keyboard.press('Escape')
}

export const TOMADAS: Tomada[] = [
  {
    id: 'arquipelago',
    url: 'novo=1&persistir=0&posicao=8&quadros=feitos&adiantar=3&em=6,18',
    palco: DE_CIMA,
    espera: 25_000,
  },
  {
    id: 'iris',
    url: 'novo=1&persistir=0&posicao=8&adiantar=3&em=-9.2,-10.9',
    preparar: subirOFarol,
    pecas: [
      {
        url: '/modelos/personagens/iris.glb',
        em: naSala(-0.95, 0, -2.15),
        giro: 2.6,
        clipe: 'parado',
      },
    ],
    palco: {
      posicao: naSala(3.0, 2.0, -1.8),
      alvo: naSala(-0.9, 0.95, -2.45),
      campo: 50,
      esconder: ESCONDER_TODOS,
    },
    espera: 15_000,
  },
  {
    id: 'sumiu',
    url: 'novo=1&persistir=0&posicao=8&adiantar=3&em=-9.2,-10.9',
    preparar: subirOFarol,
    palco: {
      posicao: naSala(3.0, 2.0, -1.8),
      alvo: naSala(-0.9, 0.95, -2.45),
      campo: 50,
      esconder: ESCONDER_TODOS,
    },
    espera: 15_000,
  },
  {
    id: 'cinza',
    url: 'novo=1&persistir=0&posicao=1&adiantar=3&em=6,18',
    palco: DE_CIMA,
    espera: 25_000,
  },
  {
    id: 'tempestade',
    url: 'novo=1&persistir=0&posicao=8&adiantar=13&em=-4.6,33.6,0.7',
    preparar: chuva,
    palco: {
      posicao: [7, 2.4, 43],
      alvo: [-2.4, 1, 33.6],
      campo: 50,
      esconder: ESCONDER_TODOS,
    },
    espera: 20_000,
  },
  {
    id: 'carta',
    url: 'novo=1&persistir=0&posicao=8&adiantar=1&em=-4.6,31,0.7',
    pecas: [
      { url: '/modelos/itens/carta.glb', em: [-4.35, 0.62, 33.2], giro: 0.4 },
      { url: '/modelos/itens/chave.glb', em: [-4.02, 0.62, 33.05], giro: -0.9 },
    ],
    palco: {
      posicao: [-3.7, 1.0, 33.85],
      alvo: [-4.2, 0.62, 33.15],
      campo: 36,
      esconder: ESCONDER_TODOS,
    },
    espera: 15_000,
  },
  {
    id: 'casa',
    url: 'novo=1&persistir=0&posicao=1&adiantar=13&em=6,18',
    palco: {
      posicao: [9, 5.5, 17],
      alvo: [-3, 3, -5],
      campo: 55,
      esconder: ESCONDER_TODOS,
    },
    espera: 20_000,
  },
  {
    id: 'zappy',
    url: 'novo=1&persistir=0&posicao=1&adiantar=3',
    palco: {
      posicao: [2.6, 0, -0.7],
      alvo: [0, 2, -4],
      campo: 50,
      // O Farol de fora aparecia por cima da parede do quarto (o quarto não tem teto).
      esconder: ['avatar-visual', 'farol', 'vidro', 'lampada', 'facho', 'porta'],
      olharPara: { no: 'zappy-3d', altura: 0 },
      alturaDoAlvo: true,
      virarParaCamera: ['zappy-3d'],
    },
    espera: 15_000,
  },
]

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
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/abertura-crua')
mkdirSync(prints, { recursive: true })
const so = (process.env.ARQUIPELAGO_SO ?? '').split(',').filter(Boolean)

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
  const prazo = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > prazo) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const t of TOMADAS.filter((t) => !so.length || so.includes(t.id))) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    })
    context.setDefaultTimeout(180_000)
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:camera-dica', '1')
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'completa' }))
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => console.error(t.id, 'pageerror', e.message))
    await page.goto(`${baseURL}/?${t.url}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        typeof (globalThis as { __arquipelagoPalco?: unknown }).__arquipelagoPalco === 'function',
    )
    await t.preparar?.(page)
    for (const p of t.pecas ?? [])
      await page.evaluate(
        (p) =>
          (
            globalThis as { __arquipelagoPorNaCena?: (...a: unknown[]) => Promise<void> }
          ).__arquipelagoPorNaCena?.(p.url, ...p.em, p.giro ?? 0, p.escala ?? 1, p.clipe),
        p,
      )
    await page.evaluate(
      (c) =>
        (globalThis as { __arquipelagoPalco?: (c: CenaDePrint) => void }).__arquipelagoPalco?.(c),
      t.palco,
    )
    // Só o mundo no print: a HUD e os painéis somem.
    await page.addStyleTag({
      content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}',
    })
    await page.waitForTimeout(t.espera ?? 12_000)
    await page
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(prints, `${t.id}.png`) })
    console.log('cena', t.id)
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
