import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  espelhar = process.env.CENARIOS_QA_ATOR_REFLEXO === '1',
  saida = resolve(raiz, `output/cenarios-reforma/lote8-animacao${espelhar ? '-espelho' : ''}`),
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
        { modeloAnimavelDeEnsaio } = await import(urls.fixture),
        { normalizarRaizAnimavel } = await import(urls.raiz),
        { ArquivosDaCompilacao } = await import(urls.arquivos),
        { gravarGlbCompilado } = await import(urls.glb),
        { lerGlb } = await import(urls.modelos),
        { matrizDoEspelho } = await import(urls.representacoes),
        original = modeloAnimavelDeEnsaio(),
        caixa = new T.Box3().setFromObject(original.raiz),
        espelho = { x: urls.espelhar, y: false, z: false },
        reflexo = matrizDoEspelho(caixa, espelho),
        normal = normalizarRaizAnimavel(original.raiz, [original.clip], { caixa, espelho }),
        sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal),
        a = new T.AnimationMixer(original.raiz)
      let carregado, b
      try {
        const ref = await gravarGlbCompilado(
            normal.raiz,
            'modelos/ator.glb',
            'modelo',
            arquivos,
            sinal,
            normal.animacoes,
          ),
          bytes = arquivos.arquivos.get(ref.caminho)
        carregado = await lerGlb(bytes.slice().buffer)
        b = new T.AnimationMixer(carregado.raiz)
        const partes = []
        carregado.raiz.traverse((n) => {
          if (n.isSkinnedMesh) partes.push(n)
        })
        a.clipAction(original.clip).play()
        b.clipAction(carregado.animacoes[0]).play()
        const quadros = []
        for (const passo of [0.125, 0.125, 0.25, 0.25]) {
          a.update(passo)
          b.update(passo)
          original.raiz.updateMatrixWorld(true)
          carregado.raiz.updateMatrixWorld(true)
          let erro = 0
          for (const parte of partes) {
            const chave = Object.keys(parte.geometry.attributes).find(
                (k) => k.toLowerCase().replace(/^_/, '') === 'indiceoriginal',
              ),
              ids = parte.geometry.getAttribute(chave)
            for (const i of [0, 1, ids.count - 1]) {
              const origem = ids.getX(i),
                esperado = original.malha
                  .getVertexPosition(origem, new T.Vector3())
                  .applyMatrix4(original.malha.matrixWorld)
                  .applyMatrix4(reflexo),
                obtido = parte.getVertexPosition(i, new T.Vector3()).applyMatrix4(parte.matrixWorld)
              erro = Math.max(erro, esperado.distanceTo(obtido))
            }
          }
          quadros.push({ tempo: a.time, erroMaximoMetros: erro })
        }
        const blocos = []
        for (let i = 0; i < bytes.length; i += 16384)
          blocos.push(String.fromCharCode(...bytes.subarray(i, i + 16384)))
        return {
          ref,
          espelho,
          partes: partes.length,
          vertices: partes.map((n) => n.geometry.getAttribute('position').count),
          clipes: carregado.animacoes.length,
          quadros,
          glb: btoa(blocos.join('')),
        }
      } finally {
        a.stopAllAction()
        a.uncacheRoot(original.raiz)
        if (b) {
          b.stopAllAction()
          b.uncacheRoot(carregado.raiz)
        }
        carregado?.descartar()
        normal.descartar()
        arquivos.descartar()
        original.malha.skeleton.dispose()
        original.g.dispose()
        original.material.dispose()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      fixture: modulo('packages/molda-cenarios-motor/tests/fixtures/modelo-animavel.ts'),
      raiz: modulo('packages/molda-cenarios-motor/src/compilar/raiz-animavel.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      representacoes: modulo('packages/molda-cenarios-motor/src/representacoes.ts'),
      espelhar,
    },
  )
  writeFileSync(resolve(saida, 'ator.glb'), Buffer.from(r.glb, 'base64'))
  delete r.glb
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.equal(r.partes, 2)
  assert.equal(r.clipes, 1)
  assert.ok(r.vertices.every((n) => n <= 65_000))
  assert.ok(r.quadros.every((q) => q.erroMaximoMetros < 0.0001))
} finally {
  await browser.close()
}
