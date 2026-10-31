/**
 * O lote B7 (E04) no navegador de verdade, com a plataforma falsa e sem persistência:
 *
 * - `?obra=andar&posicao=7`: a casa com a sala à esquerda do quarto, o andar de cima (escada na
 *   sala, dois cômodos em cima do quarto, o piso aberto com o guarda-corpo) e um morrinho no
 *   quintal. A criança sobe a escada andando, fica de pé lá em cima e o guarda-corpo a segura na
 *   beira sem parede; no morrinho o chão sobe 1,5 m, e ela sobe até o alto andando.
 * - A barra do Construir: Terreno e Escada no térreo, a troca para o andar de cima (só as
 *   ferramentas de lá), no computador e no celular, sem rolar a página para o lado. No celular, a
 *   casa de fora e o piso aberto lá em cima, de pé na altura dele.
 *
 * O corpo é lido pelo `__arquipelagoLerCorpo` (o `rastro`, sob demanda) e as esperas contam quadros
 * desenhados (`quadros`), nunca um tempo fixo: com o SwiftShader a cena anda a poucos quadros por
 * segundo, e a leitura do medidor pesado (a cada 0,25 s de jogo) às vezes ainda não tinha mudado.
 * O teleporte põe o CENTRO do corpo: o alvo é o chão e o corpo é solto 35 cm acima (antes ele
 * ficava 70 cm dentro do piso, preso, e não andava).
 * - `?posicao=8`: a subida por fora do Farol registrada (a escada dela no movimento).
 *
 * Compilar para Node como os outros:
 *
 *   bun build playground/verificar-andar-e-terreno-browser.ts --target=node \
 *     --external playwright-core --outfile .cache/verificar-andar-e-terreno-browser.mjs && \
 *     node .cache/verificar-andar-e-terreno-browser.mjs
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/andar-e-terreno')
mkdirSync(prints, { recursive: true })
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
const servidor = spawn('bun', ['run', 'dev'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

type Ponto = { x: number; y: number; z: number }
type Corpo = Ponto & { noChao: boolean; velocidade: number }
type Escada = { id: string; base: Ponto; topo: Ponto }
type Janela = typeof globalThis & {
  __arquipelagoLevar?: (x: number, y: number, z: number, giro?: number) => void
  __arquipelagoMovimento?: () => { escadas: Escada[]; modo?: string }
  __arquipelagoLerCorpo?: () => Corpo
  __arquipelagoCameraEmVolta?: (desvio: number) => void
  __arquipelagoDesenho?: { quadrosPorSegundo?: number }
}

/** O topo do piso de baixo da casa (o mesmo do verificador dos móveis) e o do piso de cima. */
const PISO = 1.02
const PISO_DE_CIMA = PISO + 4.1
/** Do centro do corpo (o `rastro` do medidor) ao pé: `CORPO.doCentroAoPe`. */
const PE = 0.9
/** De quanto acima do chão o corpo é solto ao ser levado (cai e assenta). */
const SOLTO = 0.35

async function esperarMedidor(p: Page) {
  await p.waitForFunction(
    () =>
      typeof (globalThis as Janela).__arquipelagoLevar === 'function' &&
      typeof (globalThis as Janela).__arquipelagoLerCorpo === 'function',
    undefined,
    { timeout: 60_000 },
  )
}

/**
 * Espera `n` quadros desenhados de verdade. Com o SwiftShader a cena anda a poucos quadros por
 * segundo (às vezes menos de um): conferir por quadros, e não por tempo, é o que deixa a leitura
 * confiável (um tempo fixo às vezes acabava antes de o corpo mudar).
 */
async function quadros(p: Page, n: number) {
  await p.evaluate(
    (n) =>
      new Promise<void>((pronto) => {
        let falta = n
        const passo = () => (--falta <= 0 ? pronto() : requestAnimationFrame(passo))
        requestAnimationFrame(passo)
      }),
    n,
  )
}

/** O corpo agora (o `rastro` lido sob demanda, sem o intervalo do medidor pesado). */
async function corpo(p: Page): Promise<Corpo> {
  const c = await p.evaluate(() => (globalThis as Janela).__arquipelagoLerCorpo?.())
  assert(c, 'sem a leitura do corpo no medidor')
  return c
}

const pe = (c: Ponto) => c.y - PE

/**
 * Espera o corpo assentar: de pé no chão e parado (a altura e o lugar iguais em duas janelas
 * seguidas de 4 quadros), por até `maxQuadros` quadros (e 3 min).
 */
async function assentar(p: Page, maxQuadros = 600): Promise<Corpo> {
  const fim = Date.now() + 180_000
  let antes = await corpo(p)
  let iguais = 0
  let contados = 0
  while (iguais < 2) {
    assert(
      contados < maxQuadros && Date.now() < fim,
      `o corpo não assentou (${JSON.stringify(antes)})`,
    )
    await quadros(p, 4)
    contados += 4
    const agora = await corpo(p)
    const parado =
      agora.noChao &&
      Math.abs(agora.y - antes.y) < 0.005 &&
      Math.hypot(agora.x - antes.x, agora.z - antes.z) < 0.01
    iguais = parado ? iguais + 1 : 0
    antes = agora
  }
  return antes
}

/**
 * Leva a criança com os pés `SOLTO` acima de `alvo` (o ponto do chão), confere que o teleporte foi
 * feito (o corpo chegou ao lugar) e espera assentar. `giro` é o da câmera (a frente do W é
 * `-(sen g, cos g)`).
 */
async function levar(p: Page, alvo: Ponto, giro: number): Promise<Corpo> {
  const centro = { x: alvo.x, y: alvo.y + PE + SOLTO, z: alvo.z }
  await p.evaluate(
    ({ c, giro }) => (globalThis as Janela).__arquipelagoLevar?.(c.x, c.y, c.z, giro),
    { c: centro, giro },
  )
  let chegou = false
  for (let i = 0; i < 200 && !chegou; i++) {
    await quadros(p, 1)
    const c = await corpo(p)
    chegou = Math.hypot(c.x - alvo.x, c.z - alvo.z) < 0.3
  }
  assert(chegou, `o teleporte para ${JSON.stringify(alvo)} não aconteceu`)
  return assentar(p)
}

/** Conferir que está de pé num chão na altura `chao` (o pé a até 15 cm dele). */
function dePeEm(c: Corpo, chao: number, onde: string) {
  console.log(`${onde}: pé em ${pe(c).toFixed(2)} (chão em ${chao.toFixed(2)})`)
  assert(c.noChao, `${onde}: não está no chão`)
  assert(Math.abs(pe(c) - chao) < 0.15, `${onde}: o pé em ${pe(c).toFixed(2)}, o chão em ${chao}`)
}

async function escadas(p: Page): Promise<Escada[]> {
  return p.evaluate(() => (globalThis as Janela).__arquipelagoMovimento?.().escadas ?? [])
}

/**
 * Segura o W até `ate(corpo)` valer, conferindo a cada 2 quadros, por até `maxQuadros` quadros (e
 * 6 min). Devolve o último corpo lido.
 */
async function andarAte(p: Page, ate: (c: Corpo) => boolean, maxQuadros: number): Promise<Corpo> {
  await p.keyboard.down('KeyW')
  const fim = Date.now() + 360_000
  let c = await corpo(p)
  try {
    for (let n = 0; n < maxQuadros && Date.now() < fim && !ate(c); n += 2) {
      await quadros(p, 2)
      c = await corpo(p)
    }
  } finally {
    await p.keyboard.up('KeyW')
  }
  return c
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
  })

  // 1. O andar de cima e o morrinho (computador).
  {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    const erros: string[] = []
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`${base}/?novo=1&persistir=0&posicao=7&obra=andar&adiantar=4`, {
      waitUntil: 'networkidle',
    })
    await esperarMedidor(p)
    await p.waitForFunction(
      () =>
        (globalThis as Janela)
          .__arquipelagoMovimento?.()
          .escadas.some((e) => e.id === 'casa:escada-1'),
      undefined,
      { timeout: 60_000 },
    )
    await p.locator('canvas').click()

    const fps = await p.evaluate(
      () => (globalThis as Janela).__arquipelagoDesenho?.quadrosPorSegundo,
    )
    console.log(`Quadros por segundo no navegador: ${fps ?? '?'}`)

    // O chão de sempre e o alto do morrinho (a célula do meio tem 1,5 m).
    const plano = await levar(p, { x: 6.5, y: PISO + 1, z: 6.5 }, 0)
    const morro = await levar(p, { x: 10.5, y: PISO + 2.5, z: 6.5 }, 0)
    console.log(`Chão: pé em ${pe(plano).toFixed(2)}; alto do morrinho: ${pe(morro).toFixed(2)}`)
    assert(Math.abs(morro.y - plano.y - 1.5) < 0.2, 'o morrinho não levanta o chão 1,5 m')
    await p.screenshot({ path: path.join(prints, 'morrinho.png') })
    // Subir o morrinho andando (a cápsula de verdade na colisão moldada): do plano, para +x, por
    // cima do alto (de x 10 a 11 o chão fica 1,5 m acima; de 9,6 a 11,4, pelo menos 1,3), lendo o
    // corpo a cada quadro. Com poucos quadros por segundo cada quadro anda até 1,2 m: a janela de
    // 1,8 m sempre tem uma leitura, e o mais alto lido diz que ela subiu andando.
    const pePlano = await levar(p, { x: 6.5, y: PISO + 1, z: 6.5 }, -Math.PI / 2)
    let maisAlto = pePlano.y
    await p.keyboard.down('KeyW')
    try {
      for (let n = 0; n < 1500; n++) {
        await quadros(p, 1)
        const c = await corpo(p)
        if (c.x > 9.6 && c.x < 11.4) maisAlto = Math.max(maisAlto, c.y)
        if (c.x > 11.6) break
      }
    } finally {
      await p.keyboard.up('KeyW')
    }
    await assentar(p)
    console.log(
      `Subindo o morrinho a pé: de ${pe(pePlano).toFixed(2)} a ${(maisAlto - PE).toFixed(2)} no alto`,
    )
    assert(
      maisAlto - pePlano.y > 1.3 && maisAlto - pePlano.y < 1.7,
      'andando, o alto do morrinho não ficou 1,5 m acima',
    )

    // A escada (a registrada no movimento, `casa:escada-1`): a criança de pé 0,6 na frente do pé
    // dela, no chão de dentro de casa, a câmera virada para onde ela sobe.
    const escada = (await escadas(p)).find((e) => e.id === 'casa:escada-1')
    assert(escada, 'sem a escada da casa no movimento')
    const rumo = { x: escada.topo.x - escada.base.x, z: escada.topo.z - escada.base.z }
    const comprimento = Math.hypot(rumo.x, rumo.z)
    const frente = { x: rumo.x / comprimento, z: rumo.z / comprimento }
    const giro = Math.atan2(-frente.x, -frente.z)
    const embaixo = await levar(
      p,
      { x: escada.base.x - frente.x * 0.6, y: PISO, z: escada.base.z - frente.z * 0.6 },
      giro,
    )
    dePeEm(embaixo, PISO, 'Na frente do pé da escada')
    // O print com a câmera de lado (a escada aparece com o resto do andar escondido); depois a
    // câmera volta para onde ela sobe.
    await p.evaluate(() => (globalThis as Janela).__arquipelagoCameraEmVolta?.(Math.PI - 0.9))
    await quadros(p, 8)
    await p.screenshot({ path: path.join(prints, 'escada-embaixo.png') })
    await levar(
      p,
      { x: escada.base.x - frente.x * 0.6, y: PISO, z: escada.base.z - frente.z * 0.6 },
      giro,
    )
    const subindo = await andarAte(p, (c) => c.y > embaixo.y + 3.6, 3000)
    console.log(`Depois de subir: pé em ${pe(subindo).toFixed(2)}`)
    assert(subindo.y > embaixo.y + 3.6, 'não subiu a escada')
    // Mais uns passos no piso de cima (até 1,5 m além do alto da escada): continua lá (o piso
    // segura), de pé na altura do piso de cima.
    await andarAte(
      p,
      (c) => Math.hypot(c.x - escada.topo.x, c.z - escada.topo.z) > 1.5 && c.noChao,
      1500,
    )
    const noPiso = await assentar(p)
    dePeEm(noPiso, PISO_DE_CIMA, 'No piso de cima')
    await p.screenshot({ path: path.join(prints, 'andar-de-cima.png') })
    // Seguindo em frente, até a beira do piso de cima sem parede (a da sala, onde lá embaixo é o
    // quintal): o guarda-corpo segura (o corpo para encostado e continua lá em cima).
    let ultimo = await corpo(p)
    let parado = 0
    await andarAte(
      p,
      (c) => {
        parado = Math.hypot(c.x - ultimo.x, c.z - ultimo.z) < 0.005 ? parado + 1 : 0
        ultimo = c
        return parado >= 4
      },
      1500,
    )
    const naBeira = await assentar(p)
    dePeEm(naBeira, PISO_DE_CIMA, 'Encostado no guarda-corpo')
    assert(parado >= 4, 'não parou na beira do piso de cima')
    await p.screenshot({ path: path.join(prints, 'guarda-corpo.png') })

    // Dentro do cômodo de cima (em cima do quarto, à direita da porta de lambri do piso aberto).
    const noComodo = await levar(p, { x: -3, y: PISO_DE_CIMA, z: -4 }, Math.PI / 2)
    dePeEm(noComodo, PISO_DE_CIMA, 'No cômodo de cima')
    await p.screenshot({ path: path.join(prints, 'comodo-de-cima.png') })
    // A porta de lambri do andar vista do piso aberto (de x < -6, olhando para +x).
    const noAberto = await levar(p, { x: -8.5, y: PISO_DE_CIMA, z: -2.5 }, -Math.PI / 2)
    dePeEm(noAberto, PISO_DE_CIMA, 'No piso aberto')
    await quadros(p, 6)
    await p.screenshot({ path: path.join(prints, 'porta-de-lambri-do-andar.png') })

    // A casa de fora, com o kit do andar já carregado (antes, só as caixas da reserva): de frente,
    // e do lado da sala (oeste), olhando para +x, com o piso aberto, o guarda-corpo e a porta de
    // lambri do andar.
    await levar(p, { x: -9, y: PISO + 0.5, z: 10 }, 0)
    await quadros(p, 8)
    await p.screenshot({ path: path.join(prints, 'casa-com-andar-de-fora.png') })
    await levar(p, { x: -18, y: PISO + 0.5, z: -3.5 }, -Math.PI / 2)
    await quadros(p, 8)
    await p.screenshot({ path: path.join(prints, 'casa-com-andar-do-lado.png') })

    // O Construir: Terreno e Escada no térreo; lá em cima, só as ferramentas de lá.
    await levar(p, { x: -9, y: PISO + 0.5, z: 10 }, 0)
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    const barra = p.getByRole('group', { name: 'Ferramenta' })
    await barra.getByRole('button', { name: /Terreno/ }).waitFor()
    await barra.getByRole('button', { name: /Escada/ }).waitFor()
    await p.screenshot({ path: path.join(prints, 'construir-terreo.png') })
    await p.getByRole('button', { name: 'Andar de cima', exact: true }).click()
    await quadros(p, 4)
    assert.equal(await barra.getByRole('button', { name: /Terreno/ }).count(), 0)
    assert.equal(await barra.getByRole('button', { name: /Móveis/ }).count(), 0)
    await barra.getByRole('button', { name: /Parede/ }).waitFor()
    await p.screenshot({ path: path.join(prints, 'construir-andar-de-cima.png') })
    await p.getByRole('button', { name: 'Térreo', exact: true }).click()
    await barra.getByRole('button', { name: /Terreno/ }).click()
    await p.getByRole('button', { name: '⬇ Descer', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Pronto', exact: true }).click()
    assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`)
    await contexto.close()
  }

  // 2. A barra no celular: as ferramentas cabem, sem rolar a página para o lado.
  {
    const contexto = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    await p.goto(`${base}/?novo=1&persistir=0&posicao=7&obra=andar&adiantar=4`, {
      waitUntil: 'networkidle',
    })
    await esperarMedidor(p)
    await p.waitForFunction(
      () =>
        (globalThis as Janela)
          .__arquipelagoMovimento?.()
          .escadas.some((e) => e.id === 'casa:escada-1'),
      undefined,
      { timeout: 60_000 },
    )
    // Lá em cima, o piso aberto com a porta de lambri; depois a casa com o andar de fora (com o
    // kit já carregado).
    const emCima = await levar(p, { x: -8.5, y: PISO_DE_CIMA, z: -2.5 }, -Math.PI / 2)
    dePeEm(emCima, PISO_DE_CIMA, 'No piso aberto (celular)')
    await quadros(p, 6)
    await p.screenshot({ path: path.join(prints, 'andar-de-cima-celular.png') })
    await levar(p, { x: -18, y: PISO + 0.5, z: -3.5 }, -Math.PI / 2)
    await quadros(p, 8)
    await p.screenshot({ path: path.join(prints, 'casa-com-andar-celular.png') })
    await levar(p, { x: -9, y: PISO + 0.5, z: 10 }, 0)
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    await p
      .getByRole('group', { name: 'Ferramenta' })
      .getByRole('button', { name: /Escada/ })
      .waitFor()
    await p.getByRole('button', { name: 'Andar de cima', exact: true }).waitFor()
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await p.screenshot({ path: path.join(prints, 'construir-celular.png') })
    await contexto.close()
  }

  // 3. A subida por fora do Farol na Lenda.
  {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    p.setDefaultTimeout(45_000)
    await p.goto(`${base}/?novo=1&persistir=0&posicao=8`, { waitUntil: 'networkidle' })
    await esperarMedidor(p)
    await p.waitForFunction(
      () =>
        (globalThis as Janela)
          .__arquipelagoMovimento?.()
          .escadas.some((e) => e.id.startsWith('farol:')),
      undefined,
      { timeout: 60_000 },
    )
    const daLenda = await escadas(p)
    console.log(`Escadas na Lenda: ${daLenda.map((e) => e.id).join(', ')}`)
    // Ao pé da escada da subida (a primeira do Farol), de costas para ela, olhando a torre.
    const subida = daLenda.find((e) => e.id.startsWith('farol:'))
    assert(subida, 'sem a escada da subida do Farol')
    const r = { x: subida.topo.x - subida.base.x, z: subida.topo.z - subida.base.z }
    const n = Math.hypot(r.x, r.z) || 1
    const pe0 = await levar(
      p,
      {
        x: subida.base.x - (r.x / n) * 2,
        y: subida.base.y + 0.3,
        z: subida.base.z - (r.z / n) * 2,
      },
      Math.atan2(-r.x / n, -r.z / n),
    )
    assert(pe0.noChao, 'não ficou de pé ao pé da subida')
    await p.screenshot({ path: path.join(prints, 'subida-do-farol.png') })
    await contexto.close()
  }
  console.log('Lote B7 no navegador: tudo certo.')
} finally {
  await browser?.close()
  servidor.kill()
}
