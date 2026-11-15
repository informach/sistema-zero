import type { InstancedMesh, Matrix4, Mesh } from 'three'
/** Preserva a pose dos morph targets também nas peças estáticas do GLB. */
export function preencherInstancias(
  destino: InstancedMesh,
  original: Mesh,
  matrizes: readonly Matrix4[],
) {
  matrizes.forEach((v, i) => {
    destino.setMatrixAt(i, v)
    if (original.morphTargetInfluences) destino.setMorphAt(i, original)
  })
  destino.instanceMatrix.needsUpdate = true
  if (destino.morphTexture) destino.morphTexture.needsUpdate = true
  destino.computeBoundingSphere()
}
