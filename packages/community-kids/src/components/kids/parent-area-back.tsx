import { KidsBackButton } from './back-button'

/**
 * Destino da volta para a Área dos Pais a partir das superfícies da CONTA que vivem
 * fora do layout infantil (hoje só `/responsavel/ajuda`). `?manage=1` cai direto no
 * modo "Gerenciar perfis", onde vive o card "Abrir atendimento"; se o portão parental
 * (15 min) tiver vencido, a página degrada para a grade com o modal de senha, nunca um
 * beco. É o MESMO destino que o portal usa no aviso de portão expirado (uma fonte).
 */
export const PARENT_AREA_HREF = '/perfis?manage=1'

/**
 * Seta de volta para a Área dos Pais. Rotas `/responsavel/*` não têm sidebar, topo nem
 * layout próprio, então sem isto o pai entra no Atendimento e não tem como sair.
 * `showLabel` ligado porque a seta fica sozinha na linha (regra do `KidsBackButton`).
 */
export function ParentAreaBack() {
  return <KidsBackButton href={PARENT_AREA_HREF} label="Voltar à área dos pais" showLabel />
}
