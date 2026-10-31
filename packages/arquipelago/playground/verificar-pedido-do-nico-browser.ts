/**
 * O pedido do Nico no Estúdio no playground (§6.28, A23). Só a plataforma falsa, sem banco.
 *
 * Conversa com o Nico na praia: depois das falas, o cartão "Pedido no Estúdio" mostra "A placa da
 * noite" pronto para fazer; "Fazer no Estúdio" abre o desafio (a plataforma falsa resolve na hora)
 * e o cartão passa a dizer que a placa acende à noite. A placa do pedido fica ao lado do Nico. No
 * computador e no celular.
 *
 * No Windows: `bun build playground/verificar-pedido-do-nico-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-pedido-do-nico-browser.mjs && node
 * .cache/verificar-pedido-do-nico-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
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
import { TEXTOS_DO_PEDIDO_DO_ESTUDIO } from '../src/sistemas/pedido-do-estudio'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/pedido-do-nico')
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
      if (!sessionStorage.getItem('pedido-semeado')) {
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('pedido-semeado', '1')
      }
    }, JSON.stringify(semente()))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })

    await page
      .locator('.arq-acao')
      .filter({ hasText: 'Conversar com o Nico' })
      .waitFor({ timeout: 180_000 })
    await usar(page, celular)
    const conversa = page.getByRole('dialog', { name: 'Nico', exact: true })
    for (let i = 0; i < 10; i++) {
      if (await conversa.getByRole('button', { name: 'Tchau, Nico' }).isVisible()) break
      await conversa.getByRole('button', { name: 'Continuar' }).click()
    }
    await conversa.getByText(TEXTOS_DO_PEDIDO_DO_ESTUDIO.titulo).waitFor()
    await conversa.getByText('A placa da noite').waitFor()
    await conversa.getByText(TEXTOS_DO_PEDIDO_DO_ESTUDIO.pronto).waitFor()
    await page.screenshot({ path: path.join(prints, `${nome}-1-pedido.png`) })
    await conversa.getByRole('button', { name: TEXTOS_DO_PEDIDO_DO_ESTUDIO.fazer }).click()
    await conversa.getByText(TEXTOS_DO_PEDIDO_DO_ESTUDIO.feito).waitFor()
    await conversa.getByRole('button', { name: TEXTOS_DO_PEDIDO_DO_ESTUDIO.refazer }).waitFor()
    await page.screenshot({ path: path.join(prints, `${nome}-2-feito.png`) })
    await conversa.getByRole('button', { name: 'Tchau, Nico' }).click()
    await conversa.waitFor({ state: 'detached' })
    await page.screenshot({ path: path.join(prints, `${nome}-3-placa.png`) })
    if (erros.length) throw Error(erros.join('\n'))
    console.log(`PASS ${nome}: o pedido do Nico abre no Estúdio e a placa fica pronta para acender`)
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
