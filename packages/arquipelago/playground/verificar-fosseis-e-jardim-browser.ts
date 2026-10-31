/**
 * Os fósseis do museu (B4) e o jardim do céu (B6), 31/10/2026, no playground com a plataforma falsa,
 * sem banco. No Vale, com o primeiro osso feito e o museu ganho há dois dias, a escavação oferece
 * o fóssil novo e ele vai para o museu. Nas Nuvens, o canteiro vazio abre a escolha da planta e
 * planta; o canteiro com a flor aberta colhe e a flor vai para a florada da sua ilha. No computador
 * e no celular.
 *
 * No Windows: `bun build playground/verificar-fosseis-e-jardim-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-fosseis-e-jardim-browser.mjs && node
 * .cache/verificar-fosseis-e-jardim-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS`.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  CRESCIMENTO_DO_CEU_MS,
  criarSalvamentoInicial,
  ilha,
  minutoDoCeu,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ALTURA_DAS_NUVENS, giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'

const port = await new Promise<number>((resolve, reject) => {
  const s = createServer().once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const a = s.address()
    if (!a || typeof a === 'string') return reject(Error('Sem porta local'))
    s.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/fosseis-e-jardim')
mkdirSync(prints, { recursive: true })
type P = { x: number; y: number; z: number }
const DIA = 24 * 60 * 60 * 1000

/** Uma âncora do GLB da ilha no mundo (o centro dela, girada como no jogo, e a altura do grupo). */
async function ancoras(id: 'vale-dos-dinos' | 'nuvens', nomes: string[], alturaDoGrupo = 0) {
  const noAnel = ilhasEmVolta().find((i) => i.ilha.id === id)
  if (!noAnel) throw new Error(`Sem ${id} no anel.`)
  const glb = readFileSync(path.resolve('src', 'assets', 'ilhas', `${id}.glb`))
  const modelo = (
    await new GLTFLoader().parseAsync(
      glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
      '',
    )
  ).scene
  const giro = giroDaIlha(ilha(id))
  return nomes.map((nome): P => {
    const o = modelo.getObjectByName(nome)
    if (!o) throw new Error(`sem ${nome} em ${id}`)
    const { x, y, z } = o.position
    return {
      x: noAnel.centro.x + x * Math.cos(giro) + z * Math.sin(giro),
      y: y + alturaDoGrupo,
      z: noAnel.centro.z - x * Math.sin(giro) + z * Math.cos(giro),
    }
  })
}

function semente(onde: P, mudar: (s: ReturnType<typeof criarSalvamentoInicial>) => object) {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: { ...mudar(s), posicao: { x: onde.x + 0.9, y: onde.y + 1.2, z: onde.z } },
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
const levar = (page: Page, p: P) =>
  page.evaluate(
    ({ x, y, z }) =>
      (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
        x,
        y,
        z,
        0,
      ),
    { x: p.x + 0.9, y: p.y + 1.2, z: p.z },
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
  const [escavacao] = await ancoras('vale-dos-dinos', ['escavacao'])
  const [canteiro1, canteiro2] = await ancoras(
    'nuvens',
    ['canteiro-ceu-1', 'canteiro-ceu-2'],
    ALTURA_DAS_NUVENS,
  )
  if (!escavacao || !canteiro1 || !canteiro2) throw new Error('sem as âncoras')
  const doisDiasAtras = new Date(Date.now() - 2 * DIA).toISOString()
  const florAberta = minutoDoCeu(Date.now() - CRESCIMENTO_DO_CEU_MS['flor-de-nuvem'] - 60_000)
  const cenarios = [
    {
      nome: 'vale',
      salvo: semente(escavacao, (s) => ({
        ...s,
        vale: { ...s.vale, pegadas: true, escavacao: 3 },
        projetos: { museu: { ganhoEm: doisDiasAtras, aparencia: null, aparencias: [] } },
      })),
      onde: escavacao,
    },
    {
      nome: 'nuvens',
      salvo: semente(canteiro2, (s) => ({ ...s, ceu: [[1, 0, florAberta]] })),
      onde: canteiro2,
    },
  ] as const
  for (const celular of [false, true]) {
    const tela = celular ? 'celular' : 'computador'
    for (const c of cenarios) {
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
      }, JSON.stringify(c.salvo))
      const page = await context.newPage()
      const erros: string[] = []
      page.on('pageerror', (e) => erros.push(e.message))
      await page.goto(`${baseURL}/?posicao=8&qualidade=leve`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () =>
          ((globalThis as { __arquipelagoDesenho?: { ilhasCompletas: number } })
            .__arquipelagoDesenho?.ilhasCompletas ?? 0) > 0,
        undefined,
        { timeout: 240_000 },
      )
      await levar(page, c.onde)
      const acao = page.locator('.arq-acao')
      if (c.nome === 'vale') {
        await acao.filter({ hasText: 'Escavar o fóssil novo' }).waitFor()
        await page.screenshot({ path: path.join(prints, `${tela}-vale-1-areia.png`) })
        await usar(page, celular)
        await page.getByText('Você achou: Dente de dinossauro.', { exact: false }).waitFor()
        // Dois dias depois do museu, a areia ainda guarda o segundo e o terceiro.
        await acao.filter({ hasText: 'Escavar o fóssil novo' }).waitFor()
        await page.screenshot({ path: path.join(prints, `${tela}-vale-2-achou.png`) })
        await page.waitForFunction(() => {
          const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
          return s?.salvamento?.vale?.fosseis === 1
        })
      } else {
        await acao.filter({ hasText: 'Plantar no canteiro do céu' }).waitFor()
        await usar(page, celular)
        const painel = page.getByRole('dialog', { name: 'Jardim do céu', exact: true })
        await painel.waitFor()
        await page.screenshot({ path: path.join(prints, `${tela}-nuvens-1-escolher.png`) })
        await painel.getByRole('button', { name: /Estrela trepadeira/ }).click()
        await page.getByText('Plantado: estrela trepadeira.', { exact: false }).waitFor()
        await levar(page, canteiro1)
        await acao.filter({ hasText: 'Colher flor de nuvem' }).waitFor()
        await usar(page, celular)
        await page.getByText('A flor foi para a sua ilha.', { exact: false }).waitFor()
        await page.screenshot({ path: path.join(prints, `${tela}-nuvens-2-colheu.png`) })
        await page.waitForFunction(() => {
          const s = JSON.parse(localStorage.getItem('arquipelago-playground') ?? 'null')
          return s?.salvamento?.florada === 1 && s.salvamento.ceu.length === 1
        })
      }
      if (erros.length) throw Error(erros.join('\n'))
      console.log(`PASS ${tela} ${c.nome}`)
      await context.close()
    }
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (server.exitCode === null) server.kill()
}
