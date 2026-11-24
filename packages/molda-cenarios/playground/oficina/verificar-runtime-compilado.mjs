import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-runtime'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  casos = ['plano', 'plano-juncao', 'catalogo', 'catalogo-juncao'],
  pastas = [
    'lote8-integracao',
    'lote8-integracao-juncao',
    'lote8-integracao-terreno',
    'lote8-integracao-terreno-juncao',
  ]
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage(),
  erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const resultados = []
  for (let i = 0; i < casos.length; i++) {
    const pasta = resolve(raiz, 'output/cenarios-reforma', pastas[i]),
      anterior = JSON.parse(readFileSync(resolve(pasta, 'resultado.json'), 'utf8')),
      r = await pagina.evaluate(
        async (u) => {
          const T = await import(u.three),
            { carregarCenaNoThree } = await import(u.runtime),
            { lerGlb } = await import(u.modelos),
            arquivos = new Map(
              await Promise.all(
                u.cena.arquivos.map(async (a) => {
                  const r = await fetch(`${u.pasta}/${a.caminho}`)
                  if (!r.ok) throw Error(`Falta o arquivo ${a.caminho}`)
                  return [a.caminho, new Uint8Array(await r.arrayBuffer())]
                }),
              ),
            ),
            pacote = { cena: u.cena, arquivos },
            original = JSON.stringify(u.cena),
            renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }),
            camera = new T.PerspectiveCamera(50, 640 / 360, 0.05, 3000),
            alvo = new T.Vector3(1, -0.2, 3),
            imagens = [],
            ciclos = [],
            provas = []
          renderer.setSize(640, 360)
          renderer.setPixelRatio(1)
          renderer.shadowMap.enabled = true
          renderer.shadowMap.type = T.PCFShadowMap
          renderer.setClearColor('#83bde0')
          camera.position.set(32, 25, 37)
          camera.lookAt(alvo)
          let base, resultado, gpuFinal
          try {
            // LUT e malha do fundo equiretangular pertencem ao renderer (WebGLBackground),
            // que as conserva até dispose(). Aquecer ambas antes de medir a cena.
            const vazio = new T.Scene(),
              g = new T.BoxGeometry(),
              m = new T.MeshStandardMaterial(),
              mesh = new T.Mesh(g, m)
            vazio.add(mesh, new T.HemisphereLight())
            renderer.render(vazio, camera)
            g.dispose()
            m.dispose()
            vazio.clear()
            const fundo = new T.DataTexture(new Uint8Array(8).fill(255), 2, 1)
            fundo.mapping = T.EquirectangularReflectionMapping
            fundo.needsUpdate = true
            vazio.background = fundo
            renderer.render(vazio, camera)
            fundo.dispose()
            vazio.background = null
            renderer.render(vazio, camera)
            base = { ...renderer.info.memory }
            for (let rodada = 0; rodada < 3; rodada++) {
              const r = await carregarCenaNoThree(pacote, new AbortController().signal, {
                maxTextura: renderer.capabilities.maxTextureSize,
              })
              try {
                r.quadro(camera, alvo)
                r.atualizar(0)
                renderer.render(r.cena, camera)
                if (rodada === 0)
                  imagens.push({
                    nome: 'dia',
                    png: renderer.domElement.toDataURL('image/png').split(',')[1],
                  })
                for (const p of u.provas) {
                  const hit = r.colisoes.rastrear(
                    new T.Vector3(p.x, 8, p.z),
                    new T.Vector3(p.x, -8, p.z),
                  )
                  if (!hit || Math.abs(hit.ponto.y - p.altura) > 1e-5)
                    throw Error(`Física diferente em ${p.x},${p.z}`)
                }
                for (const [x, z, id] of [
                  [0, -6, 'a'],
                  [6, -6, 'b'],
                ]) {
                  const hit = new T.Raycaster(
                    new T.Vector3(x, 5, z),
                    new T.Vector3(0, -1, 0),
                  ).intersectObject(r.raiz, true)[0]
                  if (!hit || r.entidade(hit) !== id)
                    throw Error('Picking diferente depois de carregar o pacote')
                }
                for (const agua of r.dados.aguas) {
                  if (agua.tipo === 'cachoeira' || agua.nado === false) continue
                  const centro = 'centro' in agua ? agua.centro : { x: 30, z: 30 },
                    nivel = r.agua.nivel(centro.x, centro.z)
                  if (
                    nivel &&
                    (!Number.isFinite(nivel.nivel) || !Number.isFinite(nivel.profundidade))
                  )
                    throw Error('Consulta de nado inválida')
                  if (rodada === 0) provas.push({ agua: agua.id, x: centro.x, z: centro.z, nivel })
                }
                if (u.terreno) {
                  if (r.alturas.temChao({ x: -7.75, z: -7.75 }))
                    throw Error('Máscara de buraco perdida')
                  const atores = r.atores.get('ator')
                  if (atores?.length !== 1 || atores[0].animacoes.length !== 4)
                    throw Error('Clipes reais do Cute ausentes')
                  const n = r.dados.nos.find((n) => n.entidade === 'ator'),
                    independente = await lerGlb(arquivos.get(n.arquivo).slice().buffer)
                  try {
                    const instancia = atores[0],
                      mixer = new T.AnimationMixer(independente.raiz)
                    for (const clip of instancia.animacoes) {
                      instancia.mixer.stopAllAction()
                      mixer.stopAllAction()
                      instancia.mixer.clipAction(clip).reset().play()
                      mixer
                        .clipAction(independente.animacoes.find((c) => c.name === clip.name))
                        .reset()
                        .play()
                      let erroMaximo = 0
                      for (let quadro = 0; quadro < 12; quadro++) {
                        const dt = 1 / 24
                        r.atualizar(dt)
                        mixer.update(dt)
                        independente.raiz.updateMatrixWorld(true)
                        const as = [],
                          bs = []
                        instancia.raiz.traverse((m) => {
                          if (m.isSkinnedMesh) as.push(m)
                        })
                        independente.raiz.traverse((m) => {
                          if (m.isSkinnedMesh) bs.push(m)
                        })
                        if (as.length !== bs.length) throw Error('Partes de pele diferentes')
                        for (let j = 0; j < as.length; j++)
                          for (const v of [
                            0,
                            Math.floor(as[j].geometry.getAttribute('position').count / 2),
                          ]) {
                            as[j].skeleton.update()
                            bs[j].skeleton.update()
                            const a = as[j]
                                .getVertexPosition(v, new T.Vector3())
                                .applyMatrix4(as[j].matrixWorld),
                              b = bs[j]
                                .getVertexPosition(v, new T.Vector3())
                                .applyMatrix4(bs[j].matrixWorld)
                                .applyMatrix4(new T.Matrix4().fromArray(n.matriz))
                            erroMaximo = Math.max(erroMaximo, a.distanceTo(b))
                          }
                      }
                      if (erroMaximo > 1e-5) throw Error(`Animação diferente: ${erroMaximo}`)
                      if (rodada === 0)
                        provas.push({ animacao: clip.name, quadros: 12, erroMaximo })
                    }
                    instancia.mixer.stopAllAction()
                    mixer.stopAllAction()
                    mixer.uncacheRoot(independente.raiz)
                  } finally {
                    independente.descartar()
                  }
                }
                if (rodada === 0) {
                  r.atualizar(0.5)
                  renderer.render(r.cena, camera)
                  imagens.push({
                    nome: 'movimento',
                    png: renderer.domElement.toDataURL('image/png').split(',')[1],
                  })
                }
                ciclos.push({
                  durante: { ...renderer.info.memory },
                  draws: renderer.info.render.calls,
                  triangulos: renderer.info.render.triangles,
                })
              } finally {
                r.descartar()
                r.descartar()
              }
              renderer.render(new T.Scene(), camera)
              ciclos.at(-1).depois = { ...renderer.info.memory }
              if (JSON.stringify(ciclos.at(-1).depois) !== JSON.stringify(base))
                throw Error(
                  `${u.nome}: recursos retidos após descarte: base=${JSON.stringify(base)}, depois=${JSON.stringify(ciclos.at(-1).depois)}`,
                )
              const c = new AbortController()
              let cancelou = false
              try {
                await carregarCenaNoThree(pacote, c.signal, {
                  progresso: (pronto) => {
                    if (pronto === 1) c.abort(new DOMException('Cancelado', 'AbortError'))
                  },
                })
              } catch (e) {
                if (e.name !== 'AbortError') throw e
                cancelou = true
              }
              if (!cancelou) throw Error('Cancelamento entregou cena parcial')
            }
            if (original !== JSON.stringify(u.cena)) throw Error('O runtime alterou o manifesto')
            resultado = { caso: u.nome, base, ciclos, provas, imagens, autoriaIntacta: true }
          } finally {
            renderer.dispose()
            gpuFinal = { ...renderer.info.memory }
            renderer.forceContextLoss()
          }
          if (gpuFinal.geometries !== 0 || gpuFinal.textures !== 0)
            throw Error('O renderer não liberou seus recursos internos.')
          return resultado
        },
        {
          nome: casos[i],
          cena: anterior.cena,
          provas: anterior.provas,
          terreno: i >= 2,
          pasta: modulo(`output/cenarios-reforma/${pastas[i]}`),
          three: modulo('packages/molda-cenarios/playground/oficina/qa-three.ts'),
          runtime: modulo('packages/molda-cenarios-motor/src/compilar/runtime-three.ts'),
          modelos: modulo('packages/molda-cenarios-motor/src/modelos.ts'),
        },
      )
    for (const img of r.imagens)
      writeFileSync(resolve(saida, `${casos[i]}-${img.nome}.png`), Buffer.from(img.png, 'base64'))
    delete r.imagens
    resultados.push(r)
  }
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados, null, 2))
} finally {
  await browser.close()
}
