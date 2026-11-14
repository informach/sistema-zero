import { Vector3 } from 'three'
import { PENDURADO_NO_CIPO } from '../sistemas/lugares-dos-clipes'

/**
 * As mãos na corda do cipó. A arte fez a animação de se pendurar (`pendurar_cipo`): as duas mãos
 * seguram a corda à frente do corpo, a cabeça fica atrás dela e as pernas abraçam os lados. A arte
 * mediu onde o eixo da corda passa e a que altura as mãos seguram; o personagem põe o corpo de modo
 * que esse ponto caia em cima das mãos do jogo (a pegada do cipó).
 *
 * Antes desta animação, o cipó usava a pose do ar e cada braço era dobrado por IK até a corda; com
 * as mãos já na corda pelo clipe, essa correção saiu.
 */

/**
 * Onde a corda passa no corpo do avatar (metros a partir da origem do desenho; ele olha para +z):
 * no meio, à frente, na altura das mãos do clipe.
 */
export const CORDA_NO_CORPO = new Vector3(
  0,
  PENDURADO_NO_CIPO.maos,
  PENDURADO_NO_CIPO.cordaAFrente,
)

/** O corpo pende para trás no cipó (radianos), além da pose: o clipe já pende. */
export const INCLINACAO_NO_CIPO = 0
