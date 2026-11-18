import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-pintura'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await browser.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const resultado = await p.evaluate(
    async (urls) => {
      const T = await import(urls.three),
        { MaterialDoSolo } = await import(urls.material),
        { rasterizarSoloCompilado } = await import(urls.pintura),
        { ArquivosDaCompilacao } = await import(urls.arquivos),
        { gravarGlbCompilado } = await import(urls.glb),
        { lerGlb } = await import(urls.modelos),
        scene = new T.Scene(),
        renderer = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }),
        camera = new T.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 20),
        canvas = document.createElement('canvas')
      renderer.setSize(160, 160)
      renderer.setClearColor('#26303b')
      renderer.toneMapping = T.NoToneMapping
      canvas.width = 2
      canvas.height = 2
      const ctx = canvas.getContext('2d')
      ctx.putImageData(
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
      const imagem = new T.CanvasTexture(canvas)
      imagem.colorSpace = T.SRGBColorSpace
      imagem.wrapS = imagem.wrapT = T.RepeatWrapping
      imagem.minFilter = imagem.magFilter = T.LinearFilter
      imagem.generateMipmaps = false
      const camadas = [
          {
            id: 'a',
            nome: 'Padrão',
            cor: '#ffffff',
            textura: { id: 'padrao', repeticaoMetros: 1.5 },
          },
          { id: 'b', nome: 'Cultivo', cor: '#b6d4a8' },
        ],
        material = new MaterialDoSolo(camadas),
        g = new T.BufferGeometry()
          .setAttribute(
            'position',
            new T.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1], 3),
          )
          .setAttribute(
            'mcnPesosA',
            new T.BufferAttribute(
              new Uint8Array([255, 0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0]),
              4,
              true,
            ),
          )
          .setAttribute('mcnPesosB', new T.BufferAttribute(new Uint8Array(16), 4, true))
          .setIndex([0, 2, 1, 1, 2, 3])
      g.computeVertexNormals()
      material.definirTexturas(() => imagem)
      const original = new T.Mesh(g, material.material)
      original.position.set(3.25, 0, -1.3)
      original.updateMatrixWorld(true)
      camera.position.set(3.25, 10, -1.3)
      camera.up.set(0, 0, -1)
      camera.lookAt(3.25, 0, -1.3)
      scene.add(new T.HemisphereLight('#ffffff', '#ffffff', 2))
      scene.add(original)
      const capturar = () => {
        renderer.render(scene, camera)
        const pixels = new Uint8Array(160 * 160 * 4),
          gl = renderer.getContext()
        gl.readPixels(0, 0, 160, 160, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        return { pixels, png: renderer.domElement.toDataURL('image/png').split(',')[1] }
      }
      const antes = capturar(),
        fontes = new Map([
          [
            'padrao',
            {
              largura: 2,
              altura: 2,
              pixels: ctx.getImageData(0, 0, 2, 2).data,
              flipY: imagem.flipY,
            },
          ],
        ]),
        inicio = performance.now(),
        pintura = rasterizarSoloCompilado(g, original.matrixWorld, camadas, fontes, {
          pixelsPorMetro: 64,
        }),
        tempoMs = performance.now() - inicio,
        derivada = g.clone(),
        mapa = new T.DataTexture(pintura.pixels, pintura.largura, pintura.altura, T.RGBAFormat)
      mapa.colorSpace = T.SRGBColorSpace
      mapa.needsUpdate = true
      mapa.minFilter = mapa.magFilter = T.LinearFilter
      mapa.generateMipmaps = false
      derivada.setAttribute('uv', new T.BufferAttribute(pintura.uvs, 2))
      derivada.deleteAttribute('mcnPesosA')
      derivada.deleteAttribute('mcnPesosB')
      const acabamento = new T.MeshStandardMaterial({ map: mapa, roughness: 1, metalness: 0 }),
        assada = new T.Mesh(derivada, acabamento)
      assada.position.copy(original.position)
      const sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal)
      let carregado
      try {
        const ref = await gravarGlbCompilado(
            assada,
            'terreno/solo.glb',
            'terreno',
            arquivos,
            sinal,
          ),
          bytes = arquivos.arquivos.get(ref.caminho)
        carregado = await lerGlb(bytes.slice().buffer)
        scene.remove(original)
        scene.add(carregado.raiz)
        const depois = capturar()
        let soma = 0,
          maximo = 0,
          quantidade = 0
        // Exclui borda geométrica e filtro de borda; o interior inteiro inclui regiões e padrões.
        for (let y = 14; y < 146; y++)
          for (let x = 14; x < 146; x++)
            for (let c = 0; c < 3; c++) {
              const i = (y * 160 + x) * 4 + c,
                d = Math.abs(antes.pixels[i] - depois.pixels[i])
              soma += d
              maximo = Math.max(maximo, d)
              quantidade++
            }
        return {
          largura: pintura.largura,
          altura: pintura.altura,
          tempoMs,
          erroMedio: soma / quantidade,
          erroMaximo: maximo,
          antes: antes.png,
          depois: depois.png,
        }
      } finally {
        carregado?.descartar()
        arquivos.descartar()
        renderer.dispose()
        g.dispose()
        derivada.dispose()
        material.descartar()
        acabamento.dispose()
        imagem.dispose()
        mapa.dispose()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      material: modulo('packages/molda-cenarios-motor/src/material-solo.ts'),
      pintura: modulo('packages/molda-cenarios-motor/src/compilar/pintura.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
    },
  )
  writeFileSync(resolve(saida, 'solo-editor.png'), Buffer.from(resultado.antes, 'base64'))
  writeFileSync(resolve(saida, 'solo-compilado.png'), Buffer.from(resultado.depois, 'base64'))
  delete resultado.antes
  delete resultado.depois
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado, null, 2))
  assert.deepEqual(erros, [])
  assert.ok(resultado.erroMedio < 1.5)
  assert.ok(resultado.erroMaximo <= 12)
} finally {
  await browser.close()
}
