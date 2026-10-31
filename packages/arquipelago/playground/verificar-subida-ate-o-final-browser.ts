/**
 * A subida por fora do Farol até o final (N4, revisão de 31/10/2026), no navegador de verdade, com
 * a plataforma falsa num jogo novo na Lenda: começar a subida no pé do Farol, passar pelas cinco
 * paradas e chegar à varanda (o percurso lido das âncoras do `farol.glb`, como o jogo lê), e no
 * resultado "Entrar na sala do alto" leva à sala, onde a última página está ao alcance. A porta de
 * baixo continua sendo o caminho direto ("Subir pela escada de dentro"). No computador e no
 * celular emulado.
 *
 * Lacunas de 01/11/2026: sem o planador a largada não começa e o Zappy diz o que falta (o vento do
 * último trecho só leva quem plana); com ele (`?planador=1`), fechando o resultado com Continuar,
 * a própria varanda oferece "Entrar na sala do alto".
 *
 * ⚠️ As paradas são alcançadas por teleporte (`__arquipelagoLevar`), não pelos movimentos: o que se
 * prova aqui é o caminho do percurso até o final. Escada, quinas, equilíbrio e vento têm a prova
 * deles em `tests/subida-do-farol.test.ts` e nos testes de modos.
 *
 *   bun build playground/verificar-subida-ate-o-final-browser.ts --target=node \
 *     --external playwright-core --outfile .cache/verificar-subida-ate-o-final-browser.mjs && \
 *     node .cache/verificar-subida-ate-o-final-browser.mjs
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ROTULO_DA_PORTA_DO_FAROL } from '../src/mundo/final-do-farol'
import { ROTULO_DA_VARANDA, subidaDoFarolNoMundo } from '../src/mundo/subida-do-farol'
import { FALTA_O_PLANADOR_NO_FAROL, PERCURSO_DO_FAROL } from '../src/sistemas/percurso'

const porta = Number(process.env.ARQUIPELAGO_TEST_PORT ?? 4531)
const base = `http://127.0.0.1:${porta}`
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/subida-ate-o-final')
mkdirSync(prints, { recursive: true })
const linux = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel = process.env.ARQUIPELAGO_CHROMIUM ?? (existsSync(linux) ? linux : undefined)
/** A pasta do pacote: o verificador roda de dentro dela (o compilado fica em `.cache/<pasta>/`). */
const pacote = process.cwd()

type Ponto = { x: number; y: number; z: number }
type Janela = typeof globalThis & {
  __arquipelagoLevar?: (x: number, y: number, z: number, giro?: number) => void
  __arquipelagoDesenho?: { posicao?: Ponto }
}

async function pontosDaSubida() {
  const bin = readFileSync(path.join(pacote, 'src', 'assets', 'mundo', 'farol.glb'))
  const raiz = (
    await new GLTFLoader().parseAsync(
      bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
      '',
    )
  ).scene
  raiz.updateMatrixWorld(true)
  const subida = subidaDoFarolNoMundo(raiz)
  if (!subida) throw new Error('O farol.glb não tem as âncoras da subida.')
  return subida.pontos
}

/** As cenas de chegada das pontes (jogo novo na Lenda) seguram o E: pula uma por uma. */
async function pularChegadas(p: Page) {
  const pular = p.locator('.arq-chegada-pular')
  for (let i = 0; i < 12; i++) {
    try {
      await pular.waitFor({ state: 'visible', timeout: 4000 })
    } catch {
      return
    }
    await pular.click()
    await pular.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
  }
}

const servidor = spawn('bun', ['run', 'dev'], {
  env: { ...process.env, PORTA: String(porta) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
servidor.stdout.on('data', () => {})
servidor.stderr.on('data', (d) => process.stderr.write(d))

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const pontos = await pontosDaSubida()
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
  // Sem o planador (num navegador limpo, só no computador): a largada fica no pé do Farol e o
  // Zappy diz o que falta. O diário local fica nesta aba e não conflita com o jogo novo seguinte.
  {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    await p.goto(`${base}/?novo=1&persistir=0&posicao=8`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => typeof (globalThis as Janela).__arquipelagoLevar === 'function')
    await pularChegadas(p)
    await p.locator('canvas').click()
    await p.evaluate(
      ({ alvo, giro }) =>
        (globalThis as Janela).__arquipelagoLevar?.(alvo.x, alvo.y + 1.2, alvo.z, giro),
      { alvo: pontos.largada, giro: pontos.rumoDaLargada + Math.PI },
    )
    await p.getByText(PERCURSO_DO_FAROL.rotuloDaLargada).first().waitFor({ timeout: 180_000 })
    await p.keyboard.press('KeyE')
    await p.getByText(FALTA_O_PLANADOR_NO_FAROL).first().waitFor({ timeout: 30_000 })
    assert.equal(
      await p.getByRole('timer', { name: PERCURSO_DO_FAROL.nome }).count(),
      0,
      'a subida começou sem o planador',
    )
    await p.screenshot({ path: path.join(prints, 'sem-planador-1280.png') })
    console.log('1280px: sem o planador, a largada diz o que falta')
    await contexto.close()
  }
  for (const tela of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const celular = tela.width === 390
    const contexto = await browser.newContext({ viewport: tela, hasTouch: celular })
    contexto.setDefaultTimeout(120_000)
    await contexto.addInitScript(() => localStorage.setItem('arquipelago:medir', '1'))
    const p = await contexto.newPage()
    const erros: string[] = []
    p.on('pageerror', (e) =>
      erros.push(`${e.message} ${(e.stack ?? '').split('\n').slice(0, 6).join(' | ')}`),
    )
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 300)}`)
    })
    const levar = (alvo: Ponto, giro: number) =>
      p.evaluate(
        ({ alvo, giro }) =>
          (globalThis as Janela).__arquipelagoLevar?.(alvo.x, alvo.y + 1.2, alvo.z, giro),
        { alvo, giro },
      )
    const posicao = async () =>
      (await p.evaluate(() => (globalThis as Janela).__arquipelagoDesenho?.posicao)) ?? {
        x: 0,
        y: 0,
        z: 0,
      }
    /** Espera o corpo chegar perto do alvo (o SwiftShader anda a ~1 quadro por segundo). */
    const esperarPerto = async (alvo: Ponto, raio: number) => {
      const ate = Date.now() + 60_000
      let q = await posicao()
      while (Math.hypot(q.x - alvo.x, q.z - alvo.z) > raio || Math.abs(q.y - alvo.y) > 2.5) {
        if (Date.now() > ate) break
        await p.waitForTimeout(500)
        q = await posicao()
      }
      return q
    }

    const usar = async () => {
      if (celular) await p.getByRole('button', { name: 'Usar', exact: true }).tap()
      else await p.keyboard.press('KeyE')
    }
    const abrir = async (extra: string) => {
      await p.goto(`${base}/?novo=1&persistir=0&posicao=8${extra}`, { waitUntil: 'networkidle' })
      await p.waitForFunction(() => typeof (globalThis as Janela).__arquipelagoLevar === 'function')
      await pularChegadas(p)
      await p.locator('canvas').click()
    }

    await abrir('&planador=1')

    // A largada, no pé do Farol.
    await levar(pontos.largada, pontos.rumoDaLargada + Math.PI)
    await esperarPerto(pontos.largada, 1.5)
    await p.getByText(PERCURSO_DO_FAROL.rotuloDaLargada).first().waitFor({ timeout: 180_000 })
    await usar()
    await p.getByRole('timer', { name: PERCURSO_DO_FAROL.nome }).waitFor({ timeout: 30_000 })
    await p.screenshot({ path: path.join(prints, `largada-${tela.width}.png`) })

    // As cinco paradas, em ordem, e a varanda no alto.
    for (const [i, d] of pontos.deques.entries()) {
      await levar(d, d.rumoDaVolta)
      const q = await esperarPerto(d, d.raio)
      await p.waitForTimeout(2500)
      const corrida = await p.evaluate(
        () =>
          (globalThis as { __arquipelagoDesenho?: { corrida?: unknown } }).__arquipelagoDesenho
            ?.corrida,
      )
      await p.screenshot({ path: path.join(prints, `parada-${i + 1}-${tela.width}.png`) })
      console.log(
        `parada ${i + 1}: alvo y ${d.y.toFixed(2)}, corpo ${q.x.toFixed(1)},${q.y.toFixed(2)},${q.z.toFixed(1)}`,
        JSON.stringify(corrida),
      )
    }
    await levar(pontos.chegada, 0)
    const resultado = p.getByRole('dialog', { name: PERCURSO_DO_FAROL.nome })
    await resultado.waitFor({ timeout: 60_000 })
    assert((await resultado.locator('li.ganhou').count()) >= 1, 'sem a estrela da chegada')
    await p.screenshot({ path: path.join(prints, `varanda-resultado-${tela.width}.png`) })

    // O foco vai para "Entrar na sala do alto"; fechando com Continuar, a varanda oferece o mesmo
    // passo, e é por ela que se entra na sala do alto.
    const entrarNoResultado = resultado.getByRole('button', { name: 'Entrar na sala do alto' })
    assert.equal(
      await entrarNoResultado.evaluate((b) => b === document.activeElement),
      true,
      'o foco do resultado não está em Entrar na sala do alto',
    )
    await resultado.getByRole('button', { name: 'Continuar' }).click()
    await resultado.waitFor({ state: 'detached', timeout: 30_000 })
    await p.getByText(ROTULO_DA_VARANDA).first().waitFor({ timeout: 60_000 })
    await p.screenshot({ path: path.join(prints, `varanda-entrada-${tela.width}.png`) })
    await usar()
    await p.getByText('Ler a última página').first().waitFor({ timeout: 180_000 })
    const naSala = await posicao()
    assert(naSala.y > 30, `não chegou à sala do alto (y ${naSala.y.toFixed(1)})`)
    await p.screenshot({ path: path.join(prints, `sala-do-alto-${tela.width}.png`) })
    console.log(
      `${tela.width}px: subida até a varanda, resultado e sala do alto (y ${naSala.y.toFixed(1)})`,
    )
    assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`)
    await contexto.close()
  }
  console.log(`A porta de baixo continua: "${ROTULO_DA_PORTA_DO_FAROL}".`)
  console.log('Subida do Farol até a sala do alto: tudo certo.')
} finally {
  await browser?.close()
  servidor.kill()
}
