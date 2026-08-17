/**
 * O que o selo da matrícula DEVE dizer.
 *
 * ⚠️⚠️ A coluna `status` do members não é a resposta. O acesso é `status='active'
 * E (vitalícia OU dentro da validade)`, mas a coluna fica `'active'` depois da
 * validade passar — só um cancelamento do provedor, a ação manual do admin ou a
 * varredura de vencidas a mudam. Resultado: o painel pintava **"Ativo"** de verde
 * ao lado de uma coluna "Validade" com data vencida, e foi assim que um assinante
 * cortado passou por ativo no incidente de 08/2026.
 *
 * A verdade vem do `activeNow` (o members calcula com a régua dele). Aqui só
 * escolhemos a PALAVRA — e a palavra "Vencida" ganha do "Ativo" da coluna.
 */
export type EntitlementBadge = 'active' | 'lapsed' | 'revoked' | 'expired' | 'pending'

export interface EntitlementBadgeInput {
  status: string
  /** O acesso está liberado agora? `undefined` = members antigo (sem o campo). */
  activeNow?: boolean
}

export function entitlementBadge(e: EntitlementBadgeInput): EntitlementBadge {
  // ⚠️ `activeNow` ausente (members mais velho que este painel) → cai no
  // comportamento antigo em vez de inventar "vencida" para todo mundo.
  if (e.status === 'active' && e.activeNow === false) return 'lapsed'
  if (e.status === 'active' || e.status === 'revoked' || e.status === 'expired') {
    return e.status
  }
  if (e.status === 'pending') return 'pending'
  return 'active'
}

/** Diz o ESTADO; a data fica na coluna "Validade", que já existe ao lado. */
export const ENTITLEMENT_BADGE_LABEL: Record<EntitlementBadge, string> = {
  active: 'Ativo',
  lapsed: 'Vencida',
  revoked: 'Revogada',
  expired: 'Expirada',
  pending: 'Pendente',
}
