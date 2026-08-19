import { Elysia } from 'elysia'
import type { PurgeUserDataService } from '../../../application/purge-user-data/purge-user-data.service'
import { assertInternalCaller } from '../auth'
import { AccountDeletionFinalizeBody } from '../dtos'

/** Segunda purga pós-TTL, chamada pelo worker autenticado por HMAC no gateway. */
export function accountDeletionRoutes(deps: {
  purgeUserData: PurgeUserDataService
  internalToken?: string
}) {
  return new Elysia({ prefix: '/hub/internal/account-deletion' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/finalize',
      async ({ body }) => {
        await deps.purgeUserData.execute({
          userId: body.accountId,
          profileIds: body.userIds.filter((id) => id !== body.accountId),
        })
        return { finalized: true }
      },
      { body: AccountDeletionFinalizeBody },
    )
}
