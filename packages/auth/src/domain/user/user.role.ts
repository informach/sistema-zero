/**
 * Papéis (RBAC). Cobrem usuários internos (admin/equipe) e clientes finais.
 * O gateway autoriza por rota contra estes valores; o `auth` define o padrão no
 * cadastro (cliente final). A lista mora em `@sistemazero/core/identity`; aqui ficam os nomes que
 * o auth já usava. ⚠️ Ainda há cópias escritas à mão (ex.: `READ_ROLES` em `admin.routes.ts` e os
 * `auth.ts` de outros serviços): elas passam a importar do core quando o pacote for mexido
 * (frente Famílias e Escolas, `docs/familias-e-escolas/CONTROLE.md`).
 */
import {
  USER_ROLES as CORE_USER_ROLES,
  type UserRole as CoreUserRole,
  isUserRole as coreIsUserRole,
  DEFAULT_USER_ROLE,
  TEAM_ROLES,
} from '@sistemazero/core/identity'

export const USER_ROLES = CORE_USER_ROLES

export type UserRole = CoreUserRole

/** Papel padrão de quem se cadastra pela rota pública de registro. */
export const DEFAULT_ROLE: UserRole = DEFAULT_USER_ROLE

export function isUserRole(value: unknown): value is UserRole {
  return coreIsUserRole(value)
}

/**
 * Equipe interna (superadmin/admin/staff). ⚠️ O token de ALUNO do Kids conserva este papel
 * (a família da equipe cria e testa os jogos pelos perfis antes das crianças clientes);
 * qualquer outro papel vira `customer` no token do aluno.
 */
export const PRIVILEGED_USER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(TEAM_ROLES)

export function isPrivilegedUserRole(role: string): role is UserRole {
  return (PRIVILEGED_USER_ROLES as ReadonlySet<string>).has(role)
}
