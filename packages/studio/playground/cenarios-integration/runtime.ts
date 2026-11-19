import { PerspectiveCamera, Scene, SkinnedMesh, Vector3, WebGLRenderer } from 'three'
import type { ProjectAsset } from '../../src/core/projectAssets'
import { carregarCena3DDoProjeto } from '../../src/three/scene3d'

const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }),
  camera = new PerspectiveCamera(50, 640 / 420, 0.1, 5000),
  alvo = new Vector3(2, 1, 0),
  vazio = new Scene()
renderer.setSize(640, 420)
renderer.setPixelRatio(1)
camera.position.set(34, 29, 42)
camera.lookAt(alvo)
document.getElementById('root')!.append(renderer.domElement)
renderer.render(vazio, camera)
const recursosIniciais = { ...renderer.info.memory }

Object.assign(globalThis, {
  __qaRuntime: {
    async provar(input: {
      id: string
      assets: ProjectAsset[]
      pontos: { x: number; z: number }[]
    }) {
      // A narrower transport proof: actual Studio iframe hashes/importmap are qualified later.
      const politica = document.createElement('meta')
      politica.httpEquiv = 'content-security-policy'
      politica.content = "connect-src 'none'; img-src data: blob:;"
      document.head.append(politica)
      const ciclos = []
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const r = await carregarCena3DDoProjeto(
          input.id,
          input.assets,
          new AbortController().signal,
          {
            maxTextura: renderer.capabilities.maxTextureSize,
          },
        )
        try {
          const alturas = input.pontos.map(({ x, z }) => {
              const chao = !!r.alturas?.temChao?.({ x, z })
              return { x, z, chao, altura: chao ? r.alturas!(x, z) : null }
            }),
            animacoes = []
          for (const [id, ator] of r.instancias) {
            if (!ator.animacoes.length) continue
            const ossos = new Set<number>()
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
                const matrizes = n.skeleton.boneMatrices
                matrizesFinitas &&= matrizes?.every(Number.isFinite) === true
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
            fonte: r.dados.fonte,
            nos: r.dados.nos.length,
            aguas: r.dados.aguas.length,
            caminhos: r.dados.caminhos.length,
            alturas,
            animacoes,
            desenhado,
            recursosIniciais,
            depois: { ...renderer.info.memory },
            arvoresDepois: r.colisoes.arvores,
            filhosDepois: r.cena.children.length,
            imagem,
          })
        } finally {
          r.descartar()
        }
      }
      return ciclos
    },
    descartar() {
      renderer.dispose()
      const recursosFinais = { ...renderer.info.memory }
      renderer.forceContextLoss()
      renderer.domElement.remove()
      return recursosFinais
    },
  },
})
