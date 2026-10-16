import { expect, test } from 'bun:test'
import { handleCommercialReport } from '../../src/server/commercial-report'

test('relatório interno exige token e valida período antes de consultar', async () => {
  let calls = 0
  const deps = {
    internalToken: 'test-only-internal-token',
    report: async () => {
      calls++
      throw new Error('offline')
    },
  }
  const input = {
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-15T00:00:00.000Z',
    source: 'instagram',
    campaign: 'campaign',
    content: 'mc07_ferias',
  }
  const request = (body: unknown, token: string) =>
    new Request('http://localhost/api/internal/marketing-attribution', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'x-internal-token': token },
    })
  expect((await handleCommercialReport(request(input, 'forged'), deps)).status).toBe(401)
  expect(
    (await handleCommercialReport(request({ ...input, to: input.from }, deps.internalToken), deps))
      .status,
  ).toBe(400)
  expect(calls).toBe(0)
  const failure = await handleCommercialReport(request(input, deps.internalToken), deps)
  expect(failure.status).toBe(503)
  expect(calls).toBe(1)
})
