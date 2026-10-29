/**
 * Recordes da família e visitas no navegador (fase3-12). Só usa a plataforma falsa, sem banco.
 *
 * 1. Computador (1280 × 800, `?familia=irmaos`): corre a entrega pelos telhados até o resultado e
 *    confere os "Recordes da família" (ela e os irmãos de mentira, a Ana e o Tomás). Depois abre
 *    "Visitar um irmão" pelo menu, entra na casa da Ana (a obra de exemplo no lugar da casa de
 *    antes), confere a faixa, que o Construir sumiu e que NADA é gravado durante a visita (a
 *    revisão guardada no playground fica parada, e fora dela anda a cada poucos segundos), e volta.
 *    O quarto de dentro é o da Ana (29/10/2026): ao lado da cama dela, "Deitar na cama" não
 *    aparece; no mesmo lugar, em casa, aparece. Na visita ao Tomás o Zappy avisa que o quarto dele
 *    não abriu, e sair da ilha central no meio da visita termina a visita.
 * 2. Celular (390 × 844, toque): a visita pelo menu, a faixa fora do direcional, e a volta.
 * 3. As recusas no painel: visitas desligadas e o serviço fora do ar (com "Tentar de novo").
 *
 * No Windows: `bun build playground/verificar-visitas-browser.ts --target=node --external
 * playwright-core --outfile .cache/verificar-visitas-browser.mjs && node .cache/verificar-visitas-browser.mjs`.
 * Aceita `ARQUIPELAGO_CHROMIUM` (com o SwiftShader), `ARQUIPELAGO_TEST_PORT` e `ARQUIPELAGO_PRINTS`.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { cellToWorld } from '@sistemazero/avatar-quarto/quarto/coords'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { percursoNoMundo } from '../src/mundo/bosque'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  CENTRO_DA_CASA,
  giroDaIlha,
  ilhasEmVolta,
  RAIO_DA_PRAIA,
} from '../src/mundo/medidas'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import { CHEGADA_DA_VISITA } from '../src/sistemas/visitas'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4602)
const base = `http://127.0.0.1:${porta}`
const prints = process.env.ARQUIPELAGO_PRINTS ?? path.resolve('.cache/visitas')
mkdirSync(prints, { recursive: true })
const chromiumLinux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel =
  process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(chromiumLinux) ? chromiumLinux : undefined)

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; ilhasCompletas: number }
type Janela = typeof globalThis & {
  __arquipelagoDesenho?: Desenho
  __arquipelagoLevar?: (...a: number[]) => void
}

// Os pontos da entrega pelos telhados no mundo (o mesmo cálculo do verificador dos percursos).
const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
if (!vila) throw new Error('Sem a Vila Doce no anel.')
const glb = readFileSync(path.resolve('src/assets/ilhas/vila-doce.glb'))
const modelo = (
  await new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
    '',
  )
).scene
const ancoras = {} as Record<string, P>
for (const n of NOMES_DAS_ANCORAS_DOS_TELHADOS) {
  const o = modelo.getObjectByName(n)
  if (!o) throw new Error(`sem a âncora ${n}`)
  ancoras[n] = { x: o.position.x, y: o.position.y, z: o.position.z }
}
const telhados = percursoNoMundo(
  telhadosNoModelo(ancoras as AncorasDosTelhados),
  { x: vila.centro.x, y: 0, z: vila.centro.z },
  giroDaIlha(vila.ilha),
)

const servidor = spawn('bun', ['playground/servidor.ts'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

const levar = (pagina: Page, p: P, olhar: number) =>
  pagina.evaluate(({ x, y, z, g }) => (globalThis as Janela).__arquipelagoLevar?.(x, y, z, g), {
    x: p.x,
    y: p.y + 1.2,
    z: p.z,
    g: olhar + Math.PI,
  })

/** A revisão que o playground guardou (a plataforma de mentira grava a cada PUT aceito). */
const revisao = (pagina: Page) =>
  pagina.evaluate(() => {
    const bruto = localStorage.getItem('arquipelago-playground')
    return bruto ? (JSON.parse(bruto) as { revisao: number }).revisao : 0
  })

async function abrirVisitas(pagina: Page) {
  await pagina.getByRole('button', { name: 'Abrir o menu' }).click()
  await pagina.getByRole('button', { name: '🏡 Visitar um irmão' }).click()
  const painel = pagina.getByRole('dialog', { name: 'Visitar um irmão' })
  await painel.waitFor()
  return painel
}

/** Entra na casa da Ana, confere a faixa e que o Construir sumiu, e devolve a faixa. */
async function visitarAna(pagina: Page) {
  const painel = await abrirVisitas(pagina)
  await painel.getByText('Ana').waitFor()
  await painel.getByText('Tomás').waitFor()
  await painel.getByText('Já construiu a casa.').waitFor()
  await painel.getByText('Ainda mora na casa de antes.').waitFor()
  await painel.getByRole('button', { name: 'Ver a casa de Ana' }).click()
  await painel.waitFor({ state: 'hidden' })
  const faixa = pagina.locator('.arq-visita-faixa')
  await faixa.getByText('Você está na casa de Ana. Aqui você só olha.').waitFor()
  assert.equal(await pagina.locator('.arq-modos').count(), 0, 'o Construir continua na visita')
  return faixa
}

/**
 * Ao lado da cama, dentro do quarto: a da Ana (beliche) e a do quarto de exemplo ficam na mesma
 * célula (0, 1), 2 × 3, então o mesmo ponto serve para a visita e para casa.
 */
const camaNoMundo = cellToWorld(0, 1, 2, 3)
const aoLadoDaCama = {
  x: CENTRO_DA_CASA.x + camaNoMundo.x + 1.6,
  y: ALTURA_DA_TERRA,
  z: CENTRO_DA_CASA.z + camaNoMundo.z,
}

async function voltar(pagina: Page, faixa: ReturnType<Page['locator']>) {
  await faixa.getByRole('button', { name: 'Voltar para a minha casa' }).click()
  await faixa.waitFor({ state: 'detached' })
  await pagina.locator('.arq-modos').waitFor()
}

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

  // ── 1. Computador: recordes no resultado e a visita sem gravar ──────────────────────────────
  {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const pagina = await contexto.newPage()
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    const largada = telhados.largada
    const em = `${largada.x.toFixed(2)},${largada.z.toFixed(2)},${(largada.y + 1.2).toFixed(2)}`
    await pagina.goto(`${base}/?novo=1&posicao=8&familia=irmaos&em=${em}`, {
      waitUntil: 'domcontentloaded',
    })
    await pagina.waitForFunction(
      () => ((globalThis as Janela).__arquipelagoDesenho?.ilhasCompletas ?? 0) > 0,
      undefined,
      { timeout: 180_000 },
    )
    await pagina.locator('canvas').click()
    await pagina.waitForTimeout(3000)
    await levar(pagina, telhados.largada, telhados.rumoDaLargada)
    await pagina.getByText('Começar a entrega pelos telhados').first().waitFor({ timeout: 30_000 })
    await pagina.keyboard.press('KeyE')
    await pagina.getByRole('timer', { name: 'Entrega pelos telhados' }).waitFor()
    for (const d of telhados.deques) {
      await levar(pagina, d, d.rumoDaVolta)
      await pagina.waitForTimeout(3000)
    }
    await levar(pagina, telhados.chegada, 0)
    const resultado = pagina.getByRole('dialog', { name: 'Entrega pelos telhados' })
    await resultado.waitFor({ timeout: 30_000 })
    const recordes = resultado.locator('.arq-recordes')
    await recordes.getByText('Recordes da família').waitFor({ timeout: 30_000 })
    const linhas = await recordes.locator('li').allInnerTexts()
    assert.equal(linhas.length, 3, `linhas: ${linhas.join(' | ')}`)
    assert(
      linhas.some((l) => l.includes('Ana') && l.includes('0:25,9')),
      linhas.join(' | '),
    )
    assert(linhas.some((l) => l.includes('Tomás') && l.includes('Ainda não correu')))
    assert(linhas.some((l) => l.includes('Você')))
    await pagina.screenshot({ path: path.join(prints, 'computador-1-recordes.png') })
    await resultado.getByRole('button', { name: 'Continuar' }).click()
    await resultado.waitFor({ state: 'detached' })

    // A visita: na frente da casa da ilha central.
    const { x, z } = CHEGADA_DA_VISITA
    await levar(pagina, { x, y: alturaDaIlha(x, z), z }, Math.PI)
    await pagina.waitForTimeout(4000)
    // Fora da visita, a revisão guardada anda (os relógios mudam o jogo a cada 2 s).
    const antes = await revisao(pagina)
    await pagina.waitForFunction(
      (r) => {
        const bruto = localStorage.getItem('arquipelago-playground')
        return bruto ? (JSON.parse(bruto) as { revisao: number }).revisao > r : false
      },
      antes,
      { timeout: 60_000 },
    )
    const painel = await abrirVisitas(pagina)
    await pagina.screenshot({ path: path.join(prints, 'computador-2-painel.png') })
    await painel.getByRole('button', { name: 'Voltar ao jogo' }).click()
    const faixa = await visitarAna(pagina)
    // A fila do jogo grava até 20 s depois (`intervaloMs`): o que ela mudou ANTES de entrar ainda
    // pode chegar. Depois dessa janela, nada mais: a revisão fica parada por mais de uma janela.
    await pagina.waitForTimeout(23_000)
    const naVisita = await revisao(pagina)
    await pagina.waitForTimeout(25_000)
    assert.equal(await revisao(pagina), naVisita, 'a visita gravou alguma coisa')
    await pagina.screenshot({ path: path.join(prints, 'computador-3-casa-da-ana.png') })
    // O quarto da Ana: ao lado da cama dela, nada para fazer (só se olha).
    await levar(pagina, aoLadoDaCama, Math.PI / 2)
    await pagina.waitForTimeout(4000)
    assert.equal(
      await pagina.getByText('Deitar na cama').count(),
      0,
      'a cama da Ana oferece deitar',
    )
    await pagina.screenshot({ path: path.join(prints, 'computador-4-quarto-da-ana.png') })
    await voltar(pagina, faixa)
    await pagina.waitForTimeout(3000)
    await pagina.screenshot({ path: path.join(prints, 'computador-5-de-volta.png') })
    // De volta, o jogo dela grava de novo.
    await pagina.waitForFunction(
      (r) => {
        const bruto = localStorage.getItem('arquipelago-playground')
        return bruto ? (JSON.parse(bruto) as { revisao: number }).revisao > r : false
      },
      naVisita,
      { timeout: 60_000 },
    )
    // Em casa, no mesmo lugar, a cama dela oferece deitar (o teste de cima não passa por acaso).
    await levar(pagina, aoLadoDaCama, Math.PI / 2)
    await pagina.getByText('Deitar na cama').first().waitFor({ timeout: 60_000 })
    // Sair da ilha central no meio da visita termina a visita.
    await levar(pagina, { x, y: alturaDaIlha(x, z), z }, Math.PI)
    await pagina.waitForTimeout(3000)
    const deNovo = await visitarAna(pagina)
    await levar(pagina, { x: 0, y: 0.5, z: RAIO_DA_PRAIA + 4 }, 0)
    await deNovo.waitFor({ state: 'detached', timeout: 60_000 })
    await pagina.getByText('Você saiu da casa de Ana. O seu jogo volta a ser guardado.').waitFor()
    await pagina.locator('.arq-modos').waitFor()
    // O Tomás: o quarto dele não abriu, e o Zappy diz.
    await levar(pagina, { x, y: alturaDaIlha(x, z), z }, Math.PI)
    await pagina.waitForTimeout(3000)
    const visitas = await abrirVisitas(pagina)
    await visitas.getByRole('button', { name: 'Ver a casa de Tomás' }).click()
    await visitas.waitFor({ state: 'hidden' })
    await pagina.getByText('O quarto de Tomás não abriu agora.', { exact: false }).waitFor()
    await pagina.screenshot({ path: path.join(prints, 'computador-6-casa-do-tomas.png') })
    await voltar(pagina, pagina.locator('.arq-visita-faixa'))
    assert.deepEqual(erros, [])
    console.log(
      'PASS computador: recordes, visita sem gravar, o quarto da Ana, a saída da ilha e o Tomás',
    )
    await contexto.close()
  }

  // ── 2. Celular: a visita com toque ──────────────────────────────────────────────────────────
  {
    const largura = 390
    const altura = 844
    const contexto = await browser.newContext({
      viewport: { width: largura, height: altura },
      hasTouch: true,
      isMobile: true,
    })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const pagina = await contexto.newPage()
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    const { x, z } = CHEGADA_DA_VISITA
    await pagina.goto(`${base}/?novo=1&persistir=0&familia=irmaos&em=${x},${z}`, {
      waitUntil: 'networkidle',
    })
    await pagina.waitForFunction(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)
    await pagina.waitForTimeout(2000)
    const painel = await abrirVisitas(pagina)
    const larguras = await painel.evaluate((el) => ({ rola: el.scrollWidth, cabe: el.clientWidth }))
    assert(
      larguras.rola <= larguras.cabe + 1,
      `o painel rola para o lado: ${JSON.stringify(larguras)}`,
    )
    await pagina.screenshot({ path: path.join(prints, 'celular-1-painel.png') })
    await painel.getByRole('button', { name: 'Voltar ao jogo' }).click()
    const faixa = await visitarAna(pagina)
    const r = await faixa.boundingBox()
    assert(r)
    const naZona = r.x < largura / 2 && r.y + r.height > altura * 0.45
    assert(!naZona, `a faixa cobre o direcional: ${JSON.stringify(r)}`)
    for (const outro of ['.arq-topo-dir', '.arq-necessidades']) {
      const o = await pagina.locator(outro).boundingBox()
      if (!o) continue
      const cruza =
        r.x < o.x + o.width && o.x < r.x + r.width && r.y < o.y + o.height && o.y < r.y + r.height
      assert(!cruza, `a faixa cobre ${outro}: ${JSON.stringify({ r, o })}`)
    }
    await pagina.waitForTimeout(2000)
    await pagina.screenshot({ path: path.join(prints, 'celular-2-casa-da-ana.png') })
    await voltar(pagina, faixa)
    assert.deepEqual(erros, [])
    console.log('PASS celular: visita pelo menu, faixa fora do direcional, volta')
    await contexto.close()
  }

  // ── 3. As recusas no painel ─────────────────────────────────────────────────────────────────
  for (const [familia, texto] of [
    ['desligada', 'As visitas entre irmãos estão desligadas. Quem decide são os responsáveis.'],
    ['fora-do-ar', 'As visitas não carregaram agora. Tente de novo daqui a pouco.'],
    ['sozinha', 'Ainda não há irmãos jogando o Arquipélago nesta conta.'],
  ] as const) {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    contexto.setDefaultTimeout(120_000)
    const pagina = await contexto.newPage()
    const { x, z } = CHEGADA_DA_VISITA
    await pagina.goto(`${base}/?novo=1&persistir=0&familia=${familia}&em=${x},${z}`, {
      waitUntil: 'networkidle',
    })
    const painel = await abrirVisitas(pagina)
    await painel.getByText(texto).waitFor()
    if (familia === 'fora-do-ar')
      await painel.getByRole('button', { name: 'Tentar de novo' }).waitFor()
    await pagina.screenshot({ path: path.join(prints, `recusa-${familia}.png`) })
    console.log(`PASS recusa ${familia}`)
    await contexto.close()
  }
  console.log(`Prints: ${prints}`)
} finally {
  await browser?.close()
  if (servidor.exitCode === null) servidor.kill()
}
