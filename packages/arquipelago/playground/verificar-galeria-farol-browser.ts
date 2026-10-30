/**
 * O modo livre e a galeria no alto do Farol (fase4-12), no navegador de verdade: um salvamento com
 * o final concluído, a subida, a orientação da sala, os painéis das vagas (uma aparência do Pinta,
 * um minijogo e um jogo do Mural, `?jogos=exemplo`), a troca de vaga, a gravação e a reentrada.
 * Plataforma falsa. Compilar para Node como os outros:
 *
 *   bun build playground/verificar-galeria-farol-browser.ts --target=node \
 *     --external playwright-core --outfile .cache/verificar-galeria-farol-browser.mjs
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { criarSalvamentoInicial, ILHA_IDS } from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { ALTO_DO_FAROL } from '../src/mundo/alto-do-farol'
import type { MedidaDoDesenho } from '../src/mundo/medidor'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import { VAGAS_DA_GALERIA } from '../src/sistemas/galeria-do-farol'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4597)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/galeria-farol')
mkdirSync(prints, { recursive: true })
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: MedidaDoDesenho
  __arquipelagoLevar?: (x: number, y: number, z: number, giro: number) => void
}

/** O final já concluído, todos os projetos do modo livre e uma geladeira pintada. */
function salvamentoDoFinal() {
  const agora = new Date()
  const s = criarSalvamentoInicial(agora)
  const comFinal = { ...s, farol: { pagina: true, concluido: true, galeria: [] } }
  const livre = ganharProjetos(comFinal, agora).salvamento
  const geladeira = livre.projetos.geladeira
  assert(geladeira)
  return {
    revisao: 1,
    atualizadoEm: agora.toISOString(),
    salvamento: {
      ...livre,
      // Na frente da porta do Farol (o `em=` da URL trocaria o salvamento por um novo).
      posicao: { x: -9.2, y: 2.2, z: -10.9 },
      // As pontes já vistas: a cena da chegada de cada ponte não toma a câmera.
      pontesVistas: [...ILHA_IDS],
      casa: { portaNova: true },
      projetos: {
        ...livre.projetos,
        geladeira: {
          ...geladeira,
          aparencia: { origem: 'pinta', id: 'geladeira-da-galeria' },
          aparencias: [{ origem: 'pinta', id: 'geladeira-da-galeria' }],
        },
      },
    },
  }
}

const URL_DO_FAROL = `${base}/?posicao=8&jogos=exemplo`

async function subir(p: Page, celular: boolean) {
  await p.locator('.arq-acao').filter({ hasText: 'Subir o Farol' }).waitFor()
  await usar(p, celular)
  await p.waitForFunction(() => {
    const d = (globalThis as Janela).__arquipelagoDesenho
    return d?.finalDoFarol.etapa === 'sala' && d.posicao.y > 40 && d.noChao
  })
  await p.locator('.arq-corte').waitFor({ state: 'detached' })
}

async function usar(p: Page, celular: boolean) {
  if (celular) await p.getByRole('button', { name: 'Usar', exact: true }).tap()
  else await p.keyboard.press('KeyE')
}

/** Leva para a frente da vaga (do lado da lente), com a câmera atrás olhando para o pedestal. */
async function irAVaga(p: Page, vaga: number) {
  const v = VAGAS_DA_GALERIA[vaga]
  assert(v)
  const r = Math.hypot(v.x, v.z)
  const f = (r - 1.3) / r
  await p.evaluate(({ x, y, z, g }) => (globalThis as Janela).__arquipelagoLevar?.(x, y, z, g), {
    x: ALTO_DO_FAROL.x + v.x * f,
    y: ALTO_DO_FAROL.y + 0.3,
    z: ALTO_DO_FAROL.z + v.z * f,
    g: v.giro,
  })
  await p.waitForTimeout(600)
}

async function abrirVaga(p: Page, vaga: number, celular: boolean, rotulo: RegExp) {
  await irAVaga(p, vaga)
  await p.locator('.arq-acao').filter({ hasText: rotulo }).waitFor()
  await usar(p, celular)
  const painel = p.getByRole('dialog', { name: `Vaga ${vaga + 1} da galeria` })
  await painel.waitFor()
  return painel
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const fim = Date.now() + 30_000
  while (true) {
    if (servidor.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (Date.now() > fim) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(executavel ? { executablePath: executavel } : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const salvo = JSON.stringify(salvamentoDoFinal())
  for (const celular of [false, true]) {
    const tela = celular ? { width: 390, height: 844 } : { width: 1280, height: 720 }
    const contexto = await browser.newContext({
      viewport: tela,
      isMobile: celular,
      hasTouch: celular,
    })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript((salvo) => {
      localStorage.setItem('arquipelago:medir', '1')
      localStorage.setItem('arquipelago:camera-dica', '1')
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
      // Só a primeira abertura recebe o salvamento semeado; a reentrada lê o que o jogo gravou.
      if (!sessionStorage.getItem('galeria-semeada')) {
        localStorage.setItem('arquipelago-playground', salvo)
        sessionStorage.setItem('galeria-semeada', '1')
      }
    }, salvo)
    const p = await contexto.newPage()
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(URL_DO_FAROL)
    await subir(p, celular)
    const agora = await p.locator('.arq-agora').innerText()
    assert(agora.includes('Escolher as criações dos pedestais da galeria'), agora)
    // No celular o Agora mostra só o primeiro item (a regra da HUD).
    if (!celular) assert(agora.includes('Reler a última página na mesa da Íris'), agora)
    await p.screenshot({ path: path.join(prints, `sala-${tela.width}.png`) })

    if (!celular) {
      // Vaga 1: a geladeira pintada.
      let painel = await abrirVaga(p, 0, celular, /Escolher o que expor na vaga 1/)
      await painel.getByText('Escolha uma criação sua para esta vaga.', { exact: false }).waitFor()
      for (const grupo of ['Pinta e Molda', 'Minijogos', 'Jogos do Mural'])
        await painel.getByRole('region', { name: grupo }).waitFor()
      await p.screenshot({ path: path.join(prints, 'vaga-vazia-1280.png') })
      const geladeira = painel.getByRole('listitem').filter({ hasText: 'Geladeira do Pinta' })
      await geladeira.getByRole('button', { name: 'Expor aqui' }).click()
      await geladeira.getByRole('button', { name: 'Exposta aqui' }).waitFor()
      await painel
        .getByRole('region', { name: 'Criação exposta' })
        .getByText('Geladeira do Pinta')
        .waitFor()
      await painel.getByRole('button', { name: 'Fechar' }).click()
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'vaga-1-geladeira-1280.png') })
      // Vaga 2: o minijogo, com o botão de jogar.
      painel = await abrirVaga(p, 1, celular, /Escolher o que expor na vaga 2/)
      const minijogo = painel.getByRole('listitem').filter({ hasText: 'Corrida dos bichos da Ana' })
      await minijogo.getByRole('button', { name: 'Expor aqui' }).click()
      await painel.getByRole('button', { name: 'Jogar' }).waitFor()
      await painel.getByRole('button', { name: 'Fechar' }).click()
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'vaga-2-minijogo-1280.png') })
      // Vaga 3: o jogo do Mural; a geladeira aparece como já exposta na vaga 1.
      painel = await abrirVaga(p, 2, celular, /Escolher o que expor na vaga 3/)
      await painel
        .getByRole('listitem')
        .filter({ hasText: 'Geladeira do Pinta' })
        .getByText('Na vaga 1')
        .waitFor()
      const mural = painel.getByRole('listitem').filter({ hasText: 'Labirinto das conchas' })
      await mural.getByRole('button', { name: 'Expor aqui' }).click()
      await painel.getByRole('button', { name: 'Fechar' }).click()
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'vaga-3-mural-1280.png') })
      // Mudar o minijogo da vaga 2 para a vaga 4 deixa a 2 vazia.
      painel = await abrirVaga(p, 3, celular, /Escolher o que expor na vaga 4/)
      await painel
        .getByRole('listitem')
        .filter({ hasText: 'Corrida dos bichos da Ana' })
        .getByRole('button', { name: 'Expor aqui' })
        .click()
      await painel.getByRole('button', { name: 'Fechar' }).click()
      await irAVaga(p, 1)
      await p
        .locator('.arq-acao')
        .filter({ hasText: /Escolher o que expor na vaga 2/ })
        .waitFor()
      // A vista de cima da sala, com os pedestais.
      await p.evaluate(
        ({ x, y, z }) => (globalThis as Janela).__arquipelagoLevar?.(x, y, z, Math.PI * 0.75),
        { x: ALTO_DO_FAROL.x - 1.2, y: ALTO_DO_FAROL.y + 0.3, z: ALTO_DO_FAROL.z - 0.6 },
      )
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'galeria-1280.png') })
      // A fila grava a galeria; reabrir sem semear lê a escolha guardada.
      await p.waitForFunction(
        () => {
          const raw = localStorage.getItem('arquipelago-playground')
          const g = raw && JSON.parse(raw).salvamento?.farol?.galeria
          return Array.isArray(g) && g.length === 4 && g[1] === null
        },
        undefined,
        { timeout: 60_000 },
      )
      const galeria = await p.evaluate(
        () =>
          JSON.parse(localStorage.getItem('arquipelago-playground') ?? '{}').salvamento.farol
            .galeria,
      )
      assert.deepEqual(
        galeria.map((e: unknown[] | null) => e?.[0] ?? null),
        ['a', null, 'j', 'd'],
      )
      await p.goto(URL_DO_FAROL)
      await subir(p, celular)
      painel = await abrirVaga(p, 0, celular, /Ver a criação da vaga 1/)
      await painel
        .getByRole('region', { name: 'Criação exposta' })
        .getByText('Geladeira do Pinta')
        .waitFor()
      await painel.getByRole('button', { name: 'Tirar daqui' }).click()
      await painel.getByText('Escolha uma criação sua para esta vaga.', { exact: false }).waitFor()
      await painel.getByRole('button', { name: 'Fechar' }).click()
    } else {
      // No celular: o painel cabe na tela e rola por dentro.
      const painel = await abrirVaga(p, 4, celular, /Escolher o que expor na vaga 5/)
      const caixa = await painel.boundingBox()
      assert(caixa && caixa.x >= 0 && caixa.x + caixa.width <= tela.width + 1)
      assert(caixa.y >= 0 && caixa.y + caixa.height <= tela.height + 1)
      await painel
        .getByRole('listitem')
        .filter({ hasText: 'Labirinto das conchas' })
        .getByRole('button', { name: 'Expor aqui' })
        .tap()
      await painel.getByRole('button', { name: 'Exposta aqui' }).waitFor()
      await p.screenshot({ path: path.join(prints, 'vaga-5-390.png') })
      await painel.getByRole('button', { name: 'Fechar' }).tap()
      await p.waitForTimeout(1500)
      await p.screenshot({ path: path.join(prints, 'vaga-5-mural-390.png') })
    }
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.deepEqual(erros, [])
    console.log(
      `PASS ${tela.width}: orientação, vagas, troca de vaga${celular ? '' : ', gravação e reentrada'}`,
    )
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
