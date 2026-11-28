// Mede as pranchas pedidas (1440 px de largura) e grava a altura real em dois lugares:
// no "$preview" da própria prancha e no quadro dela em project/canvas.json.
// Uso: node ajustar.mjs Prancha.dc.html [Outra.dc.html ...]
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '../../../../packages/funnel/node_modules/playwright/index.mjs'

const BASE = RAIZ
const projeto = join(BASE, 'project')
const saida = join(BASE, 'medida')
const ASSETS = join(BASE, 'assets')
const BLOBS = {
  '/_blob/b071f94b0478ee7c6b96469a94dbe0b1': pathToFileURL(join(ASSETS, 'logo-sz-escuro.svg')).href,
  '/_blob/b4694f24ec9b20134b6821b124a4aa40': pathToFileURL(join(ASSETS, 'logo-sz-claro.svg')).href,
}
const arquivos = process.argv.slice(2)
if (!arquivos.length) throw new Error('informe as pranchas')
mkdirSync(saida, { recursive: true })

const navegador = await chromium.launch({ timeout: 60000 })
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
const canvasPath = join(projeto, 'canvas.json')
const canvas = JSON.parse(readFileSync(canvasPath, 'utf8'))
for (const nome of arquivos) {
  const caminho = join(projeto, nome)
  let fonte = readFileSync(caminho, 'utf8')
  const xdc = /<x-dc>([\s\S]*?)<\/x-dc>/.exec(fonte)
  if (!xdc) throw new Error(`${nome}: sem <x-dc>`)
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(xdc[1])
  let corpo = xdc[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '')
  for (const [de, para] of Object.entries(BLOBS)) corpo = corpo.split(de).join(para)
  const destino = join(saida, nome.replace('.dc.html', '.html'))
  writeFileSync(destino, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${helmet ? helmet[1] : ''}</head><body>${corpo}</body></html>`)
  await pagina.goto(pathToFileURL(destino).href, { waitUntil: 'networkidle' })
  await pagina.evaluate(() => document.fonts.ready)
  const m = await pagina.evaluate(() => ({
    altura: Math.ceil(document.documentElement.scrollHeight),
    larguraRolavel: document.documentElement.scrollWidth,
    fontes: [...document.fonts].filter((f) => f.status === 'loaded').length,
  }))
  if (process.env.FOTO !== '0') await pagina.screenshot({ path: join(saida, nome.replace('.dc.html', '.png')), fullPage: true })
  const h = m.altura + 8
  const antes = fonte
  fonte = fonte.replace(/"\$preview":\{"width":1440,"height":\d+\}/, `"$preview":{"width":1440,"height":${h}}`)
  if (fonte === antes && !antes.includes(`"height":${h}}`)) throw new Error(`${nome}: $preview não encontrado`)
  writeFileSync(caminho, fonte)
  if (!canvas.boards[nome]) throw new Error(`${nome}: fora do canvas.json`)
  canvas.boards[nome].h = h
  console.log(`${nome}: altura ${m.altura} -> quadro ${h} | largura ${m.larguraRolavel} | fontes ${m.fontes}`)
}
await navegador.close()
writeFileSync(canvasPath, `${JSON.stringify(canvas, null, 2)}\n`)
