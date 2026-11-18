import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-solo-caminhos'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage(),
  erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const r = await pagina.evaluate(
    async (u) => {
      const T = await import(u.three),
        C = await import(u.core),
        { montarSuperficiesDaCompilacao } = await import(u.superficies),
        { particionarTerrenoCompilado } = await import(u.setores),
        { RecortesVisuaisDosCaminhos } = await import(u.recortes),
        { dividirParteEstatica } = await import(u.geometria),
        { gravarGlbCompilado } = await import(u.glb),
        { ArquivosDaCompilacao } = await import(u.arquivos),
        { lerGlb } = await import(u.modelos),
        d = C.criarDocumentoVazio('ensaio', 'Solo e caminhos'),
        digest = 'a'.repeat(64),
        recurso = C.lerRecursoDeTerreno(
          C.codificarPecaDeAlturas(
            Float64Array.from({ length: C.AMOSTRAS_DA_PECA }, (_, i) => (i % 65) / 32),
            -10,
            20,
          ),
        )
      d.base = {
        tipo: 'terreno',
        cobertura: 'grade',
        origem: { x: 0, z: 0 },
        passo: 0.25,
        colunas: 64,
        linhas: 64,
        min: -10,
        max: 20,
        fundo: 0,
        pecas: [{ coluna: 0, linha: 0, digest }],
      }
      const comum = {
        nome: 'Trilha',
        grupo: null,
        oculto: false,
        bloqueado: false,
        tipo: 'trilha',
        acabamento: null,
        largura: 1.5,
      }
      d.caminhos = [
        C.CaminhoSchema.parse({
          ...comum,
          id: 'a',
          pontos: [
            { x: 2, z: 8 },
            { x: 8, z: 8 },
            { x: 14, z: 8 },
          ],
        }),
        C.CaminhoSchema.parse({
          ...comum,
          id: 'b',
          pontos: [
            { x: 8, z: 2 },
            { x: 8, z: 14 },
          ],
        }),
      ]
      const s = montarSuperficiesDaCompilacao(
          d,
          { cenario: d.id, revisao: 0 },
          { equipe: true, bibliotecas: [] },
          new Map([[digest, recurso]]),
          () => null,
          () => null,
        ),
        recortes = new RecortesVisuaisDosCaminhos(s.caminhos.superficies(), s.alturas),
        antes = new T.Group(),
        depois = new T.Group(),
        geometrias = new Set(),
        materiais = new Set(),
        sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal),
        renderer = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }),
        scene = new T.Scene(),
        camera = new T.PerspectiveCamera(55, 640 / 360, 0.05, 100)
      renderer.setSize(640, 360)
      renderer.setClearColor('#26303b')
      renderer.toneMapping = T.NoToneMapping
      scene.add(new T.HemisphereLight('#ffffff', '#b5d3ff', 2))
      const luz = new T.DirectionalLight('#fff5dc', 2)
      luz.position.set(5, 12, 5)
      scene.add(luz)
      antes.add(s.terreno.grupo, s.caminhos.grupo)
      let carregado
      const adicionar = (g, material, matriz) => {
        geometrias.add(g)
        const m = material.clone()
        materiais.add(m)
        m.polygonOffset = false
        m.depthWrite = true
        if (m.vertexColors !== true) g.deleteAttribute('color')
        const mesh = new T.Mesh(g, m)
        mesh.matrixAutoUpdate = false
        mesh.matrix.copy(matriz)
        depois.add(mesh)
      }
      try {
        const fontes = []
        s.terreno.grupo.updateWorldMatrix(true, true)
        s.terreno.grupo.traverse((m) => {
          if (m.isMesh) fontes.push(m)
        })
        let setores = 0
        for (const m of fontes)
          for (const p of particionarTerrenoCompilado(
            { geometria: m.geometry, matriz: m.matrixWorld },
            d.base,
          )) {
            setores++
            let g
            try {
              g = recortes.recortar({ geometria: p.geometria, matriz: p.matriz })
              if (g.getAttribute('position').count)
                for (const parte of dividirParteEstatica(
                  { geometria: g, matriz: new T.Matrix4() },
                  new T.Matrix4(),
                ))
                  adicionar(parte, m.material, p.matriz)
            } finally {
              g?.dispose()
              p.geometria.dispose()
            }
          }
        for (const f of s.caminhos.superficies())
          for (const g of dividirParteEstatica(
            { geometria: f.geometria, matriz: f.matriz },
            new T.Matrix4(),
          ))
            adicionar(g, f.material, new T.Matrix4())
        const ref = await gravarGlbCompilado(
            depois,
            'terreno/encontro.glb',
            'terreno',
            arquivos,
            sinal,
          ),
          bytes = arquivos.arquivos.get(ref.caminho)
        carregado = await lerGlb(bytes.slice().buffer)
        const capturar = (grupo) => {
            scene.add(grupo)
            renderer.render(scene, camera)
            const pixels = new Uint8Array(640 * 360 * 4),
              gl = renderer.getContext()
            gl.readPixels(0, 0, 640, 360, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
            const png = renderer.domElement.toDataURL('image/png').split(',')[1]
            scene.remove(grupo)
            return { pixels, png }
          },
          vistas = [],
          quadros = []
        for (const [nome, posicao, alvo, up] of [
          ['superior', [8, 24, 8], [8, 1, 8], [0, 0, -1]],
          ['aproximacao', [3, 3, 13], [8, 1, 8], [0, 1, 0]],
          ['rasante', [8, 2.6, 14], [8, 1, 4], [0, 1, 0]],
        ]) {
          camera.position.set(...posicao)
          camera.up.set(...up)
          camera.lookAt(...alvo)
          camera.updateMatrixWorld(true)
          const a = capturar(antes),
            b = capturar(carregado.raiz)
          let soma = 0,
            maximo = 0,
            alterados = 0
          for (let i = 0; i < a.pixels.length; i++)
            if (i % 4 !== 3) {
              const erro = Math.abs(a.pixels[i] - b.pixels[i])
              soma += erro
              maximo = Math.max(maximo, erro)
              if (erro > 12) alterados++
            }
          vistas.push({
            nome,
            erroMedio: soma / (640 * 360 * 3),
            erroMaximo: maximo,
            amostrasAcimaDe12: alterados,
            antes: a.png,
            depois: b.png,
          })
        }
        for (let i = 0; i < 36; i++) {
          const t = i / 35
          camera.position.set(7 + Math.sin(t * Math.PI) * 1.5, 2.6, 14 - t * 9)
          camera.up.set(0, 1, 0)
          camera.lookAt(8, 1, 3)
          quadros.push(capturar(carregado.raiz).png)
        }
        const blocos = []
        for (let i = 0; i < bytes.length; i += 16384)
          blocos.push(String.fromCharCode(...bytes.subarray(i, i + 16384)))
        return {
          ref,
          setores,
          triangulosDeRecorte: recortes.quantidade,
          vistas,
          quadros,
          glb: btoa(blocos.join('')),
        }
      } finally {
        carregado?.descartar()
        for (const g of geometrias) g.dispose()
        for (const m of materiais) m.dispose()
        arquivos.descartar()
        renderer.dispose()
        s.descartar()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      superficies: modulo('packages/molda-cenarios-motor/src/compilar/superficies.ts'),
      setores: modulo('packages/molda-cenarios-motor/src/compilar/setores.ts'),
      recortes: modulo('packages/molda-cenarios-motor/src/compilar/recortes-caminhos.ts'),
      geometria: modulo('packages/molda-cenarios-motor/src/compilar/geometria.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
    },
  )
  for (const v of r.vistas) {
    writeFileSync(resolve(saida, `${v.nome}-editor.png`), Buffer.from(v.antes, 'base64'))
    writeFileSync(resolve(saida, `${v.nome}-compilado.png`), Buffer.from(v.depois, 'base64'))
    delete v.antes
    delete v.depois
  }
  for (const [i, q] of r.quadros.entries())
    writeFileSync(
      resolve(saida, `quadro-${String(i).padStart(3, '0')}.png`),
      Buffer.from(q, 'base64'),
    )
  writeFileSync(resolve(saida, 'encontro.glb'), Buffer.from(r.glb, 'base64'))
  delete r.glb
  delete r.quadros
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      '12',
      '-i',
      resolve(saida, 'quadro-%03d.png'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      resolve(saida, 'camera-compilada.mp4'),
    ],
    { windowsHide: true },
  )
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.ok(r.triangulosDeRecorte > 0)
  assert.ok(r.vistas.every((v) => v.erroMedio < 1))
} finally {
  await browser.close()
}
