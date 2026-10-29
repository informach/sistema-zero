/**
 * Recife real no playground: a chegada, o cais, a caverna, a Maré, os corais e o mapa (fase3-03)
 * e a lagoa. Executar no pacote:
 * bun build playground/verificar-recife-browser.ts --target=node --external playwright-core --outfile .cache/verificar-recife-browser.mjs
 * node .cache/verificar-recife-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { giroDaIlha, ilhasEmVolta, trajetoDaPonte } from '../src/mundo/medidas'
import { aguaDoRecife } from '../src/mundo/recife'
import { LAGOA_DO_RECIFE, PONTOS_DOS_CORAIS } from '../src/sistemas/corais-do-recife'
import { CORPO } from '../src/sistemas/corpo'
import { CINTURA } from '../src/sistemas/modos/chao'
import { bate, CENTRO_DO_CORPO, type Forma, TAMPO } from '../tests/ajuda-colisores'

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
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-recife')
mkdirSync(prints, { recursive: true })
const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')
if (!recife) throw new Error('Recife fora do anel')
const giro = giroDaIlha(recife.ilha)
const bytes = readFileSync('src/assets/ilhas/recife.glb')
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
  x: recife.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: recife.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
const formas = lerColisores(modelo).filter((c): c is Forma => c.forma !== 'malha')
/** O primeiro lugar da lista (local, no tampo) em que o corpo cabe sem bater em nenhum colisor. */
const livre = (candidatos: P[]): P => {
  const achado = candidatos.find(
    (p) => !formas.some((c) => bate(c, new Vector3(p.x, TAMPO + CENTRO_DO_CORPO + 0.05, p.z))),
  )
  if (!achado) throw new Error('Nenhum lugar livre perto do ponto')
  return achado
}
/** O salvamento que o playground guardou (a plataforma de mentira grava a cada PUT aceito). */
type Guardado = {
  salvamento?: { recife?: { corais?: number }; projetos?: Record<string, unknown> }
}
/** No nado, o centro fica a esta altura acima da superfície, com a cintura na água. */
const CENTRO_NADANDO = CORPO.doCentroAoPe - CINTURA
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
  for (const celular of [false, true]) {
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
    const ponte = trajetoDaPonte(recife.ilha)
    const inicio = ponte[ponte.length - 5]
    if (!inicio) throw new Error('Ponte sem começo')
    await page.goto(`${baseURL}/?novo=1&posicao=4&em=${inicio.x},${inicio.z},${inicio.y + 1.2}`, {
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
        { timeout: 30_000 },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    console.log(`${tipo}: chegada pela ponte`, await ler())
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-chegada.png`) })

    // O mesmo trajeto livre do teste dos colisores, ao lado do caixote.
    const cais = local('cais')
    const ini = new Vector3(2.8, 0, -9.4).setLength(12)
    const fim = new Vector3(cais.x, 0, cais.z)
    const direcao = fim.clone().sub(ini).normalize()
    const lado = new Vector3(-direcao.z, 0, direcao.x)
    const caixote = lerColisores(modelo).find((c) => c.nome.startsWith('col-caixote'))
    if (!caixote || caixote.forma === 'malha') throw new Error('Sem caixote simples')
    const doCaixote = new Vector3(caixote.posicao[0], 0, caixote.posicao[2]).sub(ini).dot(lado)
    lado.multiplyScalar(doCaixote > 0 ? -0.3 : 0.3)
    for (let i = 0; i <= 4; i++) {
      const p = ini
        .clone()
        .lerp(fim, i / 4)
        .add(lado)
      p.y = cais.y + 0.04
      await levar(mundo(p), rumo(mundo(p), mundo(local('casa-mare'))))
      await page.waitForFunction(
        ({ p, pe }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            Math.abs(d.posicao.y - pe - p.y) < 0.15
          )
        },
        { p: mundo(p), pe: PE },
        { timeout: 30_000 },
      )
    }
    console.log(`${tipo}: cinco pontos do cais sustentam o corpo`)
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-cais.png`) })

    // Entrar pela boca, nadando no mar, sem carregar navio ou mergulho.
    const boca = local('caverna-entrada')
    boca.x -= 2
    boca.y = 0
    await levar(mundo(boca), rumo(mundo(boca), mundo(local('caverna'))))
    await page.waitForFunction(
      (altura) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return d && !d.noChao && Math.abs(d.posicao.y - altura) < 0.08
      },
      CENTRO_NADANDO,
      { timeout: 30_000 },
    )
    const salao = mundo(local('caverna'))
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(
        ({ p, altura }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d &&
            !d.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 1.6 &&
            Math.abs(d.posicao.y - altura) < 0.08
          )
        },
        { p: salao, altura: CENTRO_NADANDO },
        { timeout: 30_000 },
      )
    } finally {
      await page.keyboard.up('KeyW')
    }
    console.log(`${tipo}: entrou na caverna nadando`, await ler())
    // A câmera precisa mostrar o corpo por inteiro, sem ser empurrada para dentro da cabeça.
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-caverna.png`) })
    const naCaverna = await ler()
    if (
      !naCaverna ||
      Math.hypot(
        naCaverna.camera.x - naCaverna.posicao.x,
        naCaverna.camera.z - naCaverna.posicao.z,
      ) < 2
    ) {
      throw new Error('A câmera entrou no avatar sob o teto da caverna')
    }

    const casa = local('casa-mare')
    const mare = mundo(casa)
    // A 1,6 m da porta: dentro do alcance, sem pousar em cima do cilindro da Maré.
    const frente = local('morador').sub(casa).normalize().multiplyScalar(1.6).add(casa)
    const encontro = mundo(frente)
    await levar(encontro, rumo(encontro, mare))
    await page.waitForFunction(
      ({ p, pe }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d?.noChao &&
          Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
          Math.abs(d.posicao.y - pe - p.y) < 0.15
        )
      },
      { p: encontro, pe: PE },
    )
    await page.locator('.arq-acao').filter({ hasText: 'Conversar com a Maré' }).waitFor()
    if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
    else await page.keyboard.press('KeyE')
    const conversa = page.getByRole('dialog', { name: 'Maré' })
    await conversa.getByText('Sou Maré. Faço mapas do mar.').waitFor()
    // A câmera e a caixa terminam a entrada antes do print.
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-mare.png`) })
    await conversa.getByRole('button', { name: 'Continuar' }).click()
    await conversa.getByText('Sem meus mapas, o mar perdeu as rotas.').waitFor()
    await conversa.getByRole('button', { name: 'Tchau, Maré' }).click()
    await conversa.waitFor({ state: 'detached' })
    console.log(`${tipo}: conversa abriu, avançou e fechou`)

    // fase3-03: da areia seca da beira, replantar o coral galho (o aquário chega junto).
    const usar = async () => {
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await page.keyboard.press('KeyE')
    }
    const dePe = (p: P) =>
      page.waitForFunction(
        ({ p, pe }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            Math.abs(d.posicao.y - pe - p.y) < 0.15
          )
        },
        { p, pe: PE },
        { timeout: 30_000 },
      )
    const primeiro = PONTOS_DOS_CORAIS[0]
    if (!primeiro) throw new Error('Sem o primeiro coral')
    const galho = local(primeiro.ancora)
    const fora = (f: number): P => {
      const dx = galho.x - LAGOA_DO_RECIFE.x
      const dz = galho.z - LAGOA_DO_RECIFE.z
      const d = Math.hypot(dx, dz)
      return { x: galho.x + (dx / d) * f, y: TAMPO, z: galho.z + (dz / d) * f }
    }
    const beira = mundo(livre([0.8, 0.9, 1.0, 1.1].map(fora)))
    await levar(beira, rumo(beira, mundo(galho)))
    await dePe(beira)
    await page.locator('.arq-acao').filter({ hasText: 'Replantar o coral galho' }).waitFor()
    await usar()
    await page.locator('.arq-dica').filter({ hasText: 'aquário' }).waitFor({ timeout: 15_000 })
    await page.waitForFunction(
      () => {
        const bruto = localStorage.getItem('arquipelago-playground')
        const g = bruto ? (JSON.parse(bruto) as Guardado) : null
        return g?.salvamento?.recife?.corais === 1 && !!g.salvamento.projetos?.aquario
      },
      undefined,
      { timeout: 60_000 },
    )
    if ((await page.locator('.arq-acao').filter({ hasText: 'Replantar' }).count()) !== 0)
      throw new Error('O coral replantado continua oferecendo replantar')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-coral.png`) })
    console.log(`${tipo}: coral galho replantado e guardado, com o aquário em projeto azul`)

    // O mapa do arquipélago na mesa da Maré.
    const mesa = local('mapa')
    const perto = Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8
      return { x: mesa.x + Math.cos(a) * 1.3, y: TAMPO, z: mesa.z + Math.sin(a) * 1.3 }
    })
    const naMesa = mundo(livre(perto))
    await levar(naMesa, rumo(naMesa, mundo(mesa)))
    await dePe(naMesa)
    await page.locator('.arq-acao').filter({ hasText: 'Ver o mapa do arquipélago' }).waitFor()
    await usar()
    const mapa = page.getByRole('dialog', { name: 'Mapa do arquipélago' })
    await mapa.waitFor()
    const recifeNoMapa = mapa.locator('li').filter({ hasText: 'Recife Coral' })
    await recifeNoMapa.getByText('Você está aqui.').waitFor()
    await mapa
      .locator('li')
      .filter({ hasText: 'Pico Gelado' })
      .getByText('Abre em Mestre dos Jogos.')
      .waitFor()
    const largura = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    if (!largura) throw new Error('O mapa abriu com rolagem para o lado')
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-mapa.png`) })
    const voltar = mapa.getByRole('button', { name: 'Voltar ao jogo' })
    if (celular) await voltar.tap()
    else await voltar.click()
    await mapa.waitFor({ state: 'detached' })
    console.log(`${tipo}: o mapa abriu na mesa, com o Recife marcado, e fechou`)

    const agua = aguaDoRecife(modelo, { ...recife.centro, y: 0 }, giro)
    if (!agua) throw new Error('GLB sem a água da lagoa')
    const lagoa = mundo(local('lagoa'))
    await levar(lagoa, giro)
    await page.waitForFunction(
      ({ altura, p }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d &&
          !d.noChao &&
          Math.abs(d.posicao.y - altura) < 0.08 &&
          Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3
        )
      },
      { altura: agua.y + CENTRO_NADANDO, p: lagoa },
      { timeout: 30_000 },
    )
    await page.screenshot({ path: path.join(prints, `recife-${tipo}-lagoa.png`) })
    console.log(`${tipo}: lagoa sustenta a cintura na superfície`, await ler())
    // Afastar solta a ilha. Voltar ao lago monta a água novamente.
    await levar({ x: 0, y: 1, z: 20 }, 0)
    await page.waitForFunction(
      () =>
        (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.ilhasCompletas ===
        0,
    )
    await levar(lagoa, giro)
    await page.waitForFunction(
      ({ altura, p }) => {
        const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
        return (
          d &&
          d.ilhasCompletas === 1 &&
          !d.noChao &&
          Math.abs(d.posicao.y - altura) < 0.08 &&
          Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3
        )
      },
      { altura: agua.y + CENTRO_NADANDO, p: lagoa },
    )
    console.log(`${tipo}: saiu, soltou a ilha e voltou a nadar na lagoa`)
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()
  }
} finally {
  await browser?.close()
  server.kill()
}
