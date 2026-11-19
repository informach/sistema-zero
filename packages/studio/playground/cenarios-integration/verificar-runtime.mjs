import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-galeria'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores'),
  projeto = JSON.parse(
    readFileSync(resolve(pasta, 'js-classic-1440-900-light.project.json'), 'utf8'),
  ),
  nativo = JSON.parse(
    readFileSync(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
  ),
  erros = [],
  fetches = [],
  browser = await chromium.launch({ channel: 'chrome', headless: true })
mkdirSync(saida, { recursive: true })
const pagina = await browser.newPage()
pagina.on('pageerror', (e) => erros.push(e.message))
pagina.on('request', (r) => {
  if (r.resourceType() === 'fetch' || r.resourceType() === 'xhr') fetches.push(r.url())
})
try {
  await pagina.goto('http://127.0.0.1:5413/runtime.html')
  await pagina.waitForFunction(() => window.__qaRuntime)
  const ciclos = await pagina.evaluate(
    async ({ id, assets, pontos }) => {
      return window.__qaRuntime.provar({ id, assets, pontos })
    },
    {
      id: projeto.assets.find((a) => a.kind === 'scene3d').id,
      assets: projeto.assets,
      pontos: nativo.alturas.map(({ x, z }) => ({ x, z })),
    },
  )
  assert.equal(ciclos.length, 3)
  for (const r of ciclos) {
    assert.equal(r.mesmaThree, true)
    assert.equal(r.nos, 20)
    assert.equal(r.aguas, 2)
    assert.equal(r.caminhos, 3)
    assert.equal(r.arvoresDepois, 0)
    assert.equal(r.filhosDepois, 0)
    assert.deepEqual(r.depois, ciclos[0].depois)
    assert.ok(r.desenhado.chamadas > 0 && r.desenhado.triangulos > 0)
    assert.equal(r.animacoes.length, 1)
    assert.equal(r.animacoes[0].clipes.length, 4)
    assert.deepEqual(r.animacoes[0].ossos, [44])
    assert.equal(r.animacoes[0].matrizesFinitas, true)
    for (const [i, h] of r.alturas.entries()) {
      const e = nativo.alturas[i]
      assert.equal(h.chao, e.chao)
      if (h.chao) assert.ok(Math.abs(h.altura - e.altura) < 1e-6, JSON.stringify({ h, e }))
      else assert.equal(h.altura, null)
    }
    const png = Buffer.from(r.imagem.split(',')[1], 'base64')
    assert.equal(png.readUInt32BE(16), 640)
    assert.equal(png.readUInt32BE(20), 420)
    writeFileSync(resolve(saida, `carregador-ciclo-${r.ciclo}.png`), png)
    delete r.imagem
  }
  assert.deepEqual(erros, [])
  assert.deepEqual(fetches, [])
  const rendererDescartado = await pagina.evaluate(() => window.__qaRuntime.descartar())
  assert.deepEqual(rendererDescartado, { geometries: 0, textures: 0 })
  writeFileSync(
    resolve(saida, 'carregador.json'),
    `${JSON.stringify(
      {
        ciclos,
        erros,
        fetches,
        rendererDescartado,
        nota: 'Carregador comum com projeto importado pela galeria. connect-src none, bytes locais e uma instância de Three; ainda não é a integração dos motores ou o bootstrap final do iframe. Alturas comparadas ao Raylib nativo em 441 pontos por ciclo.',
      },
      null,
      2,
    )}\n`,
  )
  console.log(
    'Carregador: 20 nós, 2 águas, 3 caminhos, 4 clipes, 441 consultas por ciclo e três ciclos sem crescimento, sem fetch.',
  )
} catch (e) {
  await pagina.screenshot({ path: resolve(saida, 'carregador-falha.png') })
  writeFileSync(
    resolve(saida, 'carregador-falha.json'),
    JSON.stringify({ erro: String(e), erros, fetches }, null, 2),
  )
  throw e
} finally {
  await browser.close()
}
