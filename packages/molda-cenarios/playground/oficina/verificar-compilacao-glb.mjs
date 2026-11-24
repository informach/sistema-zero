import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-glb'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true }),
  p = await navegador.newPage(),
  erros = []
p.on('pageerror', (e) => erros.push(e.message))
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  await p.waitForFunction(() => window.__cenarios)
  const resultado = await p.evaluate(
    async (urls) => {
      const THREE = await import(urls.three),
        { ArquivosDaCompilacao } = await import(urls.arquivos),
        { gravarGlbCompilado } = await import(urls.glb),
        { lerGlb } = await import(urls.modelos),
        { inspecionarGlbDaCompilacao } = await import(urls.inspecao),
        s = new AbortController().signal,
        a = new ArquivosDaCompilacao(s),
        g = new THREE.BoxGeometry(2, 1, 3),
        textura = new THREE.DataTexture(
          new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]),
          2,
          2,
          THREE.RGBAFormat,
        ),
        material = new THREE.MeshStandardMaterial({ map: textura }),
        grupo = new THREE.Group(),
        malha = new THREE.Mesh(g, material)
      textura.colorSpace = THREE.SRGBColorSpace
      textura.needsUpdate = true
      grupo.position.set(4, 2, -3)
      malha.position.y = 0.5
      grupo.add(malha)
      let carregado
      try {
        const ref = await gravarGlbCompilado(grupo, 'modelos/ensaio.glb', 'modelo', a, s),
          bytes = a.arquivos.get(ref.caminho)
        carregado = await lerGlb(bytes.slice().buffer)
        const tamanhos = [...carregado.caixa.getSize(new THREE.Vector3())],
          centro = [...carregado.caixa.getCenter(new THREE.Vector3())],
          medidas = inspecionarGlbDaCompilacao(bytes),
          mapa = carregado.partes[0].material.map,
          canvas = document.createElement('canvas')
        canvas.width = 2
        canvas.height = 2
        canvas.getContext('2d').drawImage(mapa.image, 0, 0)
        const pixels = [...canvas.getContext('2d').getImageData(0, 0, 2, 2).data]
        return { ref, tamanhos, centro, medidas, pixels, glb: [...bytes] }
      } finally {
        carregado?.descartar()
        a.descartar()
        g.dispose()
        material.dispose()
        textura.dispose()
      }
    },
    {
      three: modulo('packages/molda-cenarios-motor/node_modules/three/build/three.module.js'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      inspecao: modulo('packages/molda-cenarios-motor/src/compilar/inspecao-glb.ts'),
    },
  )
  assert.deepEqual(resultado.tamanhos, [2, 1, 3])
  assert.deepEqual(resultado.centro, [4, 2.5, -3])
  assert.equal(resultado.ref.malhas, 1)
  assert.equal(resultado.ref.triangulos, 12)
  assert.deepEqual(
    resultado.pixels,
    [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255],
  )
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'ensaio.glb'), new Uint8Array(resultado.glb))
  delete resultado.glb
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado, null, 2))
} finally {
  await navegador.close()
}
