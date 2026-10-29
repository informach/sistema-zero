import { PAINEL_DA_MARE, PAINEL_DO_FLOCO } from '../estado/moradores'
import { PainelDeApresentacao } from './apresentacao'

/** Apresentação fixa, sem mostrar escolhas de amizade que ainda não existem. */
export function PainelDaMare() {
  return (
    <PainelDeApresentacao quem="mare" painel={PAINEL_DA_MARE} nome="Maré" tchau="Tchau, Maré" />
  )
}

/** O Floco no palco do Pico Gelado (fase3-06), do mesmo jeito. */
export function PainelDoFloco() {
  return (
    <PainelDeApresentacao quem="floco" painel={PAINEL_DO_FLOCO} nome="Floco" tchau="Tchau, Floco" />
  )
}
