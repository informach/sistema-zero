import { expect, test } from 'bun:test'
import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { AcquisitionReportsService } from '../../src/application/acquisitions/acquisition-reports.service'
import type { CourseBenefitAdminService } from '../../src/application/course-benefits/course-benefit-admin.service'
import { courseBenefitsRoutes } from '../../src/interfaces/http/course-benefits.routes'

test('benefícios do curso exigem token interno e administração; staff não recebe pessoas nem valores', async () => {
  const app = new Elysia()
    .onError(({ error, set }) => {
      set.status =
        error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500
      return { error: error instanceof Error ? error.message : 'Error' }
    })
    .use(
      courseBenefitsRoutes({
        internalToken: 'benefit-private-internal',
        requireAdminEnabled: true,
        benefits: {} as CourseBenefitAdminService,
        reports: { courseBenefits: async () => [] } as unknown as AcquisitionReportsService,
      }),
    )
  const request = (role: string, token = 'benefit-private-internal') =>
    app.handle(
      new Request('http://local/referrals/admin/course-benefits?audience=kids', {
        headers: {
          'x-auth-user-role': role,
          'x-auth-user-status': 'active',
          'x-internal-token': token,
        },
      }),
    )
  expect((await request('admin', 'wrong')).status).toBe(401)
  expect((await request('staff')).status).toBe(403)
  expect((await request('customer')).status).toBe(403)
  expect((await request('admin')).status).toBe(200)
})
