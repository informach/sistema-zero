import {
  FOSSEIS_DO_VALE,
  type FossilDoVale,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { PEIXES_DO_AQUARIO, peixesVisiveis } from './corais-do-recife'
import { achouFossil } from './fosseis'

/** As descobertas conservam identidade e progresso; a casa só mostra arte Morada. */
export const MORADA_FOSSIL: Readonly<Record<FossilDoVale, string>> = {
  'fossil-dente': 'moveis/objetos/esqueleto_didatico',
  'fossil-garra': 'moveis/brinquedos/dinossauro_plastico_verde',
  'fossil-vertebra': 'moveis/objetos/esqueleto_didatico',
  'fossil-ovo': 'moveis/brinquedos/dinossauro_plastico_roxo',
  'fossil-chifre-triceratopo': 'moveis/brinquedos/dinossauro_plastico_laranja',
  'fossil-cranio-rex': 'moveis/brinquedos/dinossauro_plastico_verde',
}
export const MORADA_AQUARIUM_FISH = 'moveis/comida/peixe_azul_pacote'
export function moradaMuseumExhibits(save: Salvamento) {
  return FOSSEIS_DO_VALE.flatMap((id, index) =>
    achouFossil(save, id) ? [{ id, index, pieceId: MORADA_FOSSIL[id] }] : [],
  )
}
export function moradaAquariumExhibits(corals: number) {
  const visible = peixesVisiveis(corals)
  return PEIXES_DO_AQUARIO.flatMap((id, index) =>
    visible[index] ? [{ id, index, pieceId: MORADA_AQUARIUM_FISH }] : [],
  )
}
