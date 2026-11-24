import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote5-modelo'),
  doc = JSON.parse(
    readFileSync(
      resolve(raiz, 'output/cenarios-reforma/conversao-faisca/original/documento.json'),
      'utf8',
    ),
  ),
  fonte = doc.aguas.find((a) => a.id === 'agua-campos')
assert.ok(fonte)
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } }),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  await pagina.waitForLoadState('networkidle')
  const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
  const resultado = await pagina.evaluate(
    async ({ pasta, coreUrl, tresUrl, modelosUrl, encaixeUrl, fonte }) => {
      const core = await import(coreUrl),
        T = await import(tresUrl),
        { lerGlb } = await import(modelosUrl),
        { encaixeDaAguaImportada } = await import(encaixeUrl),
        { AguasDoPalco } = await import(`${pasta}/agua/aguas.ts`),
        { AguasDoTeste } = await import(`${pasta}/teste/agua.ts`),
        { MundoDoTeste } = await import(`${pasta}/teste/colisoes.ts`),
        { MovimentoDoTeste } = await import(`${pasta}/teste/movimento.ts`)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(1280, 800)
      const cena = new T.Scene(),
        camera = new T.PerspectiveCamera(45, 1.6, 0.1, 100),
        sol = new T.DirectionalLight('#fff2dc', 2),
        ambiente = new T.HemisphereLight('#ffffff', '#6e8064', 2)
      camera.position.set(11, 10, 12)
      camera.lookAt(0, 1, 0)
      sol.position.set(-6, 20, 10)
      cena.background = new T.Color('#add7ed')
      cena.add(sol, ambiente)
      const modelo = await lerGlb(
          await (await fetch('/acervo/lago_nadavel.87f49a705905.glb')).arrayBuffer(),
        ),
        d = core.criarDocumentoVazio('qa', 'Lago real'),
        digest = '87f49a7059052af87ab2d2c162f441b908ce92ded82e4f43936d071a5114fd5b'
      d.modelos = [{ id: 'lago', biblioteca: 'qa', modelo: 'lago', digest }]
      d.aguas = [
        {
          ...fonte,
          modelo: 'lago',
          centro: { x: 0, z: 0 },
          giro: 0,
          escala: 1,
          nivel: 1.4,
          encaixeModelo: encaixeDaAguaImportada({ digest }),
        },
      ]
      core.validarDocumento(d)
      const fora = [
          new T.Vector2(-20, -20),
          new T.Vector2(20, -20),
          new T.Vector2(20, 20),
          new T.Vector2(-20, 20),
        ],
        furo = fonte.recorte.map((p) => new T.Vector2(p.x, p.z)),
        faces = T.ShapeUtils.triangulateShape(fora, [furo]),
        pontos = [...fora, ...furo],
        geo = new T.BufferGeometry()
          .setAttribute(
            'position',
            new T.BufferAttribute(new Float32Array(pontos.flatMap((p) => [p.x, 1.55, p.y])), 3),
          )
          .setIndex(faces.flatMap((f) => [f[0], f[2], f[1]]))
      geo.computeVertexNormals()
      const material = new T.MeshStandardMaterial({ color: '#9dc982', side: T.DoubleSide }),
        chao = new T.Mesh(geo, material),
        aguas = new AguasDoPalco(renderer.capabilities.maxTextureSize)
      cena.add(chao, aguas.grupo)
      const desenhar = () => {
        camera.updateMatrixWorld()
        aguas.quadro(camera, 3, true)
        renderer.render(cena, camera)
      }
      desenhar()
      const inicial = { ...renderer.info.memory }
      const estado = aguas.definir(d, null, () => modelo, new Set())
      desenhar()
      const cheio = { ...renderer.info.memory },
        fontes = aguas.fontesDoTeste(),
        mundo = new MundoDoTeste(fontes),
        agua = new AguasDoTeste(d.aguas, () => 100, aguas.consultasDoTeste()),
        amostras = []
      for (let z = -2.5; z <= 2.5; z += 0.5)
        for (let x = -3.5; x <= 3.5; x += 0.5) {
          const q = agua.nivel(x, z),
            hit = mundo.rastrear(new T.Vector3(x, 10, z), new T.Vector3(x, -2, z))
          if (q && hit)
            amostras.push({
              profundidade: q.profundidade,
              esperado: Math.max(0, 1.4 - hit.ponto.y),
            })
        }
      const m = new MovimentoDoTeste(mundo, new T.Vector3(0, 0.001, 0), 1.16, agua.nivel)
      for (let i = 0; i < 360; i++)
        m.avancar(1 / 120, { x: 0, z: 0, vertical: 0, correr: false, saltar: false })
      const nado = { nadando: m.nadando, noChao: m.noChao, y: m.posicao.y }
      mundo.descartar()
      const ciclos = []
      for (let i = 0; i < 3; i++) {
        aguas.definir({ ...d, aguas: [] }, null, () => modelo, new Set())
        desenhar()
        const vazio = { ...renderer.info.memory }
        aguas.definir(d, null, () => modelo, new Set())
        desenhar()
        ciclos.push({ vazio, cheio: { ...renderer.info.memory } })
      }
      window.__aguaModeloQA = {
        noite() {
          sol.intensity = 0.08
          ambiente.intensity = 0.3
          cena.background.set('#14283f')
          desenhar()
        },
        destruir() {
          aguas.descartar()
          modelo.descartar()
          geo.dispose()
          material.dispose()
          renderer.dispose()
        },
      }
      return { estado, solidos: fontes.length, inicial, cheio, amostras, nado, ciclos }
    },
    {
      pasta: modulo('packages/molda-cenarios-motor/src'),
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      tresUrl: modulo('node_modules/three/build/three.module.js'),
      modelosUrl: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      encaixeUrl: modulo('packages/arquipelago/src/molda/encaixes-de-agua.ts'),
      fonte,
    },
  )
  await pagina.screenshot({ path: resolve(saida, 'lago-real-dia.png') })
  await pagina.evaluate(() => window.__aguaModeloQA.noite())
  await pagina.screenshot({ path: resolve(saida, 'lago-real-noite.png') })
  await pagina.evaluate(() => window.__aguaModeloQA.destruir())
  assert.deepEqual(erros, [])
  assert.deepEqual(resultado.estado, { carregando: 0, falhas: [] })
  assert.equal(resultado.solidos, 2)
  assert.ok(resultado.amostras.length > 30)
  for (const a of resultado.amostras)
    assert.ok(Math.abs(a.profundidade - a.esperado) < 1e-5, JSON.stringify(a))
  assert.equal(resultado.nado.nadando, true)
  assert.equal(resultado.nado.noChao, false)
  assert.ok(resultado.nado.y > 0.5 && resultado.nado.y < 0.8)
  for (const c of resultado.ciclos) {
    assert.deepEqual(c.cheio, resultado.cheio)
    assert.deepEqual(c.vazio, resultado.ciclos[0].vazio)
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(
    JSON.stringify({
      estado: resultado.estado,
      solidos: resultado.solidos,
      amostras: resultado.amostras.length,
      nado: resultado.nado,
      recursos: resultado.cheio,
      erros,
    }),
  )
} finally {
  await navegador.close()
}
