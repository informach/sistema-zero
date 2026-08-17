/**
 * A chave do selo da matrícula.
 *
 * ⚠️⚠️ A coluna `status` do members não é a resposta sozinha. O acesso é
 * `status='active' E (vitalícia OU dentro da validade)`, mas a coluna fica
 * `'active'` depois da validade passar — só um cancelamento do provedor, a ação
 * manual do admin ou a varredura de vencidas a mudam. Resultado: o painel pintava
 * **"Ativo"** de verde ao lado de uma coluna "Validade" com data vencida, e foi
 * assim que um assinante cortado passou por ativo no incidente de 08/2026.
 *
 * A função faz UMA coisa: troca `active` por `lapsed` quando o acesso já caiu.
 * Todo o resto passa direto — inclusive um status que ainda não existe, que o
 * `StatusBadge` mostra como vier (ele é o dono dos rótulos; uma 2ª tabela aqui
 * seria drift esperando para acontecer).
 */
export interface EntitlementBadgeInput {
  status: string
  /** O acesso está liberado agora? `undefined` = members antigo (sem o campo). */
  activeNow?: boolean
}

export function entitlementBadge(e: EntitlementBadgeInput): string {
  // ⚠️ `activeNow` ausente (members mais velho que este painel) → comportamento
  // antigo, em vez de inventar "vencida" para todo mundo.
  return e.status === 'active' && e.activeNow === false ? 'lapsed' : e.status
}
