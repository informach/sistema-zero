/**
 * Joga os projetos dos cursos-base do Construtor num Chromium de verdade, com WebGL, e fotografa.
 *
 *   bun docs/aulas-interativas-tecnico/qa/construtor-navegador.ts <pasta-das-fotos> [2d|3d|variacoes]
 *
 * Usa o MESMO documento do player do Estúdio (`renderProjectToPreviewDocAsync`: motor, CSP, assets
 * e modelos da biblioteca dos cursos), num iframe sandbox como o da página de jogar. O 3D carrega o
 * three.js pinado do esm.sh, como no Estúdio; sem placa de vídeo, o Chromium usa o SwiftShader.
 *
 * Confere: os modelos terminam de carregar (`__szModelosPendentes` chega a zero), nenhum erro no
 * console, e a partida responde ao teclado (Enter começa, setas movem, Espaço atira). As fotos
 * servem à revisão visual da arte no motor. A regra do jogo é conferida pelos validadores da
 * progressão (`recursos/construtor-base/validar-*.ts`).
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Frame, type Page } from 'playwright'
import { renderProjectToPreviewDocAsync } from '../../../packages/studio/src/preview/renderProject'
import { ESPACO_CATEGORIAS } from './publicar-construtor-modelos'

const raiz = resolve(import.meta.dirname, '../../aulas-interativas/construtor')
const [saida = '/tmp/construtor-navegador', modo = 'tudo'] = process.argv.slice(2)
mkdirSync(saida, { recursive: true })

const lerProjeto = (curso: string, etapa: string) =>
  JSON.parse(readFileSync(resolve(raiz, curso, 'projetos', `${etapa}.szproject.json`), 'utf8'))

/** Troca a peça de cada objeto no programa, como a criança faz no seletor do bloco. */
function comPecas(projeto: any, trocas: Record<string, string>) {
  let script: string = projeto.files['script.js']
  for (const [de, para] of Object.entries(trocas)) script = script.replaceAll(`"${de}"`, `"${para}"`)
  return { ...projeto, files: { ...projeto.files, 'script.js': script } }
}

async function abrir(page: Page, projeto: any): Promise<Frame> {
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
    const pendentes = await frame.evaluate(() => (window as any).__szModelosPendentes ?? 0)
    if (pendentes === 0 && Date.now() - inicio > 1500) return
    if (Date.now() - inicio > 90_000) throw new Error(`Modelos ainda pendentes: ${pendentes}`)
    await frame.page().waitForTimeout(300)
  }
}

async function partida(page: Page, foto: string, segurar = 'ArrowLeft') {
  await page.mouse.click(640, 360)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  await page.keyboard.down(segurar)
  await page.waitForTimeout(500)
  await page.keyboard.up(segurar)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(260)
  }
  await page.waitForTimeout(1600)
  await page.screenshot({ path: resolve(saida, foto) })
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const problemas: string[] = []
const relatorio: Record<string, unknown> = {}
try {
  const casos: { nome: string; projeto: any; tresD: boolean }[] = []
  if (modo === 'tudo' || modo === '2d') {
    casos.push({ nome: 'nave-2d-final', projeto: lerProjeto('nave-contra-asteroides', 'final'), tresD: false })
    casos.push({ nome: 'nave-2d-inicial', projeto: lerProjeto('nave-contra-asteroides', 'inicial'), tresD: false })
  }
  if (modo === 'tudo' || modo === '3d') {
    casos.push({ nome: 'patrulha-3d-completo', projeto: lerProjeto('patrulha-espacial', 'completo'), tresD: true })
    casos.push({ nome: 'patrulha-3d-inicio', projeto: lerProjeto('patrulha-espacial', 'inicio'), tresD: true })
  }
  if (modo === 'tudo' || modo === 'variacoes') {
    const base = lerProjeto('patrulha-espacial', 'completo')
    const padrao = Object.fromEntries(Object.entries(ESPACO_CATEGORIAS).map(([c, l]) => [c, l[0]]))
    for (let i = 1; i < 4; i++) {
      const trocas = Object.fromEntries(
        Object.entries(ESPACO_CATEGORIAS).map(([c, l]) => [padrao[c] as string, l[i] as string]),
      )
      casos.push({ nome: `patrulha-3d-variacao-${i}`, projeto: comPecas(base, trocas), tresD: true })
    }
    const nave2d = lerProjeto('nave-contra-asteroides', 'final')
    const trocas2d: Record<string, string>[] = [
      { 'nave-falcao-azul': 'nave-exploradora-coral', 'cenario-aurora': 'cenario-orbita', 'asteroide-rocha-lunar': 'asteroide-gelo-azul', 'laser-ciano': 'laser-dourado' },
      { 'nave-falcao-azul': 'nave-arraia-lilas', 'cenario-aurora': 'cenario-nebulosa', 'asteroide-rocha-lunar': 'asteroide-cristal-violeta', 'laser-ciano': 'laser-lilas' },
      { 'nave-falcao-azul': 'nave-cometa-verde', 'cenario-aurora': 'cenario-estacao', 'asteroide-rocha-lunar': 'asteroide-lava-laranja', 'laser-ciano': 'laser-verde' },
    ]
    trocas2d.forEach((t, i) => casos.push({ nome: `nave-2d-variacao-${i + 1}`, projeto: comPecas(nave2d, t), tresD: false }))
  }
  for (const caso of casos) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const erros: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' && !/GPU stall|WebGL-|swiftshader/i.test(m.text())) erros.push(m.text())
    })
    page.on('pageerror', (e) => erros.push(String(e)))
    const t0 = Date.now()
    const frame = await abrir(page, caso.projeto)
    if (caso.tresD) await esperarModelos(frame)
    else await page.waitForTimeout(1200)
    const carregou = Date.now() - t0
    await page.screenshot({ path: resolve(saida, `${caso.nome}-abertura.png`) })
    await partida(page, `${caso.nome}-jogando.png`, caso.nome.endsWith('2') ? 'ArrowRight' : 'ArrowLeft')
    relatorio[caso.nome] = { carregouEmMs: carregou, erros }
    if (erros.length) problemas.push(`${caso.nome}: ${erros.join(' | ')}`)
    console.log(caso.nome, `${carregou} ms`, erros.length ? `ERROS: ${erros.length}` : 'sem erros')
    await page.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(relatorio, null, 2))
if (problemas.length) {
  console.error(problemas.join('\n'))
  process.exit(1)
}
