import { pointInSelection, type SceneSelectionRegion } from '@sistemazero/molda/palco'
import type { Camera, Vector3 } from 'three'

/** Seleção de objetos pelo centro projetado, sem depender da ordem de renderização. */
export function escolherNaArea(
  candidatos: Iterable<{ id: string; centro: Vector3; bloqueado?: boolean; oculto?: boolean }>,
  camera: Camera,
  regiao: SceneSelectionRegion,
): string[] {
  camera.updateMatrixWorld(true)
  const escolhidos: string[] = []
  for (const c of candidatos) {
    if (c.bloqueado || c.oculto) continue
    const p = c.centro.clone().project(camera)
    if (![p.x, p.y, p.z].every(Number.isFinite) || p.z < -1 || p.z > 1) continue
    if (pointInSelection([(p.x + 1) / 2, (1 - p.y) / 2], regiao)) escolhidos.push(c.id)
  }
  return escolhidos
}
