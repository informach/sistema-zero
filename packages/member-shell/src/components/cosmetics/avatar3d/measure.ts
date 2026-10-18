import type { Box3, Object3D } from 'three'

/**
 * Mede o personagem PELA POSE DE AGORA (12/10/2026: a foto do avatar saía com a cabeça cortada).
 *
 * ⚠️⚠️ Nunca `box.setFromObject(obj)` sem o `true`: para `SkinnedMesh` o three guarda a caixa da
 * malha na PRIMEIRA medição (`SkinnedMesh.boundingBox`) e nunca mais recalcula. Aqui ela era
 * calculada no quadro em que o personagem ficava em pé e saía errada (medido no ensaio: 0,62 de
 * altura num personagem de 2,2), e a foto enquadrava só as pernas. Com `precise` o three passa
 * por cada vértice com os ossos da pose atual (vale também para as poses da Cabine de fotos).
 *
 * O `updateMatrixWorld(true)` não é redundante com o `updateWorldMatrix`: só ele atualiza a
 * `bindMatrixInverse` das malhas presas ao esqueleto, que a conta do vértice usa.
 */
export function measureCharacter(object: Object3D, box: Box3): Box3 {
  object.updateWorldMatrix(true, false)
  object.updateMatrixWorld(true)
  return box.setFromObject(object, true)
}
