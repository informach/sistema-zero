import { PAINEL_DA_MARE, PAINEL_DO_FLOCO } from '../estado/moradores'
import { PainelDeAmizadeDoAnel } from './amizade-do-anel'

/** Relação da Maré com a mesma conversa e câmera do mundo. */
export function PainelDaMare() {
  return <PainelDeAmizadeDoAnel quem="mare" painel={PAINEL_DA_MARE} />
}

/** O Floco no palco do Pico Gelado (fase3-06), do mesmo jeito. */
export function PainelDoFloco() {
  return <PainelDeAmizadeDoAnel quem="floco" painel={PAINEL_DO_FLOCO} />
}
