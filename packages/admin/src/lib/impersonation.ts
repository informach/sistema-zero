/**
 * Guard de UX do "Entrar como" (impersonação p/ suporte). PURO e testável —
 * espelha a matriz REAL do auth (que re-checa no serviço; aqui é só gating de UI):
 * superadmin impersona qualquer um; admin só customer/staff (não escala p/ agir
 * como outro admin/superadmin); nunca a própria conta; só alvo ATIVO.
 */
export function canImpersonate(
  currentUser: { id: string; role: string },
  target: { id: string; role: string; status: string },
): boolean {
  if (target.id === currentUser.id) return false
  if (target.status !== 'active') return false
  if (currentUser.role === 'superadmin') return true
  if (currentUser.role === 'admin') return target.role === 'customer' || target.role === 'staff'
  return false
}

/** Monta a URL de handoff que o admin abre em nova aba (rota /impersonar da community). */
export function impersonationUrl(communityUrl: string, token: string): string {
  return `${communityUrl.replace(/\/+$/, '')}/impersonar?token=${encodeURIComponent(token)}`
}
