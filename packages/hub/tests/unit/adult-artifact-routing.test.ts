import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createStudioArtifactHttpGateway } from '../../src/infrastructure/gateways/studio-artifact-http.gateway'

test('limpeza adulta usa o BFF adulto; ausência de configuração nunca desvia para o Kids', async () => {
  const calls: string[] = []
  const fetchImpl = Object.assign(
    async (input: string | Request | URL) => {
      calls.push(input instanceof Request ? input.url : String(input))
      return Response.json({ ok: true })
    },
    { preconnect: globalThis.fetch.preconnect },
  )
  const options = {
    baseUrl: 'http://kids.test',
    adultBaseUrl: 'http://adult.test',
    hmacSecret: 'test-artifact-secret-0001',
    fetchImpl,
  }
  const gateway = createStudioArtifactHttpGateway(options)
  const input = { playId: randomUUID(), coverUrl: null }
  await gateway.cleanupShowcaseArtifacts({ ...input, audience: 'adult' })
  await gateway.cleanupShowcaseArtifacts(input)
  expect(calls).toEqual([
    'http://adult.test/api/studio/cleanup',
    'http://kids.test/api/studio/cleanup',
  ])
  const withoutAdult = createStudioArtifactHttpGateway({ ...options, adultBaseUrl: undefined })
  await withoutAdult.cleanupShowcaseArtifacts({ ...input, audience: 'adult' })
  expect(calls).toHaveLength(2)
})
