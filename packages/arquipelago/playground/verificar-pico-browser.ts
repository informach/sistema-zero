/**
 * Pico Gelado real no playground (fase3-06, com a subida, o trenó e o cristal da fase3-07, e o
 * iglu por dentro, a banda e o festival de inverno da fase3-08, e o planador da fase3-09).
 * Executar no pacote:
 * bun build playground/verificar-pico-browser.ts --target=node --external playwright-core --outfile .cache/verificar-pico-browser.mjs
 * node .cache/verificar-pico-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints;
 * ARQUIPELAGO_TELA (`computador` ou `celular`) roda só uma das telas.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { giroDaIlha, ilhasEmVolta, trajetoDaPonte } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; camera: P; ilhasCompletas: number; modo: string; noChao: boolean }
const port = process.env.ARQUIPELAGO_TEST_PORT
  ? Number(process.env.ARQUIPELAGO_TEST_PORT)
  : await new Promise<number>((resolve, reject) => {
      const reserva = createServer()
      reserva.once('error', reject)
      reserva.listen(0, '127.0.0.1', () => {
        const endereco = reserva.address()
        if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
        reserva.close(() => resolve(endereco.port))
      })
    })
const baseURL = `http://127.0.0.1:${port}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-pico')
mkdirSync(prints, { recursive: true })
const pico = ilhasEmVolta().find((i) => i.ilha.id === 'pico')
if (!pico) throw new Error('Pico fora do anel')
const giro = giroDaIlha(pico.ilha)
const bytes = readFileSync('src/assets/ilhas/pico.glb')
const modelo = (
  await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
).scene
const local = (nome: string) => {
  const no = modelo.getObjectByName(nome)
  if (!no) throw new Error(`Sem âncora ${nome}`)
  return no.position.clone()
}
const mundo = (p: P): P => ({
  x: pico.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: pico.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
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
  const deadline = Date.now() + 30_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou')
    try {
      if (servidorPronto && (await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() > deadline) throw new Error('Playground não iniciou')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const celular of [false, true].filter(
    (c) =>
      !process.env.ARQUIPELAGO_TELA ||
      process.env.ARQUIPELAGO_TELA === (c ? 'celular' : 'computador'),
  )) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    context.setDefaultTimeout(120_000)
    await context.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    const ponte = trajetoDaPonte(pico.ilha)
    const inicio = ponte[ponte.length - 5]
    if (!inicio) throw new Error('Ponte sem começo')
    await page.goto(`${baseURL}/?novo=1&posicao=5&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`, {
      waitUntil: 'domcontentloaded',
    })
    const ler = () =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
    const levar = (p: P, olhar: number) =>
      page.evaluate(
        ({ p, g }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          ir(p.x, p.y + 1.2, p.z, g)
        },
        { p, g: olhar + Math.PI },
      )
    await page.waitForFunction(
      () =>
        ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ??
          0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await page.locator('canvas').click()
    await levar(inicio, rumo(inicio, mundo(local('chegada'))))
    await page.waitForTimeout(2000)
    const de = (await ler())?.posicao
    if (!de) throw new Error('Sem posição')
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(
        ({ de }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d && Math.hypot(d.posicao.x - de.x, d.posicao.z - de.z) > 5 && d.noChao
        },
        { de },
        { timeout: 90_000 },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    console.log(`${tipo}: chegada pela ponte`, await ler())
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-chegada.png`) })

    /** Leva e espera o corpo de pé no ponto (o pé a `PE` do centro; `subida`: um degrau a mais). */
    const dePe = async (p: P, olhar: number, rotulo: string, subida = 0) => {
      await levar(p, olhar)
      await page.waitForFunction(
        ({ p, pe, subida }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            d.posicao.y - pe - p.y > -0.15 &&
            d.posicao.y - pe - p.y < 0.15 + subida
          )
        },
        { p, pe: PE, subida },
        { timeout: 60_000 },
      )
      console.log(`${tipo}: de pé ${rotulo}`)
    }

    // O Floco no tablado; a criança na marca da frente do palco, que fica nos degraus dele (0,15 e
    // 0,30), dentro do alcance da conversa.
    const palco = mundo(local('palco'))
    const encontro = mundo(local('morador'))
    await dePe(encontro, rumo(encontro, palco), 'na frente do palco', 0.3)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com o Floco' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('KeyE')
    const conversa = page.getByRole('dialog', { name: 'Floco' })
    await conversa.getByText('Sou Floco. Toco cavaquinho no palco do Pico Gelado.').waitFor()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-floco.png`) })
    await conversa.getByRole('button', { name: 'Continuar' }).click()
    await conversa
      .getByText(
        'Os pinguins da banda perderam os instrumentos na neve, e sem eles não tem festival de inverno.',
      )
      .waitFor()
    // As dicas de onde ficou cada instrumento (fase3-08), uma por fala, até o Tchau.
    for (const dica of [
      'O xilofone ficou dentro do iglu.',
      'O violão ficou perto do lago congelado.',
      'A bateria ficou lá no alto da montanha, no platô do cume.',
    ]) {
      await conversa.getByRole('button', { name: 'Continuar' }).click()
      await conversa.getByText(dica).waitFor()
    }
    await conversa.getByRole('button', { name: 'Tchau, Floco' }).click()
    await conversa.waitFor({ state: 'detached' })
    console.log(`${tipo}: conversa abriu, avançou e fechou`)

    // O começo da trilha e o platô do cume (a 1,2 m do mastro) sustentam o corpo.
    const inicio_ = mundo(local('trilha-inicio'))
    await dePe(inicio_, rumo(inicio_, mundo(local('cume'))), 'no começo da trilha')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-trilha.png`) })
    const cume = local('cume')
    const noPlato = mundo({ x: cume.x + 1.2, y: cume.y, z: cume.z })
    await dePe(noPlato, rumo(noPlato, mundo(local('chegada'))), 'no platô do cume')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-cume.png`) })

    const usar = () =>
      celular
        ? page.getByRole('button', { name: 'Usar', exact: true }).tap()
        : page.keyboard.press('KeyE')

    // A subida ao cume (fase3-07): o "Começar" na largada, as quatro paradas na ordem e a chegada
    // no platô com as estrelas. Com o SwiftShader a poucos quadros por segundo, subir andando não
    // serve: o corpo é levado de parada em parada (os flocos ficam para os testes das regras).
    const largada = mundo(local('subida-largada'))
    await dePe(largada, rumo(largada, mundo(local('subida-1'))), 'na largada da subida')
    await page.locator('.arq-acao').filter({ hasText: 'Começar a subida ao cume' }).waitFor()
    await usar()
    await page.getByText('Valendo. Suba a trilha').first().waitFor({ timeout: 20_000 })
    for (let i = 1; i <= 4; i++) {
      const parada = mundo(local(`subida-${i}`))
      await dePe(parada, rumo(parada, mundo(local('cume'))), `na parada ${i} da subida`)
    }
    // Ao lado do mastro da bandeira (o meio do platô), dentro do raio da chegada.
    const cumeDaSubida = local('cume')
    await levar(mundo({ x: cumeDaSubida.x + 0.8, y: cumeDaSubida.y, z: cumeDaSubida.z }), 0)
    const resultado = page.getByRole('dialog', { name: 'Subida ao cume' })
    await resultado.waitFor({ timeout: 20_000 })
    const ganhas = await resultado.locator('li.ganhou').count()
    console.log(`${tipo}: subida ao cume com ${ganhas} estrelas`)
    if (ganhas < 2) throw new Error('A subida não deu as estrelas da chegada e do tempo.')
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-subida.png`) })
    await resultado.getByRole('button', { name: 'Continuar' }).click()
    await resultado.waitFor({ state: 'detached' })

    // O trenó: ao lado dele (na largura, fora do colisor), "Descer de trenó", a descida pela
    // trilha toda e a volta ao chão no pé dela.
    const noTreno = modelo.getObjectByName('treno')
    if (!noTreno) throw new Error('Sem o trenó')
    const lado = new Vector3(1, 0, 0).applyQuaternion(noTreno.quaternion)
    const cumeLocal = local('cume')
    const sinal =
      Math.hypot(
        noTreno.position.x + lado.x - cumeLocal.x,
        noTreno.position.z + lado.z - cumeLocal.z,
      ) <
      Math.hypot(
        noTreno.position.x - lado.x - cumeLocal.x,
        noTreno.position.z - lado.z - cumeLocal.z,
      )
        ? 1
        : -1
    const aoLado = mundo({
      x: noTreno.position.x + lado.x * 1.2 * sinal,
      y: noTreno.position.y,
      z: noTreno.position.z + lado.z * 1.2 * sinal,
    })
    await dePe(aoLado, rumo(aoLado, mundo(noTreno.position)), 'ao lado do trenó')
    await page.locator('.arq-acao').filter({ hasText: 'Descer de trenó' }).waitFor()
    await usar()
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo ===
        'escorregar',
      undefined,
      { timeout: 20_000 },
    )
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-treno.png`) })
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo === 'chao',
      undefined,
      { timeout: 120_000 },
    )
    const pe = mundo(local('trilha-inicio'))
    const chegou = (await ler())?.posicao
    if (!chegou || Math.hypot(chegou.x - pe.x, chegou.z - pe.z) > 5)
      throw new Error(`O trenó não chegou ao pé da trilha: ${JSON.stringify(chegou)}`)
    console.log(`${tipo}: desceu de trenó até o pé da trilha`)

    // O cristal raro no alto da saliência do fundo da caverna: pegar põe na mochila.
    const raro = local('cristal-raro')
    const naLaje = mundo({ x: raro.x + 0.5, y: raro.y, z: raro.z })
    await dePe(naLaje, rumo(naLaje, mundo(raro)), 'no alto da saliência do cristal')
    await page.locator('.arq-acao').filter({ hasText: 'Pegar o cristal' }).waitFor()
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-cristal.png`) })
    await usar()
    await page.getByText('O cristal rosa está na mochila.').first().waitFor({ timeout: 20_000 })
    await page
      .locator('.arq-acao')
      .filter({ hasText: 'Pegar o cristal' })
      .waitFor({ state: 'detached' })
    console.log(`${tipo}: pegou o cristal raro`)

    // A banda do festival de inverno (fase3-08). Um ponto a `d` de um lugar, na direção de outro.
    const perto = (lugar: P, rumoA: P, d: number): P => {
      const n = Math.hypot(rumoA.x - lugar.x, rumoA.z - lugar.z) || 1
      return {
        x: lugar.x + ((rumoA.x - lugar.x) / n) * d,
        y: lugar.y,
        z: lugar.z + ((rumoA.z - lugar.z) / n) * d,
      }
    }
    const levarAoPalco = async (id: string, rotulo: string, fala: string) => {
      await page.locator('.arq-acao').filter({ hasText: rotulo }).waitFor()
      await usar()
      await page.getByText(fala).first().waitFor({ timeout: 20_000 })
      console.log(`${tipo}: levou ${id} ao palco`)
    }
    // O iglu por dentro: a criança de pé lá dentro, o xilofone perdido e o fogareiro.
    const dentro = mundo(local('iglu-dentro'))
    await dePe(dentro, rumo(dentro, mundo(local('fogareiro'))), 'dentro do iglu')
    const xilofone = mundo(local('instrumento-xilofone'))
    const juntoDoXilofone = perto(xilofone, dentro, 0.75)
    await dePe(juntoDoXilofone, rumo(juntoDoXilofone, xilofone), 'junto do xilofone')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-iglu.png`) })
    await levarAoPalco('o xilofone', 'Levar o xilofone ao palco', 'O xilofone voltou para o palco.')
    const fogareiro = mundo(local('fogareiro'))
    const juntoDoFogo = perto(fogareiro, dentro, 1.0)
    await dePe(juntoDoFogo, rumo(juntoDoFogo, fogareiro), 'junto do fogareiro')
    await page.locator('.arq-acao').filter({ hasText: 'Fazer chocolate quente' }).waitFor()
    await usar()
    await page
      .getByText('Para o chocolate quente, traga 1 cacau e 1 leite.')
      .first()
      .waitFor({ timeout: 20_000 })
    console.log(`${tipo}: o fogareiro pediu o cacau e o leite`)
    // O violão na beira do lago congelado e a bateria no platô do cume.
    const violao = mundo(local('instrumento-violao'))
    const juntoDoViolao = perto(violao, mundo({ x: 0, y: violao.y, z: 0 }), 1.0)
    await dePe(juntoDoViolao, rumo(juntoDoViolao, violao), 'junto do violão')
    await levarAoPalco('o violão', 'Levar o violão ao palco', 'O violão voltou para o palco.')
    const bateria = mundo(local('instrumento-bateria'))
    const juntoDaBateria = perto(bateria, mundo(local('cume')), 0.85)
    await dePe(juntoDaBateria, rumo(juntoDaBateria, bateria), 'junto da bateria')
    await levarAoPalco('a bateria', 'Levar a bateria ao palco', 'o festival de inverno começou')
    await page.waitForFunction(
      () => {
        const bruto = localStorage.getItem('arquipelago-playground')
        const g = bruto
          ? (JSON.parse(bruto) as { salvamento?: { pico?: { banda: number } } })
          : null
        return g?.salvamento?.pico?.banda === 7
      },
      undefined,
      { timeout: 30_000 },
    )
    // O festival no palco: os três pinguins tocando e o Floco falando dele.
    await dePe(encontro, rumo(encontro, palco), 'na frente do palco, no festival', 0.3)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-festival.png`) })
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com o Floco' }).waitFor()
    await usar()
    const festa = page.getByRole('dialog', { name: 'Floco' })
    await festa
      .getByText('A banda voltou a tocar. É o festival de inverno do Pico Gelado.')
      .waitFor()
    // No festival, a primeira conversa dá o planador (fase3-09) e fala do vento da parede de gelo.
    const presente = festa.getByText('este planador é seu')
    const tchau = festa.getByRole('button', { name: 'Tchau, Floco' })
    let viuOPresente = false
    while (!(await tchau.isVisible())) {
      if (await presente.isVisible()) viuOPresente = true
      await festa.getByRole('button', { name: 'Continuar' }).click()
    }
    await festa.getByText('o vento na frente da parede de gelo').waitFor()
    if (!viuOPresente) throw new Error('O Floco não deu o planador no festival')
    await tchau.click()
    await festa.waitFor({ state: 'detached' })
    await page.waitForFunction(
      () => {
        const bruto = localStorage.getItem('arquipelago-playground')
        const g = bruto
          ? (JSON.parse(bruto) as { salvamento?: { inventario?: Record<string, number> } })
          : null
        return (g?.salvamento?.inventario?.planador ?? 0) > 0
      },
      undefined,
      { timeout: 60_000 },
    )
    console.log(
      `${tipo}: festival de inverno no palco, guardado no salvamento, planador na mochila`,
    )

    // O planador (fase3-09): no ar, dentro do vento da parede de gelo, pular abre o planador; o
    // vento leva para cima do alto da parede e, guiando para ela, a criança pousa lá em cima.
    const corrente = mundo(local('corrente-de-ar'))
    const topoDaParede = mundo(local('topo-da-parede'))
    const lerModo = async () => (await ler())?.modo
    // No celular, o toque vai direto na posição do botão Pular: o `tap()` espera o botão parar por
    // alguns quadros e, a poucos quadros por segundo, o corpo pousa antes.
    const botaoPular = celular
      ? await page.getByRole('button', { name: 'Pular', exact: true }).boundingBox()
      : null
    const pular = () =>
      botaoPular
        ? page.touchscreen.tap(
            botaoPular.x + botaoPular.width / 2,
            botaoPular.y + botaoPular.height / 2,
          )
        : page.keyboard.press('Space')
    // O corpo é posto bem alto, acima do vento, e o pulo vai quando ele já está caindo (um pouco
    // abaixo de onde foi posto, longe do chão): com o SwiftShader a poucos quadros por segundo,
    // um tempo fixo não serve, e a queda longa dá tempo ao toque do celular. Planando, ele desce
    // até o vento, que o segura lá no alto. Pousou antes, tenta de novo.
    const noAlto = { ...corrente, y: corrente.y + 20 }
    for (let tentativa = 0; tentativa < 6 && (await lerModo()) !== 'planar'; tentativa++) {
      await levar(noAlto, rumo(corrente, topoDaParede))
      const caindo = await page
        .waitForFunction(
          ({ alto, chao, pe }) => {
            const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
            const y = (d?.posicao.y ?? 0) - pe
            return d?.noChao === false && y < alto - 0.3 && y > chao + 1.5
          },
          { alto: noAlto.y, chao: corrente.y, pe: PE },
          { timeout: 20_000, polling: 'raf' },
        )
        .then(() => true)
        .catch(() => false)
      if (!caindo) continue
      await pular()
      await page.waitForTimeout(1500)
    }
    if ((await lerModo()) !== 'planar') throw new Error('O planador não abriu no ar')
    if (celular) await page.getByRole('button', { name: 'Fechar', exact: true }).waitFor()
    await page.waitForFunction(
      ({ y, pe, c }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        const pes = (d?.posicao.y ?? 0) - pe
        return (
          d?.modo === 'planar' &&
          pes > y + 0.2 &&
          pes < c.y + 5.5 &&
          Math.hypot(d.posicao.x - c.x, d.posicao.z - c.z) < 1.2
        )
      },
      { y: topoDaParede.y, pe: PE, c: corrente },
      { timeout: 120_000 },
    )
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-planador.png`) })
    console.log(`${tipo}: o planador abriu e o vento subiu acima da parede de gelo`)
    // No vento o planador fica no lugar; pedindo a frente (virada para a parede pelo transporte),
    // ele sai do vento, desce planando e pousa. Onde pousa depende do quanto se guia: a regra de
    // que, guiando para a parede, ele pousa no alto dela é do teste dos colisores, porque a poucos
    // quadros por segundo o navegador não solta o controle na hora certa.
    // O toque no Pular deixa o foco no botão, e o teclado do jogo não vale com o foco num botão.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    // O W segue a câmera: recentralizar (C) a põe atrás do avatar, virado para a parede.
    await page.keyboard.press('KeyC')
    await page.waitForTimeout(2500)
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(
        ({ c }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return Boolean(d && Math.hypot(d.posicao.x - c.x, d.posicao.z - c.z) > 1.5)
        },
        { c: corrente },
        { timeout: 60_000, polling: 'raf' },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    await page.waitForFunction(
      () => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return d?.modo !== 'planar' && d?.noChao === true
      },
      undefined,
      { timeout: 60_000 },
    )
    await page.screenshot({ path: path.join(prints, `pico-${tipo}-pouso.png`) })
    console.log(`${tipo}: saiu do vento planando e pousou`)

    // Afastar solta a ilha; voltar monta de novo e o palco segura o Floco.
    await levar({ x: 0, y: 1, z: 20 }, 0)
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ===
        0,
    )
    await dePe(encontro, rumo(encontro, palco), 'de volta, na frente do palco', 0.3)
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com o Floco' }).waitFor()
    console.log(`${tipo}: saiu, soltou a ilha e voltou ao palco`)
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
