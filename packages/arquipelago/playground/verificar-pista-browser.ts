/**
 * A pista de conferência do personagem (etapa 1 do personagem, passo 7): a sala de movimento
 * (`/movimento`), uma estação por vez, com o boneco do pack de verdade. Em cada estação três fotos:
 * parado ao chegar, no meio da ação da estação (andar, pular, entrar na água) e parado depois dela.
 * As fotos são comparadas com as referências que a dona aprovou, pixel a pixel, no próprio navegador.
 *
 * As peças do pack são pagas e ficam fora do git, e as fotos mostram o boneco: tudo mora em
 * `.cache/pista/` (fora do git). Rode no pacote, com a cópia local do bucket do avatar:
 *   bun build playground/verificar-pista-browser.ts --target=node --external playwright-core --outfile .cache/verificar-pista-browser.mjs
 *   AVATAR_QA_DIR=<cópia do bucket> node .cache/verificar-pista-browser.mjs
 *
 * - `ARQUIPELAGO_PISTA=Degraus,Escada` roda só algumas estações.
 * - `ARQUIPELAGO_PISTA_LIMITE` (padrão 0,04): a fração de pixels que pode mudar.
 * - `ARQUIPELAGO_PISTA_REFERENCIAS=1` grava as fotos desta rodada como referências (depois de a dona
 *   aprovar a página com elas).
 * - `ARQUIPELAGO_CHROMIUM` / `ARQUIPELAGO_BROWSER_CHANNEL` escolhem o navegador.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { ESTACOES } from './sala-de-movimento'

/** O que fazer em cada estação (segura W por `andar` ms; `pular` aperta Espaço no meio). */
const ACOES: Record<string, { andar: number; pular?: boolean }> = {
  'Peças soltas': { andar: 1500 },
  'Galho seco': { andar: 1500 },
  Fogueira: { andar: 1200 },
  Mecanismos: { andar: 1500 },
  Pista: { andar: 1800, pular: true },
  Degraus: { andar: 1800 },
  Rampas: { andar: 1800 },
  Beiradas: { andar: 1200, pular: true },
  Plataformas: { andar: 1500, pular: true },
  'Tronco caído': { andar: 1500 },
  Escada: { andar: 1800 },
  Escorregador: { andar: 1500 },
  Câmera: { andar: 1500 },
  Laguinho: { andar: 2000 },
}

const pacote = path.join(import.meta.dirname, '..')
const pasta = path.join(pacote, '.cache', 'pista')
const referencias = path.join(pasta, 'referencias')
const hoje = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const rodada = path.join(pasta, hoje)
const limite = Number(process.env.ARQUIPELAGO_PISTA_LIMITE ?? 0.04)
const gravarReferencias = process.env.ARQUIPELAGO_PISTA_REFERENCIAS === '1'
const escolhidas = process.env.ARQUIPELAGO_PISTA?.split(',').map((s) => s.trim())
const estacoes = ESTACOES.filter((e) => !escolhidas || escolhidas.includes(e.nome))
mkdirSync(rodada, { recursive: true })
mkdirSync(referencias, { recursive: true })

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
if (!process.env.AVATAR_QA_DIR)
  console.warn('Sem AVATAR_QA_DIR: o boneco do pack não aparece nas fotos.')

/** O nome do arquivo de uma foto (sem acento nem espaço). */
const arquivo = (estacao: string, momento: string) =>
  `${estacao
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-${momento}.png`

/** A fração de pixels que mudou entre duas fotos (comparadas num canvas, na página). */
async function diferenca(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ({ a, b }) => {
      const carregar = async (base64: string) => {
        const img = new Image()
        img.src = `data:image/png;base64,${base64}`
        await img.decode()
        return img
      }
      const [ia, ib] = await Promise.all([carregar(a), carregar(b)])
      if (ia.width !== ib.width || ia.height !== ib.height) return 1
      const pixels = (img: HTMLImageElement) => {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const g = c.getContext('2d')
        if (!g) throw new Error('sem canvas 2d')
        g.drawImage(img, 0, 0)
        return g.getImageData(0, 0, c.width, c.height).data
      }
      const pa = pixels(ia)
      const pb = pixels(ib)
      let mudou = 0
      // Um pixel muda quando algum canal anda mais de 24 (o tremor do SwiftShader fica abaixo).
      for (let i = 0; i < pa.length; i += 4) {
        if (
          Math.abs((pa[i] ?? 0) - (pb[i] ?? 0)) > 24 ||
          Math.abs((pa[i + 1] ?? 0) - (pb[i + 1] ?? 0)) > 24 ||
          Math.abs((pa[i + 2] ?? 0) - (pb[i + 2] ?? 0)) > 24
        )
          mudou++
      }
      return mudou / (pa.length / 4)
    },
    { a: a.toString('base64'), b: b.toString('base64') },
  )
}

type Pe = { x: number; y: number; z: number; noChao: boolean }
const lerPe = (page: Page) =>
  page.evaluate(() => (globalThis as { __peNaSala?: Pe }).__peNaSala ?? null)

/** Espera o corpo pousar e ficar parado (o pé não anda mais que 2 cm em 0,4 s). */
async function esperarParado(page: Page) {
  let antes = await lerPe(page)
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(400)
    const agora = await lerPe(page)
    if (
      agora?.noChao &&
      antes &&
      Math.hypot(agora.x - antes.x, agora.y - antes.y, agora.z - antes.z) < 0.02
    )
      return
    antes = agora
  }
}

const server = spawn('bun', ['playground/servidor.ts'], {
  cwd: pacote,
  env: { ...process.env, PORTA: String(port) },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.on('data', () => {})
server.stderr.on('data', (d) => process.stderr.write(d))
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const resultado: { foto: string; diferenca: number | null }[] = []
const problemas: string[] = []
try {
  const deadline = Date.now() + 60_000
  while (true) {
    if (server.exitCode !== null) throw new Error('Playground encerrou antes de iniciar.')
    try {
      if ((await fetch(baseURL)).ok) break
    } catch {}
    if (Date.now() >= deadline) throw new Error('Playground não iniciou.')
    await new Promise((r) => setTimeout(r, 200))
  }
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: process.env.ARQUIPELAGO_BROWSER_CHANNEL ?? 'chrome' }),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  for (const estacao of estacoes) {
    const acao = ACOES[estacao.nome] ?? { andar: 1500 }
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    context.setDefaultTimeout(180_000)
    // Menos movimento: o vento e as ondas param, e as fotos de uma rodada para outra batem.
    await context.addInitScript(() => {
      localStorage.setItem('arquipelago:conforto', JSON.stringify({ menosMovimento: true }))
    })
    const page = await context.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    try {
      await page.goto(`${baseURL}/movimento?estacao=${encodeURIComponent(estacao.nome)}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => (globalThis as { __peNaSala?: Pe }).__peNaSala?.noChao === true,
      )
      await page.locator('canvas').click()
      await esperarParado(page)
      // O boneco do pack carrega depois do chão.
      await page.waitForTimeout(3000)
      const fotos: [string, Buffer][] = []
      fotos.push(['1-parado', await page.screenshot()])
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(acao.andar / 2)
      if (acao.pular) {
        await page.keyboard.down('Space')
        await page.waitForTimeout(250)
        await page.keyboard.up('Space')
      }
      fotos.push(['2-acao', await page.screenshot()])
      await page.waitForTimeout(acao.andar / 2)
      await page.keyboard.up('KeyW')
      await esperarParado(page)
      await page.waitForTimeout(1500)
      fotos.push(['3-depois', await page.screenshot()])
      for (const [momento, png] of fotos) {
        const nome = arquivo(estacao.nome, momento)
        writeFileSync(path.join(rodada, nome), png)
        const ref = path.join(referencias, nome)
        if (gravarReferencias) writeFileSync(ref, png)
        // A foto do meio da ação depende do quadro em que a tecla caiu: ela vai para a página da
        // dona, mas não é comparada.
        const comparar = momento !== '2-acao' && existsSync(ref) && !gravarReferencias
        const d = comparar ? await diferenca(page, png, readFileSync(ref)) : null
        resultado.push({ foto: nome, diferenca: d })
        if (d !== null && d > limite)
          problemas.push(`${nome}: ${(d * 100).toFixed(1)}% dos pixels mudaram`)
      }
      if (erros.length) problemas.push(`${estacao.nome}: ${erros.join(' | ')}`)
      console.log(`estação ${estacao.nome}: ${fotos.length} fotos`)
    } catch (e) {
      problemas.push(`${estacao.nome}: ${(e as Error).message.split('\n')[0]}`)
    } finally {
      await context.close()
    }
  }
  writeFileSync(path.join(rodada, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(`Fotos em ${rodada}`)
  if (gravarReferencias) console.log(`Referências gravadas em ${referencias}`)
  if (problemas.length) {
    console.log(`Problemas:\n- ${problemas.join('\n- ')}`)
    process.exitCode = 1
  } else console.log('PASS: a pista bate com as referências.')
} finally {
  await browser?.close()
  server.kill()
}
