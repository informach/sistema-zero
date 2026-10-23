import { staffRequestSchema } from '@sistemazero/core/staff'
import { Elysia, t } from 'elysia'
import type { StaffOperationsService } from '../../../application/staff/staff-operations.service'
import { UnauthorizedError } from '../errors'

export function staffRoutes(service: StaffOperationsService) {
  return new Elysia().post(
    '/auth/staff/operations',
    async ({ body, headers, set }) => {
      const token = headers.authorization?.match(/^Bearer (\S+)$/i)?.[1]
      if (!token) throw new UnauthorizedError('Token de acesso ausente')
      const parsed = staffRequestSchema.safeParse(body)
      // Never echo validation input: it includes a session secret.
      if (!parsed.success) {
        set.status = 400
        return { error: { code: 'INVALID_STAFF_OPERATION', message: 'Operação inválida' } }
      }
      const result = await service.execute(token, parsed.data.refreshToken, parsed.data.operation)
      set.status = result.status
      return result.value
    },
    { body: t.Unknown() },
  )
}
