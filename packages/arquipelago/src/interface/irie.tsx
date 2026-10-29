import { PAINEL_DA_IRIE } from '../estado/moradores'
import { PainelDeApresentacao } from './apresentacao'

export function PainelDaIrie() {
  return (
    <PainelDeApresentacao quem="irie" painel={PAINEL_DA_IRIE} nome="Iriê" tchau="Tchau, Iriê" />
  )
}
