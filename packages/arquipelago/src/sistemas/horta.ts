export {
  COLHEITA,
  CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS,
  CRESCIMENTO_MS,
  cabeColheita,
  colher,
  type Estagio,
  estagio,
  noTempoDoPrimeiroPedido,
  plantar,
  progresso,
  regar,
  tempoDeCrescer,
} from '@sistemazero/arquipelago-contracts'

/**
 * Quando a geladeira foi ganha (`null` com o primeiro pedido aberto): o que foi regado até ali
 * cresce no tempo curto do tutorial (`noTempoDoPrimeiroPedido`, no contrato).
 */
export function geladeiraEm(s: { projetos: { geladeira?: { ganhoEm: string } | undefined } }) {
  return s.projetos.geladeira?.ganhoEm ?? null
}
