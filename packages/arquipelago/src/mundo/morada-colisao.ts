import { Matrix4, type Mesh, type Object3D, Quaternion, Vector3 } from 'three'

export interface AuthoredColliderShape {
  name: string
  node: Mesh
  vertices: Float32Array
  indices: Uint32Array
}

/** Dados da malha autoral usados pelo Rapier, sem alterar a geometria compartilhada. */
export function authoredColliderShapes(
  root: Object3D,
  names: readonly string[],
): AuthoredColliderShape[] {
  const nodes = new Set<Mesh>()
  for (const name of names)
    root.getObjectByName(name)?.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) nodes.add(mesh)
    })
  return [...nodes].map((node) => {
    node.updateWorldMatrix(true, false)
    // O corpo cinemático segue posição e giro. Escala e transformações autorais
    // ficam nos vértices locais desse corpo, sem congelar a posição no mundo.
    const positionInWorld = node.getWorldPosition(new Vector3())
    const rotationInWorld = node.getWorldQuaternion(new Quaternion())
    const inverseFrame = new Matrix4()
      .compose(positionInWorld, rotationInWorld, new Vector3(1, 1, 1))
      .invert()
    const geometry = node.geometry.clone().applyMatrix4(inverseFrame.multiply(node.matrixWorld))
    const position = geometry.getAttribute('position')
    const vertices = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++)
      vertices.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3)
    const index = geometry.index
    const indices = Uint32Array.from(
      index ? Array.from(index.array) : Array.from({ length: position.count }, (_, i) => i),
    )
    geometry.dispose()
    return { name: `${node.name}:${node.uuid}`, node, vertices, indices }
  })
}

export function syncAuthoredCollider(
  node: Object3D,
  body: {
    setNextKinematicTranslation(value: Vector3): void
    setNextKinematicRotation(value: Quaternion): void
  },
  position: Vector3,
  rotation: Quaternion,
) {
  node.updateWorldMatrix(true, false)
  node.getWorldPosition(position)
  node.getWorldQuaternion(rotation)
  body.setNextKinematicTranslation(position)
  body.setNextKinematicRotation(rotation)
}
