import { describe, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { masteryRoutes } from '../../src/interfaces/http/routes/mastery.routes'

const userId = '20000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000002'
describe('Maestria HTTP identity boundary', () => {
  const headers = {
    'x-internal-token': 'local-test-token',
    'x-auth-user-id': userId,
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
    'content-type': 'application/json',
  }
  test('review requires the authenticated own staff account, never an impersonated learner', async () => {
    let calls = 0
    const unreachable = async () => {
      calls++
      throw new Error('Application must not receive an unauthorized request')
    }
    const service = {
      get: unreachable,
      evidence: unreachable,
      submit: unreachable,
      queue: unreachable,
      detail: unreachable,
      review: unreachable,
    }
    const app = new Elysia()
      .onError(({ set }) => {
        set.status = 403
        return { denied: true }
      })
      .use(masteryRoutes({ service, internalToken: 'local-test-token' }))
    const cases: ReadonlyArray<Record<string, string>> = [
      { 'x-auth-user-role': 'user' },
      { 'x-auth-user-status': 'inactive' },
      { 'x-auth-account-id': userId },
      { 'x-auth-impersonator-id': id },
      { 'x-auth-kids-context': 'student' },
      { 'x-internal-token': 'invalid' },
    ]
    for (const changes of cases) {
      const response = await app.handle(
        new Request(`http://localhost/members/admin/journey/masteries/submissions/${id}/review`, {
          method: 'POST',
          headers: { ...headers, ...changes },
          body: '{}',
        }),
      )
      expect(response.status).toBe(403)
    }
    expect(calls).toBe(0)
  })
  test('the learner body cannot choose another owner and support sessions cannot submit', async () => {
    let calls = 0
    const unreachable = async () => {
      calls++
      throw new Error('Unauthorized')
    }
    const app = new Elysia()
      .onError(({ set }) => {
        set.status = 403
        return { denied: true }
      })
      .use(
        masteryRoutes({
          service: {
            get: unreachable,
            evidence: unreachable,
            submit: unreachable,
            queue: unreachable,
            detail: unreachable,
            review: unreachable,
          },
          internalToken: 'local-test-token',
        }),
      )
    const response = await app.handle(
      new Request(
        'http://localhost/members/journey/masteries/python2d/levels/1/submissions?audience=adult',
        {
          method: 'POST',
          headers: { ...headers, 'x-auth-impersonator-id': id },
          body: JSON.stringify({ evidenceId: id }),
        },
      ),
    )
    expect(response.status).toBe(403)
    expect(calls).toBe(0)
  })
})
