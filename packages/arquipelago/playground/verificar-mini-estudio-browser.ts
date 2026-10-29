/** Mini estúdio real sobre o jogo local, com arrasto de bloco, prévia, gravação e execução. */

import assert from 'node:assert/strict'

import { spawn } from 'node:child_process'

import { existsSync, mkdirSync } from 'node:fs'

import path from 'node:path'

import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'

import { chromium, type Page } from 'playwright-core'

import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4607)

const base = `http://127.0.0.1:${porta}`

const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-mini-estudio-lumis')

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

  for (const caso of CASOS) {
    // Libera também o processo de GPU entre os tamanhos de tela.

    browser = await chromium.launch({
      ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),

      headless: true,

      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })

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

    await pagina.goto(`${base}/?lumis=quindim:1&cartas=todas&rotina=editor&qualidade=leve`, {
      waitUntil: 'networkidle',
    })

    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)

    await pagina.waitForTimeout(1500)

    const painel = await abrirPainel(pagina)

    await painel.getByRole('button', { name: 'Voar até', exact: true }).click()

    await painel.getByRole('button', { name: 'Montar com blocos', exact: true }).click()

    const editor = pagina.getByRole('dialog', { name: 'Rotina do Lumi', exact: true })

    await editor.waitFor()

    const tema = await editor.evaluate((el) => {
      const estilo = getComputedStyle(el)

      const workspace = el.querySelector('.blocklyMainBackground')

      return {
        fundo: estilo.backgroundColor,

        texto: estilo.color,

        workspace: workspace ? getComputedStyle(workspace).fill : null,
        area: getComputedStyle(el.querySelector('.blocklySvg') ?? el).backgroundColor,
        caixa: getComputedStyle(el.querySelector('.blocklyToolbox') ?? el).backgroundColor,

        fonte: estilo.fontFamily,
      }
    })

    console.log(`${caso.nome} tema: ${JSON.stringify(tema)}`)
    assert.notEqual(tema.fundo, tema.texto, 'tema sem contraste')
    assert.equal(tema.area, tema.fundo, 'Blockly não usa o fundo do tema Kids')

    assert(tema.workspace && tema.workspace !== 'rgb(0, 0, 0)', 'canvas não recebeu o tema Kids')

    assert(!tema.fonte.includes('Times'), 'tipografia do tema ausente')

    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-0-editor.png`) })
    // Menus e campos precisam funcionar dentro do diálogo modal, inclusive por toque.
    const destino = editor
      .locator('.blocklyBlockCanvas .blocklyDropdownField')
      .filter({ hasText: /^horta/ })
      .first()
    if (caso.toque) await destino.tap()
    else await destino.click()
    await editor
      .locator('.blocklyMenuItem')
      .filter({ hasText: /^geladeira$/ })
      .click()
    await editor
      .locator('.blocklyBlockCanvas .blocklyDropdownField')
      .filter({ hasText: /^geladeira/ })
      .first()
      .click()
    await editor
      .locator('.blocklyMenuItem')
      .filter({ hasText: /^horta$/ })
      .click()

    await editor

      .locator('.blocklyToolboxCategory')

      .filter({ hasText: /^Ação$/ })

      .click()

    const flyout = editor

      .locator('.blocklyFlyout .blocklyDraggable')

      .filter({ hasText: /^Regar$/ })

      .first()

    await flyout.waitFor()

    const origem = await flyout.boundingBox()

    const alvo = await editor

      .locator('.blocklyWorkspace > .blocklyBlockCanvas > .blocklyDraggable')

      .first()

      .boundingBox()

    assert(origem && alvo, 'blocos não apareceram')

    await pagina.mouse.move(origem.x + 25, origem.y + 15)

    await pagina.mouse.down()

    await pagina.mouse.move(origem.x + 40, origem.y + 25, { steps: 3 })

    await pagina.mouse.move(alvo.x + 25, alvo.y + alvo.height + 8, { steps: 18 })

    await pagina.mouse.up()

    await pagina.waitForTimeout(500)

    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-1-blocos.png`) })

    if (caso.toque) await editor.getByRole('button', { name: 'Prévia', exact: true }).click()

    const antes = await guardado(pagina)

    await editor.getByRole('button', { name: 'Prever', exact: true }).click()

    await editor.getByText('Prévia encerrada.', { exact: true }).waitFor({ timeout: 15000 })

    assert.equal(
      await editor.getByRole('alert').count(),

      0,

      (await editor.getByRole('alert').allTextContents()).join('\n'),
    )

    await editor.getByRole('listitem').filter({ hasText: 'Regou o canteiro 1.' }).waitFor()

    const depoisDaPrevia = await guardado(pagina)

    assert.deepEqual(depoisDaPrevia?.horta, antes?.horta, 'a prévia alterou a horta real')

    const largura = await editor.evaluate((el) => ({ rola: el.scrollWidth, cabe: el.clientWidth }))

    assert(largura.rola <= largura.cabe + 1, 'editor com rolagem lateral')

    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-2-previa.png`) })

    await editor.getByRole('button', { name: 'Guardar rotina', exact: true }).click()

    await editor.waitFor({ state: 'hidden' })

    await painel

      .getByText('Rotina guardada. Use Testar para ver o Lumi na ilha.', { exact: true })

      .waitFor()

    await painel.getByRole('button', { name: 'Testar', exact: true }).click()

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
      timeout: 90_000,
    })

    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-3-lumi-regando.png`) })

    await aviso.waitFor({ state: 'hidden', timeout: 90_000 })

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

      ['quando-amanhecer', 'voar-ate', 'regar'],
    )

    // A última vez fica no painel.

    const depois = await abrirPainel(pagina)

    await depois.getByText('Da última vez, a rotina foi até o fim').click()

    await depois.getByText('Regou o canteiro 1.').waitFor()

    await pagina.screenshot({ path: path.join(prints, `${caso.nome}-4-ultima-vez.png`) })

    await depois.getByRole('button', { name: 'Voltar ao jogo' }).click()

    assert.deepEqual(erros, [])

    console.log(`PASS ${caso.nome}: rotina em blocos, prévia isolada, Lumi regou o canteiro 1`)

    await contexto.close()

    await browser.close()

    browser = undefined
  }

  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()

  if (servidor.exitCode === null) servidor.kill()
}
