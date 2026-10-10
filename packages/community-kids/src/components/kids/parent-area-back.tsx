import { KidsBackButton } from './back-button'

/**
 * Destino da volta para a Área dos Pais a partir das superfícies da CONTA que vivem
 * fora do layout infantil (`/responsavel`, o acompanhamento, e `/responsavel/ajuda`).
 * `/pais` é a área adulta com o card "Abrir atendimento"; sem sessão de responsável ela
 * manda ao login dele, nunca a um beco. É o MESMO destino que o portal usa no aviso de
 * sessão expirada (uma fonte).
 */
export const PARENT_AREA_HREF = '/pais'

/**
 * Seta de volta para a Área dos Pais. Rotas `/responsavel/*` não têm sidebar, topo nem
 * layout próprio, então sem isto o pai entra no Atendimento e não tem como sair.
 * `showLabel` ligado porque a seta fica sozinha na linha (regra do `KidsBackButton`).
 */
export function ParentAreaBack() {
  return <KidsBackButton href={PARENT_AREA_HREF} label="Voltar à área dos pais" showLabel />
}
