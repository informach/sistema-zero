import { expect, test } from 'bun:test'
import { buildApp, jsonRequest, TEST_INTERNAL_API_TOKEN } from '../helpers'

for (const route of ['studio-artifact-cleanups', 'studio-reservation-cleanups'])
  test(`${route} drain requires internal authentication and an explicit valid audience`, async () => {
    const { app } = buildApp()
    const url = `/hub/internal/${route}/drain`
    expect(
      (await app.handle(jsonRequest('POST', url, { body: { audience: 'kids' } }))).status,
    ).toBe(401)
    const headers = {
      'content-type': 'application/json',
      'x-internal-token': TEST_INTERNAL_API_TOKEN,
    }
    expect((await app.handle(jsonRequest('POST', url, { headers, body: {} }))).status).toBe(400)
    expect(
      (await app.handle(jsonRequest('POST', url, { headers, body: { audience: 'all' } }))).status,
    ).toBe(400)
    for (const audience of ['kids', 'adult']) {
      const response = await app.handle(jsonRequest('POST', url, { headers, body: { audience } }))
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ attempted: 0 })
    }
  })
