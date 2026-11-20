import type { AtorDaCenaCompilada } from '@sistemazero/molda-cenarios-motor/runtime'
import {
  type AnimationClip,
  AnimationMixer,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

type Fonte = { cena: Object3D; animacoes: readonly AnimationClip[] }

/** Conserva a mesma rotina da Íris, distinguindo a instância local daquela pertencente ao pacote. */
export function recursosDaIris(fonte: Fonte | AtorDaCenaCompilada) {
  const externa = 'raiz' in fonte,
    clipes = fonte.animacoes,
    andar = clipes.find((a) => a.name === 'andar'),
    parado = clipes.find((a) => a.name === 'parado')
  if (!andar || !parado)
    throw Error('A Íris precisa dos clipes andar e parado do modelo existente.')
  const cena = externa ? fonte.raiz : clone(fonte.cena),
    mixer = externa ? fonte.mixer : new AnimationMixer(cena),
    andando = mixer.clipAction(andar),
    parada = mixer.clipAction(parado)
  cena.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh) m.castShadow = true
  })
  andando.play()
  parada.play()
  let descartado = false
  return {
    cena,
    mixer,
    andar: andando,
    parado: parada,
    descartar() {
      if (descartado) return
      descartado = true
      andando.stop()
      parada.stop()
      // O carregador continua sendo dono do mixer/esqueletos da instância compilada.
      if (externa) return
      mixer.uncacheRoot(cena)
      const esqueletos = new Set<SkinnedMesh['skeleton']>()
      cena.traverse((o) => {
        const m = o as SkinnedMesh
        if (m.isSkinnedMesh) esqueletos.add(m.skeleton)
      })
      for (const s of esqueletos) s.dispose()
    },
  }
}
