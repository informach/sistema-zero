import { criarInstaladorDeCenasThree } from '@sistemazero/molda-cenarios-motor/instalar'
import type {
  CenaNoThree,
  OpcoesDoRuntimeCompilado,
} from '@sistemazero/molda-cenarios-motor/runtime'
import { criarFisicaDaCena3D, type FisicaDaCena3D } from './scene3dPhysics'

export interface CenaNoCanvas extends CenaNoThree {
  readonly fisica: FisicaDaCena3D
}

type Carregar = (
  id: string,
  sinal: AbortSignal,
  opcoes?: OpcoesDoRuntimeCompilado,
) => Promise<CenaNoThree>

/** O ciclo de instalação é compartilhado; somente a física dos quatro motores é do Studio. */
export function criarInstaladorDeCenas3D(carregar: Carregar) {
  return criarInstaladorDeCenasThree(carregar, (cena, ativa) => ({
    fisica: criarFisicaDaCena3D(cena, ativa),
  }))
}
