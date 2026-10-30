import { PAINEL_DA_IRIE } from '../estado/moradores'
import { PainelDeAmizadeDoAnel } from './amizade-do-anel'

export function PainelDaIrie() {
  return <PainelDeAmizadeDoAnel quem="irie" painel={PAINEL_DA_IRIE} />
}
