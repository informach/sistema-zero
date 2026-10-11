/**
 * Papéis (RBAC). Cobrem usuários internos (admin/equipe) e clientes finais.
 * O gateway autoriza por rota contra estes valores; o `auth` define o padrão no
 * cadastro (cliente final).
 */
export const USER_ROLES = ['superadmin', 'admin', 'staff', 'customer'] as const

export type UserRole = (typeof USER_ROLES)[number]

/** Papel padrão de quem se cadastra pela rota pública de registro. */
export const DEFAULT_ROLE: UserRole = 'customer'

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

/**
 * Equipe interna (superadmin/admin/staff). ⚠️ O token de ALUNO do Kids conserva este papel
 * (a família da equipe cria e testa os jogos pelos perfis antes das crianças clientes);
 * qualquer outro papel vira `customer` no token do aluno.
 */
export const PRIVILEGED_USER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'superadmin',
  'admin',
  'staff',
])

export function isPrivilegedUserRole(role: string): role is UserRole {
  return (PRIVILEGED_USER_ROLES as ReadonlySet<string>).has(role)
}
