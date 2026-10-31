/**
 * Os primeiros passos com o Zappy e as dicas de primeira vez no playground, com os controles de
 * verdade. Executar no pacote:
 * bun build playground/verificar-passos-browser.ts --target=node --external playwright-core --outfile .cache/verificar-passos-browser.mjs
 * node .cache/verificar-passos-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS a pasta dos prints;
 * ARQUIPELAGO_PARTE (passos, celular, dicas) roda uma parte só.
 *
 * Confere: o tutorial inteiro no computador (andar, olhar, pular, a porta, plantar e regar, as
 * barrinhas, a mochila, o menu e o mapa, a colheita de verdade, a obra com parede, porta e
 * geladeira, o fim e o menu depois), o X que recolhe a tarefa no Agora, o cartão sem cobrir a HUD,
 * o Construir sem o Agora; no celular, pular e continuar pelo menu; e as dicas do barco, da noite e
 * do Quadro, uma vez só, e o desligar.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { CRESCIMENTO_MS, criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { type BrowserContext, chromium, type Page } from 'playwright-core'
import { PerspectiveCamera, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { posicaoDoCanteiro } from '../src/mundo/colisao-da-ilha-central'
import { LUGAR_DO_QUADRO } from '../src/mundo/lugar-do-quadro'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; noChao: boolean; ilhasCompletas: number; camera: P }

const port = await new Promise<number>((resolve, reject) => {
  const r = createServer()
  r.once('error', reject)
  r.listen(0, '127.0.0.1', () => {
    const a = r.address()
    if (!a || typeof a === 'string') return reject(new Error('Sem porta local'))
    r.close(() => resolve(a.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-30-primeiros-passos')
mkdirSync(prints, { recursive: true })
const parte = process.env.ARQUIPELAGO_PARTE
const server = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let pronto = false
server.stdout.on('data', (d) => {
  if (String(d).includes('Arquipélago no ar')) pronto = true
})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

const ler = (page: Page) =>
  page.evaluate(
    () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho ?? null,
  )
async function esperar(page: Page, o: string, fn: (d: Desenho) => boolean, ms = 240_000) {
  const ate = Date.now() + ms
  while (Date.now() < ate) {
    const d = await ler(page)
    if (d && fn(d)) return d
    await page.waitForTimeout(300)
  }
  throw new Error(`Não aconteceu a tempo: ${o}`)
}
const levar = (page: Page, p: P, olhar: number) =>
  page.evaluate(
    ({ x, y, z, g }) =>
      (globalThis as { __arquipelagoLevar?: (...a: number[]) => void }).__arquipelagoLevar?.(
        x,
        y,
        z,
        g,
      ),
    { x: p.x, y: p.y, z: p.z, g: olhar + Math.PI },
  )
const rumo = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.atan2(b.x - a.x, b.z - a.z)
/** O cartão do Zappy com este texto (o do tutorial ou o da dica). */
const cartao = (page: Page, texto: string | RegExp) =>
  page.locator('.arq-guia').filter({ hasText: texto }).first()
/** O anel acende na parte da HUD (ele segue a fala na conferência seguinte, 250 ms depois). */
const anel = (page: Page, nome: string) =>
  page.waitForFunction(
    (n) => document.querySelector<HTMLElement>('.arq-hud')?.dataset.anel === n,
    nome,
    { timeout: 10_000 },
  )
const fechar = (page: Page) => page.locator('.arq-guia .arq-guia-x').first().click()

/** As caixas das partes visíveis não se cruzam. */
async function semSobreposicao(page: Page, nome: string, seletores: string[]) {
  const caixas: { s: string; r: { x: number; y: number; width: number; height: number } }[] = []
  for (const s of seletores) {
    const l = page.locator(s).first()
    if ((await l.count()) === 0 || !(await l.isVisible())) continue
    const r = await l.boundingBox()
    if (r) caixas.push({ s, r })
  }
  for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i]!.r
      const b = caixas[j]!.r
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      )
        throw new Error(`${nome}: ${caixas[i]!.s} cobre ${caixas[j]!.s}`)
    }
}
const PARTES = [
  '.arq-guia',
  '.arq-quem',
  '.arq-topo-dir',
  '.arq-agora',
  '.arq-baixo',
  '.arq-cantinho',
  '.arq-botoes-toque',
  '.arq-obra',
  '.arq-dica',
]

async function novoContexto(tela: { width: number; height: number }, celular = false) {
  const c = await browser!.newContext({
    viewport: tela,
    deviceScaleFactor: 1,
    isMobile: celular,
    hasTouch: celular,
    reducedMotion: celular ? 'reduce' : 'no-preference',
  })
  c.setDefaultTimeout(120_000)
  await c.addInitScript(() => {
    localStorage.setItem('arquipelago:medir', '1')
    localStorage.setItem('arquipelago:conforto', JSON.stringify({ qualidade: 'leve' }))
  })
  return c
}
async function abrir(c: BrowserContext, url: string) {
  const page = await c.newPage()
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  await page.goto(`${baseURL}${url}`, { waitUntil: 'domcontentloaded' })
  return { page, erros }
}
const print = (page: Page, nome: string) =>
  page.screenshot({ path: path.join(prints, `${nome}.png`) })

const relatorio: string[] = []

/** O tutorial inteiro, no computador, com o teclado e o mouse. */
async function passosNoComputador() {
  const tela = { width: 1280, height: 720 }
  const c = await novoContexto(tela)
  const { page, erros } = await abrir(c, '/?novo=1&persistir=0&passos=1')
  await cartao(page, 'Oi,').waitFor({ timeout: 180_000 })
  await esperar(page, 'o chão', (d) => d.noChao)
  await semSobreposicao(page, 'oi', PARTES)
  await print(page, 'computador-01-oi')
  await fechar(page)

  // Andar: W segurado até o "Isso".
  await cartao(page, 'Ande pelo quarto').waitFor()
  assert.equal(await page.locator('.arq-guia kbd').first().innerText(), 'W')
  await print(page, 'computador-02-andar')
  await page.keyboard.down('KeyW')
  await cartao(page, 'Isso. Feito.').waitFor({ timeout: 60_000 })
  await page.keyboard.up('KeyW')

  // Olhar: arrastar a tela.
  await cartao(page, 'olhe em volta').waitFor()
  for (let k = 0; k < 3; k++) {
    await page.mouse.move(900, 380)
    await page.mouse.down()
    await page.mouse.move(500, 380, { steps: 20 })
    await page.mouse.up()
    if (await cartao(page, 'Isso. Feito.').isVisible()) break
  }
  await cartao(page, 'pule com a barra').waitFor({ timeout: 60_000 })

  // O X numa fala com tarefa recolhe a fala; a tarefa fica no Agora e abre de novo.
  await fechar(page)
  await page.locator('.arq-agora-passos button').waitFor()
  assert.equal(await page.locator('.arq-guia').count(), 0)
  await print(page, 'computador-03-agora')
  await page.locator('.arq-agora-passos button').click()
  await cartao(page, 'pule com a barra').waitFor()
  await page.keyboard.press('Space')

  // A porta: o Zappy voa até ela; perto, o E abre.
  await cartao(page, 'A porta nova está brilhando').waitFor({ timeout: 60_000 })
  await page.waitForTimeout(2500)
  await print(page, 'computador-04-porta')
  const porta = { x: 2.5, y: 2.4, z: -2.2 }
  await levar(page, porta, 0)
  await cartao(page, 'Quando aparece a tecla E').waitFor({ timeout: 60_000 })
  await page.waitForTimeout(800)
  await print(page, 'computador-05-usar')
  await page.keyboard.press('KeyE')

  // A horta: plantar e regar no canteiro.
  await cartao(page, 'Essa é a sua horta').waitFor({ timeout: 60_000 })
  const h = posicaoDoCanteiro(0)
  await levar(page, { x: h.x, y: 2.2, z: h.z - 1.4 }, 0)
  await page.getByText('Plantar alface', { exact: false }).first().waitFor({ timeout: 60_000 })
  await print(page, 'computador-06-plantar')
  await page.keyboard.press('KeyE')
  await cartao(page, 'Toda semente precisa de água').waitFor({ timeout: 60_000 })
  await page.getByText('Regar', { exact: false }).first().waitFor()
  await page.keyboard.press('KeyE')
  const regadoEm = Date.now()
  await cartao(page, 'A alface cresce de verdade, em uns três minutos').waitFor({ timeout: 60_000 })
  await print(page, 'computador-07-cresce')
  await fechar(page)

  // Você e suas coisas: barrinhas, mochila, menu e o mapa dentro do menu.
  await cartao(page, 'Essas barrinhas').waitFor()
  await anel(page, 'necessidades')
  await print(page, 'computador-08-barrinhas')
  await fechar(page)
  await cartao(page, 'Na mochila').waitFor()
  await fechar(page)
  await cartao(page, 'Abra o menu').waitFor()
  await page.keyboard.press('Escape')
  const menu = page.getByRole('dialog', { name: 'Menu do jogo' })
  await menu.waitFor()
  await menu
    .locator('.arq-guia')
    .filter({ hasText: 'Essas são as ilhas' })
    .waitFor({ timeout: 30_000 })
  await anel(page, 'mapa')
  await print(page, 'computador-09-menu-mapa')
  await menu.locator('.arq-guia .arq-guia-x').click()
  await menu.locator('.arq-guia').filter({ hasText: 'Pode fechar o menu' }).waitFor()
  await menu.locator('.arq-guia .arq-guia-x').click()
  await page.keyboard.press('Escape')
  await menu.waitFor({ state: 'detached' })

  // A colheita espera a alface de verdade (sem o cartão na tela enquanto isso).
  assert.equal(await page.locator('.arq-guia').count(), 0)
  const falta = Math.max(0, regadoEm + CRESCIMENTO_MS.alface - Date.now())
  relatorio.push(`esperando a alface por ${Math.round(falta / 1000)} s`)
  await cartao(page, 'A alface ficou pronta').waitFor({ timeout: falta + 90_000 })
  await page.getByText('Colher', { exact: false }).first().waitFor({ timeout: 60_000 })
  await print(page, 'computador-10-colher')
  await page.keyboard.press('KeyE')

  await obraEFim(page, tela, 'computador')
  assert.deepEqual(erros, [])
  relatorio.push('computador: os 23 passos, da boas-vindas ao fim, pelos controles de verdade')
  await c.close()
}

/**
 * Da geladeira ganha ao fim: "Fazer agora", o Construir (sem o Agora), três paredes encostadas na
 * casa, do lado direito do quarto (como a obra de exemplo), a porta do cômodo, a geladeira, o Pronto,
 * a fala da geladeira, o cartão do fim e o menu depois.
 */
async function obraEFim(page: Page, tela: { width: number; height: number }, prefixo: string) {
  // A geladeira pede um cômodo: "Fazer agora" leva à obra.
  await cartao(page, 'Chegou o projeto azul da geladeira').waitFor({ timeout: 60_000 })
  await print(page, `${prefixo}-11-escolha`)
  await page.locator('.arq-guia').getByRole('button', { name: 'Fazer agora' }).click()
  await cartao(page, 'Escolha Construir').waitFor()
  await page.getByRole('button', { name: 'Construir', exact: true }).click()
  await cartao(page, 'Escolha Parede').waitFor({ timeout: 60_000 })
  // O conserto da HUD: no Construir o Agora sai e a fala não cobre o cartão de quem joga.
  assert.equal(await page.locator('.arq-agora').count(), 0)
  await semSobreposicao(page, 'construir', PARTES)
  await print(page, `${prefixo}-12-parede`)

  // A obra: três paredes encostadas no lado direito do quarto (como a obra de exemplo).
  await page
    .getByRole('button', { name: /Parede/ })
    .first()
    .click()
  await page.waitForTimeout(1800)
  const cam = await esperar(page, 'a câmera de obra', (d) => Boolean(d.camera))
  const camera = new PerspectiveCamera(55, tela.width / tela.height, 0.1, 1000)
  camera.position.set(cam.camera.x, cam.camera.y, cam.camera.z)
  camera.lookAt(0, 1.02, -3)
  camera.updateMatrixWorld()
  const naTela = (x: number, z: number) => {
    const v = new Vector3(x, 1.02, z).project(camera)
    return { x: ((v.x + 1) * tela.width) / 2, y: ((1 - v.y) * tela.height) / 2 }
  }
  const arrastar = async (a: [number, number], b: [number, number]) => {
    const de = naTela(...a)
    const ate = naTela(...b)
    await page.mouse.move(de.x, de.y)
    await page.mouse.down()
    await page.mouse.move(ate.x, ate.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
  await arrastar([6, -6], [8, -6])
  await arrastar([8, -6], [8, -2])
  await arrastar([8, -2], [6, -2])
  await cartao(page, 'Agora escolha Porta').waitFor({ timeout: 60_000 })
  await page
    .getByRole('button', { name: /^.?\s*Porta$/ })
    .first()
    .click()
  // A porta (3 células) na parede de fora do cômodo (4 células): um toque perto do meio.
  const objetos = cartao(page, 'Agora escolha Objetos')
  for (const [x, z] of [
    [8, -3.5],
    [7.85, -3.5],
    [8.15, -3.5],
    [8, -3.7],
    [8, -3.3],
  ] as const) {
    const ponto = naTela(x, z)
    await page.mouse.click(ponto.x, ponto.y)
    await page.waitForTimeout(1500)
    if (await objetos.isVisible()) break
    relatorio.push(`porta: o toque em (${x}; ${z}) não pôs`)
  }
  try {
    await objetos.waitFor({ timeout: 30_000 })
  } catch (e) {
    await print(page, `${prefixo}-porta-falhou`)
    console.log('recado:', await page.locator('.arq-guia-recado').allInnerTexts())
    throw e
  }
  await page
    .getByRole('button', { name: /Objetos/ })
    .first()
    .click()
  await page
    .getByRole('button', { name: /Geladeira/ })
    .first()
    .click()
  // Células dentro do cômodo, acima da barra de escolhas (que cobre a frente da casa).
  const pronto = cartao(page, 'Escolha Pronto')
  for (const [x, z] of [
    [6.5, -5.5],
    [7.5, -5.5],
    [6.5, -4.5],
    [7.5, -3.5],
  ] as const) {
    const ponto = naTela(x, z)
    await page.mouse.click(ponto.x, ponto.y)
    await page.waitForTimeout(1500)
    if (await pronto.isVisible()) break
    relatorio.push(`geladeira: o toque em (${x}; ${z}) não pôs`)
  }
  try {
    await pronto.waitFor({ timeout: 30_000 })
  } catch (e) {
    await print(page, `${prefixo}-geladeira-falhou`)
    console.log(relatorio.join(' | '))
    throw e
  }
  await print(page, `${prefixo}-13-pronto`)
  await page.getByRole('button', { name: 'Pronto', exact: true }).click()
  await cartao(page, 'A geladeira já guarda 4 coisas').waitFor({ timeout: 60_000 })
  await fechar(page)

  // O fim: o cartão do que ela já sabe, por cima do jogo parado; o X fecha tudo.
  await page.getByRole('dialog', { name: 'O que você já sabe' }).waitFor()
  await cartao(page, 'Agora a ilha é sua').waitFor()
  assert.ok(await page.getByText('Construir', { exact: true }).first().isVisible())
  await print(page, `${prefixo}-14-fim`)
  await fechar(page)
  await page.getByRole('dialog', { name: 'O que você já sabe' }).waitFor({ state: 'detached' })
  const marca = await page.evaluate(() =>
    Object.entries(localStorage).find(([k]) => k.startsWith('arquipelago:passos:')),
  )
  assert.ok(marca && JSON.parse(marca[1]).situacao === 'feito', 'a marca fica como feito')

  // No menu, o cartão dos primeiros passos diz que acabou e deixa rever.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Rever os primeiros passos' }).first().waitFor()
  await print(page, `${prefixo}-15-menu-feito`)
}

/**
 * Só a obra, com a geladeira já ganha (o salvamento guardado no playground e os passos parados na
 * fala da geladeira), sem esperar a alface crescer.
 */
async function soAObra() {
  const tela = { width: 1280, height: 720 }
  const c = await novoContexto(tela)
  const salvo = criarSalvamentoInicial(new Date())
  salvo.casa.portaNova = true
  salvo.posicao = { x: 4, y: 2.4, z: 4 }
  salvo.projetos.geladeira = { ganhoEm: new Date().toISOString(), aparencia: null, aparencias: [] }
  await c.addInitScript((sv) => {
    if (localStorage.getItem('arquipelago-playground')) return
    localStorage.setItem(
      'arquipelago-playground',
      JSON.stringify({ revisao: 1, atualizadoEm: new Date().toISOString(), salvamento: sv }),
    )
    localStorage.setItem(
      'arquipelago:passos:kids:perfil-de-teste',
      JSON.stringify({ situacao: 'andando', passo: 'escolha' }),
    )
  }, salvo)
  const { page, erros } = await abrir(c, '/?passos=manter')
  await esperar(page, 'o chão', (d) => d.noChao)
  await obraEFim(page, tela, 'obra')
  assert.deepEqual(erros, [])
  relatorio.push('obra: geladeira, parede, porta, objetos, pronto e fim')
  await c.close()
}

/** No celular: o cartão ao lado do joystick, pular e continuar pelo menu. */
async function passosNoCelular() {
  const c = await novoContexto({ width: 390, height: 844 }, true)
  const { page, erros } = await abrir(c, '/?novo=1&persistir=0&passos=1')
  await cartao(page, 'Oi,').waitFor({ timeout: 180_000 })
  await page.locator('.arq-guia .arq-guia-x').tap()
  await cartao(page, 'Ponha o dedo no canto de baixo').waitFor()
  await semSobreposicao(page, 'celular', PARTES)
  await print(page, 'celular-01-andar')
  await page.locator('.arq-guia').getByRole('button', { name: 'Pular o tutorial' }).tap()
  await cartao(page, 'Tudo bem pular').waitFor()
  await print(page, 'celular-02-pular')
  await page.locator('.arq-guia').getByRole('button', { name: 'Pular', exact: true }).tap()
  await page.locator('.arq-guia').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Abrir o menu', exact: true }).tap()
  await page.getByText('Você parou no capítulo 2').waitFor()
  await print(page, 'celular-03-menu')
  // O cartão fica no fim do meio do menu: rola até ele antes do toque (um toque no meio da
  // rolagem pode cair fora do botão), e confere que o menu fechou.
  const continuar = page.getByRole('button', { name: 'Continuar', exact: true })
  const menu = page.getByRole('dialog', { name: 'Menu do jogo' })
  for (let k = 0; k < 3 && (await menu.count()) > 0; k++) {
    await continuar.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await continuar.tap()
    await page.waitForTimeout(800)
  }
  await menu.waitFor({ state: 'detached' })
  await cartao(page, 'Ponha o dedo no canto de baixo').waitFor()
  assert.deepEqual(erros, [])
  relatorio.push('celular: cartão sem cobrir os botões, pular e continuar do mesmo passo')
  await c.close()
}

/** As dicas: o barco, a primeira noite e o Quadro das Cores, uma vez só, e o desligar. */
async function dicas() {
  const tela = { width: 1280, height: 720 }
  // O barco, no píer (o Recife aberto).
  {
    const c = await novoContexto(tela)
    const { page, erros } = await abrir(c, '/?novo=1&persistir=0&barco=central&dicas=1')
    await cartao(page, 'Esse barco leva você até o Recife Coral').waitFor({ timeout: 180_000 })
    await anel(page, 'acao')
    await semSobreposicao(page, 'dica do barco', PARTES)
    await print(page, 'dica-barco')
    await fechar(page)
    await cartao(page, 'Na viagem você fica no barco').waitFor()
    await fechar(page)
    await page.locator('.arq-guia').waitFor({ state: 'detached' })
    const vistas = await page.evaluate(() =>
      Object.entries(localStorage).find(([k]) => k.startsWith('arquipelago:dicas:')),
    )
    assert.ok(vistas && JSON.parse(vistas[1]).vistas.includes('barco'))
    // Uma vez só: voltando perto do barco, nada de novo.
    await page.waitForTimeout(2000)
    assert.equal(await page.locator('.arq-guia').count(), 0)
    // No menu, ela fica para ler de novo.
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'O barco', exact: true }).click()
    await cartao(page, 'Esse barco leva você').waitFor()
    assert.deepEqual(erros, [])
    await c.close()
  }
  // A primeira noite, na sua ilha; e desligar as dicas.
  {
    const c = await novoContexto(tela)
    // O adiantar do playground vale com o ponto de partida (o em): a grama do lote, na frente da casa.
    const { page, erros } = await abrir(c, '/?novo=1&persistir=0&adiantar=12&dicas=1&em=8,4,2.4')
    await cartao(page, 'Anoiteceu').waitFor({ timeout: 180_000 })
    await anel(page, 'relogio')
    await esperar(page, 'o chão', (d) => d.noChao)
    await page.waitForTimeout(2500)
    await print(page, 'dica-noite')
    await page.locator('.arq-guia').getByRole('button', { name: 'Desligar as dicas' }).click()
    await cartao(page, 'As dicas ficam desligadas').waitFor()
    await page.locator('.arq-guia').getByRole('button', { name: 'Desligar', exact: true }).click()
    await page.locator('.arq-guia').waitFor({ state: 'detached' })
    const marca = await page.evaluate(() =>
      Object.entries(localStorage).find(([k]) => k.startsWith('arquipelago:dicas:')),
    )
    assert.ok(marca && JSON.parse(marca[1]).desligadas === true)
    // Em Conforto e controles a caixa aparece desmarcada e religa.
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Conforto e controles' }).click()
    const caixa = page.getByLabel('Dicas do Zappy na primeira vez de cada coisa')
    assert.equal(await caixa.isChecked(), false)
    assert.deepEqual(erros, [])
    await c.close()
  }
  // O Quadro das Cores, na chegada do Bosque.
  {
    const achada = ilhasEmVolta().find((i) => i.ilha.id === 'bosque')!
    const g = giroDaIlha(achada.ilha)
    const glb = readFileSync(path.resolve('src/assets/ilhas/bosque.glb'))
    const cena = (
      await new GLTFLoader().parseAsync(
        glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
        '',
      )
    ).scene
    const ch = cena.getObjectByName('chegada')!.position
    const mundo = (lx: number, lz: number) => ({
      x: achada.centro.x + lx * Math.cos(g) + lz * Math.sin(g),
      z: achada.centro.z - lx * Math.sin(g) + lz * Math.cos(g),
    })
    const quadro = mundo(ch.x - LUGAR_DO_QUADRO.paraDentro, ch.z + LUGAR_DO_QUADRO.paraOLado)
    const onde = mundo(
      ch.x - LUGAR_DO_QUADRO.paraDentro + 2.2,
      ch.z + LUGAR_DO_QUADRO.paraOLado - 1,
    )
    const c = await novoContexto(tela)
    const em = `${onde.x.toFixed(2)},${onde.z.toFixed(2)},${(ch.y + 1.2).toFixed(2)}`
    const { page, erros } = await abrir(c, `/?novo=1&persistir=0&dicas=1&em=${em}`)
    await esperar(page, 'o Bosque', (d) => d.ilhasCompletas > 0 && d.noChao)
    await levar(page, { x: onde.x, y: ch.y + 1.2, z: onde.z }, rumo(onde, quadro))
    await cartao(page, 'Esse é o Quadro das Cores').waitFor({ timeout: 120_000 })
    await print(page, 'dica-quadro')
    await fechar(page)
    await cartao(page, 'Cada desafio feito pinta').waitFor()
    await anel(page, 'quadro')
    assert.deepEqual(erros, [])
    await c.close()
  }
  relatorio.push('dicas: barco (uma vez, rever no menu), noite (desligar e Conforto), Quadro')
}

try {
  const ate = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (pronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > ate) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  if (!parte || parte === 'celular') await passosNoCelular()
  if (!parte || parte === 'dicas') await dicas()
  if (parte === 'obra') await soAObra()
  if (!parte || parte === 'passos') await passosNoComputador()
  console.log(`PASS\n${relatorio.join('\n')}`)
} finally {
  await browser?.close()
  server.kill()
}
