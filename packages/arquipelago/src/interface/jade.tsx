import { PAINEL_DA_JADE } from '../estado/moradores'
import { PainelDeAmizadeDoAnel } from './amizade-do-anel'

export function PainelDaJade() {
  return <PainelDeAmizadeDoAnel quem="jade" painel={PAINEL_DA_JADE} />
}
