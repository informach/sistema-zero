/**
 * O lote B7 (E04) no navegador de verdade, com a plataforma falsa e sem persistência:
 *
 * - `?obra=andar&posicao=7`: a casa com a sala à esquerda do quarto, o andar de cima (escada na
 *   sala, dois cômodos em cima do quarto, o piso aberto com o guarda-corpo) e um morrinho no
 *   quintal. A criança sobe a escada andando e fica de pé lá em cima; no morrinho o chão sobe.
 * - A barra do Construir: Terreno e Escada no térreo, a troca para o andar de cima (só as
 *   ferramentas de lá), no computador e no celular, sem rolar a página para o lado.
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
type Janela = typeof globalThis & {
  __arquipelagoLevar?: (x: number, y: number, z: number, giro?: number) => void
  __arquipelagoMovimento?: () => { escadas: { id: string }[]; modo?: string }
  __arquipelagoDesenho?: { posicao?: Ponto }
}

/** O topo do piso de baixo da casa (o mesmo do verificador dos móveis) e o do piso de cima. */
const PISO = 1.02
const PISO_DE_CIMA = PISO + 4.1

async function esperarMedidor(p: Page) {
  await p.waitForFunction(
    () => typeof (globalThis as Janela).__arquipelagoLevar === 'function',
    undefined,
    { timeout: 60_000 },
  )
}

/**
 * Leva a criança e espera o corpo assentar (com o SwiftShader a cena anda a uns 1 quadro por
 * segundo: nunca um tempo fixo).
 */
async function levar(p: Page, alvo: Ponto, giro: number) {
  await p.evaluate(
    ({ alvo, giro }) => (globalThis as Janela).__arquipelagoLevar?.(alvo.x, alvo.y, alvo.z, giro),
    { alvo, giro },
  )
  await assentar(p)
}

/** Espera a altura parar de mudar (duas leituras seguidas iguais), por até 90 s. */
async function assentar(p: Page): Promise<Ponto> {
  const fim = Date.now() + 90_000
  let antes = await posicao(p)
  let iguais = 0
  while (Date.now() < fim && iguais < 2) {
    await p.waitForTimeout(1500)
    const agora = await posicao(p)
    iguais =
      Math.abs(agora.y - antes.y) < 0.005 && Math.hypot(agora.x - antes.x, agora.z - antes.z) < 0.01
        ? iguais + 1
        : 0
    antes = agora
  }
  return antes
}

async function posicao(p: Page): Promise<Ponto> {
  const pos = await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)
  assert(pos, 'sem a posição no medidor')
  return pos
}

async function escadas(p: Page): Promise<string[]> {
  return p.evaluate(
    () => (globalThis as Janela).__arquipelagoMovimento?.().escadas.map((e) => e.id) ?? [],
  )
}

/** Anda para a frente (a câmera olhando para `-(sen g, cos g)`) até `y` passar de `acima`. */
async function andarAte(p: Page, acima: number, prazoMs: number): Promise<Ponto> {
  await p.keyboard.down('KeyW')
  const fim = Date.now() + prazoMs
  let pos = await posicao(p)
  while (Date.now() < fim && pos.y < acima) {
    await p.waitForTimeout(250)
    pos = await posicao(p)
  }
  await p.keyboard.up('KeyW')
  return pos
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
    await p.goto(`${base}/?novo=1&persistir=0&posicao=7&obra=andar`, { waitUntil: 'networkidle' })
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

    // A casa de fora, com o andar de cima e o guarda-corpo.
    await levar(p, { x: -9, y: PISO + 0.2, z: 10 }, 0)
    await p.screenshot({ path: path.join(prints, 'casa-com-andar-de-fora.png') })

    // O chão de sempre e o alto do morrinho (a célula do meio tem 1,5 m).
    await levar(p, { x: 6.5, y: PISO + 3, z: 6.5 }, 0)
    const plano = await posicao(p)
    await levar(p, { x: 10.5, y: PISO + 4, z: 6.5 }, 0)
    const morro = await posicao(p)
    console.log(`Chão: ${plano.y.toFixed(2)}; alto do morrinho: ${morro.y.toFixed(2)}`)
    assert(Math.abs(morro.y - plano.y - 1.5) < 0.2, 'o morrinho não levanta o chão 1,5 m')
    await p.screenshot({ path: path.join(prints, 'morrinho.png') })

    // A escada: na frente do pé (célula -10, -1), andando para -z.
    await levar(p, { x: -9.5, y: PISO + 0.2, z: -0.4 }, 0)
    const embaixo = await posicao(p)
    await p.screenshot({ path: path.join(prints, 'escada-embaixo.png') })
    const emCima = await andarAte(p, embaixo.y + 3.6, 240_000)
    console.log(`Pé da escada: ${embaixo.y.toFixed(2)}; depois de subir: ${emCima.y.toFixed(2)}`)
    assert(emCima.y > embaixo.y + 3.6, 'não subiu a escada')
    // Mais uns passos no piso de cima: continua lá (o piso segura).
    await p.keyboard.down('KeyW')
    await p.waitForTimeout(6000)
    await p.keyboard.up('KeyW')
    const noPiso = await assentar(p)
    console.log(`No piso de cima: ${noPiso.y.toFixed(2)} (piso em ${PISO_DE_CIMA.toFixed(2)})`)
    assert(noPiso.y > embaixo.y + 3.8, 'caiu do piso de cima')
    await p.screenshot({ path: path.join(prints, 'andar-de-cima.png') })

    // Dentro do cômodo de cima (em cima do quarto, à direita da porta lisa do piso aberto).
    await levar(p, { x: -3, y: PISO_DE_CIMA + 0.3, z: -4 }, Math.PI / 2)
    const noComodo = await posicao(p)
    assert(noComodo.y > PISO_DE_CIMA - 0.3, 'o piso do cômodo de cima não segura')
    await p.screenshot({ path: path.join(prints, 'comodo-de-cima.png') })

    // O Construir: Terreno e Escada no térreo; lá em cima, só as ferramentas de lá.
    await levar(p, { x: -9, y: PISO + 0.2, z: 10 }, 0)
    await p.getByRole('button', { name: 'Construir', exact: true }).click()
    const barra = p.getByRole('group', { name: 'Ferramenta' })
    await barra.getByRole('button', { name: /Terreno/ }).waitFor()
    await barra.getByRole('button', { name: /Escada/ }).waitFor()
    await p.screenshot({ path: path.join(prints, 'construir-terreo.png') })
    await p.getByRole('button', { name: 'Andar de cima', exact: true }).click()
    await p.waitForTimeout(1500)
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
    await p.goto(`${base}/?novo=1&persistir=0&posicao=7&obra=andar`, { waitUntil: 'networkidle' })
    await esperarMedidor(p)
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
    console.log(`Escadas na Lenda: ${(await escadas(p)).join(', ')}`)
    await levar(p, { x: -12, y: PISO + 0.5, z: -3 }, 0)
    await p.screenshot({ path: path.join(prints, 'subida-do-farol.png') })
    await contexto.close()
  }
  console.log('Lote B7 no navegador: tudo certo.')
} finally {
  await browser?.close()
  servidor.kill()
}
