import {
  type AnimationClip,
  InterpolateDiscrete,
  InterpolateLinear,
  type Object3D,
  PropertyBinding,
  type SkinnedMesh,
  Vector3,
} from 'three'

/** O glTF ignora TRS da malha com skin. Retirá-la da árvore conserva posições,
 * mas não a normalMatrix/front-face do Three para escala anisotrópica/reflexo
 * internos. Recusar antes de clonar evita produzir um ator com iluminação distinta.
 * A transformação externa da instância não participa desta restrição. */
export function conferirHierarquiaDaPele(entrada: Object3D, clipes: readonly AnimationClip[]) {
  entrada.updateWorldMatrix(true, true)
  const ancestrais = new Set<object>(),
    x = new Vector3(),
    y = new Vector3(),
    z = new Vector3()
  entrada.traverse((n) => {
    const m = n as SkinnedMesh
    if (!m.isSkinnedMesh) return
    if (m.bindMode !== 'attached')
      throw Error('A pele precisa de vínculo attached para a exportação glTF.')
    const matriz = m.matrixWorld
    x.setFromMatrixColumn(matriz, 0)
    y.setFromMatrixColumn(matriz, 1)
    z.setFromMatrixColumn(matriz, 2)
    const a = x.lengthSq(),
      b = y.lengthSq(),
      c = z.lengthSq(),
      tolerancia = Math.max(a, b, c) * 1e-5
    if (
      !matriz.elements.every(Number.isFinite) ||
      Math.min(a, b, c) <= 0 ||
      matriz.determinant() <= 0
    )
      throw Error(
        'A pele contém matriz singular ou reflexo interno. Prepare o modelo antes de exportar.',
      )
    if (
      Math.abs(a - b) > tolerancia ||
      Math.abs(a - c) > tolerancia ||
      Math.abs(x.dot(y)) > tolerancia ||
      Math.abs(x.dot(z)) > tolerancia ||
      Math.abs(y.dot(z)) > tolerancia
    )
      throw Error(
        'A transformação interna da pele precisa ser uniforme e sem cisalhamento para exportar.',
      )
    for (let p: Object3D | null = m; p; p = p.parent) {
      ancestrais.add(p)
      if (p === entrada) break
    }
  })
  if (!ancestrais.size) return
  for (const clip of clipes)
    for (const track of clip.tracks) {
      const b = PropertyBinding.parseTrackName(track.name)
      if (b.propertyName !== 'scale' || b.objectName) continue
      const alvo = PropertyBinding.findNode(entrada, b.nodeName)
      if (!alvo || !ancestrais.has(alvo)) continue
      const interpolacao = track.getInterpolation()
      if (
        track.getValueSize() !== 3 ||
        (interpolacao !== InterpolateDiscrete && interpolacao !== InterpolateLinear)
      )
        throw Error(
          'A escala animada de ancestral da pele precisa de interpolação linear ou discreta para exportar.',
        )
      for (let i = 0; i < track.values.length; i += 3) {
        const a = track.values[i]!,
          b = track.values[i + 1]!,
          c = track.values[i + 2]!,
          tolerancia = Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) * 1e-5
        if (
          ![a, b, c].every(Number.isFinite) ||
          Math.min(a, b, c) <= 0 ||
          Math.abs(a - b) > tolerancia ||
          Math.abs(a - c) > tolerancia
        )
          throw Error(
            'A escala animada de ancestral da pele precisa continuar uniforme e positiva.',
          )
      }
    }
}
