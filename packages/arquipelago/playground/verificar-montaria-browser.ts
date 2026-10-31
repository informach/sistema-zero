/**
 * A montaria do Vale (fase4-04) no playground. Executar no pacote:
 * bun build playground/verificar-montaria-browser.ts --target=node --external playwright-core --outfile .cache/verificar-montaria-browser.mjs
 * node .cache/verificar-montaria-browser.mjs
 * ARQUIPELAGO_CHROMIUM escolhe o navegador; ARQUIPELAGO_PRINTS escolhe a pasta dos prints;
 * ARQUIPELAGO_TELA=computador|celular roda uma tela só.
 *
 * Com os três ninhos cuidados (o salvamento semeado no playground): monta no dino, anda para a
 * frente pelo controle (gamepad emulado, igual nas duas telas), pula e desce pelo mesmo botão.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  criarSalvamentoInicial,
  NINHOS_DO_VALE,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { chromium, type Page } from 'playwright-core'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import { MONTARIA_NO_VALE } from '../src/sistemas/montaria'

type P = { x: number; y: number; z: number }
type Desenho = { posicao: P; ilhasCompletas: number; noChao: boolean; modo: string }
const port = await new Promise<number>((resolve, reject) => {
  const reserva = createServer()
  reserva.once('error', reject)
  reserva.listen(0, '127.0.0.1', () => {
    const endereco = reserva.address()
    if (!endereco || typeof endereco === 'string') return reject(new Error('Sem porta local'))
    reserva.close(() => resolve(endereco.port))
  })
})
const baseURL = `http://127.0.0.1:${port}`
const prints =
  process.env.ARQUIPELAGO_PRINTS ?? path.resolve('../../docs/qa/2026-10-29-montaria-do-vale')
mkdirSync(prints, { recursive: true })
const vale = ilhasEmVolta().find((i) => i.ilha.id === 'vale-dos-dinos')
if (!vale) throw new Error('Vale fora do anel')
const giro = giroDaIlha(vale.ilha)
const mundo = (p: P): P => ({
  x: vale.centro.x + p.x * Math.cos(giro) + p.z * Math.sin(giro),
  y: p.y,
  z: vale.centro.z - p.x * Math.sin(giro) + p.z * Math.cos(giro),
})
const rumo = (a: P, b: P) => Math.atan2(b.x - a.x, b.z - a.z)
const PE = CORPO.doCentroAoPe + CORPO.folga
/** O chão do Vale (o tampo dos lugares) e o dino parado no lugar dele. */
const TAMPO = 1
const dino = mundo({ x: MONTARIA_NO_VALE.x, y: TAMPO, z: MONTARIA_NO_VALE.z })
/** Ao lado dele, a 1,6 m do meio do corpo (fora do colisor, dentro do alcance). */
const aoLado = mundo({ x: MONTARIA_NO_VALE.x, y: TAMPO, z: MONTARIA_NO_VALE.z - 1.6 })

function salvamento(onde: P): Salvamento {
  const s = criarSalvamentoInicial(new Date())
  return {
    ...s,
    posicao: { x: onde.x, y: onde.y + 1.2, z: onde.z },
    vale: { ...s.vale, pegadas: true, escavacao: 3, ninhos: [...NINHOS_DO_VALE], filhote: null },
  }
}

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
  const telas = process.env.ARQUIPELAGO_TELA
    ? [process.env.ARQUIPELAGO_TELA === 'celular']
    : [false, true]
  for (const celular of telas) {
    const tipo = celular ? 'celular' : 'computador'
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: celular,
      hasTouch: celular,
    })
    context.setDefaultTimeout(180_000)
    await context.addInitScript(
      ({ guardado }) => {
        localStorage.setItem('arquipelago:medir', '1')
        localStorage.setItem(
          'arquipelago:conforto',
          JSON.stringify({ menosMovimento: true, qualidade: 'leve' }),
        )
        if (!localStorage.getItem('qa-semeado')) {
          localStorage.setItem('qa-semeado', '1')
          localStorage.setItem('arquipelago-playground', guardado)
        }
        const g = globalThis as unknown as {
          qaPad: {
            axes: number[]
            buttons: { pressed: boolean }[]
            connected: boolean
            mapping: string
          }
        }
        g.qaPad = {
          axes: [0, 0, 0, 0],
          buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
          connected: true,
          mapping: 'standard',
        }
        Object.defineProperty(navigator, 'getGamepads', { value: () => [g.qaPad] })
      },
      {
        guardado: JSON.stringify({
          revisao: 1,
          salvamento: salvamento(aoLado),
          atualizadoEm: new Date().toISOString(),
        }),
      },
    )
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: celular ? 'reduce' : 'no-preference' })
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    const ler = () =>
      page.evaluate(() => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho)
    try {
      await page.goto(`${baseURL}/?posicao=6`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () =>
          ((globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
            ?.ilhasCompletas ?? 0) > 0,
      )
      await page.locator('canvas').click()
      await dePe(page, aoLado, dino)
      console.log(`${tipo}: de pé ao lado do dino`)

      // 1. Montar.
      await usar(page, 'Montar no dino')
      await page.waitForFunction(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo ===
          'montar',
      )
      await page.getByText('Você subiu na sela.', { exact: false }).waitFor()
      await page.locator('.arq-acao').filter({ hasText: 'Descer do dino' }).waitFor()
      await page.waitForTimeout(2500)
      await page.screenshot({ path: path.join(prints, `montaria-${tipo}-montou.png`) })
      console.log(`${tipo}: montou`)

      // 2. Andar para trás, para o lado do vulcão (a frente dele dá na ponte, fora do limite; o
      // gamepad anda relativo à câmera, e o botão do analógico direito a recentraliza antes).
      const antes = (await ler())!.posicao
      await apertar(page, 11)
      await page.evaluate(() => {
        ;(globalThis as unknown as { qaPad: { axes: number[] } }).qaPad.axes[1] = 1
      })
      await page.waitForFunction(
        ({ antes }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d && Math.hypot(d.posicao.x - antes.x, d.posicao.z - antes.z) > 3
        },
        { antes },
      )
      await page.screenshot({ path: path.join(prints, `montaria-${tipo}-andando.png`) })
      await page.evaluate(() => {
        ;(globalThis as unknown as { qaPad: { axes: number[] } }).qaPad.axes[1] = 0
      })
      console.log(`${tipo}: andou montada`, (await ler())!.posicao)

      // 3. Pular (Espaço no computador, o botão Pular no celular): o ponto mais alto do corpo em
      // alguns segundos, medido a cada quadro, passa de meio metro acima do chão.
      await page.waitForTimeout(3000)
      const chao = (await ler())!.posicao.y
      const alto = page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let maior = -Infinity
            const fim = performance.now() + 20_000
            const medir = () => {
              const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
              if (d) maior = Math.max(maior, d.posicao.y)
              if (performance.now() < fim) requestAnimationFrame(medir)
              else resolve(maior)
            }
            requestAnimationFrame(medir)
          }),
      )
      if (celular) await page.getByRole('button', { name: 'Pular', exact: true }).tap()
      else {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.keyboard.press('Space')
      }
      const subiu = (await alto) - chao
      console.log(`${tipo}: pulou montada, subiu`, subiu.toFixed(2))
      if (subiu < 0.5) throw new Error(`O pulo montado subiu só ${subiu.toFixed(2)} m`)
      await page.waitForFunction(
        ({ chao }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return d && Math.abs(d.posicao.y - chao) < 0.15
        },
        { chao },
      )

      // 4. Descer pelo mesmo botão: de volta ao chão, com um pulinho para fora do dino, que fica ali.
      await page.waitForTimeout(1500)
      const naSela = (await ler())!.posicao
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.keyboard.press('KeyE')
      }
      await page.waitForFunction(
        () =>
          (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.modo === 'chao',
      )
      await page.locator('.arq-acao').filter({ hasText: 'Montar no dino' }).waitFor()
      await page.waitForFunction(
        () => (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho?.noChao,
      )
      const fora = (await ler())!.posicao
      const longe = Math.hypot(fora.x - naSela.x, fora.z - naSela.z)
      // Com espaço, cai a uns 1,1 m; uma parede ao lado segura o pulinho mais perto (o colisor do
      // dino só volta quando ela se afasta). Basta ter saído da sela.
      console.log(`${tipo}: desceu a`, longe.toFixed(2), 'm do meio do dino')
      if (longe < CORPO.raio + 0.3)
        throw new Error(`Desceu em cima da sela (a ${longe.toFixed(2)} m do meio do dino)`)
      await page.waitForTimeout(2500)
      await page.screenshot({ path: path.join(prints, `montaria-${tipo}-desceu.png`) })
      console.log(`${tipo}: desceu e o dino ficou onde parou`)
      if (celular && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
        throw new Error('A interface ultrapassa a largura do celular')
    } catch (erro) {
      await page.screenshot({ path: path.join(prints, `montaria-${tipo}-falha.png`) })
      console.log(`${tipo}: falhou`, await ler())
      throw erro
    }
    if (erros.length) throw new Error(erros.join('\n'))
    await context.close()

    async function dePe(page: Page, p: P, olhar: P) {
      await page.evaluate(
        ({ p, g }) => {
          const ir = (globalThis as { __arquipelagoLevar?: (...args: number[]) => void })
            .__arquipelagoLevar
          if (!ir) throw new Error('Sem transporte de conferência')
          ir(p.x, p.y + 1.2, p.z, g)
        },
        { p, g: rumo(p, olhar) + Math.PI },
      )
      await page.waitForFunction(
        ({ p, pe }) => {
          const d = (globalThis as { __arquipelagoDesenho?: Desenho }).__arquipelagoDesenho
          return (
            d?.noChao &&
            Math.hypot(d.posicao.x - p.x, d.posicao.z - p.z) < 0.3 &&
            Math.abs(d.posicao.y - pe - p.y) < 0.15
          )
        },
        { p, pe: PE },
      )
    }

    async function usar(page: Page, rotulo: string) {
      await page.locator('.arq-acao').filter({ hasText: rotulo }).waitFor()
      if (celular) await page.getByRole('button', { name: 'Usar', exact: true }).tap()
      else {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.keyboard.press('KeyE')
      }
    }

    /** Aperta e solta um botão do gamepad emulado, esperando quadros dos dois lados. */
    async function apertar(page: Page, botao: number) {
      for (const pressed of [true, false]) {
        await page.evaluate(
          ({ botao, pressed }) => {
            const pad = (globalThis as unknown as { qaPad: { buttons: { pressed: boolean }[] } })
              .qaPad
            pad.buttons[botao] = { pressed }
          },
          { botao, pressed },
        )
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        )
      }
    }
  }
} finally {
  await browser?.close()
  server.kill()
}
