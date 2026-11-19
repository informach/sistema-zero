import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  ppm = Number(process.env.CENARIOS_QA_AGUA_PPM ?? 32),
  diagnosticar = process.env.CENARIOS_QA_AGUA_DIAGNOSTICO === '1',
  saida = resolve(raiz, `output/cenarios-reforma/lote8-agua-${ppm}ppm`),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await browser.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const r = await p.evaluate(
    async (u) => {
      const T = await import(u.three),
        C = await import(u.core),
        { AlturasDaAgua } = await import(u.alturas),
        { MaterialDaAgua } = await import(u.material),
        { prepararAguaCompilada } = await import(u.agua),
        { ArquivosDaCompilacao } = await import(u.arquivos),
        { gravarGlbCompilado } = await import(u.glb),
        { lerGlb } = await import(u.modelos),
        base = {
          tipo: 'terreno',
          origem: { x: -32, z: -32 },
          passo: 1,
          colunas: 64,
          linhas: 64,
          min: -100,
          max: 100,
          fundo: -10,
          pecas: [],
        },
        campo = C.criarCampoDeAlturas(base)
      for (let z = 0; z <= 64; z++) for (let x = 0; x <= 64; x++) campo.alturas[z * 65 + x] = x - 32
      const alturas = new AlturasDaAgua(base, campo, 128, () => true),
        material = new MaterialDaAgua(
          { ondas: { altura: 0, comprimento: 3, velocidade: 0 } },
          { fundo: alturas, profundidade: 4 },
        ),
        g = new T.PlaneGeometry(4, 4).rotateX(-Math.PI / 2).translate(0, 1, 0),
        original = new T.Mesh(g, material.material),
        sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal),
        preparada = await prepararAguaCompilada(
          { geometria: g, matriz: new T.Matrix4(), acabamento: material },
          sinal,
          u.ppm,
        ),
        pronta = new T.Mesh(preparada.geometria, preparada.material),
        scene = new T.Scene(),
        renderer = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }),
        camera = new T.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, 0.1, 20)
      renderer.setSize(256, 256)
      renderer.setClearColor('#26303b')
      renderer.toneMapping = T.NoToneMapping
      camera.position.set(0, 10, 0)
      camera.up.set(0, 0, -1)
      camera.lookAt(0, 1, 0)
      scene.add(new T.HemisphereLight('#ffffff', '#ffffff', 2))
      const capturar = (modelo) => {
        scene.add(modelo)
        renderer.render(scene, camera)
        const pixels = new Uint8Array(256 * 256 * 4),
          gl = renderer.getContext()
        gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        const png = renderer.domElement.toDataURL('image/png').split(',')[1]
        scene.remove(modelo)
        return { pixels, png }
      }
      let carregado
      try {
        const ref = await gravarGlbCompilado(pronta, 'aguas/lago.glb', 'agua', arquivos, sinal),
          bytes = arquivos.arquivos.get(ref.caminho)
        carregado = await lerGlb(bytes.slice().buffer)
        const a = capturar(original),
          b = capturar(carregado.raiz)
        const diagnosticos = []
        if (u.diagnosticar) {
          const preparar = material.material.onBeforeCompile
          for (const [nome, expressao] of [
            [
              'posicao',
              'vec4(vMcnAguaMundo.x / 4.0 + .5, vMcnAguaMundo.y / 4.0, vMcnAguaMundo.z / 4.0 + .5, 1.0)',
            ],
            ['fundo', 'vec4(vec3(mcnAlturaDoFundo(vMcnAguaMundo.xz) / 8.0 + .5), 1.0)'],
            ['amostra', 'vec4(vec3(mcnAlturaDaAmostra(uvec2(33u, 32u)) / 8.0 + .5), 1.0)'],
          ]) {
            material.material.onBeforeCompile = (shader) => {
              preparar(shader)
              if (!shader.fragmentShader.includes('void main() {'))
                throw Error('Shader de diagnóstico sem main')
              shader.fragmentShader = shader.fragmentShader.replace(
                'void main() {',
                `void main() { gl_FragColor = ${expressao}; return;`,
              )
            }
            material.material.customProgramCacheKey = () => `diagnostico-${nome}`
            material.material.needsUpdate = true
            const quadro = capturar(original)
            diagnosticos.push({
              nome,
              amostras: [32, 64, 96, 128, 160, 192, 224].map((x) => ({
                x,
                rgba: Array.from(
                  quadro.pixels.subarray((128 * 256 + x) * 4, (128 * 256 + x) * 4 + 4),
                ),
                fundoCpu: alturas.alturaEm(((x + 0.5) / 256) * 4.4 - 2.2, 0),
              })),
            })
          }
        }
        let soma = 0,
          maximo = 0,
          quantidade = 0
        for (let y = 18; y < 238; y++)
          for (let x = 18; x < 238; x++)
            for (let c = 0; c < 3; c++) {
              const i = (y * 256 + x) * 4 + c,
                d = Math.abs(a.pixels[i] - b.pixels[i])
              soma += d
              maximo = Math.max(maximo, d)
              quantidade++
            }
        const blocos = []
        for (let i = 0; i < bytes.length; i += 16384)
          blocos.push(String.fromCharCode(...bytes.subarray(i, i + 16384)))
        const png = []
        for (let i = 0; i < preparada.pintura.png.length; i += 16384)
          png.push(String.fromCharCode(...preparada.pintura.png.subarray(i, i + 16384)))
        return {
          ref,
          pixelsPorMetro: u.ppm,
          largura: preparada.pintura.largura,
          altura: preparada.pintura.altura,
          erroMedio: soma / quantidade,
          erroMaximo: maximo,
          amostras: quantidade,
          diagnosticos,
          antes: a.png,
          depois: b.png,
          glb: btoa(blocos.join('')),
          pintura: btoa(png.join('')),
        }
      } finally {
        carregado?.descartar()
        arquivos.descartar()
        preparada.descartar()
        material.descartar()
        alturas.descartar()
        g.dispose()
        renderer.dispose()
      }
    },
    {
      ppm,
      diagnosticar,
      three: modulo('node_modules/three/build/three.module.js'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      alturas: modulo('packages/molda-cenarios-motor/src/agua/alturas.ts'),
      material: modulo('packages/molda-cenarios-motor/src/agua/material.ts'),
      agua: modulo('packages/molda-cenarios-motor/src/compilar/agua.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
    },
  )
  writeFileSync(resolve(saida, 'agua-editor.png'), Buffer.from(r.antes, 'base64'))
  writeFileSync(resolve(saida, 'agua-compilada.png'), Buffer.from(r.depois, 'base64'))
  writeFileSync(resolve(saida, 'agua.glb'), Buffer.from(r.glb, 'base64'))
  writeFileSync(resolve(saida, 'pintura.png'), Buffer.from(r.pintura, 'base64'))
  delete r.antes
  delete r.depois
  delete r.glb
  delete r.pintura
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.ok(r.erroMedio < 2)
  assert.ok(r.erroMaximo <= 24)
} finally {
  await browser.close()
}
