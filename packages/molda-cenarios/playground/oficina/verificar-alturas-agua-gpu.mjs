import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-alturas-gpu'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await browser.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const casos = await p.evaluate(
    async (u) => {
      const T = await import(u.three),
        C = await import(u.core),
        { AlturasDaAgua } = await import(u.alturas),
        renderer = new T.WebGLRenderer({ antialias: false }),
        scene = new T.Scene(),
        camera = new T.Camera(),
        g = new T.PlaneGeometry(2, 2),
        resultados = []
      if (!renderer.extensions.has('EXT_color_buffer_float'))
        throw Error('O ensaio exige leitura de framebuffer Float32.')
      try {
        for (const [colunas, maxTextura, linha] of [
          [64, 128, 32],
          [128, 128, 32],
          [128, 32, 64],
        ]) {
          const b = {
              tipo: 'terreno',
              origem: { x: 0, z: 0 },
              passo: 1,
              colunas,
              linhas: 64,
              min: -1000,
              max: 1000,
              fundo: -10,
              pecas: [],
            },
            campo = C.criarCampoDeAlturas(b)
          for (let z = 0; z <= 64; z++)
            for (let x = 0; x <= colunas; x++)
              campo.alturas[z * (colunas + 1) + x] = x - colunas / 2
          const alturas = new AlturasDaAgua(b, campo, maxTextura, () => true),
            mat = new T.ShaderMaterial({
              uniforms: alturas.uniformes,
              vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
              fragmentShader: `${alturas.glsl}\nvoid main(){float h=mcnAlturaDaAmostra(uvec2(uint(gl_FragCoord.x),${linha}u));gl_FragColor=vec4(h,0.0,0.0,1.0);}`,
              toneMapped: false,
            }),
            mesh = new T.Mesh(g, mat),
            target = new T.WebGLRenderTarget(colunas + 1, 1, {
              format: T.RGBAFormat,
              type: T.FloatType,
              minFilter: T.NearestFilter,
              magFilter: T.NearestFilter,
              depthBuffer: false,
              stencilBuffer: false,
            }),
            dados = new Float32Array((colunas + 1) * 4)
          try {
            scene.add(mesh)
            renderer.setRenderTarget(target)
            renderer.render(scene, camera)
            renderer.readRenderTargetPixels(target, 0, 0, colunas + 1, 1, dados)
            const divergencias = []
            for (let x = 0; x <= colunas; x++) {
              const esperado = Math.fround(campo.alturas[linha * (colunas + 1) + x]),
                obtido = dados[x * 4]
              if (esperado !== obtido) divergencias.push({ x, esperado, obtido })
            }
            resultados.push({
              colunas,
              maxTextura,
              linha,
              paginas: alturas.paginas.map((p) => ({
                inicio: p.inicio,
                largura: p.largura,
                altura: p.altura,
              })),
              amostras: colunas + 1,
              divergencias,
            })
          } finally {
            scene.remove(mesh)
            renderer.setRenderTarget(null)
            target.dispose()
            mat.dispose()
            alturas.descartar()
          }
        }
        return resultados
      } finally {
        g.dispose()
        renderer.dispose()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      alturas: modulo('packages/molda-cenarios-motor/src/agua/alturas.ts'),
    },
  )
  writeFileSync(
    resolve(saida, process.env.CENARIOS_QA_ANTES === '1' ? 'antes.json' : 'resultado.json'),
    JSON.stringify({ casos, erros }, null, 2),
  )
  console.log(JSON.stringify(casos, null, 2))
  assert.deepEqual(erros, [])
  assert.ok(
    casos.every((c) => c.divergencias.length === 0),
    'A GPU precisa ler exatamente os Float32 enviados em todas as páginas/canais.',
  )
} finally {
  await browser.close()
}
