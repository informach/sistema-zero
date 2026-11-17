import {
  type AnimationClip,
  type Mesh,
  Object3D,
  PropertyBinding,
  type SkinnedMesh,
  type Vector3,
} from 'three'

/** Remove apenas o transporte do corpo inteiro; articulações continuam com os clipes autorais. */
export function animacoesNoLugar(
  raiz: Object3D,
  clipes: readonly AnimationClip[],
  noAr?: string,
  posicoes?: ReadonlyMap<Object3D, Vector3>,
): AnimationClip[] {
  const corpo = new Set<Object3D>()
  raiz.traverse((no) => {
    const m = no as Mesh
    if (!m.isMesh) return
    const pele = m as SkinnedMesh
    if (!pele.isSkinnedMesh) {
      corpo.add(no)
      return
    }
    const ids = m.geometry.getAttribute('skinIndex'),
      pesos = m.geometry.getAttribute('skinWeight')
    if (!ids || !pesos) return
    const indices = new Set<number>()
    for (let i = 0; i < ids.count; i++)
      for (let eixo = 0; eixo < 4; eixo++)
        if (pesos.getComponent(i, eixo) > 0) indices.add(ids.getComponent(i, eixo))
    for (const i of indices) {
      const osso = pele.skeleton.bones[i]
      if (osso) corpo.add(osso)
    }
  })
  const domina = (no: Object3D) =>
    corpo.size > 0 &&
    [...corpo].every((parte) => {
      for (let atual: Object3D | null = parte; atual; atual = atual.parent)
        if (atual === no) return true
      return false
    })
  return clipes.map((clipe) => {
    const copia = clipe.clone()
    for (const track of copia.tracks) {
      const caminho = PropertyBinding.parseTrackName(track.name)
      if (caminho.propertyName !== 'position' || track.getValueSize() !== 3) continue
      const no = PropertyBinding.findNode(raiz, caminho.nodeName)
      if (!(no instanceof Object3D) || !domina(no)) continue
      const posicao = posicoes?.get(no) ?? no.position
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = posicao.x
        track.values[i + 2] = posicao.z
        if (clipe.name === noAr) track.values[i + 1] = posicao.y
      }
    }
    return copia
  })
}
