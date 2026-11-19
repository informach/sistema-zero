import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-glb-unico'),
  origem = resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao'),
  { cena } = JSON.parse(readFileSync(resolve(origem, 'resultado.json'), 'utf8')),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage(),
  erros = [],
  avisos = []
pagina.on('pageerror', (e) => erros.push(e.message))
pagina.on('console', (m) => {
  if (m.type() === 'warning' || m.type() === 'error') avisos.push(m.text().slice(0, 400))
})
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const r = await pagina.evaluate(
    async (u) => {
      const T = await import(u.three),
        { gerarGlbUnico } = await import(u.exportar),
        { carregarCenaNoThree } = await import(u.runtime),
        { lerGlb } = await import(u.modelos),
        { digestDosBytes } = await import(u.core),
        { prepararComposicaoDoGlb } = await import(u.composicao),
        { gravarGlbCompilado } = await import(u.gravador),
        { ArquivosDaCompilacao } = await import(u.arquivos),
        arquivos = new Map(
          await Promise.all(
            u.cena.arquivos.map(async (a) => [
              a.caminho,
              new Uint8Array(await (await fetch(`${u.pasta}/${a.caminho}`)).arrayBuffer()),
            ]),
          ),
        ),
        pacote = { cena: u.cena, arquivos },
        original = JSON.stringify(u.cena),
        ciclos = [],
        comparativos = [],
        animacoes = [],
        imagens = [],
        renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }),
        camera = new T.PerspectiveCamera(50, 640 / 360, 0.02, 3000),
        scene = new T.Scene(),
        vazio = new T.Scene()
      renderer.setSize(640, 360)
      renderer.setPixelRatio(1)
      renderer.setClearColor('#83bde0')
      scene.add(new T.HemisphereLight(0xffffff, 0x8a9a7a, 2))
      const sol = new T.DirectionalLight(0xffffff, 1.7)
      sol.position.set(7, 12, 5)
      scene.add(sol, sol.target)
      camera.position.set(20, 16, 24)
      camera.lookAt(1, 0, 3)
      const warm = new T.BoxGeometry(),
        mat = new T.MeshStandardMaterial()
      vazio.add(new T.Mesh(warm, mat), new T.HemisphereLight())
      renderer.render(vazio, camera)
      warm.dispose()
      mat.dispose()
      vazio.clear()
      renderer.render(vazio, camera)
      const base = { ...renderer.info.memory }
      const gpuFinal = {}
      let ultimo, jsonAnterior
      const variacoes = []
      try {
        const g = new T.BoxGeometry(),
          material = new T.MeshStandardMaterial({ flatShading: true }),
          ramos = [new T.Group(), new T.Group()],
          inventario = new ArquivosDaCompilacao(new AbortController().signal)
        for (const [i, ramo] of ramos.entries()) {
          ramo.position.x = i * 10
          ramo.add(new T.Mesh(g, material))
        }
        const compartilhada = prepararComposicaoDoGlb(
          ramos.map((raiz) => ({ raiz, animacoes: [] })),
        )
        let compartilhamento
        try {
          const meta = await gravarGlbCompilado(
              compartilhada.raiz,
              'repetidas.glb',
              'modelo',
              inventario,
              new AbortController().signal,
            ),
            bytes = inventario.arquivos.get(meta.caminho),
            n = new DataView(bytes.buffer, bytes.byteOffset, bytes.length).getUint32(12, true),
            json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + n))),
            referencias = json.nodes.filter((n) => n.mesh !== undefined).map((n) => n.mesh)
          compartilhamento = { malhas: json.meshes.length, referencias }
          if (
            json.meshes.length !== 1 ||
            referencias.length !== 2 ||
            referencias[0] !== referencias[1]
          )
            throw Error('Instâncias estáticas duplicaram geometria no GLB')
        } finally {
          compartilhada.descartar()
          inventario.descartar()
          g.dispose()
          material.dispose()
        }
        for (let ciclo = 0; ciclo < 3; ciclo++) {
          const exportado = await gerarGlbUnico(pacote, new AbortController().signal),
            modelo = await lerGlb(exportado.bytes.slice().buffer),
            fonte = await carregarCenaNoThree(pacote, new AbortController().signal, {
              aguaDinamica: false,
            })
          try {
            const n = new DataView(
                exportado.bytes.buffer,
                exportado.bytes.byteOffset,
                exportado.bytes.byteLength,
              ).getUint32(12, true),
              texto = new TextDecoder().decode(exportado.bytes.subarray(20, 20 + n)),
              json = JSON.parse(texto),
              diferencas = []
            const comparar = (a, b, p) => {
              if (diferencas.length >= 12 || Object.is(a, b)) return
              if (a && b && typeof a === 'object' && typeof b === 'object') {
                for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
                  comparar(a[k], b[k], `${p}/${k}`)
              } else diferencas.push({ p, a, b })
            }
            if (jsonAnterior) comparar(jsonAnterior, json, '')
            variacoes.push({
              ciclo,
              json: await digestDosBytes(exportado.bytes.subarray(20, 20 + n)),
              bin: await digestDosBytes(exportado.bytes.subarray(28 + n)),
              diferencas,
            })
            jsonAnterior = json
            const metadados = modelo.raiz.userData.moldaCenario
            if (
              !metadados ||
              metadados.fonte.digest !== u.cena.fonte.digest ||
              metadados.entidades.length !== u.cena.entidades.length
            )
              throw Error('O GLB perdeu fonte/revisão ou entidades')
            if (modelo.animacoes.length !== 4 || metadados.animacoes.length !== 4)
              throw Error('GLB sem os quatro clipes reais')
            const luzes = []
            modelo.raiz.traverse((n) => {
              if (n.isLight) {
                luzes.push(n)
                n.visible = false
              }
            })
            if (luzes.length !== 1 || !luzes[0].isDirectionalLight)
              throw Error('O GLB perdeu o sol padrão')
            const bounds = new T.Box3().setFromObject(fonte.raiz),
              alvo = bounds.getCenter(new T.Vector3())
            fonte.quadro(camera, alvo)
            let solNativo
            fonte.cena.traverse((n) => {
              if (n.isDirectionalLight) solNativo = n
            })
            const direcaoNativa = solNativo.target
                .getWorldPosition(new T.Vector3())
                .sub(solNativo.getWorldPosition(new T.Vector3()))
                .normalize(),
              direcaoGlb = new T.Vector3(0, 0, -1).applyQuaternion(
                luzes[0].getWorldQuaternion(new T.Quaternion()),
              )
            if (direcaoNativa.distanceTo(direcaoGlb) > 1e-6)
              throw Error('Direção do sol alterada pelo GLB')
            const volume = new T.Box3().setFromObject(modelo.raiz)
            // Alvos/luzes são Object3D sem geometria; o volume continua sendo o da composição.
            if (
              volume.min.distanceTo(bounds.min) > 1e-5 ||
              volume.max.distanceTo(bounds.max) > 1e-5
            )
              throw Error('Volume visual do GLB diferente')
            if (ciclo === 0) {
              for (const [nome, pos, alvo] of [
                ['geral', [24, 20, 28], [2, 0, 3]],
                ['aproximacao', [13, 4, 18], [8, 0, 10]],
                ['rasante', [-3, 1.16, 4], [5, 0, 0]],
              ]) {
                camera.position.fromArray(pos)
                camera.lookAt(...alvo)
                const render = (g) => {
                    fonte.raiz.removeFromParent()
                    modelo.raiz.removeFromParent()
                    scene.add(g)
                    renderer.render(scene, camera)
                    const pixels = new Uint8Array(640 * 360 * 4),
                      gl = renderer.getContext()
                    gl.readPixels(0, 0, 640, 360, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
                    return { pixels, png: renderer.domElement.toDataURL('image/png').split(',')[1] }
                  },
                  a = render(fonte.raiz),
                  b = render(modelo.raiz)
                let soma = 0,
                  maximo = 0,
                  canaisAcima16 = 0
                for (let i = 0; i < a.pixels.length; i++) {
                  const d = Math.abs(a.pixels[i] - b.pixels[i])
                  soma += d
                  maximo = Math.max(maximo, d)
                  if (d > 16) canaisAcima16++
                }
                comparativos.push({
                  nome,
                  erroMedio: soma / a.pixels.length,
                  maximo,
                  canaisAcima16,
                })
                imagens.push(
                  { nome: `${nome}-antes`, png: a.png },
                  { nome: `${nome}-depois`, png: b.png },
                )
              }
            }
            const ator = fonte.atores.get('ator')[0],
              mixer = new T.AnimationMixer(modelo.raiz),
              as = [],
              bs = []
            ator.raiz.traverse((m) => {
              if (m.isSkinnedMesh) as.push(m)
            })
            modelo.raiz.traverse((m) => {
              if (m.isSkinnedMesh) bs.push(m)
            })
            if (as.length !== bs.length) throw Error('Número de partes da pele diferente')
            for (const meta of metadados.animacoes) {
              ator.mixer.stopAllAction()
              mixer.stopAllAction()
              ator.mixer
                .clipAction(ator.animacoes.find((a) => a.name === meta.original))
                .reset()
                .play()
              mixer
                .clipAction(modelo.animacoes.find((a) => a.name === meta.nome))
                .reset()
                .play()
              let erroMaximo = 0
              for (let quadro = 0; quadro < 12; quadro++) {
                fonte.atualizar(1 / 24)
                mixer.update(1 / 24)
                modelo.raiz.updateMatrixWorld(true)
                for (let j = 0; j < as.length; j++)
                  for (const i of [
                    0,
                    Math.floor(as[j].geometry.getAttribute('position').count / 2),
                  ]) {
                    as[j].skeleton.update()
                    bs[j].skeleton.update()
                    const a = as[j]
                        .getVertexPosition(i, new T.Vector3())
                        .applyMatrix4(as[j].matrixWorld),
                      b = bs[j]
                        .getVertexPosition(i, new T.Vector3())
                        .applyMatrix4(bs[j].matrixWorld)
                    erroMaximo = Math.max(erroMaximo, a.distanceTo(b))
                  }
              }
              if (erroMaximo > 1e-5) throw Error(`A animação ${meta.original} mudou: ${erroMaximo}`)
              if (ciclo === 0) animacoes.push({ nome: meta.original, quadros: 12, erroMaximo })
            }
            ator.mixer.stopAllAction()
            mixer.stopAllAction()
            mixer.uncacheRoot(modelo.raiz)
            ciclos.push({
              bytes: exportado.bytes.length,
              digest: await digestDosBytes(exportado.bytes),
              malhas: exportado.medidas.malhas,
              triangulos: exportado.medidas.triangulos,
              verticesMaximos: exportado.medidas.verticesMaximos,
            })
            ultimo = exportado
          } finally {
            fonte.raiz.removeFromParent()
            modelo.raiz.removeFromParent()
            fonte.descartar()
            modelo.descartar()
          }
          renderer.render(vazio, camera)
          if (JSON.stringify(renderer.info.memory) !== JSON.stringify(base))
            throw Error('GLB reteve recursos da cena')
          const c = new AbortController()
          let cancelou = false
          try {
            await gerarGlbUnico(pacote, c.signal, {
              progresso: (p) => {
                if (p.nome === 'Gravando GLB único')
                  queueMicrotask(() => c.abort(new DOMException('Cancelado', 'AbortError')))
              },
            })
          } catch (e) {
            if (e.name !== 'AbortError') throw e
            cancelou = true
          }
          if (!cancelou) throw Error('GLB retornou resultado depois de cancelar')
        }
        if (original !== JSON.stringify(u.cena)) throw Error('A exportação GLB alterou o manifesto')
        const blocos = []
        for (let i = 0; i < ultimo.bytes.length; i += 16384)
          blocos.push(String.fromCharCode(...ultimo.bytes.subarray(i, i + 16384)))
        return {
          ciclos,
          comparativos,
          animacoes,
          imagens,
          base,
          gpuFinal,
          variacoes,
          compartilhamento,
          bytes: btoa(blocos.join('')),
          avisos: ultimo.avisos,
        }
      } finally {
        renderer.dispose()
        Object.assign(gpuFinal, renderer.info.memory)
        renderer.forceContextLoss()
      }
    },
    {
      cena,
      pasta: modulo('output/cenarios-reforma/lote8-integracao-terreno-juncao'),
      three: modulo('packages/molda-cenarios/playground/oficina/qa-three.ts'),
      exportar: modulo('packages/molda-cenarios-motor/src/compilar/glb-unico.ts'),
      runtime: modulo('packages/molda-cenarios-motor/src/compilar/runtime-three.ts'),
      modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      composicao: modulo('packages/molda-cenarios-motor/src/compilar/composicao-glb.ts'),
      gravador: modulo('packages/molda-cenarios-motor/src/compilar/arquivos-glb.ts'),
      arquivos: modulo('packages/molda-cenarios-motor/src/compilar/arquivos.ts'),
    },
  )
  for (const img of r.imagens)
    writeFileSync(resolve(saida, `${img.nome}.png`), Buffer.from(img.png, 'base64'))
  delete r.imagens
  const bytes = Buffer.from(r.bytes, 'base64')
  delete r.bytes
  writeFileSync(resolve(saida, 'cenario.glb'), bytes)
  const validator = createRequire(resolve(raiz, 'packages/molda/package.json'))('gltf-validator'),
    v = await validator.validateBytes(new Uint8Array(bytes), { uri: 'cenario.glb' }),
    validacao = {
      erros: v.issues.numErrors,
      avisos: v.issues.numWarnings,
      informacoes: v.issues.numInfos,
      mensagens: v.issues.messages,
    }
  writeFileSync(resolve(saida, 'validacao-khronos.json'), JSON.stringify(validacao, null, 2))
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...r, console: avisos }, null, 2),
  )
  assert.deepEqual(erros, [])
  assert.deepEqual(avisos, [])
  assert.deepEqual(r.gpuFinal, { geometries: 0, textures: 0 })
  assert.equal(validacao.erros, 0)
  assert.equal(validacao.avisos, 0)
  assert.deepEqual(r.ciclos[0], r.ciclos[1])
  assert.deepEqual(r.ciclos[1], r.ciclos[2])
  for (const c of r.comparativos) {
    assert.ok(c.erroMedio < 1)
    assert.ok(c.canaisAcima16 < 1000)
  }
  console.log(JSON.stringify({ ...r, khronos: validacao }, null, 2))
} finally {
  await browser.close()
}
