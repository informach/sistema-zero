import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { z } from 'zod'
import type { ProfileJourneyGateway } from '../../domain/ports/profile-journey-gateway.port'

const OwnerSchema = z.strictObject({ profileId: IdentityUuidSchema, accountUserId: IdentityUuidSchema })
const ReceiptSchema = z.strictObject({
  userId: IdentityUuidSchema,
  accountId: IdentityUuidSchema,
  policyVersion: z.number().int().positive(),
})

export function createMembersProfileJourneyGateway(options: {
  baseUrl: string
  admissionToken: string | undefined
  timeoutMs: number
  fetchImpl?: typeof fetch
}): ProfileJourneyGateway {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const token = options.admissionToken
  const timeoutMs = options.timeoutMs
  const doFetch = options.fetchImpl ?? fetch
  return {
    async initialize(input) {
      const owner = OwnerSchema.parse(input)
      // This credential proves only Auth admission; the general Members/internal token is insufficient.
      if (!token) throw new Error('Profile admission credential is not configured')
      const response = await doFetch(`${baseUrl}/members/internal/kids-journey/admission`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': token },
        body: JSON.stringify({ userId: owner.profileId, accountId: owner.accountUserId }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status === 202) return 'not_ready'
      if (!response.ok) throw new Error(`Profile admission failed (${response.status})`)
      const receipt = ReceiptSchema.parse(await response.json())
      if (receipt.userId !== owner.profileId || receipt.accountId !== owner.accountUserId)
        throw new Error('Profile admission receipt belongs to another owner')
      return 'admitted'
    },
  }
}
