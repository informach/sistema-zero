import type { UserRole } from '../../../domain/user/user.role'

/** Quem está criando (resolvido dos headers do gateway). */
export interface CreateUserActor {
  id: string
  role: UserRole
}

/**
 * Criação de usuário pelo PAINEL (fluxo convite): sem senha — o serviço gera uma
 * aleatória impossível de usar e envia o e-mail de definição de senha.
 */
export interface CreateUserCommand {
  actor: CreateUserActor
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  role: UserRole
}
