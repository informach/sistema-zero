import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { z } from 'zod'
import type {
  KidsProfileCohortGateway,
  KidsProfileCohortQuery,
} from '../../domain/ports/kids-profile-cohort-gateway.port'

const uuid = IdentityUuidSchema
const QuerySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('start'), limit: z.number().int().min(1).max(200) }),
  z.strictObject({
    kind: z.literal('continue'),
    upperBound: uuid,
    cursor: uuid.nullable(),
    limit: z.number().int().min(1).max(200),
  }),
])
const PageSchema = z.strictObject({
  upperBound: uuid.nullable(),
  cursor: uuid.nullable(),
  done: z.boolean(),
  owners: z.array(z.strictObject({ profileId: uuid, accountUserId: uuid })).max(200),
})

/** A work bound plus pages, not a persistent Auth database snapshot or a session authorization. */
export function createAuthProfileCohortGateway(opts: {
  baseUrl: string | undefined
  internalToken: string | undefined
  timeoutMs: number
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>
}): KidsProfileCohortGateway {
  const { baseUrl, internalToken, timeoutMs } = opts
  const doFetch = opts.fetchImpl ?? fetch
  return {
    async readPage(input: KidsProfileCohortQuery) {
      const query = QuerySchema.parse(input)
      if (!baseUrl || !internalToken) throw new Error('Auth profile cohort is not configured')
      const response = await doFetch(
        `${baseUrl.replace(/\/$/, '')}/auth/internal/kids-journey/profile-cohort`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-token': internalToken },
          body: JSON.stringify(query),
          signal: AbortSignal.timeout(timeoutMs),
        },
      )
      if (!response.ok) throw new Error(`Auth profile cohort responded ${response.status}`)
      const page = PageSchema.parse(await response.json())
      const cursor = query.kind === 'continue' ? query.cursor : null
      if (query.kind === 'continue' && page.upperBound !== query.upperBound)
        throw new Error('Auth changed the captured profile bound')
      if (page.owners.length > query.limit || (!page.done && page.owners.length === 0))
        throw new Error('Auth cohort page cannot make progress')
      let previous = cursor
      for (const owner of page.owners) {
        if (
          page.upperBound === null ||
          owner.profileId > page.upperBound ||
          (previous !== null && owner.profileId <= previous)
        )
          throw new Error('Auth cohort page is outside its ordered bound')
        previous = owner.profileId
      }
      if (
        page.cursor !== previous ||
        (page.upperBound === null &&
          (!page.done || page.cursor !== null || page.owners.length !== 0))
      )
        throw new Error('Auth cohort cursor does not match the returned owners')
      return {
        ...page,
        owners: page.owners.map((owner) => ({
          userId: owner.profileId,
          accountId: owner.accountUserId,
        })),
      }
    },
  }
}
