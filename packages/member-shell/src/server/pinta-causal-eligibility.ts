import 'server-only'
import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { learnerIdentity } from '../lib/learner-identity'
import type { SessionUser } from '../lib/types'

/**
 * A conta do Pinta (fila causal e paletas negociadas) vale para todo perfil desde 23/11/2026:
 * sem flag e sem lista de perfis. O que resta é infraestrutura, não produto: o BFF só assina e
 * confere bytes com o segredo HMAC do gateway e as credenciais do R2 privado de criações. Sem
 * elas, as rotas respondem 404 e o host fica no armazenamento de sempre.
 */
export function pintaAccountStorageReady(): boolean {
  const env = getEnv()
  return Boolean(
    env.MEMBER_SHELL_HMAC_SECRET &&
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_UGC_BUCKET,
  )
}

/**
 * Quem guarda o Pinta pela conta nesta página: o aluno ativo da sessão (perfil kids com a conta
 * responsável; adulto = a própria conta). Pais, suporte em modo leitura e sessão sem aluno não
 * recebem a fila causal nem as paletas negociadas. O escopo vale para todas as ferramentas que
 * leem a conta do Pinta: o Pinta solto, o Pinta do Arquipélago e a biblioteca de paletas do Molda.
 */
export function pintaAccountViewer(
  user: SessionUser | null,
  audience: PintaCausalViewer['audience'],
): PintaCausalViewer | null {
  const identity = learnerIdentity(user, audience)
  if (!user || !identity || isReadonlyImpersonation(user) || !pintaAccountStorageReady())
    return null
  return { audience, userId: identity.learnerId, accountId: identity.accountId }
}
