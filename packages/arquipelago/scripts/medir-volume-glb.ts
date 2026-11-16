import { Box3, Matrix4, Quaternion, Vector3 } from 'three'

/** Mede primitivas e pivôs reais, incluindo as transformações da hierarquia glTF. */
export function medirVolumeGlb(json: {
  scenes?: { nodes?: number[] }[]
  scene?: number
  nodes?: {
    matrix?: number[]
    translation?: number[]
    rotation?: number[]
    scale?: number[]
    mesh?: number
    children?: number[]
  }[]
  meshes?: { primitives: { attributes: Record<string, number> }[] }[]
  accessors?: { min?: number[]; max?: number[] }[]
}) {
  const volume = new Box3(),
    vistos = new Set<number>()
  const visitar = (id: number, pai: Matrix4) => {
    if (vistos.has(id)) throw Error('Grafo de nós cíclico ou compartilhado')
    vistos.add(id)
    const n = json.nodes?.[id]
    if (!n) throw Error('Nó ausente')
    const local = n.matrix
      ? new Matrix4().fromArray(n.matrix)
      : new Matrix4().compose(
          new Vector3().fromArray(n.translation ?? [0, 0, 0]),
          new Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
          new Vector3().fromArray(n.scale ?? [1, 1, 1]),
        )
    const mundo = pai.clone().multiply(local)
    if (n.mesh !== undefined)
      for (const p of json.meshes?.[n.mesh]?.primitives ?? []) {
        const a = json.accessors?.[p.attributes.POSITION!]
        if (!a?.min || !a.max) throw Error('Posições sem limites verificáveis no glTF')
        volume.union(
          new Box3(new Vector3().fromArray(a.min), new Vector3().fromArray(a.max)).applyMatrix4(
            mundo,
          ),
        )
      }
    for (const filho of n.children ?? []) visitar(filho, mundo)
  }
  for (const id of json.scenes?.[json.scene ?? 0]?.nodes ?? []) visitar(id, new Matrix4())
  if (volume.isEmpty() || !Number.isFinite(volume.min.length() + volume.max.length()))
    throw Error('Modelo sem volume de geometria verificável')
  return {
    min: volume.min.toArray(),
    max: volume.max.toArray(),
    dimensoes: volume.getSize(new Vector3()).toArray(),
  }
}
