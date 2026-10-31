/**
 * Os segredos dos outros movimentos (B11, 31/10/2026) no playground, com a plataforma falsa e sem
 * banco. Em cada lugar, levado direto pelo `__arquipelagoLevar`:
 * - no deque do cipó da sua ilha, no terraço da montaria do Vale, do outro lado do vão dos patins no
 *   Bosque e na nuvem do balão: "Abrir o baú" abre e a página entra no salvamento;
 * - na cinza quente do Vale, a pé: o corpo é empurrado para fora da área;
 * - na ponta do píer, com o Recife visitado: "Mergulhar na gruta" aparece.
 * No computador e no celular.
 *
 * No Windows: `bun build playground/verificar-segredos-dos-movimentos-browser.ts --target=node
 * --external playwright-core --outfile .cache/verificar-segredos-dos-movimentos-browser.mjs && node
 * .cache/verificar-segredos-dos-movimentos-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e
 * `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { BIT_DA_ILHA, criarSalvamentoInicial, ilha } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ALTURA_DAS_NUVENS, giroDaIlha, ilhasEmVolta, PIER } from '../src/mundo/medidas'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/segredos-dos-movimentos')
mkdirSync(prints, { recursive: true })
type P = { x: number; y: number; z: number }

async function glb(arquivo: string): Promise<Object3D> {
  const b = readFileSync(path.resolve('src', 'assets', arquivo))
  return (
    await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
  ).scene
}
async function naIlha(
  id: 'bosque' | 'vale-dos-dinos' | 'nuvens',
  nome: string,
  y0 = 0,
): Promise<P> {
  const noAnel = ilhasEmVolta().find((i) => i.ilha.id === id)
  if (!noAnel) throw new Error(`sem ${id}`)
  const o = (await glb(`ilhas/${id}.glb`)).getObjectByName(nome)
  if (!o) throw new Error(`sem ${nome}`)
  const g = giroDaIlha(ilha(id))
  const { x, y, z } = o.position
  return {
    x: noAnel.centro.x + x * Math.cos(g) + z * Math.sin(g),
    y: y + y0,
    z: noAnel.centro.z - x * Math.sin(g) + z * Math.cos(g),
  }
}
async function naSuaIlha(arquivo: string, nome: string, base = { x: 0, z: 0 }): Promise<P> {
  const o = (await glb(`mundo/${arquivo}`)).getObjectByName(nome)
  if (!o) throw new Error(`sem ${nome}`)
  return { x: base.x + o.position.x, y: o.position.y, z: base.z + o.position.z }
}

const todasAsIlhas = Object.values(BIT_DA_ILHA).reduce((a, b) => a | b, 0)
function semente() {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: { ...s, ilhasVisitadas: todasAsIlhas, casa: { portaNova: true } },
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
const levar = (page: Page, p: P) =>
  page.evaluate(
    ({ x, y, z }) =>
      (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
        x,
        y,
        z,
        0,
      ),
    { x: p.x, y: p.y + 1.2, z: p.z },
  )
const posicao = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as { __arquipelagoDesenho?: { posicao?: P } }).__arquipelagoDesenho?.posicao ??
      null,
  )
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
  const baus = [
    { id: 'cipo', bit: 16, onde: await naSuaIlha('segredos-da-ilha.glb', 'segredo-cipo') },
    { id: 'patins', bit: 32, onde: await naIlha('bosque', 'segredo-patins') },
    { id: 'montaria', bit: 128, onde: await naIlha('vale-dos-dinos', 'segredo-montaria') },
    { id: 'balao', bit: 256, onde: await naIlha('nuvens', 'segredo-balao', ALTURA_DAS_NUVENS) },
  ]
  const cinza = await naIlha('vale-dos-dinos', 'cinza-quente-area')
  const gruta = await naSuaIlha('pier.glb', 'mergulho-gruta', PIER)
  for (const celular of [false, true]) {
    const tela = celular ? 'celular' : 'computador'
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
      if (!sessionStorage.getItem('semeado')) {
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('semeado', '1')
      }
    }, JSON.stringify(semente()))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })
    // Começa em casa: as ilhas completas carregam quando a criança chega perto de cada uma.
    await page
      .getByRole('button', { name: 'Abrir o menu', exact: true })
      .waitFor({ timeout: 240_000 })
    await page.waitForFunction(
      () =>
        typeof (globalThis as { __arquipelagoLevar?: unknown }).__arquipelagoLevar === 'function',
      undefined,
      { timeout: 120_000 },
    )
    await page.waitForTimeout(2000)
    const acao = page.locator('.arq-acao')
    const esperar = async (texto: string, nome: string, timeout = 60_000) => {
      try {
        await acao.filter({ hasText: texto }).waitFor({ timeout })
      } catch (e) {
        await page.screenshot({ path: path.join(prints, `${tela}-falhou-${nome}.png`) })
        const acoes = await acao.allInnerTexts()
        throw Error(
          `${nome}: sem "${texto}" (ações: ${acoes.join(' | ')}; em ${JSON.stringify(await posicao(page))})`,
          { cause: e },
        )
      }
    }
    const usar = () =>
      celular
        ? page.getByRole('button', { name: 'Usar', exact: true }).click()
        : page.keyboard.press('KeyE')
    // A ponta do píer: com o Recife visitado, dá para mergulhar na gruta.
    await levar(page, { x: gruta.x + 0.8, y: 0.55, z: gruta.z })
    await esperar('Mergulhar na gruta', 'gruta')
    await page.screenshot({ path: path.join(prints, `${tela}-gruta.png`) })
    for (const b of baus) {
      // A ilha completa carrega na chegada (no computador do teste, devagar). O baú da nuvem do
      // balão fica a 14 m do chão das Nuvens: levado antes de o colisor da nuvem chegar, o corpo
      // cai (o "Abrir o baú" aparece por um instante no caminho). Levar de novo até o corpo ficar
      // no lugar do baú.
      for (let tentativa = 1; ; tentativa++) {
        await levar(page, b.onde)
        await page.waitForTimeout(1200)
        await esperar('Abrir o baú', b.id, 240_000)
        await page.waitForTimeout(3000)
        const p = await posicao(page)
        // Caído, o corpo fica bem abaixo do baú (na nuvem do balão, 14 m).
        const noLugar = p && p.y > b.onde.y - 1
        const aindaOferece = (await acao.filter({ hasText: 'Abrir o baú' }).count()) > 0
        if (noLugar && aindaOferece) break
        if (tentativa >= 6)
          throw Error(`${b.id}: o corpo não ficou no baú (em ${JSON.stringify(p)})`)
        await page.waitForTimeout(15_000)
      }
      await page.screenshot({ path: path.join(prints, `${tela}-${b.id}.png`) })
      await usar()
      await page.waitForFunction((bit) => {
        const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
        return ((s?.salvamento?.segredos ?? 0) & bit) !== 0
      }, b.bit)
      console.log(`${tela}: baú ${b.id} aberto`)
      if (b.id === 'montaria') {
        // Com o Vale ativo, a cinza quente empurra quem vai a pé.
        await levar(page, cinza)
        // O medidor lê a posição de tempos em tempos: comparar com folga.
        await page.waitForTimeout(1200)
        const antes = cinza
        await page.waitForTimeout(4000)
        const depois = await posicao(page)
        if (!antes || !depois) throw Error('sem a posição')
        const andou = Math.hypot(depois.x - antes.x, depois.z - antes.z)
        if (andou < 1) throw Error(`a cinza não empurrou (${andou.toFixed(2)} m)`)
        await page.screenshot({ path: path.join(prints, `${tela}-cinza.png`) })
        // Os Lumis de luz (B8): o baú da montaria dá o Brotinho de Luz. Ter aberto o baú é ter o
        // Lumi, e o álbum mostra ele na seção própria.
        await page.getByRole('button', { name: 'Abrir o menu', exact: true }).click()
        await page
          .getByRole('dialog', { name: 'Menu do jogo' })
          .getByRole('button', { name: 'Álbum de coleções' })
          .click()
        const deLuz = page.locator('section[aria-labelledby="arq-album-lumis-de-luz"]')
        await deLuz.scrollIntoViewIfNeeded()
        if ((await deLuz.getByText('Brotinho de Luz', { exact: true }).count()) !== 1) {
          await page.screenshot({ path: path.join(prints, `${tela}-falhou-album.png`) })
          throw Error('o álbum não mostra o Brotinho de Luz')
        }
        await page.screenshot({ path: path.join(prints, `${tela}-album-lumis-de-luz.png`) })
        console.log(`${tela}: o álbum mostra o Brotinho de Luz`)
        await page.getByRole('button', { name: 'Voltar ao jogo' }).first().click()
        await page.waitForTimeout(1500)
      }
    }
    if (erros.length) throw Error(erros.join('\n'))
    console.log(
      `PASS ${tela}: os quatro baús abrem, a gruta oferece o mergulho, a cinza empurra e o álbum mostra o Lumi de luz`,
    )
    await context.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
