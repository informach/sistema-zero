import type { UserAggregate } from '../../domain/user/user.aggregate'

/**
 * View de usuário para o PAINEL ADMIN. Estende o contrato público (`user-view`)
 * com `version` (concorrência otimista) e os timestamps, e expõe `phone`/
 * `signupSource` sempre (como `null` quando ausentes) para a tabela. NUNCA inclui
 * `passwordHash`. É um contrato separado do `UserView` público de propósito — o
 * admin precisa de mais campos, o cliente final não.
 */
export interface AdminUserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone: string | null
  signupSource: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export function toAdminUserView(user: UserAggregate): AdminUserView {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    phone: user.phone,
    signupSource: user.signupSource,
    version: user.version,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
