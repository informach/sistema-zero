import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote5-material')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } }),
    erros = []
  pagina.on('pageerror', (erro) => erros.push(erro.message))
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  await pagina.waitForLoadState('networkidle')
  const modulo = (caminho) => `/@fs/${resolve(raiz, caminho).replaceAll('\\', '/')}`
  const resultado = await pagina.evaluate(
    async ({ coreUrl, tresUrl, pasta }) => {
      const core = await import(coreUrl),
        T = await import(tresUrl),
        { AlturasDaAgua } = await import(`${pasta}/alturas.ts`),
        { MaterialDaAgua } = await import(`${pasta}/material.ts`),
        { geometriaDaAgua } = await import(`${pasta}/geometria.ts`)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(1280, 800)
      const cena = new T.Scene(),
        camera = new T.PerspectiveCamera(45, 1280 / 800, 0.1, 200)
      camera.position.set(24, 23, 30)
      camera.lookAt(0, 0, 0)
      cena.background = new T.Color('#a9d9ed')
      const ambiente = new T.HemisphereLight('#ffffff', '#5b6857', 2.1),
        sol = new T.DirectionalLight('#fff2cf', 2)
      sol.position.set(-8, 20, 10)
      cena.add(ambiente, sol)
      const base = {
          tipo: 'terreno',
          origem: { x: -32, z: -32 },
          colunas: 64,
          linhas: 64,
          passo: 1,
          min: -10,
          max: 10,
          fundo: -5,
          pecas: [],
          cobertura: 'grade',
        },
        campo = core.criarCampoDeAlturas(base, 2)
      for (let z = 0; z <= 64; z++)
        for (let x = 0; x <= 64; x++) {
          const d = Math.hypot(x - 32, z - 32)
          campo.alturas[z * 65 + x] = d < 3 ? 2 : d < 13 ? -3 + Math.max(0, d - 9) * 1.3 : 2
        }
      const mapa = new AlturasDaAgua(
          base,
          campo,
          Math.min(2048, renderer.capabilities.maxTextureSize),
          () => true,
        ),
        dados = core.malhaDeGradeNaPeca(
          base,
          { coluna: 0, linha: 0 },
          (x, z) => campo.alturas[z * 65 + x],
        ),
        chaoGeo = new T.BufferGeometry()
          .setAttribute('position', new T.BufferAttribute(dados.vertices, 3))
          .setIndex(new T.BufferAttribute(dados.indices, 1))
      chaoGeo.computeVertexNormals()
      const chao = new T.Mesh(
        chaoGeo,
        new T.MeshStandardMaterial({ color: '#9bc28b', roughness: 1 }),
      )
      chao.position.set(-32, 0, -32)
      cena.add(chao)
      const comum = { id: 'a', nome: 'Água', grupo: null, oculto: false, bloqueado: false },
        contorno = [
          { x: -14, z: -14 },
          { x: 14, z: -14 },
          { x: 14, z: 14 },
          { x: -14, z: 14 },
        ],
        agua = core.AguaSchema.parse({
          ...comum,
          tipo: 'lago',
          modelo: null,
          centro: { x: 0, z: 0 },
          giro: 0,
          escala: 1,
          nivel: 0,
          profundidade: 10,
          contorno,
          recorte: contorno,
          ilhas: [
            [
              { x: -2, z: -2 },
              { x: 2, z: -2 },
              { x: 2, z: 2 },
              { x: -2, z: 2 },
            ],
          ],
        }),
        g = geometriaDaAgua(agua, base),
        material = new MaterialDaAgua(undefined, { fundo: mapa, profundidade: 10 }),
        malha = new T.Mesh(g.geometria, material.material)
      malha.position.copy(g.origem)
      cena.add(malha)
      const desenhar = () => {
        material.atualizar(2, false)
        renderer.render(cena, camera)
      }
      desenhar()
      const inicial = { ...renderer.info.memory },
        programas = renderer.info.programs.length
      // Uma única altura modificada deve ser refletida na GPU sem apagar os canais vizinhos.
      campo.alturas[32 * 65 + 38] = -1
      mapa.atualizar(campo, { x0: 38, x1: 38, z0: 32, z1: 32 })
      desenhar()
      const alvo = new T.WebGLRenderTarget(1, 1),
        geometriaTeste = new T.PlaneGeometry(2, 2),
        cameraTeste = new T.Camera()
      async function lerAltura(mapa, ponto, min, amplitude) {
        const m = new T.ShaderMaterial({
            uniforms: {
              ...mapa.uniformes,
              ponto: { value: new T.Vector2(...ponto) },
              minimo: { value: min },
              amplitude: { value: amplitude },
            },
            vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
            fragmentShader: `uniform vec2 ponto; uniform float minimo, amplitude; ${mapa.glsl} void main(){float h=mcnAlturaDoFundo(ponto);gl_FragColor=vec4(vec3((h-minimo)/amplitude),1.0);}`,
          }),
          s = new T.Scene()
        s.add(new T.Mesh(geometriaTeste, m))
        try {
          renderer.setRenderTarget(alvo)
          renderer.render(s, cameraTeste)
          const bytes = new Uint8Array(4)
          renderer.readRenderTargetPixels(alvo, 0, 0, 1, 1, bytes)
          return bytes[0]
        } finally {
          renderer.setRenderTarget(null)
          m.dispose()
        }
      }
      const leituras = []
      for (const [x, z] of [
        [6, 0],
        [5.25, 0.25],
        [5.8, 0.8],
      ])
        leituras.push({
          x,
          z,
          valor: await lerAltura(mapa, [x, z], -10, 20),
          esperado: Math.round(((core.alturaDoCampo(campo, x, z) + 10) / 20) * 255),
        })
      // Compilar também as variantes sem terreno e com queda, dia/noite, sem um piso de água.
      const variantes = []
      for (const a of [
        core.AguaSchema.parse({ ...comum, tipo: 'mar', nivel: -4 }),
        core.AguaSchema.parse({
          ...comum,
          tipo: 'rio',
          largura: 2,
          profundidade: 2,
          correnteza: 1,
          pontos: [
            { x: -8, y: 2, z: 3 },
            { x: 0, y: 1, z: 3 },
            { x: 8, y: 0, z: 6 },
          ],
        }),
        core.AguaSchema.parse({
          ...comum,
          tipo: 'cachoeira',
          topo: { x: -10, y: 6, z: 0 },
          base: { x: -10, y: 0, z: 0 },
          largura: 3,
          giro: 0,
        }),
      ]) {
        const g = geometriaDaAgua(a, base),
          m = new MaterialDaAgua(undefined, {
            fundo: null,
            profundidade: 2,
            movimento: a.tipo === 'cachoeira' ? 'queda' : a.tipo === 'rio' ? 'rio' : 'horizontal',
            largura: a.tipo === 'mar' ? 1 : a.largura,
            correnteza: a.tipo === 'rio' ? a.correnteza : 0,
          }),
          mesh = new T.Mesh(g.geometria, m.material)
        mesh.position.copy(g.origem)
        cena.add(mesh)
        m.atualizar(3, false)
        desenhar()
        variantes.push(a.tipo)
        cena.remove(mesh)
        g.geometria.dispose()
        m.descartar()
      }
      // A última linha da grade máxima ultrapassa 2^24 índices. uint conserva índices ímpares;
      // a paginação força dois mapas em um dispositivo de 2048 px sem alocar malha gigante.
      const grandeBase = {
          ...base,
          origem: { x: 0, z: 0 },
          colunas: 4096,
          linhas: 4096,
          passo: 0.25,
        },
        grandeCampo = core.criarCampoDeAlturas(grandeBase, 0)
      grandeCampo.alturas.set([1, 4, 7, 10], grandeCampo.alturas.length - 4)
      const grande = new AlturasDaAgua(grandeBase, grandeCampo, 2048, () => true),
        ultimas = []
      try {
        for (let i = 0; i < 4; i++)
          ultimas.push({
            valor: await lerAltura(grande, [(4093 + i) * 0.25, 1024], 0, 10),
            esperado: Math.round(([1, 4, 7, 10][i] / 10) * 255),
          })
      } finally {
        grande.descartar()
      }
      alvo.dispose()
      geometriaTeste.dispose()
      desenhar()
      window.__aguaMaterialQA = {
        renderer,
        cena,
        camera,
        material,
        mapa,
        desenhar,
        noite() {
          ambiente.intensity = 0.35
          sol.intensity = 0.08
          cena.background.set('#13283f')
          desenhar()
        },
        destruir() {
          mapa.descartar()
          material.descartar()
          g.geometria.dispose()
          chaoGeo.dispose()
          chao.material.dispose()
          renderer.dispose()
        },
      }
      return {
        inicial,
        programas,
        atual: { ...renderer.info.memory },
        leituras,
        ultimas,
        variantes,
        maxTextura: renderer.capabilities.maxTextureSize,
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      tresUrl: modulo('node_modules/three/build/three.module.js'),
      pasta: modulo('packages/molda-cenarios-motor/src/agua'),
    },
  )
  await pagina.screenshot({ path: resolve(saida, 'lago-dia.png') })
  await pagina.evaluate(() => window.__aguaMaterialQA.noite())
  await pagina.screenshot({ path: resolve(saida, 'lago-noite.png') })
  await pagina.evaluate(() => window.__aguaMaterialQA.destruir())
  assert.deepEqual(erros, [])
  for (const r of [...resultado.leituras, ...resultado.ultimas])
    assert.ok(Math.abs(r.valor - r.esperado) <= 1, JSON.stringify(r))
  assert.deepEqual(resultado.variantes, ['mar', 'rio', 'cachoeira'])
  assert.ok(resultado.programas >= 2)
  assert.equal(resultado.atual.textures, resultado.inicial.textures)
  assert.equal(resultado.atual.geometries, resultado.inicial.geometries)
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(JSON.stringify(resultado))
} finally {
  await navegador.close()
}
