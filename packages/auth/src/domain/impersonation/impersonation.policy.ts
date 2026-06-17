import type { UserRole } from '../user/user.role'

/** Papéis que um `admin` pode impersonar (`superadmin` pode qualquer um). */
const ADMIN_IMPERSONABLE_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['customer', 'staff'])

/**
 * Matriz de impersonação (suporte): `superadmin` entra como qualquer um; `admin`
 * só como customer/staff (não escala para agir como outro admin/superadmin).
 * É re-checada na EMISSÃO do handoff **e** no EXCHANGE — o ator pode ser rebaixado
 * na janela (~60s) entre os dois passos (full review F5); o exchange usa o papel
 * FRESCO do ator, então um admin rebaixado a customer não completa a impersonação.
 */
export function canImpersonate(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'superadmin') return true
  return actorRole === 'admin' && ADMIN_IMPERSONABLE_ROLES.has(targetRole)
}
