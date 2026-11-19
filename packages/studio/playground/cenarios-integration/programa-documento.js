import { PerspectiveCamera, Scene, SkinnedMesh, Vector3, WebGLRenderer } from 'three'

const entrada = __ENTRADA_DE_ENSAIO__
const enviar = (resultado) => parent.postMessage({ tag: 'mcn-documento', resultado }, '*')
async function provar() {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }),
    camera = new PerspectiveCamera(50, 640 / 420, 0.1, 5000),
    alvo = new Vector3(2, 1, 0),
    vazio = new Scene(),
    ciclos = []
  renderer.setSize(640, 420)
  renderer.setPixelRatio(1)
  camera.position.set(34, 29, 42)
  camera.lookAt(alvo)
  document.body.append(renderer.domElement)
  renderer.render(vazio, camera)
  try {
    for (let ciclo = 0; ciclo < 3; ciclo++) {
      const r = await window.SZScene3D.carregar(entrada.id, new AbortController().signal, {
        maxTextura: renderer.capabilities.maxTextureSize,
      })
      try {
        const alturas = entrada.pontos.map(({ x, z }) => {
            const chao = !!r.alturas?.temChao?.({ x, z })
            return { x, z, chao, altura: chao ? r.alturas(x, z) : null }
          }),
          animacoes = []
        for (const [id, ator] of r.instancias) {
          if (!ator.animacoes.length) continue
          const ossos = new Set()
          let matrizesFinitas = true
          for (const clip of ator.animacoes) {
            ator.mixer.stopAllAction()
            ator.mixer.clipAction(clip).reset().play()
            r.atualizar(0.5)
            ator.raiz.traverse((n) => {
              if (!(n instanceof SkinnedMesh)) return
              n.updateWorldMatrix(true, false)
              n.skeleton.update()
              ossos.add(n.skeleton.bones.length)
              matrizesFinitas &&= n.skeleton.boneMatrices?.every(Number.isFinite) === true
            })
          }
          animacoes.push({
            id,
            clipes: ator.animacoes.map((c) => c.name),
            ossos: [...ossos],
            matrizesFinitas,
          })
        }
        for (let quadro = 0; quadro < 8; quadro++) {
          r.atualizar(1 / 60)
          r.quadro(camera, alvo)
          renderer.render(r.cena, camera)
          await new Promise(requestAnimationFrame)
        }
        const imagem = renderer.domElement.toDataURL('image/png'),
          desenhado = {
            ...renderer.info.memory,
            chamadas: renderer.info.render.calls,
            triangulos: renderer.info.render.triangles,
          }
        r.descartar()
        r.descartar()
        renderer.render(vazio, camera)
        renderer.renderLists.dispose()
        ciclos.push({
          ciclo,
          mesmaThree: r.cena instanceof Scene,
          nos: r.dados.nos.length,
          aguas: r.dados.aguas.length,
          caminhos: r.dados.caminhos.length,
          alturas,
          animacoes,
          desenhado,
          depois: { ...renderer.info.memory },
          arvoresDepois: r.colisoes.arvores,
          filhosDepois: r.cena.children.length,
          imagem,
        })
      } finally {
        r.descartar()
      }
    }
    const cancelado = new AbortController()
    cancelado.abort()
    let aborto = false
    try {
      await window.SZScene3D.carregar(entrada.id, cancelado.signal)
    } catch (e) {
      aborto = e.name === 'AbortError'
    }
    const durante = new AbortController()
    let abortoDurante = false
    try {
      await window.SZScene3D.carregar(entrada.id, durante.signal, {
        progresso(pronto) {
          if (pronto === 1) durante.abort()
        },
      })
    } catch (e) {
      abortoDurante = e.name === 'AbortError'
    }
    const campo = window.__SZGAME_CENAS_3D.artefatos.find((a) => a.kind === 'scene3d-data'),
      original = campo.dataUrl,
      inicio = original.indexOf(',') + 1,
      bytes = atob(original.slice(inicio))
    let adulteracaoRecusada = false
    campo.dataUrl =
      original.slice(0, inicio) +
      btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1))
    try {
      await window.SZScene3D.carregar(entrada.id, new AbortController().signal)
    } catch (e) {
      adulteracaoRecusada = /digest|conteúdo|integridade|SHA|hash/i.test(String(e))
    } finally {
      campo.dataUrl = original
    }
    renderer.dispose()
    enviar({
      origem: self.origin,
      ciclos,
      aborto,
      abortoDurante,
      adulteracaoRecusada,
      recursosFinais: { ...renderer.info.memory },
    })
  } finally {
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
}
provar().catch((e) => enviar({ erro: String(e), stack: e.stack }))
