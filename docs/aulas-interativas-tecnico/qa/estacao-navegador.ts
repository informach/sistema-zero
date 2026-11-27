/**
 * Joga os projetos da missão do Construtor (A Estação de Reciclagem) num Chromium de verdade, com
 * WebGL, e fotografa.
 *
 *   bun docs/aulas-interativas-tecnico/qa/estacao-navegador.ts <pasta-das-fotos> [2d|3d|variacoes]
 *
 * Usa o MESMO documento do player do Estúdio (`renderProjectToPreviewDocAsync`), num iframe
 * sandbox. Confere: os modelos terminam de carregar, nenhum erro no console, e a partida responde
 * (Enter começa, as peças descem e o coletor anda). As fotos servem à revisão visual. A regra do
 * jogo é conferida pelos objetivos no executor de verdade (`estacao-objetivos-navegador.ts`).
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Frame, type Page } from 'playwright'
import { renderProjectToPreviewDocAsync } from '../../../packages/studio/src/preview/renderProject'
import { ESTACAO_OPCOES, ESTACAO_PADRAO, montarProjetoEstacao } from './estacao-projeto'

type Projeto = Parameters<typeof renderProjectToPreviewDocAsync>[0] & {
  files: Record<string, string>
}

const [saida = '/tmp/estacao-navegador', modo = 'tudo'] = process.argv.slice(2)
mkdirSync(saida, { recursive: true })

function comPecas(projeto: Projeto, i: number) {
  let script: string = projeto.files['script.js']
  for (const [categoria, lista] of Object.entries(ESTACAO_OPCOES))
    script = script.replaceAll(
      `"${ESTACAO_PADRAO[categoria as keyof typeof ESTACAO_PADRAO]}"`,
      `"${lista[i]}"`,
    )
  return { ...projeto, files: { ...projeto.files, 'script.js': script } }
}

async function abrir(page: Page, projeto: Projeto): Promise<Frame> {
  const doc = await renderProjectToPreviewDocAsync(projeto)
  await page.setContent(
    '<body style="margin:0;background:#000"><iframe id="jogo" sandbox="allow-scripts allow-pointer-lock" style="width:1280px;height:720px;border:0;display:block"></iframe></body>',
  )
  await page.evaluate((html) => {
    ;(document.getElementById('jogo') as HTMLIFrameElement).srcdoc = html
  }, doc)
  await page.waitForTimeout(500)
  const frame = page.frames().find((f) => f !== page.mainFrame())
  if (!frame) throw new Error('O jogo não abriu no iframe')
  await frame.waitForLoadState('load')
  return frame
}

async function esperarModelos(frame: Frame) {
  const inicio = Date.now()
  for (;;) {
    const pendentes = await frame.evaluate(
      () => (window as { __szModelosPendentes?: number }).__szModelosPendentes ?? 0,
    )
    if (pendentes === 0 && Date.now() - inicio > 1500) return
    if (Date.now() - inicio > 90_000) throw new Error(`Modelos ainda pendentes: ${pendentes}`)
    await frame.page().waitForTimeout(300)
  }
}

async function partida(page: Page, foto: string, tresD: boolean) {
  await page.mouse.click(640, 360)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(tresD ? 3200 : 2600)
  await page.keyboard.down('ArrowLeft')
  await page.waitForTimeout(700)
  await page.keyboard.up('ArrowLeft')
  await page.waitForTimeout(tresD ? 1500 : 1200)
  await page.screenshot({ path: resolve(saida, foto) })
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const problemas: string[] = []
const relatorio: Record<string, unknown> = {}
try {
  const casos: { nome: string; projeto: Projeto; tresD: boolean }[] = []
  if (modo === 'tudo' || modo === '2d')
    for (const etapa of ['meta-nova', 'inicio'] as const)
      casos.push({
        nome: `estacao-2d-${etapa}`,
        projeto: montarProjetoEstacao('2d', etapa),
        tresD: false,
      })
  if (modo === 'tudo' || modo === '3d')
    for (const etapa of ['meta-nova', 'inicio'] as const)
      casos.push({
        nome: `estacao-3d-${etapa}`,
        projeto: montarProjetoEstacao('3d', etapa),
        tresD: true,
      })
  if (modo === 'tudo' || modo === 'variacoes')
    for (let i = 1; i < 4; i++) {
      casos.push({
        nome: `estacao-3d-variacao-${i}`,
        projeto: comPecas(montarProjetoEstacao('3d', 'meta-nova'), i),
        tresD: true,
      })
      casos.push({
        nome: `estacao-2d-variacao-${i}`,
        projeto: comPecas(montarProjetoEstacao('2d', 'meta-nova'), i),
        tresD: false,
      })
    }
  for (const caso of casos) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' && !/GPU stall|WebGL-|swiftshader/i.test(m.text()))
        erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(String(e)))
    const t0 = Date.now()
    const frame = await abrir(page, caso.projeto)
    if (caso.tresD) await esperarModelos(frame)
    else await page.waitForTimeout(1200)
    const carregou = Date.now() - t0
    await page.screenshot({ path: resolve(saida, `${caso.nome}-abertura.png`) })
    await partida(page, `${caso.nome}-jogando.png`, caso.tresD)
    relatorio[caso.nome] = { carregouEmMs: carregou, erros }
    if (erros.length) problemas.push(`${caso.nome}: ${erros.join(' | ')}`)
    console.log(caso.nome, `${carregou} ms`, erros.length ? `ERROS: ${erros.length}` : 'sem erros')
    await page.close()
  }
} finally {
  await browser.close()
}
if (problemas.length) {
  console.error(problemas.join('\n'))
  process.exit(1)
}
