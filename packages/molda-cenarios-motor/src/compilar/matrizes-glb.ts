import { affineTrsChain } from '@sistemazero/molda/gltf'
import { Group, type Object3D } from 'three'

/** Os wrappers são cópias privadas do runtime. Clipes fazem o GLTFExporter exigir
 * TRS em toda a cena; dois nós do Molda conservam a matriz afim externa exata. */
export function prepararMatrizesExternasDoGlb(wrappers: readonly Object3D[]) {
  for (const no of wrappers) {
    const [a, b] = affineTrsChain([...no.matrix.elements]),
      interior = new Group(),
      filhos = [...no.children]
    no.matrixAutoUpdate = true
    no.position.fromArray(a.translation)
    no.quaternion.fromArray(a.rotation)
    no.scale.fromArray(a.scale)
    no.updateMatrix()
    interior.name = 'molda_fator'
    interior.position.fromArray(b.translation)
    interior.quaternion.fromArray(b.rotation)
    interior.scale.fromArray(b.scale)
    no.add(interior)
    for (const filho of filhos) interior.add(filho)
    no.updateWorldMatrix(true, true)
  }
}
