import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  espelhar = process.env.CENARIOS_QA_ATOR_REFLEXO === '1',
  acabamento = process.env.CENARIOS_QA_ATOR_TEXTURA === '1',
  saida = resolve(
    raiz,
    `output/cenarios-reforma/lote8-ator-real${espelhar ? '-espelho' : ''}${acabamento ? '-textura' : ''}`,
  ),
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
        { normalizarRaizAnimavel } = await import(urls.raiz),
        { ArquivosDaCompilacao } = await import(urls.arquivos),
        { gravarGlbCompilado } = await import(urls.glb),
        { lerGlb } = await import(urls.modelos),
        { inspecionarGlbDaCompilacao } = await import(urls.inspecao),
        { matrizDoEspelho } = await import(urls.representacoes),
        bytesFonte = new Uint8Array(await (await fetch(urls.fonte)).arrayBuffer())
      inspecionarGlbDaCompilacao(bytesFonte, { fonte: true })
      const original = await lerGlb(bytesFonte.buffer),
        espelho = { x: urls.espelhar, y: false, z: false },
        reflexo = matrizDoEspelho(original.caixa, espelho),
        canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffe080'
      ctx.fillRect(0, 0, 2, 2)
      ctx.fillStyle = '#2060a0'
      ctx.fillRect(0, 0, 1, 1)
      const textura = new T.CanvasTexture(canvas),
        normal = normalizarRaizAnimavel(original.raiz, original.animacoes, {
          caixa: original.caixa,
          espelho,
          ...(urls.acabamento
            ? {
                cor: '#ffd0a0',
                textura: { mapa: textura, escala: new T.Vector3(2, 1, 3), repeticaoMetros: 0.5 },
              }
            : {}),
        }),
        sinal = new AbortController().signal,
        arquivos = new ArquivosDaCompilacao(sinal)
      let compilado
      try {
        const ref = await gravarGlbCompilado(
            normal.raiz,
            'modelos/cute-ensaio.glb',
            'modelo',
            arquivos,
            sinal,
            normal.animacoes,
          ),
          bytes = arquivos.arquivos.get(ref.caminho)
        compilado = await lerGlb(bytes.slice().buffer)
        const fontes = [],
          destinos = []
        original.raiz.traverse((n) => {
          if (n.isSkinnedMesh) fontes.push(n)
        })
        compilado.raiz.traverse((n) => {
          if (n.isSkinnedMesh) destinos.push(n)
        })
        if (fontes.length !== destinos.length)
          throw Error('O ensaio exige correspondência das peças reais do avatar.')
        const quadros = []
        for (const nome of ['parado_relaxado', 'andar_frente', 'correr_frente', 'pulo_no_ar']) {
          const clip = original.animacoes.find((c) => c.name === nome),
            copia = compilado.animacoes.find((c) => c.name === nome)
          if (!clip || !copia) throw Error(`Clipe perdido: ${nome}`)
          const a = new T.AnimationMixer(original.raiz),
            b = new T.AnimationMixer(compilado.raiz)
          try {
            a.clipAction(clip).play()
            b.clipAction(copia).play()
            for (const fracao of [0.125, 0.125, 0.25]) {
              const passo = clip.duration * fracao
              a.update(passo)
              b.update(passo)
              original.raiz.updateMatrixWorld(true)
              compilado.raiz.updateMatrixWorld(true)
              let erro = 0
              for (let m = 0; m < fontes.length; m++) {
                const fonte = fontes[m],
                  destino = destinos[m],
                  n = fonte.geometry.index?.count ?? fonte.geometry.getAttribute('position').count,
                  nd =
                    destino.geometry.index?.count ?? destino.geometry.getAttribute('position').count
                if (n !== nd)
                  throw Error('O número de cantos desenhados de uma peça do avatar mudou.')
                for (const canto of [0, Math.floor(n / 6) * 3, n - 1]) {
                  const reverso = urls.espelhar
                      ? Math.floor(canto / 3) * 3 + (canto % 3 === 0 ? 0 : 3 - (canto % 3))
                      : canto,
                    i = fonte.geometry.index ? fonte.geometry.index.getX(canto) : canto,
                    j = destino.geometry.index ? destino.geometry.index.getX(reverso) : reverso,
                    esperado = fonte
                      .getVertexPosition(i, new T.Vector3())
                      .applyMatrix4(fonte.matrixWorld)
                      .applyMatrix4(reflexo),
                    obtido = destino
                      .getVertexPosition(j, new T.Vector3())
                      .applyMatrix4(destino.matrixWorld)
                  erro = Math.max(erro, esperado.distanceTo(obtido))
                }
              }
              quadros.push({ clipe: nome, tempo: a.time, erroMaximoMetros: erro })
            }
          } finally {
            a.stopAllAction()
            a.uncacheRoot(original.raiz)
            b.stopAllAction()
            b.uncacheRoot(compilado.raiz)
          }
        }
        const blocos = []
        for (let i = 0; i < bytes.length; i += 16384)
          blocos.push(String.fromCharCode(...bytes.subarray(i, i + 16384)))
        return {
          ref,
          espelho,
          acabamento: urls.acabamento,
          alturaOriginal: original.caixa.getSize(new T.Vector3()).y,
          alturaCompilada: compilado.caixa.getSize(new T.Vector3()).y,
          pecasOriginais: fontes.length,
          pecasCompiladas: destinos.length,
          clipes: compilado.animacoes.map((c) => c.name),
          quadros,
          glb: btoa(blocos.join('')),
        }
      } finally {
        compilado?.descartar()
        normal.descartar()
        arquivos.descartar()
        original.descartar()
        textura.dispose()
      }
    },
    {
      three: modulo('node_modules/three/build/three.module.js'),
      raiz: modulo('packages/molda-cenarios-motor/src/compilar/raiz-animavel.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
      glb: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      inspecao: modulo('packages/molda-cenarios-motor/src/compilar/inspecao-glb.ts'),
      representacoes: modulo('packages/molda-cenarios-motor/src/representacoes.ts'),
      espelhar,
      acabamento,
      fonte: modulo('output/cenarios-reforma/lote3-testar-avatar/avatar-cute-ensaio.glb'),
    },
  )
  // Os GLBs reais continuam privados em output; somente medições podem ser versionadas.
  writeFileSync(resolve(saida, 'cute-compilado.glb'), Buffer.from(r.glb, 'base64'))
  delete r.glb
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r, null, 2))
  assert.deepEqual(erros, [])
  assert.equal(r.clipes.length, 4)
  assert.equal(r.pecasOriginais, r.pecasCompiladas)
  assert.ok(Math.abs(r.alturaOriginal - r.alturaCompilada) < 0.0001)
  assert.ok(r.quadros.every((q) => q.erroMaximoMetros < 0.0001))
} finally {
  await browser.close()
}
