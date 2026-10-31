/**
 * Enquanto você estava fora, no navegador (§6.28, A12, A14 e A20). Só usa a plataforma falsa.
 *
 * Um jogo salvo duas horas atrás, com o Quindim e a rotina "Quando amanhecer, Voar até a horta,
 * Para cada [Regar, Se maduro: Colher], Voar até a geladeira, Guardar tudo", uma semente sem água
 * no canteiro 1 e uma alface madura no canteiro 2. Ao abrir: o recado de que os Lumis fizeram a
 * rotina, a alface colhida e guardada na geladeira, a semente regada, o painel Rotina dizendo
 * "Enquanto você estava fora", o canteiro regado dizendo quanto falta no tempo de verdade e o
 * selo "Humor ótimo" na HUD. No computador e no celular.
 *
 * No Windows: `bun build playground/verificar-jogo-fechado-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-jogo-fechado-browser.mjs && node
 * .cache/verificar-jogo-fechado-browser.mjs`. Aceita `ARQUIPELAGO_CHROMIUM`,
 * `ARQUIPELAGO_TEST_PORT` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  type CartaoDaRotina,
  criarSalvamentoInicial,
  ilhasDoAnel,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'
import { obraDeExemplo, PROJETOS_DE_EXEMPLO } from '../src/plataforma/obra-de-exemplo'
import { CRESCIMENTO_MS } from '../src/sistemas/horta'
import { HUMOR_OTIMO } from '../src/sistemas/necessidades'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/jogo-fechado')
mkdirSync(prints, { recursive: true })
const executavel = process.env.ARQUIPELAGO_CHROMIUM
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

type Janela = typeof globalThis & {
  __arquipelagoDesenho?: { posicao: { x: number; y: number; z: number } }
  __arquipelagoLevar?: (x: number, y: number, z: number, giro: number) => void
}

const HORA = 60 * 60 * 1000
const ROTINA: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
  { c: 'voar-ate', a: 'geladeira' },
  { c: 'guardar' },
]

/** O jogo salvo duas horas atrás (começado há três), fora de casa, perto da horta. */
function jogoDeDuasHorasAtras() {
  const agora = Date.now()
  const s = criarSalvamentoInicial(new Date(agora - 3 * HORA))
  const c = posicaoDoCanteiro(0)
  const madura = new Date(agora - 3 * HORA - CRESCIMENTO_MS.alface).toISOString()
  return {
    revisao: 1,
    atualizadoEm: new Date(agora - 2 * HORA).toISOString(),
    salvamento: {
      ...s,
      casa: { portaNova: true },
      posicao: { x: c.x + 3, y: 1.6, z: c.z + 3 },
      necessidades: { fome: 90, energia: 90, diversao: 90 },
      // Com as pontes já vistas, o playground não regrava o salvamento com a hora de agora.
      pontesVistas: ilhasDoAnel().map((i) => i.id),
      // Com a latinha na mochila, a de graça não aparece no canto da horta (perto do canteiro 1).
      inventario: { ...s.inventario, 'isca-minhoca': 1 },
      lumis: { quindim: 1 },
      rotinas: { quindim: ROTINA },
      construcao: { ...s.construcao, casa: obraDeExemplo() },
      projetos: { ...PROJETOS_DE_EXEMPLO },
      horta: s.horta.map((h, i) =>
        i === 0
          ? { ...h, semente: 'alface', plantadoEm: new Date(agora - 3 * HORA).toISOString() }
          : i === 1
            ? { ...h, semente: 'alface', plantadoEm: madura, regadoEm: madura }
            : h,
      ),
    },
  }
}

type Guardado = {
  atualizadoEm: string
  salvamento: {
    horta: { semente: string | null; regadoEm: string | null }[]
    projetos: { geladeira?: { guardado: Record<string, number> } }
  }
}
async function guardado(pagina: Page): Promise<Guardado | null> {
  return pagina.evaluate(() => {
    const bruto = localStorage.getItem('arquipelago-playground')
    return bruto ? JSON.parse(bruto) : null
  })
}

const CASOS = [
  { nome: 'computador', largura: 1280, altura: 800, toque: false },
  { nome: 'celular', largura: 390, altura: 844, toque: true },
] as const

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const limite = Date.now() + 30_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('O playground encerrou antes de iniciar')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > limite) throw new Error('O playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const caso of CASOS) {
    const contexto = await browser.newContext({
      viewport: { width: caso.largura, height: caso.altura },
      hasTouch: caso.toque,
      isMobile: caso.toque,
    })
    const semente = jogoDeDuasHorasAtras()
    await contexto.addInitScript((semente) => {
      localStorage.setItem('arquipelago:medir', '1')
      if (!sessionStorage.getItem('fechado-semeado')) {
        localStorage.setItem('arquipelago-playground', semente)
        sessionStorage.setItem('fechado-semeado', '1')
      }
    }, JSON.stringify(semente))
    const pagina = await contexto.newPage()
    pagina.setDefaultTimeout(60_000)
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    // Sem `?lumis=`: ele regrava o salvamento com a hora de agora (o Quindim já vem na semente).
    await pagina.goto(`${base}/?cartas=todas`, { waitUntil: 'networkidle' })
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)

    // ── O recado e o resultado no salvamento ─────────────────────────────────────────────────
    await pagina
      .getByText(/Um Lumi (também )?fez a rotina/)
      .waitFor()
      .catch(async (erro: unknown) => {
        const g = await guardado(pagina)
        console.log('Diagnóstico:', {
          atualizadoEm: g?.atualizadoEm,
          horta: g?.salvamento.horta.slice(0, 2),
          recado: await pagina.locator('.arq-dica').allInnerTexts(),
          erros,
        })
        await pagina.screenshot({ path: path.join(prints, `${caso.nome}-falha.png`) })
        throw erro
      })
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-1-recado.png`) })
    await pagina.waitForFunction(
      () => {
        const bruto = localStorage.getItem('arquipelago-playground')
        const s = bruto ? JSON.parse(bruto).salvamento : null
        return s?.horta?.[1]?.semente === null && Boolean(s?.horta?.[0]?.regadoEm)
      },
      undefined,
      { timeout: 60_000 },
    )
    const g = await guardado(pagina)
    assert(g, 'nada guardado')
    const naGeladeira = g.salvamento.projetos.geladeira?.guardado.alface ?? 0
    // A geladeira de exemplo começa vazia.
    assert(
      naGeladeira > 0,
      `a alface não foi guardada: ${JSON.stringify(g.salvamento.projetos.geladeira)}`,
    )

    // ── O selo do humor ótimo ────────────────────────────────────────────────────────────────
    const selo = pagina.locator('.arq-humor-otimo')
    await selo.waitFor()
    assert.equal(await selo.getAttribute('title'), HUMOR_OTIMO.explicacao)
    const caixa = await selo.boundingBox()
    assert(caixa && caixa.x + caixa.width <= caso.largura, 'o selo do humor sai da tela')
    assert(
      await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'a HUD rola para o lado',
    )

    // ── O painel Rotina conta que foi com o jogo fechado ─────────────────────────────────────
    await pagina.getByRole('button', { name: 'Abrir o menu' }).click()
    await pagina.getByRole('button', { name: 'Caderno dos Lumis' }).click()
    await pagina.getByRole('button', { name: 'Montar a rotina de um Lumi' }).click()
    const painel = pagina.getByRole('dialog', { name: 'Rotina' })
    await painel.getByText('Enquanto você estava fora, a rotina foi até o fim').click()
    await painel.getByText(/Guardou \d+ na geladeira/).waitFor()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-2-painel.png`) })
    await painel.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await painel.waitFor({ state: 'hidden' })

    // ── O canteiro regado diz quanto falta, no tempo de verdade ─────────────────────────────
    const c = posicaoDoCanteiro(0)
    await pagina.evaluate(
      ({ x, z }) => (globalThis as Janela).__arquipelagoLevar?.(x, 1.6, z, Math.PI / 2),
      // Do lado de fora da horta: o canteiro 2, agora vazio, fica do outro lado.
      { x: c.x - 1.3, z: c.z - 0.4 },
    )
    await pagina.locator('.arq-acao').filter({ hasText: 'Ver quando colhe' }).waitFor()
    if (caso.toque) await pagina.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await pagina.keyboard.press('KeyE')
    await pagina
      .getByText(/A colheita sai daqui a .+, no tempo de verdade/)
      .waitFor()
      .catch(async (erro: unknown) => {
        console.log('Recado na tela:', await pagina.locator('.arq-dica').allInnerTexts())
        await pagina.screenshot({ path: path.join(prints, `${caso.nome}-falha-canteiro.png`) })
        throw erro
      })
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-3-quanto-falta.png`) })

    assert.deepEqual(erros, [])
    console.log(
      `PASS ${caso.nome}: rotina com o jogo fechado, alface guardada, painel, quanto falta e humor`,
    )
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
