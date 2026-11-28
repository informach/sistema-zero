// Monta cada prancha .dc.html como página comum e mede a altura real em 1440 px de largura.
// Uso: node medir.mjs <pasta project> <pasta de saída> [Prancha.dc.html ...]
import { fileURLToPath as caminhoDoArquivo } from 'node:url'
// Pasta docs/familias-e-escolas/canvas (este script fica em canvas/scripts).
const RAIZ = caminhoDoArquivo(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '')
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '../../../../packages/funnel/node_modules/playwright/index.mjs'

const [projeto, saida, ...pedidas] = process.argv.slice(2)
if (!projeto || !saida) throw new Error('uso: medir.mjs <project> <saida> [arquivos]')
mkdirSync(saida, { recursive: true })

const ASSETS = RAIZ + '/assets'
const BLOBS = {
  '/_blob/b071f94b0478ee7c6b96469a94dbe0b1': pathToFileURL(join(ASSETS, 'logo-sz-escuro.svg')).href,
  '/_blob/b4694f24ec9b20134b6821b124a4aa40': pathToFileURL(join(ASSETS, 'logo-sz-claro.svg')).href,
}

const arquivos = pedidas.length ? pedidas : readdirSync(projeto).filter((n) => n.endsWith('.dc.html'))
const largura = Number(process.env.LARGURA ?? 1440)
const foto = process.env.FOTO !== '0'

const navegador = await chromium.launch({ timeout: 60000 })
const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } })
const resultado = {}
for (const nome of arquivos) {
  const fonte = readFileSync(join(projeto, nome), 'utf8')
  const xdc = /<x-dc>([\s\S]*?)<\/x-dc>/.exec(fonte)
  if (!xdc) throw new Error(`${nome}: sem <x-dc>`)
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(xdc[1])
  let corpo = xdc[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '')
  for (const [de, para] of Object.entries(BLOBS)) corpo = corpo.split(de).join(para)
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${helmet ? helmet[1] : ''}</head><body>${corpo}</body></html>`
  const destino = join(saida, nome.replace('.dc.html', '.html'))
  writeFileSync(destino, html)
  await pagina.goto(pathToFileURL(destino).href, { waitUntil: 'networkidle' })
  await pagina.evaluate(() => document.fonts.ready)
  const medida = await pagina.evaluate(() => ({
    altura: Math.ceil(document.documentElement.scrollHeight),
    larguraRolavel: document.documentElement.scrollWidth,
    fontes: [...document.fonts].filter((f) => f.status === 'loaded').length,
  }))
  resultado[nome] = medida
  if (foto) await pagina.screenshot({ path: join(saida, nome.replace('.dc.html', '.png')), fullPage: true })
}
await navegador.close()
console.log(JSON.stringify(resultado, null, 1))
