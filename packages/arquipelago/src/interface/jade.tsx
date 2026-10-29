import { PAINEL_DA_JADE } from '../estado/moradores'
import { PainelDeApresentacao } from './apresentacao'

export function PainelDaJade() {
  return (
    <PainelDeApresentacao quem="jade" painel={PAINEL_DA_JADE} nome="Jade" tchau="Tchau, Jade" />
  )
}
