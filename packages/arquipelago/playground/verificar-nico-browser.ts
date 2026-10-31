/**
 * O Nico e o dino de estimação no playground (§6.28, A19 e A7). Só a plataforma falsa, sem banco.
 *
 * Um jogo com o Bosque e a Vila Doce visitados e o filhote do Vale nascido (Rex) acompanhando:
 * conversa com o Nico na praia (a apresentação de carteiro, o correio do dia com os pedidos da
 * Capi e do Bento e o pedido dele), depois se afasta e vê o Rex seguir junto, abre o cuidar dele
 * e o deixa no Vale. No computador e no celular.
 *
 * No Windows: `bun build playground/verificar-nico-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-nico-browser.mjs && node
 * .cache/verificar-nico-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  BIT_DA_ILHA,
  criarSalvamentoInicial,
  ilhasDoAnel,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { HABITANTES_DA_PRAIA } from '../src/sistemas/habitantes-da-praia'
import { APRESENTACAO_DO_NICO } from '../src/sistemas/nico'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/nico')
mkdirSync(prints, { recursive: true })
const nico = HABITANTES_DA_PRAIA.nico

function semente() {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: {
      ...s,
      casa: { portaNova: true },
      pontesVistas: ilhasDoAnel().map((i) => i.id),
      ilhasVisitadas: BIT_DA_ILHA['sua-ilha'] | BIT_DA_ILHA.bosque | BIT_DA_ILHA['vila-doce'],
      // Diante do Nico, que olha para o mar (giro π): a criança chega pelo lado da casa.
      posicao: { x: nico.x, y: 1.6, z: nico.z - 1.6 },
      companhia: 'filhote' as const,
      vale: {
        ...s.vale,
        filhote: {
          ovo: 3,
          aquecidoEm: null,
          nome: 'Rex',
          comeuEm: null,
          carinhoEm: null,
          dias: 1,
        },
      },
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
const usar = (page: Page, celular: boolean) =>
  celular
    ? page.getByRole('button', { name: 'Usar', exact: true }).click()
    : page.keyboard.press('KeyE')
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
      if (!sessionStorage.getItem('nico-semeado')) {
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('nico-semeado', '1')
      }
    }, JSON.stringify(semente()))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })

    // ── O Nico: apresentação, correio do dia e o pedido dele ───────────────────────────────
    await page
      .locator('.arq-acao')
      .filter({ hasText: 'Conversar com o Nico' })
      .waitFor({ timeout: 180_000 })
    await usar(page, celular)
    const conversa = page.getByRole('dialog', { name: 'Nico', exact: true })
    await conversa.getByText(APRESENTACAO_DO_NICO[0]).waitFor()
    await page.screenshot({ path: path.join(prints, `${nome}-1-nico.png`) })
    const vistas: string[] = []
    for (let i = 0; i < 10; i++) {
      if (await conversa.getByRole('button', { name: 'Tchau, Nico' }).isVisible()) break
      vistas.push(await conversa.locator('.arq-capi-fala').first().innerText())
      await conversa.getByRole('button', { name: 'Continuar' }).click()
    }
    const correio = vistas.find((f) => f.includes('correio'))
    if (correio !== 'No correio de hoje, pedidos da Capi e do Bento esperam por você.')
      throw Error(`Correio inesperado: ${JSON.stringify(vistas)}`)
    if (!vistas.some((f) => f.startsWith('Hoje eu preciso de uma coisa:')))
      throw Error(`Sem o pedido do Nico: ${JSON.stringify(vistas)}`)
    await page.screenshot({ path: path.join(prints, `${nome}-2-escolhas.png`) })
    await conversa.getByRole('button', { name: 'Tchau, Nico' }).click()
    await conversa.waitFor({ state: 'detached' })

    // ── O Rex acompanha: longe do Nico, o cuidar dele aparece e deixa no Vale ───────────────
    await page.evaluate(
      ({ x, z }) =>
        (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
          x,
          1.6,
          z,
          0,
        ),
      { x: nico.x - 6, z: nico.z - 4 },
    )
    await page
      .locator('.arq-acao')
      .filter({ hasText: 'Cuidar de Rex' })
      .waitFor({ timeout: 60_000 })
    await page.screenshot({ path: path.join(prints, `${nome}-3-rex-junto.png`) })
    await usar(page, celular)
    const deixar = page.getByRole('button', { name: 'Deixar Rex no Vale' })
    await deixar.click()
    await page.getByRole('button', { name: 'Levar Rex para casa' }).waitFor()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')?.salvamento
          ?.companhia === 'quarto',
    )
    await page.getByRole('button', { name: 'Voltar ao jogo' }).click()
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: Nico com correio e pedido; Rex acompanhou e voltou ao Vale`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
