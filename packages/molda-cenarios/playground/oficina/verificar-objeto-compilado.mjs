import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-objeto'),
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
    async (urls) => {
      const T = await import(urls.three),
        { RepresentacoesDoModelo } = await import(urls.representacoes),
        { criarModeloDaForma } = await import(urls.formas),
        { matrizDoObjeto } = await import(urls.matematica),
        { criarDocumentoVazio } = await import(urls.core),
        { prepararObjetoEstatico } = await import(urls.objeto),
        { ArquivosDaCompilacao } = await import(urls.arquivos),
        { gravarGlbCompilado } = await import(urls.glb),
        { lerGlb } = await import(urls.modelos),
        doc = criarDocumentoVazio('c', 'Objeto'),
        o = {
          id: 'o',
          nome: 'Objeto',
          modelo: 'f',
          grupo: null,
          oculto: false,
          bloqueado: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 2, y: 0, z: -3 },
            rotacao: { x: 0, y: 0.7, z: 0 },
            escala: { x: 2, y: 1, z: 3 },
          },
          espelho: { x: true, y: false, z: false },
          aparencia: { cor: '#ffd98a', textura: { id: 't', repeticaoMetros: 1.5 } },
        },
        modelo = criarModeloDaForma({
          id: 'f',
          nome: 'Caixa',
          tipo: 'caixa',
          largura: 2,
          altura: 1,
          comprimento: 3,
        }),
        matriz = matrizDoObjeto(doc, o, new T.Matrix4()),
        canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      canvas
        .getContext('2d')
        .putImageData(
          new ImageData(
            new Uint8ClampedArray([
              255, 90, 20, 255, 40, 80, 250, 255, 250, 230, 90, 255, 25, 180, 90, 255,
            ]),
            2,
            2,
          ),
          0,
          0,
        )
      const textura = new T.CanvasTexture(canvas)
      textura.colorSpace = T.SRGBColorSpace
      textura.wrapS = textura.wrapT = T.RepeatWrapping
      textura.minFilter = textura.magFilter = T.LinearFilter
      textura.generateMipmaps = false
      const scene = new T.Scene(),
        pai = new T.Group(),
        representacoes = new RepresentacoesDoModelo(pai, modelo),
        lote = representacoes.obter(o.espelho, { textura, repeticaoMetros: 1.5 }),
        camera = new T.PerspectiveCamera(40, 1, 0.1, 100),
        renderer = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
      lote.preencher([{ id: 'o', matriz, cor: o.aparencia.cor }])
      scene.add(pai)
      scene.add(new T.HemisphereLight('#ffffff', '#ffffff', 2))
      camera.position.set(10, 6, 5)
      camera.lookAt(2, 0.5, -3)
      renderer.setSize(224, 224)
      renderer.setClearColor('#26303b')
      renderer.toneMapping = T.NoToneMapping
      const capturar = () => {
        renderer.render(scene, camera)
        const pixels = new Uint8Array(224 * 224 * 4),
          gl = renderer.getContext()
        gl.readPixels(0, 0, 224, 224, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        return { pixels, png: renderer.domElement.toDataURL('image/png').split(',')[1] }
      }
      const antes = capturar(),
        pronto = prepararObjetoEstatico(o, modelo, textura),
        sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal)
      let carregado
      try {
        const ref = await gravarGlbCompilado(
          pronto.raiz,
          'modelos/objeto.glb',
          'modelo',
          arquivos,
          sinal,
        )
        carregado = await lerGlb(arquivos.arquivos.get(ref.caminho).slice().buffer)
        carregado.raiz.matrixAutoUpdate = false
        carregado.raiz.matrix.copy(matriz)
        scene.remove(pai)
        scene.add(carregado.raiz)
        const depois = capturar(),
          fundo = antes.pixels.slice(0, 3)
        let soma = 0,
          maximo = 0,
          n = 0
        for (let i = 0; i < antes.pixels.length; i += 4) {
          if (
            [0, 1, 2].every((c) => Math.abs(antes.pixels[i + c] - fundo[c]) <= 1) ||
            [0, 1, 2].every((c) => Math.abs(depois.pixels[i + c] - fundo[c]) <= 1)
          )
            continue
          for (let c = 0; c < 3; c++) {
            const d = Math.abs(antes.pixels[i + c] - depois.pixels[i + c])
            soma += d
            maximo = Math.max(maximo, d)
            n++
          }
        }
        return {
          ref,
          erroMedio: soma / n,
          erroMaximo: maximo,
          amostras: n,
          antes: antes.png,
          depois: depois.png,
        }
      } finally {
        carregado?.descartar()
        pronto.descartar()
        arquivos.descartar()
        representacoes.descartar()
        modelo.descartar()
        textura.dispose()
        renderer.dispose()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      representacoes: modulo('packages/molda-cenarios-motor/src/representacoes.ts'),
      formas: modulo('packages/molda-cenarios-motor/src/formas.ts'),
      matematica: modulo('packages/molda-cenarios-motor/src/matematica.ts'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      objeto: modulo('packages/molda-cenarios-motor/src/compilar/objeto-estatico.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
    },
  )
  writeFileSync(resolve(saida, 'objeto-editor.png'), Buffer.from(r.antes, 'base64'))
  writeFileSync(resolve(saida, 'objeto-compilado.png'), Buffer.from(r.depois, 'base64'))
  delete r.antes
  delete r.depois
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.ok(r.amostras > 1000)
  assert.ok(r.erroMedio < 1.5)
  assert.ok(r.erroMaximo <= 15)
} finally {
  await browser.close()
}
