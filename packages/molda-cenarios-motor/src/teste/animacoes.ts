import {
  type AnimationClip,
  Matrix3,
  type Mesh,
  Object3D,
  PropertyBinding,
  type SkinnedMesh,
  Vector3,
} from 'three'

/** Remove apenas o transporte do corpo inteiro; articulações continuam com os clipes autorais. */
export function animacoesNoLugar(
  raiz: Object3D,
  clipes: readonly AnimationClip[],
  noAr?: string,
  posicoes?: ReadonlyMap<Object3D, Vector3>,
  registrarVelocidade?: (nome: string, metrosPorSegundo: number) => void,
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
    const movimento = new Vector3()
    for (const track of copia.tracks) {
      const caminho = PropertyBinding.parseTrackName(track.name)
      if (caminho.propertyName !== 'position') continue
      const tamanho = track.getValueSize(),
        cubica = tamanho === 9
      if (tamanho !== 3 && !cubica) continue
      const no = PropertyBinding.findNode(raiz, caminho.nodeName)
      if (!(no instanceof Object3D) || !domina(no)) continue
      const posicao = posicoes?.get(no) ?? no.position
      const offset = cubica ? 3 : 0,
        ultimo = (track.times.length - 1) * tamanho + offset
      const primeiroX = track.values[offset]!,
        primeiroZ = track.values[offset + 2]!
      const dx = track.values[ultimo]! - primeiroX,
        dz = track.values[ultimo + 2]! - primeiroZ
      const duracao = track.times[track.times.length - 1]! - track.times[0]!
      const deslocamento = new Vector3(dx, 0, dz)
      if (no.parent) deslocamento.applyMatrix3(new Matrix3().setFromMatrix4(no.parent.matrixWorld))
      movimento.add(deslocamento)
      for (let k = 0; k < track.times.length; k++) {
        const i = k * tamanho + offset,
          f = duracao > 0 ? (track.times[k]! - track.times[0]!) / duracao : 0
        track.values[i] = track.values[i]! - dx * f - (primeiroX - posicao.x)
        track.values[i + 2] = track.values[i + 2]! - dz * f - (primeiroZ - posicao.z)
        if (clipe.name === noAr) track.values[i + 1] = posicao.y
        if (cubica)
          for (const tangente of [-3, 3]) {
            if (duracao > 0) {
              track.values[i + tangente] = track.values[i + tangente]! - dx / duracao
              track.values[i + tangente + 2] = track.values[i + tangente + 2]! - dz / duracao
            }
            if (clipe.name === noAr) track.values[i + tangente + 1] = 0
          }
      }
    }
    registrarVelocidade?.(clipe.name, clipe.duration > 0 ? movimento.length() / clipe.duration : 0)
    return copia
  })
}
