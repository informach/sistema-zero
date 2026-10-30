import {
  BIT_DA_ILHA,
  type IlhaId,
  ilhaAberta,
  ilhaVisitada,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/** Área de presença no chão, não o raio usado para carregar a ilha. */
export interface AreaDaDescoberta {
  ilha: IlhaId
  x: number
  z: number
  raio: number
  alturaMinima: number
}

export function registrarDescoberta(
  s: Salvamento,
  area: AreaDaDescoberta,
  posicao: { x: number; y: number; z: number },
  jornada: number,
  apoiado: boolean,
): Salvamento {
  if (ilhaVisitada(s.ilhasVisitadas, area.ilha) || !apoiado || !ilhaAberta(area.ilha, jornada))
    return s
  if (
    !Number.isFinite(posicao.y) ||
    posicao.y < area.alturaMinima ||
    !Number.isFinite(posicao.x) ||
    !Number.isFinite(posicao.z) ||
    (posicao.x - area.x) ** 2 + (posicao.z - area.z) ** 2 > area.raio ** 2
  )
    return s
  return { ...s, ilhasVisitadas: s.ilhasVisitadas | BIT_DA_ILHA[area.ilha] }
}
