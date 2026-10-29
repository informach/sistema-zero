/**
 * A rotina dos Lumis no navegador (fase2-07). Só usa a plataforma falsa, sem banco.
 *
 * Com o Quindim preso (`?lumis=quindim:1`) e todos os cartões (`?cartas=todas`), num jogo com uma
 * semente de alface sem água no primeiro canteiro: abre o painel "Rotina" pelo caderno, monta
 * "Quando amanhecer, Voar até a horta, Para cada [Regar]", confere o motivo de uma rotina que
 * pararia no meio (Guardar tudo sem estar na geladeira), guarda, testa e espera o Lumi regar.
 * Confere a horta regada no salvamento, a última vez no painel e, no celular, que o painel não
 * rola para o lado e o aviso do Lumi não cobre o direcional.
 *
 * No Windows: `bun build playground/verificar-rotina-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-rotina-browser.mjs && node .cache/verificar-rotina-browser.mjs`.
 * Aceita `ARQUIPELAGO_CHROMIUM`, `ARQUIPELAGO_TEST_PORT` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4598)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/rotina')
mkdirSync(prints, { recursive: true })
const chromiumLinux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel =
  process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(chromiumLinux) ? chromiumLinux : undefined)
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

type Medida = {
  posicao: { x: number; y: number; z: number }
  lumiDaRotina: { lumi: string; x: number; y: number; z: number } | null
}
type Janela = typeof globalThis & { __arquipelagoDesenho?: Medida }

/** Um jogo fora de casa, perto da horta, com uma semente de alface sem água no primeiro canteiro. */
function jogoComSemente() {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  const c = posicaoDoCanteiro(0)
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: {
      ...s,
      casa: { portaNova: true },
      posicao: { x: c.x + 3, y: 1.6, z: c.z + 3 },
      horta: s.horta.map((h, i) =>
        i === 0 ? { ...h, semente: 'alface', plantadoEm: agora.toISOString() } : h,
      ),
    },
  }
}

/** O salvamento que o jogo guardou no playground (`persistir`). */
async function guardado(pagina: Page) {
  return pagina.evaluate(() => {
    const bruto = localStorage.getItem('arquipelago-playground')
    return bruto
      ? (
          JSON.parse(bruto) as {
            salvamento: {
              horta: { regadoEm: string | null }[]
              rotinas: Record<string, { c: string }[]>
            }
          }
        ).salvamento
      : null
  })
}

async function abrirPainel(pagina: Page) {
  await pagina.getByRole('button', { name: 'Abrir o menu' }).click()
  await pagina.getByRole('button', { name: '📒 Caderno dos Lumis' }).click()
  await pagina.getByRole('button', { name: 'Montar a rotina de um Lumi' }).click()
  const painel = pagina.getByRole('dialog', { name: 'Rotina' })
  await painel.waitFor()
  // Os cartões chegam pelo serviço (`GET /cartas`), como no caderno.
  await painel.getByRole('button', { name: 'Voar até', exact: true }).waitFor()
  return painel
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
  })
  for (const caso of CASOS) {
    const contexto = await browser.newContext({
      viewport: { width: caso.largura, height: caso.altura },
      hasTouch: caso.toque,
      isMobile: caso.toque,
    })
    const semente = JSON.stringify(jogoComSemente())
    await contexto.addInitScript((semente) => {
      localStorage.setItem('arquipelago:medir', '1')
      // Só na primeira carga: recarregar a página continua o mesmo jogo.
      if (!sessionStorage.getItem('rotina-semeada')) {
        localStorage.setItem('arquipelago-playground', semente)
        sessionStorage.setItem('rotina-semeada', '1')
      }
    }, semente)
    const pagina = await contexto.newPage()
    pagina.setDefaultTimeout(60_000)
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    await pagina.goto(`${base}/?lumis=quindim:1&cartas=todas`, { waitUntil: 'networkidle' })
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)
    await pagina.waitForTimeout(1500)

    // ── Montar a rotina ──────────────────────────────────────────────────────────────────────
    const painel = await abrirPainel(pagina)
    assert.equal(
      await painel.getByRole('button', { name: /Quindim/, pressed: true }).count(),
      1,
      'o Quindim não veio escolhido',
    )
    await painel.getByRole('button', { name: 'Voar até', exact: true }).click()
    await painel.getByRole('button', { name: 'Para cada', exact: true }).click()
    await painel.getByText('Ponha pelo menos um cartão dentro do Para cada.').waitFor()
    await painel.getByRole('button', { name: 'Pôr cartões aqui: dentro do Para cada' }).click()
    await painel.getByRole('button', { name: 'Regar', exact: true }).click()
    await painel.getByText('Pronta para testar.').waitFor()
    const larguras = await painel.evaluate((el) => ({ rola: el.scrollWidth, cabe: el.clientWidth }))
    assert(
      larguras.rola <= larguras.cabe + 1,
      `o painel rola para o lado: ${JSON.stringify(larguras)}`,
    )
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-1-rotina-montada.png`) })

    // Uma rotina que pararia no meio mostra o motivo, sem o Lumi sair (e sem castigo).
    await painel
      .getByRole('button', { name: 'Os cartões novos entram aqui: dentro do Para cada' })
      .click()
    await painel.getByRole('button', { name: 'Guardar tudo', exact: true }).click()
    await painel.getByRole('button', { name: 'Testar' }).click()
    await painel
      .getByText(
        'No teste, a rotina pararia: Para guardar tudo, o Lumi precisa estar na geladeira. Ponha um Voar até a geladeira antes.',
      )
      .waitFor()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-2-motivo.png`) })
    await painel.getByRole('button', { name: 'Tirar Guardar tudo' }).click()

    // Guardar e testar.
    await painel.getByRole('button', { name: 'Guardar', exact: true }).click()
    await painel.getByText('Rotina guardada. O Lumi faz sozinho quando o dia nascer.').waitFor()
    await painel.getByRole('button', { name: 'Testar' }).click()
    await painel.waitFor({ state: 'hidden' })

    // ── O Lumi no mundo ──────────────────────────────────────────────────────────────────────
    const aviso = pagina.locator('.arq-rotina-andando')
    await aviso.waitFor()
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.lumiDaRotina)
    const r = await aviso.boundingBox()
    assert(r)
    const naZona = r.x < caso.largura / 2 && r.y + r.height > caso.altura * 0.45
    assert(!naZona, `o aviso do Lumi cobre o direcional: ${JSON.stringify(r)}`)
    for (const outro of ['.arq-topo-dir', '.arq-necessidades', '.arq-modos']) {
      const o = await pagina.locator(outro).boundingBox()
      if (!o) continue
      const cruza =
        r.x < o.x + o.width && o.x < r.x + r.width && r.y < o.y + o.height && o.y < r.y + r.height
      assert(!cruza, `o aviso do Lumi cobre ${outro}: ${JSON.stringify({ r, o })}`)
    }
    await pagina.locator('.arq-rotina-andando').filter({ hasText: 'regando o canteiro' }).waitFor({
      timeout: 300_000,
    })
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-3-lumi-regando.png`) })
    await aviso.waitFor({ state: 'hidden', timeout: 600_000 })
    // A horta regada no salvamento (o jogo grava logo depois de mudar).
    await pagina.waitForFunction(
      () => {
        const bruto = localStorage.getItem('arquipelago-playground')
        const s = bruto ? JSON.parse(bruto).salvamento : null
        return Boolean(s?.horta?.[0]?.regadoEm)
      },
      undefined,
      { timeout: 60_000 },
    )
    const s = await guardado(pagina)
    assert(s?.horta[0]?.regadoEm, 'o primeiro canteiro não foi regado')
    assert.deepEqual(
      s?.rotinas.quindim?.map((c) => c.c),
      ['quando-amanhecer', 'voar-ate', 'para-cada'],
    )

    // A última vez fica no painel.
    const depois = await abrirPainel(pagina)
    await depois.getByText('Da última vez, a rotina foi até o fim').click()
    await depois.getByText('Regou o canteiro 1.').waitFor()
    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-4-ultima-vez.png`) })
    await depois.getByRole('button', { name: 'Voltar ao jogo' }).click()
    assert.deepEqual(erros, [])
    console.log(`PASS ${caso.nome}: rotina montada, motivo sem castigo, Lumi regou o canteiro 1`)
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
