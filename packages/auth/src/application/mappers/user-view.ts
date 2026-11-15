import type { UserAggregate } from '../../domain/user/user.aggregate'

/**
 * View pública do usuário — o CONTRATO retornado pela camada de identidade.
 * NUNCA inclui `passwordHash`. `phone`/`signupSource`/`avatarUrl` são opcionais.
 */
export interface UserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
  avatarUrl?: string
  /**
   * A pessoa já definiu uma senha? A senha é opcional (entra pelo código do e-mail); a tela
   * de senha usa isto para oferecer "Criar senha" (sem a atual) ou "Alterar senha".
   */
  passwordSet: boolean
}

export function toUserView(user: UserAggregate): UserView {
  const view: UserView = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    passwordSet: user.isPasswordSet(),
  }
  if (user.phone) view.phone = user.phone
  if (user.signupSource) view.signupSource = user.signupSource
  if (user.avatarUrl) view.avatarUrl = user.avatarUrl
  return view
}
