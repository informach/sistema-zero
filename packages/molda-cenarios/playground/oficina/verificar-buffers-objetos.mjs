import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-buffers')
mkdirSync(saida, { recursive: true })
const catalogo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
)
const modelo = catalogo.modelos.find((m) => m.arquivo === 'poco_manivela_baixa.209f7e2a54ed.glb')
assert.ok(modelo)
const fs = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const p = await browser.newPage({ viewport: { width: 1024, height: 900 } })
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForLoadState('networkidle')
  const resultados = await p.evaluate(
    async ({ tres, lotes, modelos, arquivo }) => {
      const THREE = await import(tres),
        { LoteDoModelo } = await import(lotes),
        { lerGlb } = await import(modelos)
      const real = await lerGlb(await (await fetch(`/acervo/${arquivo}`)).arrayBuffer())
      const geometria = new THREE.BoxGeometry(1, 1, 1),
        material = new THREE.MeshStandardMaterial()
      const resultados = []
      try {
        for (const [nome, quantidade, partes] of [
          ['formas', 20000, [{ geometria, material, matriz: new THREE.Matrix4() }]],
          ['glb-real', 512, real.partes],
        ]) {
          const canvas = document.createElement('canvas')
          document.body.append(canvas)
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
          renderer.setPixelRatio(1)
          renderer.setSize(512, 512)
          const cena = new THREE.Scene(),
            grupo = new THREE.Group(),
            camera = new THREE.OrthographicCamera(-310, 310, 160, -160, 0.1, 1000)
          camera.position.set(300, 200, 150)
          camera.up.set(0, 0, -1)
          camera.lookAt(300, 0, 150)
          cena.add(grupo, new THREE.AmbientLight(0xffffff, 2))
          const lote = new LoteDoModelo(grupo, partes)
          try {
            const itens = Array.from({ length: quantidade }, (_, i) => ({
              id: `p${i}`,
              matriz: new THREE.Matrix4().makeTranslation(
                (i % 200) * 3,
                0,
                Math.floor(i / 200) * 3,
              ),
            }))
            lote.preencher(itens)
            // Não atribuir ausência de transferência a descarte por frustum neste ensaio.
            for (const malha of lote.malhas) malha.frustumCulled = false
            const matrizes = new Set(lote.malhas.map((m) => m.instanceMatrix.array))
            const gl = renderer.getContext(),
              enviar = gl.bufferSubData.bind(gl),
              chamadas = []
            gl.bufferSubData = (...args) => {
              if (matrizes.has(args[2]))
                chamadas.push({
                  inicio: args[1],
                  bytes: (args[4] ?? args[2].length - (args[3] ?? 0)) * args[2].BYTES_PER_ELEMENT,
                })
              return enviar(...args)
            }
            renderer.render(cena, camera)
            const inicial = lote.malhas.reduce((n, m) => n + m.instanceMatrix.array.byteLength, 0)
            chamadas.length = 0
            const indice = Math.floor(quantidade * 0.7)
            itens[indice].matriz.makeTranslation(-10, 2, -10)
            lote.atualizar(indice, itens[indice].matriz)
            const inicio = performance.now()
            renderer.render(cena, camera)
            const tempo = performance.now() - inicio
            const movimento = chamadas.slice()
            chamadas.length = 0
            lote.preencher(itens)
            renderer.render(cena, camera)
            resultados.push({
              caso: nome,
              quantidade,
              partes: partes.length,
              bytesAlocados: inicial,
              bytesNoMovimento: movimento.reduce((n, c) => n + c.bytes, 0),
              bytesSemMudanca: chamadas.reduce((n, c) => n + c.bytes, 0),
              chamadasNoMovimento: movimento,
              triangulos: renderer.info.render.triangles,
              tempoRenderMovimentoMs: tempo,
            })
          } finally {
            lote.descartar()
            renderer.dispose()
            renderer.forceContextLoss()
            canvas.remove()
          }
        }
      } finally {
        real.descartar()
        geometria.dispose()
        material.dispose()
      }
      return resultados
    },
    {
      tres: fs('node_modules/three/build/three.module.js'),
      lotes: fs('packages/molda-cenarios-motor/src/lotes.ts'),
      modelos: fs('packages/molda-cenarios-motor/src/modelos.ts'),
      arquivo: modelo.arquivo,
    },
  )
  for (const r of resultados) {
    assert.equal(r.bytesNoMovimento, 64 * r.partes)
    assert.equal(r.bytesSemMudanca, 0)
    assert.ok(r.triangulos > 0)
    assert.ok(r.bytesNoMovimento < r.bytesAlocados / 100)
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} finally {
  await browser.close()
}
