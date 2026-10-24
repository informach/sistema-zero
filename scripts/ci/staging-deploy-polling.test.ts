import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { stagingJourney } from '../release/kids-journey-bootstrap.mjs'
import { monitorStagingDeployments } from './staging-deploy-monitor.mjs'

const sha = 'a'.repeat(40)
const entries = Array.from({ length: 16 }, (_, i) => ({
  service: `service-${i}`,
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  serviceId: `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`,
}))
function fixture(reply?: (data: Record<string, unknown>, round: number) => Response) {
  let elapsed = 0
  const requests: Array<{ query: string; variables: unknown; at: number }> = []
  return {
    requests,
    elapsed: () => elapsed,
    run: () =>
      monitorStagingDeployments(
        { entries, sha, token: 'synthetic-token' },
        {
          now: () => elapsed,
          sleep: async (ms: number) => {
            elapsed += ms
          },
          log: () => {},
          fetch: async (_url: string, init: RequestInit) => {
            const { query, variables } = JSON.parse(String(init.body))
            requests.push({ query, variables, at: elapsed })
            const data = Object.fromEntries(
              entries.map((entry, i) => [
                `d${i}`,
                {
                  ...entry,
                  projectId: stagingJourney.project,
                  environmentId: stagingJourney.environment,
                  status: 'SUCCESS',
                  meta: { commitHash: sha },
                },
              ]),
            )
            return reply?.(data, requests.length) ?? Response.json({ data })
          },
        },
      ),
  }
}

test('workflow executes the real batch monitor over the exact acknowledged deployments', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
  const start = workflow.indexOf('          esperar() {')
  const end = workflow.indexOf('\n          }\n', start)
  const polling = workflow.slice(start, end)
  expect(start).toBeGreaterThan(0)
  expect(polling).toContain('node scripts/ci/staging-deploy-monitor.mjs "$GITHUB_SHA"')
  expect(polling).toContain(`"\${DEP[$s]}"`)
  expect(polling).toContain(`"\${SVC_ID[$s]}"`)
  expect(polling).not.toContain('mutation')
  expect(polling).not.toContain('gql ')
})

test('sixteen services use one request per round, with UUIDs in variables', async () => {
  const qa = fixture()
  await qa.run()
  expect(qa.requests).toHaveLength(1)
  expect(qa.requests[0]!.query.match(/:deployment\(/g)).toHaveLength(16)
  expect(qa.requests[0]!.variables).toEqual(
    Object.fromEntries(entries.map((e, i) => [`id${i}`, e.id])),
  )
  expect(qa.requests[0]!.query).not.toContain('mutation')
})

test('queued builds converge after twenty minutes within sixty minutes', async () => {
  const qa = fixture((data, round) => {
    if (round <= 50)
      for (const item of Object.values(data)) (item as { status: string }).status = 'BUILDING'
    return Response.json({ data })
  })
  await qa.run()
  expect(qa.elapsed()).toBe(25 * 60_000)
  expect(qa.requests).toHaveLength(51)
})

test('rate limiting respects Retry-After without changing deployment ids', async () => {
  const qa = fixture((data, round) =>
    round === 1
      ? new Response('not-json', { status: 429, headers: { 'retry-after': '120' } })
      : Response.json({ data }),
  )
  await qa.run()
  expect(qa.requests.map((r) => r.at)).toEqual([0, 120_000])
  expect(qa.requests[0]!.variables).toEqual(qa.requests[1]!.variables)
})

test.each([
  'FAILED',
  'CRASHED',
  'REMOVED',
  'SKIPPED',
  'CANCELED',
  'CANCELLED',
  'alien',
])('rejects terminal/unknown %s', async (status) => {
  const qa = fixture((data) => {
    ;(data.d0 as { status: string }).status = status
    return Response.json({ data })
  })
  await expect(qa.run()).rejects.toThrow()
  expect(qa.requests).toHaveLength(1)
})

test.each([
  'id',
  'projectId',
  'environmentId',
  'serviceId',
  'commit',
])('rejects %s divergence even with SUCCESS', async (field) => {
  const qa = fixture((data) => {
    const item = data.d0 as Record<string, unknown>
    if (field === 'commit') item.meta = { commitHash: 'b'.repeat(40) }
    else item[field] = 'wrong'
    return Response.json({ data })
  })
  await expect(qa.run()).rejects.toThrow(/diverged/)
})

test('missing alias and partial GraphQL errors cannot produce success', async () => {
  const missing = fixture((data) => {
    delete data.d7
    return Response.json({ data })
  })
  await expect(missing.run()).rejects.toThrow()
  const errors = fixture((data) => Response.json({ data, errors: [{ message: 'Not Authorized' }] }))
  await expect(errors.run()).rejects.toThrow('api-authorization-rejected')
})

test('expiry while pending is a failure at sixty minutes', async () => {
  const qa = fixture((data) => {
    for (const item of Object.values(data)) (item as { status: string }).status = 'BUILDING'
    return Response.json({ data })
  })
  await expect(qa.run()).rejects.toThrow(/deadline/)
  expect(qa.elapsed()).toBe(60 * 60_000)
  expect(qa.requests).toHaveLength(120)
})
