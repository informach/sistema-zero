import { ForbiddenError } from './edge-errors'

const MUTATING_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export interface AccountDeletionFence {
  isFenced(accountId: string): Promise<boolean>
}

/**
 * Impede que um JWT emitido antes da exclusão volte a gravar dados. Chamadas S2S
 * sem identidade de usuário não passam por esta política.
 */
export async function assertAccountMutationAllowed(input: {
  method: string
  headers: Record<string, string | undefined>
  fence: AccountDeletionFence
}): Promise<void> {
  if (!MUTATING_METHODS.has(input.method.toUpperCase())) return
  const userId = input.headers['x-auth-user-id']
  if (!userId) return
  const accountId = input.headers['x-auth-account-id'] || userId
  if (await input.fence.isFenced(accountId)) {
    throw new ForbiddenError('Esta conta está em processo de exclusão.')
  }
}
