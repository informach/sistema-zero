import { z } from 'zod'

/** Existing Auth/HTTP/Postgres identity contract: format only, without RFC version/variant gates. */
export const IDENTITY_UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
export const IdentityUuidSchema = z
  .string()
  .regex(new RegExp(IDENTITY_UUID_PATTERN))
  .transform((value) => value.toLowerCase())

/**
 * Papéis globais da conta (RBAC). É a fonte da lista no monorepo: o `auth` grava um destes valores
 * no usuário e a borda autoriza cada rota contra eles. ⚠️ Alguns pacotes ainda têm cópia escrita à
 * mão; elas migram para cá quando o pacote for mexido. Os papéis dentro de uma instituição (gestão,
 * professor, coordenação, profissional) NÃO entram aqui: moram no vínculo com a instituição.
 * ⚠️ Mudar esta lista exige migration do enum `auth.user_role`.
 */
export const USER_ROLES = ['superadmin', 'admin', 'staff', 'customer'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Papel de quem se cadastra pela rota pública (cliente final). */
export const DEFAULT_USER_ROLE: UserRole = 'customer'

/** A equipe interna inteira: superadmin, admin e staff. */
export const TEAM_ROLES = ['superadmin', 'admin', 'staff'] as const satisfies readonly UserRole[]
export type TeamRole = (typeof TEAM_ROLES)[number]

/** A parte da equipe que administra (sem o staff). */
export const TEAM_ADMIN_ROLES = ['superadmin', 'admin'] as const satisfies readonly TeamRole[]

/** Só o superadmin. */
export const SUPERADMIN_ONLY = ['superadmin'] as const satisfies readonly TeamRole[]

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value)
}
